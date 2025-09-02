// CineAI - AI-Powered Movie Recommendation App
// This is the main App component structure

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');

  // Check for existing auth token on app load
  useEffect(() => {
    const token = localStorage.getItem('cineai_token');
    if (token) {
      // Verify token with backend
      fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('cineai_token');
        }
      })
      .catch(() => {
        localStorage.removeItem('cineai_token');
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('cineai_token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cineai_token');
    setCurrentPage('home');
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <h2>🎬 Loading CineAI...</h2>
      </div>
    );
  }

  return (
    <div className="App">
      <Navbar 
        user={user} 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        logout={logout} 
      />
      
      <main className="main-content">
        {currentPage === 'home' && <Home setCurrentPage={setCurrentPage} />}
        {currentPage === 'login' && !user && <Login login={login} setCurrentPage={setCurrentPage} />}
        {currentPage === 'register' && !user && <Register login={login} setCurrentPage={setCurrentPage} />}
        {currentPage === 'search' && <Search />}
        {currentPage === 'favorites' && user && <Favorites user={user} />}
        {currentPage === 'recommendations' && user && <Recommendations user={user} />}
        
        {/* Redirect to login if trying to access protected pages */}
        {(currentPage === 'favorites' || currentPage === 'recommendations') && !user && (
          <div className="auth-required">
            <h2>Login Required</h2>
            <p>Please log in to access this feature.</p>
            <button onClick={() => setCurrentPage('login')} className="btn-primary">
              Go to Login
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Navbar Component
function Navbar({ user, currentPage, setCurrentPage, logout }) {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo" onClick={() => setCurrentPage('home')}>
          <h1>🎬 CineAI</h1>
        </div>
        
        <div className="nav-links">
          <button 
            className={currentPage === 'home' ? 'active' : ''}
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          <button 
            className={currentPage === 'search' ? 'active' : ''}
            onClick={() => setCurrentPage('search')}
          >
            Search
          </button>
          
          {user ? (
            <>
              <button 
                className={currentPage === 'recommendations' ? 'active' : ''}
                onClick={() => setCurrentPage('recommendations')}
              >
                AI Recommendations
              </button>
              <button 
                className={currentPage === 'favorites' ? 'active' : ''}
                onClick={() => setCurrentPage('favorites')}
              >
                Favorites
              </button>
              <div className="user-menu">
                <span>Hello, {user.username}!</span>
                <button onClick={logout} className="logout-btn">Logout</button>
              </div>
            </>
          ) : (
            <>
              <button 
                className={currentPage === 'login' ? 'active' : ''}
                onClick={() => setCurrentPage('login')}
              >
                Login
              </button>
              <button 
                className={currentPage === 'register' ? 'active' : ''}
                onClick={() => setCurrentPage('register')}
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// Home Page Component
function Home({ setCurrentPage }) {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/movies/trending')
      .then(res => res.json())
      .then(data => {
        setTrendingMovies(data.movies || []);
      })
      .catch(err => console.error('Error fetching trending movies:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>🎬 Welcome to CineAI</h1>
          <p>Discover your next favorite movie with AI-powered recommendations</p>
          <div className="hero-buttons">
            <button 
              className="btn-primary" 
              onClick={() => setCurrentPage('search')}
            >
              Search Movies
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => setCurrentPage('recommendations')}
            >
              Get AI Recommendations
            </button>
          </div>
        </div>
      </section>

      <section className="trending-section">
        <h2>🔥 Trending Movies</h2>
        {loading ? (
          <div className="loading">Loading trending movies...</div>
        ) : (
          <div className="movies-grid">
            {trendingMovies.slice(0, 8).map(movie => (
              <MovieCard key={movie.imdb_id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Search Page Component
function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/movies/search?title=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setMovies(data.movies || []);
      setSearched(true);
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="search">
      <div className="search-container">
        <h1>🔍 Search Movies</h1>
        
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Enter movie title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>

        {loading && <div className="loading">Searching...</div>}
        
        {searched && !loading && (
          <div className="search-results">
            {movies.length > 0 ? (
              <>
                <h2>Search Results ({movies.length})</h2>
                <div className="movies-grid">
                  {movies.map(movie => (
                    <MovieCard key={movie.imdb_id} movie={movie} />
                  ))}
                </div>
              </>
            ) : (
              <div className="no-results">
                <h3>No movies found</h3>
                <p>Try searching with a different title</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Login Component
function Login({ login, setCurrentPage }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        login(data.user, data.token);
        setCurrentPage('home');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Login to CineAI</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <p>
          Don't have an account?{' '}
          <button onClick={() => setCurrentPage('register')} className="link-btn">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

// Register Component  
function Register({ login, setCurrentPage }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        login(data.user, data.token);
        setCurrentPage('home');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Register for CineAI</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            required
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        
        <p>
          Already have an account?{' '}
          <button onClick={() => setCurrentPage('login')} className="link-btn">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}

// Favorites Component
function Favorites({ user }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const token = localStorage.getItem('cineai_token');
        const response = await fetch('http://localhost:5000/api/favorites', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setFavorites(data.favorites || []);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
      setLoading(false);
    };

    fetchFavorites();
  }, []);

  const removeFavorite = async (imdbId) => {
    try {
      const token = localStorage.getItem('cineai_token');
      const response = await fetch('http://localhost:5000/api/favorites/remove', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imdbId })
      });

      if (response.ok) {
        setFavorites(favorites.filter(movie => movie.imdb_id !== imdbId));
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) return <div className="loading">Loading favorites...</div>;

  return (
    <div className="favorites">
      <h1>❤️ Your Favorite Movies</h1>
      
      {favorites.length > 0 ? (
        <div className="movies-grid">
          {favorites.map(movie => (
            <MovieCard 
              key={movie.imdb_id} 
              movie={movie} 
              showRemoveFavorite={true}
              onRemoveFavorite={() => removeFavorite(movie.imdb_id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No favorite movies yet</h3>
          <p>Start adding movies to your favorites to see them here!</p>
        </div>
      )}
    </div>
  );
}

// Recommendations Component
function Recommendations({ user }) {
  const [prompt, setPrompt] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');

  const handleAIRecommendation = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('cineai_token');
      const response = await fetch('http://localhost:5000/api/recommendations/ai', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          userId: user.id
        })
      });

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setExplanation(data.explanation || '');
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
    }
    setLoading(false);
  };

  return (
    <div className="recommendations">
      <h1>🤖 AI Movie Recommendations</h1>
      
      <div className="recommendation-form">
        <form onSubmit={handleAIRecommendation}>
          <textarea
            placeholder="Tell me what kind of movie you're in the mood for... 
            
Examples:
• 'I want a dark thriller with a plot twist'
• 'Suggest me romantic comedies from the 90s'
• 'I'm looking for sci-fi movies like Blade Runner'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows="4"
            className="prompt-input"
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '🤔 Thinking...' : '✨ Get Recommendations'}
          </button>
        </form>
      </div>

      {explanation && (
        <div className="ai-explanation">
          <h3>🎯 Why these recommendations?</h3>
          <p>{explanation}</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="recommendations-results">
          <h2>Recommended Movies</h2>
          <div className="movies-grid">
            {recommendations.map(movie => (
              <MovieCard 
                key={movie.imdb_id} 
                movie={movie} 
                showAIReason={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Movie Card Component
function MovieCard({ movie, showRemoveFavorite, onRemoveFavorite, showAIReason }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const token = localStorage.getItem('cineai_token');
      if (!token) return;

      try {
        const response = await fetch(`http://localhost:5000/api/favorites/check/${movie.imdb_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setIsFavorite(data.isFavorite);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [movie.imdb_id]);

  const toggleFavorite = async () => {
    const token = localStorage.getItem('cineai_token');
    if (!token) return;

    setFavoriteLoading(true);
    try {
      const endpoint = isFavorite ? '/api/favorites/remove' : '/api/favorites/add';
      const method = isFavorite ? 'DELETE' : 'POST';

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imdbId: movie.imdb_id })
      });

      if (response.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
    setFavoriteLoading(false);
  };

  return (
    <div className="movie-card">
      <div className="movie-poster">
        {movie.poster_url && movie.poster_url !== 'N/A' ? (
          <img src={movie.poster_url} alt={movie.title} />
        ) : (
          <div className="no-poster">🎬</div>
        )}
      </div>
      
      <div className="movie-info">
        <h3>{movie.title}</h3>
        <p className="movie-year">{movie.year}</p>
        <p className="movie-genre">{movie.genre}</p>
        
        {movie.imdb_rating && (
          <div className="movie-rating">
            ⭐ {movie.imdb_rating}/10
          </div>
        )}
        
        {showAIReason && movie.ai_reason && (
          <div className="ai-reason">
            <strong>AI Says:</strong> {movie.ai_reason}
          </div>
        )}
        
        <div className="movie-actions">
          {showRemoveFavorite ? (
            <button onClick={onRemoveFavorite} className="btn-danger">
              Remove from Favorites
            </button>
          ) : (
            <button
              onClick={toggleFavorite}
              disabled={favoriteLoading}
              className={isFavorite ? 'btn-favorite active' : 'btn-favorite'}
            >
              {favoriteLoading ? '...' : isFavorite ? '❤️ Favorited' : '🤍 Add to Favorites'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import './App.css';

export default App;