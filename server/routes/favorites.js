// server/routes/favorites.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();

// Middleware to authenticate user
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get user's favorite movies
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [favorites] = await pool.execute(
      `SELECT mc.*, uf.added_at 
       FROM user_favorites uf
       JOIN movies_cache mc ON uf.imdb_id = mc.imdb_id
       WHERE uf.user_id = ?
       ORDER BY uf.added_at DESC`,
      [userId]
    );

    res.json({
      favorites: favorites,
      count: favorites.length
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Error fetching favorites' });
  }
});

// Add movie to favorites
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { imdbId } = req.body;

    if (!imdbId) {
      return res.status(400).json({ error: 'IMDb ID is required' });
    }

    // Check if movie is already in favorites
    const [existingFavorite] = await pool.execute(
      'SELECT id FROM user_favorites WHERE user_id = ? AND imdb_id = ?',
      [userId, imdbId]
    );

    if (existingFavorite.length > 0) {
      return res.status(400).json({ error: 'Movie already in favorites' });
    }

    // Check if movie exists in cache, if not fetch and cache it
    const [movieInCache] = await pool.execute(
      'SELECT * FROM movies_cache WHERE imdb_id = ?',
      [imdbId]
    );

    if (movieInCache.length === 0) {
      // Movie not in cache, fetch from OMDb and cache it
      const axios = require('axios');
      try {
        const omdbResponse = await axios.get(`http://www.omdbapi.com/`, {
          params: {
            apikey: process.env.OMDB_API_KEY,
            i: imdbId
          }
        });

        if (omdbResponse.data.Response === 'True') {
          const movieData = formatMovieData(omdbResponse.data);
          await cacheMovie(movieData);
        } else {
          return res.status(404).json({ error: 'Movie not found' });
        }
      } catch (fetchError) {
        console.error('Error fetching movie for favorites:', fetchError);
        return res.status(500).json({ error: 'Error fetching movie details' });
      }
    }

    // Add to favorites
    await pool.execute(
      'INSERT INTO user_favorites (user_id, imdb_id) VALUES (?, ?)',
      [userId, imdbId]
    );

    // Get the movie details to return
    const [movieDetails] = await pool.execute(
      'SELECT * FROM movies_cache WHERE imdb_id = ?',
      [imdbId]
    );

    res.status(201).json({
      message: 'Movie added to favorites',
      movie: movieDetails[0]
    });

  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ error: 'Error adding movie to favorites' });
  }
});

// Remove movie from favorites
router.delete('/remove', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { imdbId } = req.body;

    if (!imdbId) {
      return res.status(400).json({ error: 'IMDb ID is required' });
    }

    // Check if movie is in favorites
    const [existingFavorite] = await pool.execute(
      'SELECT id FROM user_favorites WHERE user_id = ? AND imdb_id = ?',
      [userId, imdbId]
    );

    if (existingFavorite.length === 0) {
      return res.status(404).json({ error: 'Movie not in favorites' });
    }

    // Remove from favorites
    await pool.execute(
      'DELETE FROM user_favorites WHERE user_id = ? AND imdb_id = ?',
      [userId, imdbId]
    );

    res.json({ message: 'Movie removed from favorites' });

  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ error: 'Error removing movie from favorites' });
  }
});

// Check if movie is in user's favorites
router.get('/check/:imdbId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { imdbId } = req.params;

    const [favorite] = await pool.execute(
      'SELECT id FROM user_favorites WHERE user_id = ? AND imdb_id = ?',
      [userId, imdbId]
    );

    res.json({
      isFavorite: favorite.length > 0
    });

  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ error: 'Error checking favorite status' });
  }
});

// Get favorite movies by genre
router.get('/by-genre', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [favoritesByGenre] = await pool.execute(
      `SELECT 
        TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(mc.genre, ',', numbers.n), ',', -1)) AS genre,
        COUNT(*) as count,
        GROUP_CONCAT(mc.title ORDER BY uf.added_at DESC LIMIT 3) as sample_movies
       FROM user_favorites uf
       JOIN movies_cache mc ON uf.imdb_id = mc.imdb_id
       JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) numbers
       ON CHAR_LENGTH(mc.genre) - CHAR_LENGTH(REPLACE(mc.genre, ',', '')) >= numbers.n - 1
       WHERE uf.user_id = ? AND mc.genre IS NOT NULL
       GROUP BY genre
       HAVING genre != ''
       ORDER BY count DESC`,
      [userId]
    );

    res.json({
      genreBreakdown: favoritesByGenre
    });

  } catch (error) {
    console.error('Get favorites by genre error:', error);
    res.status(500).json({ error: 'Error fetching favorites by genre' });
  }
});

// Helper functions
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