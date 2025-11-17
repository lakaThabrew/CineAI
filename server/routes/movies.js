// server/routes/movies.js
const express = require('express');
const axios = require('axios');
const { pool } = require('../config/database');

// Helper to call OMDb with retries, HTTPS and a timeout
async function fetchOmdb(params, retries = 3, timeout = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get('https://www.omdbapi.com/', { params, timeout });
      return response.data;
    } catch (err) {
      const last = attempt === retries;
      console.warn(`OMDb request failed (attempt ${attempt}/${retries})`, err && err.message);
      if (last) throw err;
      // backoff before retrying
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

const router = express.Router();

// Search movies by title
router.get('/search', async (req, res) => {
  try {
    const { title, year, page = 1 } = req.query;

    if (!title) {
      return res.status(400).json({ error: 'Title parameter is required' });
    }

    // First, try to find in cache
    const [cachedMovies] = await pool.execute(
      'SELECT * FROM movies_cache WHERE title LIKE ? ORDER BY imdb_rating DESC LIMIT 10',
      [`%${title}%`]
    );

    if (cachedMovies.length > 0) {
      return res.json({
        source: 'cache',
        movies: cachedMovies,
        totalResults: cachedMovies.length
      });
    }

    // If not in cache, fetch from OMDb API (with retries/timeout)
    let omdbData;
    try {
      omdbData = await fetchOmdb({
        apikey: process.env.OMDB_API_KEY,
        s: title,
        y: year,
        page: page,
        type: 'movie'
      });
    } catch (err) {
      console.error('OMDb search failed:', err && err.message);
      return res.status(502).json({ error: 'OMDb API request failed' });
    }

    if (!omdbData || omdbData.Response === 'False') {
      return res.status(404).json({ error: (omdbData && omdbData.Error) || 'No movies found' });
    }

    // Cache the search results
    const movies = omdbData.Search;
    const detailedMovies = [];

    for (const movie of movies.slice(0, 8)) { // Get details for first 5 movies
      try {
        const details = await getMovieDetails(movie.imdbID);
        if (details) {
          detailedMovies.push(details);
          // Cache in database
          await cacheMovie(details);
        }
      } catch (error) {
        console.error(`Error fetching details for ${movie.imdbID}:`, error);
      }
    }

    res.json({
      source: 'omdb',
      movies: detailedMovies,
      totalResults: parseInt(omdbData.totalResults) || detailedMovies.length
    });

  } catch (error) {
    console.error('Movie search error:', error);
    res.status(500).json({ error: 'Error searching movies' });
  }
});

// Get movie details by IMDb ID
router.get('/details/:imdbId', async (req, res) => {
  try {
    const { imdbId } = req.params;

    // Check cache first
    const [cachedMovie] = await pool.execute(
      'SELECT * FROM movies_cache WHERE imdb_id = ?',
      [imdbId]
    );

    if (cachedMovie.length > 0) {
      return res.json({
        source: 'cache',
        movie: cachedMovie[0]
      });
    }

    // Fetch from OMDb API
    const movieDetails = await getMovieDetails(imdbId);
    
    if (!movieDetails) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Cache the movie
    await cacheMovie(movieDetails);

    res.json({
      source: 'omdb',
      movie: movieDetails
    });

  } catch (error) {
    console.error('Movie details error:', error);
    res.status(500).json({ error: 'Error fetching movie details' });
  }
});

// Get trending/popular movies
router.get('/trending', async (req, res) => {
  try {
    // Allow clients to force fetching from OMDb (bypass cache) by passing ?force=1 or ?source=omdb
    const { force, source } = req.query;
    const forceOmdb = force === '1' || force === 'true' || source === 'omdb';

    if (!forceOmdb) {
      // Try to get from cache first
      const [trendingMovies] = await pool.execute(
        'SELECT * FROM movies_cache WHERE imdb_rating >= 7.0 ORDER BY imdb_rating DESC, created_at DESC LIMIT 20'
      );

      if (trendingMovies.length >= 10) {
        return res.json({
          source: 'cache',
          movies: trendingMovies
        });
      }
    }

    // Fetch fresh popular movies from OMDb (either fallback or forced)
    const popularTitles = [
      'The Dark Knight', 'Inception', 'Pulp Fiction', 'The Shawshank Redemption',
      'Forrest Gump', 'The Matrix', 'Goodfellas', 'The Godfather',
      'Interstellar', 'Fight Club'
    ];

    const movies = [];
    for (const title of popularTitles) {
      try {
        const searchData = await fetchOmdb({
          apikey: process.env.OMDB_API_KEY,
          t: title,
          type: 'movie'
        });

        if (searchData && searchData.Response === 'True') {
          const movie = formatMovieData(searchData);
          movies.push(movie);
          // Cache the fresh movie data asynchronously (don't block response)
          cacheMovie(movie).catch((err) => console.error('Cache movie error:', err));
        }
      } catch (error) {
        console.error(`Error fetching ${title}:`, error && error.message);
      }
    }

    // If OMDb failed to return any movies, try returning cache as a fallback
    if (movies.length === 0) {
      try {
        const [cachedFallback] = await pool.execute(
          'SELECT * FROM movies_cache WHERE imdb_rating >= 6.0 ORDER BY imdb_rating DESC, created_at DESC LIMIT 20'
        );
        if (cachedFallback && cachedFallback.length > 0) {
          return res.json({ source: 'cache-fallback', movies: cachedFallback });
        }
      } catch (err) {
        console.error('Error reading cache fallback:', err && err.message);
      }
    }

    res.json({ source: 'omdb', movies });

  } catch (error) {
    console.error('Trending movies error:', error);
    res.status(500).json({ error: 'Error fetching trending movies' });
  }
});

// Helper function to get movie details from OMDb
async function getMovieDetails(imdbId) {
  try {
    const data = await fetchOmdb({
      apikey: process.env.OMDB_API_KEY,
      i: imdbId,
      plot: 'full'
    });

    if (data && data.Response === 'True') {
      return formatMovieData(data);
    }
    return null;
  } catch (error) {
    console.error('OMDb API error:', error);
    return null;
  }
}

// Helper function to format movie data
function formatMovieData(omdbData) {
  return {
    imdb_id: omdbData.imdbID,
    title: omdbData.Title,
    year: parseInt(omdbData.Year) || null,
    genre: omdbData.Genre,
    director: omdbData.Director,
    actors: omdbData.Actors,
    plot: omdbData.Plot,
    poster_url: omdbData.Poster !== 'N/A' ? omdbData.Poster : null,
    imdb_rating: parseFloat(omdbData.imdbRating) || null,
    runtime: omdbData.Runtime,
    language: omdbData.Language,
    country: omdbData.Country
  };
}

// Helper function to cache movie in database
async function cacheMovie(movieData) {
  try {
    await pool.execute(
      `INSERT INTO movies_cache 
       (imdb_id, title, year, genre, director, actors, plot, poster_url, imdb_rating, runtime, language, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       title = VALUES(title), year = VALUES(year), genre = VALUES(genre),
       director = VALUES(director), actors = VALUES(actors), plot = VALUES(plot),
       poster_url = VALUES(poster_url), imdb_rating = VALUES(imdb_rating),
       runtime = VALUES(runtime), language = VALUES(language), country = VALUES(country)`,
      [
        movieData.imdb_id, movieData.title, movieData.year, movieData.genre,
        movieData.director, movieData.actors, movieData.plot, movieData.poster_url,
        movieData.imdb_rating, movieData.runtime, movieData.language, movieData.country
      ]
    );
  } catch (error) {
    console.error('Cache movie error:', error);
  }
}

module.exports = router;