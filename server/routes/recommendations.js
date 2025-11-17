// server/routes/recommendations.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../config/database');

const router = express.Router();

// AI-powered movie recommendations
router.post('/ai', async (req, res) => {
  try {
    const { prompt, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Validate prompt length
    if (prompt.length > 500) {
      return res.status(400).json({ error: 'Prompt too long. Please keep it under 500 characters.' });
    }

    // Create hash of the prompt for caching
    const promptHash = crypto.createHash('sha256').update(prompt.toLowerCase().trim()).digest('hex');

    // Check cache first
    const [cachedRecommendations] = await pool.execute(
      'SELECT * FROM ai_recommendations_cache WHERE prompt_hash = ? AND expires_at > NOW()',
      [promptHash]
    );

    if (cachedRecommendations.length > 0) {
      console.log('Returning cached recommendations for prompt hash:', promptHash);

      // The stored `recommendations` column may be a JSON string, a Buffer,
      // or (in some edge cases) a string like "[object Object]". Be defensive
      // when parsing so we don't throw while trying to return cached results.
      const raw = cachedRecommendations[0].recommendations;
      let parsed = null;

      try {
        if (typeof raw === 'string') {
          parsed = JSON.parse(raw);
        } else if (raw && typeof raw === 'object' && raw.toString && raw.toString() === '[object Object]') {
          // Some MySQL drivers may coerce objects into a string like '[object Object]'.
          // In that case, fall back to the stored user_prompt or return an empty list.
          parsed = null;
        } else if (Buffer && Buffer.isBuffer(raw)) {
          parsed = JSON.parse(raw.toString());
        } else {
          // Already an object
          parsed = raw;
        }
      } catch (parseErr) {
        console.warn('Cached recommendations parse warning:', parseErr && parseErr.message);
        parsed = null;
      }

      // `parsed` may be the full response object (with a `recommendations` field),
      // or it may directly be an array of recommendations. Normalize to an array.
      let recommendations = [];
      if (parsed) {
        if (Array.isArray(parsed)) recommendations = parsed;
        else if (Array.isArray(parsed.recommendations)) recommendations = parsed.recommendations;
        else if (Array.isArray(parsed.data)) recommendations = parsed.data;
      }

      // As a final fallback, attempt to use the raw value if it already looks like JSON-ish
      if (recommendations.length === 0) {
        // If raw is an object with a nested recommendations property, use that
        if (raw && typeof raw === 'object' && Array.isArray(raw.recommendations)) {
          recommendations = raw.recommendations;
        }
      }

      return res.json({
        source: 'cache',
        recommendations: recommendations,
        originalPrompt: cachedRecommendations[0].user_prompt || (parsed && parsed.originalPrompt) || ''
      });
    }

    // Generate AI recommendations using Groq
    console.log('Generating new AI recommendations for prompt:', prompt);
    const aiResponse = await generateAIRecommendations(prompt);
    
    if (!aiResponse.success) {
      return res.status(500).json({ 
        error: aiResponse.error,
        details: aiResponse.details 
      });
    }

    // Get movie details for the recommended titles
    const detailedRecommendations = await getMovieDetailsForRecommendations(aiResponse.movieTitles);

    const response = {
      source: 'ai',
      explanation: aiResponse.explanation,
      recommendations: detailedRecommendations,
      originalPrompt: prompt
    };

    // Cache the recommendations (expire in 24 hours)
    try {
      await pool.execute(
        `INSERT INTO ai_recommendations_cache (prompt_hash, user_prompt, recommendations, expires_at) 
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        [promptHash, prompt, JSON.stringify(response)]
      );
      console.log('Cached recommendations for prompt hash:', promptHash);
    } catch (cacheError) {
      console.error('Cache error:', cacheError);
    }

    // Save to search history if user is logged in
    if (userId) {
      try {
        await pool.execute(
          'INSERT INTO search_history (user_id, search_query, search_type) VALUES (?, ?, ?)',
          [userId, prompt, 'ai_prompt']
        );
      } catch (historyError) {
        console.error('Search history error:', historyError);
      }
    }

    res.json(response);

  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({ error: 'Error generating AI recommendations' });
  }
});

// Generate recommendations based on user's favorites
router.get('/based-on-favorites/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    // Get user's favorite movies
    const [favorites] = await pool.execute(
      `SELECT mc.* FROM user_favorites uf 
       JOIN movies_cache mc ON uf.imdb_id = mc.imdb_id 
       WHERE uf.user_id = ? 
       ORDER BY uf.added_at DESC LIMIT 5`,
      [userId]
    );

    if (favorites.length === 0) {
      return res.json({
        recommendations: [],
        message: 'Add some favorite movies to get personalized recommendations!'
      });
    }

    // Create a prompt based on user's favorites
    const favoriteGenres = [...new Set(favorites.map(f => f.genre).filter(g => g))];
    const favoriteMovies = favorites.map(f => f.title).join(', ');

    const prompt = `Based on someone who likes these movies: ${favoriteMovies}. 
                   The genres they enjoy are: ${favoriteGenres.join(', ')}. 
                   Recommend 5 similar movies they would enjoy.`;

    // Use AI to generate recommendations
    const aiResponse = await generateAIRecommendations(prompt);
    
    if (!aiResponse.success) {
      return res.status(500).json({ 
        error: aiResponse.error,
        details: aiResponse.details 
      });
    }

    const detailedRecommendations = await getMovieDetailsForRecommendations(aiResponse.movieTitles);

    res.json({
      source: 'favorites',
      basedOn: favorites.map(f => ({ title: f.title, genre: f.genre })),
      recommendations: detailedRecommendations,
      explanation: aiResponse.explanation
    });

  } catch (error) {
    console.error('Favorites-based recommendations error:', error);
    res.status(500).json({ error: 'Error generating recommendations based on favorites' });
  }
});

// Get trending recommendations
router.get('/trending', async (req, res) => {
  try {
    const [trendingMovies] = await pool.execute(
      `SELECT * FROM movies_cache 
       WHERE imdb_rating >= 7.0 AND year >= 2020 
       ORDER BY imdb_rating DESC, year DESC 
       LIMIT 10`
    );

    res.json({
      source: 'trending',
      recommendations: trendingMovies,
      explanation: 'Highly rated recent movies'
    });

  } catch (error) {
    console.error('Trending recommendations error:', error);
    res.status(500).json({ error: 'Error fetching trending recommendations' });
  }
});

// Get genre-based recommendations
router.get('/genre/:genre', async (req, res) => {
  try {
    const { genre } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const [genreMovies] = await pool.execute(
      `SELECT * FROM movies_cache 
       WHERE genre LIKE ? AND imdb_rating >= 6.0
       ORDER BY imdb_rating DESC 
       LIMIT ?`,
      [`%${genre}%`, limit]
    );

    res.json({
      source: 'genre',
      genre: genre,
      recommendations: genreMovies,
      explanation: `Top-rated ${genre} movies`
    });

  } catch (error) {
    console.error('Genre recommendations error:', error);
    res.status(500).json({ error: 'Error fetching genre recommendations' });
  }
});

// Test Groq API connection
router.get('/test-groq', async (req, res) => {
  try {
    const result = await testGroqConnection();
    res.json({ 
      success: result.success,
      message: result.message,
      details: result.details 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Test failed',
      error: error.message 
    });
  }
});

// Clear AI recommendations cache
router.delete('/cache', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM ai_recommendations_cache WHERE expires_at <= NOW()'
    );
    
    res.json({
      message: 'Cache cleared successfully',
      deletedRows: result.affectedRows
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Error clearing cache' });
  }
});

// Helper function to generate AI recommendations using Groq
async function generateAIRecommendations(prompt) {
  try {
    // Verify API key exists
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not found in environment variables');
    }

    const systemPrompt = `You are a movie recommendation expert. Based on the user's request, recommend exactly 5 movies that match their criteria.

Your response must be valid JSON with this exact structure:
{
  "explanation": "Brief explanation of why these movies were chosen",
  "movies": [
    {"title": "Movie Title 1", "year": 2020, "reason": "Why this movie fits"},
    {"title": "Movie Title 2", "year": 2019, "reason": "Why this movie fits"},
    {"title": "Movie Title 3", "year": 2018, "reason": "Why this movie fits"},
    {"title": "Movie Title 4", "year": 2017, "reason": "Why this movie fits"},
    {"title": "Movie Title 5", "year": 2016, "reason": "Why this movie fits"}
  ]
}

Important rules:
- Only recommend real, well-known movies
- Include the release year if known
- Focus on movies that are widely available
- Give brief reasons for each recommendation
- Must return exactly 5 movies
- Response must be valid JSON only, no extra text`;

    const requestData = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
              model: 'llama-3.1-8b-instant', // Updated to current model
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    };

    console.log('Making Groq API request:', {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: requestData.model,
      promptLength: prompt.length,
      hasApiKey: !!process.env.GROQ_API_KEY
    });

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const aiContent = response.data.choices[0].message.content;
    console.log('Raw Groq API response:', aiContent);
    
    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Attempting text extraction from:', aiContent);
      
      // Fallback: try to extract movie titles from the text
      const movieTitles = extractMovieTitlesFromText(aiContent);
      if (movieTitles.length === 0) {
        throw new Error('Could not extract movie titles from AI response');
      }
      
      parsedResponse = {
        explanation: "AI-generated recommendations based on your request.",
        movies: movieTitles.map(title => ({ 
          title, 
          year: null, 
          reason: "Recommended by AI" 
        }))
      };
    }

    // Validate the response structure
    if (!parsedResponse.movies || !Array.isArray(parsedResponse.movies)) {
      throw new Error('Invalid response format from AI');
    }

    if (parsedResponse.movies.length === 0) {
      throw new Error('No movie recommendations returned from AI');
    }

    return {
      success: true,
      explanation: parsedResponse.explanation || "AI-generated recommendations",
      movieTitles: parsedResponse.movies.map(m => ({
        title: m.title || 'Unknown Title',
        year: m.year,
        reason: m.reason || "Recommended by AI"
      }))
    };

  } catch (error) {
    console.error('Groq API error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });

    // Return specific error information
    let errorMessage = 'Error generating AI recommendations';
    let details = error.message;
    
    if (error.response) {
      switch (error.response.status) {
        case 400:
          errorMessage = 'Invalid request format or parameters';
          details = error.response.data?.error?.message || 'Bad request to AI service';
          break;
        case 401:
          errorMessage = 'Authentication failed';
          details = 'Invalid or expired API key';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded';
          details = 'Too many requests. Please try again later.';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = 'AI service unavailable';
          details = 'The AI service is temporarily down. Please try again later.';
          break;
        default:
          details = error.response.data?.error?.message || error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
      details: details
    };
  }
}

// Improved helper function to extract movie titles from text
function extractMovieTitlesFromText(text) {
  console.log('Extracting titles from text:', text.substring(0, 200) + '...');
  
  const titles = [];
  
  // Multiple patterns to extract movie titles
  const patterns = [
    /"([^"]+)"/g, // Quoted titles
    /\d+\.\s*([^\n\r]+)/g, // Numbered list items
    /[-*•]\s*([^\n\r]+)/g, // Bullet points
    /Title:\s*([^\n\r]+)/gi, // "Title: Movie Name"
    /Movie:\s*([^\n\r]+)/gi, // "Movie: Movie Name"
    /(\b[A-Z][a-zA-Z\s]+\(\d{4}\))/g, // "Movie Title (Year)"
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      let title = match[1].trim();
      
      // Clean up the title
      title = title.replace(/^\d+\.\s*/, ''); // Remove numbering
      title = title.replace(/\(\d{4}\)/, '').trim(); // Remove year in parentheses
      title = title.replace(/^(Title|Movie):\s*/gi, ''); // Remove prefixes
      title = title.replace(/[^\w\s\-:!?&.,]/g, '').trim(); // Clean special chars
      
      // Validate title
      if (title.length > 2 && title.length < 100 && !titles.includes(title)) {
        titles.push(title);
      }
    }
    
    if (titles.length >= 5) break;
  }

  // If no titles found, try a more aggressive approach
  if (titles.length === 0) {
    const lines = text.split(/\n|\r\n/).filter(line => line.trim().length > 0);
    for (const line of lines) {
      const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/^[-*•]\s*/, '').trim();
      if (cleanLine.length > 2 && cleanLine.length < 100) {
        titles.push(cleanLine);
      }
      if (titles.length >= 5) break;
    }
  }

  console.log('Extracted titles:', titles);
  return titles.slice(0, 5);
}

// Helper function to get detailed movie information for recommendations
async function getMovieDetailsForRecommendations(movieTitles) {
  const detailedMovies = [];
  console.log('Fetching details for movies:', movieTitles.map(m => m.title));

  for (const movieData of movieTitles) {
    try {
      // First check cache
      const [cachedMovie] = await pool.execute(
        'SELECT * FROM movies_cache WHERE title LIKE ? ORDER BY imdb_rating DESC LIMIT 1',
        [`%${movieData.title}%`]
      );

      if (cachedMovie.length > 0) {
        console.log(`Found cached movie: ${movieData.title}`);
        detailedMovies.push({
          ...cachedMovie[0],
          ai_reason: movieData.reason
        });
        continue;
      }

      // If not in cache, fetch from OMDb API
      if (!process.env.OMDB_API_KEY) {
        console.warn('OMDB_API_KEY not found, skipping external fetch for:', movieData.title);
        // Add basic movie info without external API
        detailedMovies.push({
          title: movieData.title,
          year: movieData.year,
          ai_reason: movieData.reason,
          plot: 'Plot information unavailable',
          poster_url: null,
          genre: 'Unknown',
          director: 'Unknown',
          actors: 'Unknown',
          imdb_rating: null
        });
        continue;
      }

      console.log(`Fetching from OMDb: ${movieData.title}`);
      const omdbResponse = await axios.get(`http://www.omdbapi.com/`, {
        params: {
          apikey: process.env.OMDB_API_KEY,
          t: movieData.title,
          y: movieData.year,
          type: 'movie'
        },
        timeout: 10000
      });

      if (omdbResponse.data.Response === 'True') {
        const movieDetails = formatMovieData(omdbResponse.data);
        movieDetails.ai_reason = movieData.reason;
        
        // Cache the movie
        await cacheMovie(movieDetails);
        detailedMovies.push(movieDetails);
        console.log(`Successfully fetched and cached: ${movieData.title}`);
      } else {
        console.log(`Movie not found in OMDb: ${movieData.title}`);
        // Add basic info even if not found in OMDb
        detailedMovies.push({
          title: movieData.title,
          year: movieData.year,
          ai_reason: movieData.reason,
          plot: 'Movie details not available',
          poster_url: null,
          genre: 'Unknown',
          director: 'Unknown',
          actors: 'Unknown',
          imdb_rating: null,
          error: 'Details not found'
        });
      }

    } catch (error) {
      console.error(`Error fetching details for ${movieData.title}:`, error.message);
      // Add movie with error info
      detailedMovies.push({
        title: movieData.title,
        year: movieData.year,
        ai_reason: movieData.reason,
        plot: 'Error fetching movie details',
        poster_url: null,
        genre: 'Unknown',
        director: 'Unknown',
        actors: 'Unknown',
        imdb_rating: null,
        error: 'Fetch failed'
      });
    }
  }

  return detailedMovies;
}

// Test Groq API connection
async function testGroqConnection() {
  try {
    if (!process.env.GROQ_API_KEY) {
      return {
        success: false,
        message: 'GROQ_API_KEY not found in environment variables',
        details: 'Please set GROQ_API_KEY in your .env file'
      };
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        messages: [{ role: 'user', content: 'Hello, respond with just "Connection successful"' }],
        model: 'llama3-8b-8192',
        max_tokens: 50,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    return {
      success: true,
      message: 'Groq API connection successful',
      details: {
        model: 'llama3-8b-8192',
        response: response.data.choices[0].message.content
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Groq API connection failed',
      details: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.response?.data?.error || error.message,
        url: error.config?.url
      }
    };
  }
}

// Format movie data from OMDb API
function formatMovieData(omdbData) {
  return {
    imdb_id: omdbData.imdbID,
    title: omdbData.Title,
    year: parseInt(omdbData.Year) || null,
    genre: omdbData.Genre || 'Unknown',
    director: omdbData.Director || 'Unknown',
    actors: omdbData.Actors || 'Unknown',
    plot: omdbData.Plot || 'Plot not available',
    poster_url: omdbData.Poster !== 'N/A' ? omdbData.Poster : null,
    imdb_rating: parseFloat(omdbData.imdbRating) || null,
    runtime: omdbData.Runtime || 'Unknown',
    language: omdbData.Language || 'Unknown',
    country: omdbData.Country || 'Unknown',
    rated: omdbData.Rated || 'Unknown',
    released: omdbData.Released || 'Unknown',
    awards: omdbData.Awards || 'Unknown'
  };
}

// Cache movie data
async function cacheMovie(movieData) {
  try {
    // Insert only the columns that exist in the current movies_cache schema.
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
    console.log(`Cached movie: ${movieData.title}`);
  } catch (error) {
    console.error('Cache movie error:', error);
  }
}

// Get user's search history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const [history] = await pool.execute(
      `SELECT search_query, search_type, created_at 
       FROM search_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    res.json({
      history: history
    });

  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({ error: 'Error fetching search history' });
  }
});

// Delete user's search history
router.delete('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM search_history WHERE user_id = ?',
      [userId]
    );

    res.json({
      message: 'Search history cleared successfully',
      deletedRows: result.affectedRows
    });

  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Error clearing search history' });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Recommendations router error:', error);
  res.status(500).json({
    error: 'Internal server error in recommendations',
    message: error.message
  });
});

module.exports = router;