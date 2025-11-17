// CineAI - AI-Powered Movie Recommendation App
// This is the main App component structure

import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  // movie details modal state
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const openMovieDetails = async (imdbId) => {
    if (!imdbId) return;
    setDetailsLoading(true);
    setShowDetailsModal(true);
    try {
      const resp = await fetch(`http://localhost:5000/api/movies/details/${imdbId}`);
      const data = await resp.json();
      if (resp.ok && data.movie) {
        setSelectedMovie(data.movie);
      } else {
        setSelectedMovie({ error: data.error || 'Details not found' });
      }
    } catch (err) {
      console.error('Error loading movie details:', err);
      setSelectedMovie({ error: 'Network error' });
    }
    setDetailsLoading(false);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedMovie(null);
  };

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

  // Listen for footer navigation events and update currentPage
  useEffect(() => {
    const handler = (e) => {
      const page = e?.detail;
      if (typeof page === 'string') {
        setCurrentPage(page);
        // bring new page into view
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (err) {}
      }
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
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
        {currentPage === 'home' && <Home setCurrentPage={setCurrentPage} onOpen={openMovieDetails} />}
        {currentPage === 'login' && !user && <Login login={login} setCurrentPage={setCurrentPage} />}
        {currentPage === 'register' && !user && <Register login={login} setCurrentPage={setCurrentPage} />}
        {currentPage === 'search' && <Search onOpen={openMovieDetails} />}
        {currentPage === 'favorites' && user && <Favorites user={user} onOpen={openMovieDetails} />}
        {currentPage === 'recommendations' && user && <Recommendations user={user} onOpen={openMovieDetails} />}
        {currentPage === 'about' && <About />}
        {currentPage === 'profile' && user && <Profile user={user} logout={logout} setUser={setUser} />}

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
      {/* Movie details modal */}
      <MovieDetailsModal visible={showDetailsModal} loading={detailsLoading} movie={selectedMovie} onClose={closeDetailsModal} />
      {/* Footer */}
      <Footer />
    </div>
  );
}

// Navbar Component
function Navbar({ user, currentPage, setCurrentPage, logout }) {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo" onClick={() => setCurrentPage('home')}>
          <img src="/logo192.png" alt="CineAI" className="nav-logo-img" />
          <h1>CineAI</h1>
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

          {user && (
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
            </>
          )}

          <button
            className={currentPage === 'about' ? 'active' : ''}
            onClick={() => setCurrentPage('about')}
          >
            About
          </button>

          {user ? (
            <>
              <button
                className={currentPage === 'profile' ? 'active' : ''}
                onClick={() => setCurrentPage('profile')}
              >
                Profile
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
function Home({ setCurrentPage, onOpen }) {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);
  const POLL_MS = 30000; // refresh every 30s

  const fetchTrending = async () => {
    setLoading(true);
    try {
      // request fresh trending from OMDb (bypass DB cache)
      const resp = await fetch('http://localhost:5000/api/movies/trending?force=1');
      const data = await resp.json();
      // sort by imdb_rating descending when available
      const movies = (data.movies || []).slice();
      movies.sort((a, b) => (b.imdb_rating || 0) - (a.imdb_rating || 0));
      setTrendingMovies(movies);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Error fetching trending movies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial fetch and set up polling to keep trending fresh
    fetchTrending();
    pollRef.current = setInterval(fetchTrending, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>🎥 Welcome to CineAI</h1>
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
              <MovieCard key={movie.imdb_id} movie={movie} onOpen={onOpen} />
            ))}
          </div>
        )}
        <div className="trending-meta" style={{ marginTop: '0.6rem', textAlign: 'center' }}>
          <small className="muted">
            {lastUpdated ? `Updated ${Math.round((Date.now() - lastUpdated) / 1000)}s ago` : 'Updated just now'}
          </small>
          <div style={{ marginTop: '0.4rem' }}>
            <button className="btn-secondary" onClick={fetchTrending} disabled={loading}>Refresh Trending</button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Search Page Component
function Search({ onOpen }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // debounce timer holder (kept across renders)
  const suggestTimeoutRef = React.useRef(null);
  // cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    };
  }, []);

  // debug: log suggestions changes (remove or silence in production)
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('search suggestions updated:', suggestions.length);
  }, [suggestions]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/movies/search?title=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      // sort search results by imdb_rating desc when available
      const results = (data.movies || []).slice();
      results.sort((a, b) => (b.imdb_rating || 0) - (a.imdb_rating || 0));
      setMovies(results);
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

        <form onSubmit={handleSearch} className="search-form" autoComplete="off">
          <div className="search-input-wrapper">
            <div className="input-group">
              <input
                type="text"
                name="title"
                placeholder="Enter movie title..."
                value={searchQuery}
                onChange={(e) => {
                  // handle debounced suggestion fetch
                  const value = e.target.value;
                  setSearchQuery(value);
                  setSearched(false);

                  if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);

                  if (!value.trim()) {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    return;
                  }

                  suggestTimeoutRef.current = setTimeout(async () => {
                    try {
                      const resp = await fetch(`http://localhost:5000/api/movies/search?title=${encodeURIComponent(value)}`);
                      if (resp.ok) {
                        const data = await resp.json();
                            // sort suggestions by imdb_rating desc when available
                            const suggs = (data.movies || []).slice();
                            suggs.sort((a, b) => (b.imdb_rating || 0) - (a.imdb_rating || 0));
                            setSuggestions(suggs.slice(0, 6));
                        setShowSuggestions(true);
                      } else {
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }
                    } catch (err) {
                      console.error('Suggestion fetch error:', err);
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }, 300);
                }}
                onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="search-input"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="suggestions-list">
                  {suggestions.map((sugg) => (
                    <li
                      key={sugg.imdb_id}
                      className="suggestion-item"
                      onMouseDown={() => {
                        setSearchQuery(sugg.title);
                        setShowSuggestions(false);
                        setSuggestions([]);
                        setTimeout(() => document.querySelector('.search-form button[type="submit"]')?.click(), 0);
                      }}
                    >
                      <span className="suggestion-title">{sugg.title}</span>
                      <span className="suggestion-badge">system</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="btn-primary">Search</button>
          </div>
        </form>

        {loading && <div className="loading">Searching...</div>}

        {searched && !loading && (
          <div className="search-results">
            {movies.length > 0 ? (
              <>
                <h2>Search Results ({movies.length})</h2>
                <div className="movies-grid">
                  {movies.map(movie => (
                    <MovieCard key={movie.imdb_id} movie={movie} onOpen={onOpen} />
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

// About Page Component
function About() {
  return (
    <div className="about-page">
      {/* HERO SECTION */}
      <div className="about-hero">
        <img src="/logo512.png" alt="CineAI" className="about-hero-logo" />

        <div className="about-hero-text">
          <h1>About CineAI</h1>
          <p className="tagline">
            Smarter movie discovery powered by Artificial Intelligence.
          </p>
        </div>
      </div>

      <div className="about-card">

        {/* WHAT WE DO */}
        <div className="about-content">
          <h3>What We Do</h3>
          <p>
            CineAI is an AI-driven movie discovery platform designed to help you
            explore films in a smarter, faster, and more personalized way.
            By combining intelligent algorithms, cached datasets, and the OMDb API,
            CineAI delivers instant search results, curated recommendations, and deeper
            insights — all within a clean and modern interface.
          </p>
        </div>

        {/* MISSION */}
        <div className="about-content">
          <h3>Our Mission</h3>
          <p>
            Our mission is simple: make movie discovery effortless and meaningful.
            We believe that finding the right film shouldn’t feel overwhelming.
            CineAI uses intelligent systems to guide your journey, helping you
            spend less time searching and more time enjoying unforgettable stories.
          </p>
        </div>

        {/* WHY CINEAI */}
        <div className="about-content">
          <h3>Why CineAI?</h3>
          <p>
            Unlike traditional movie search tools, CineAI blends AI-driven insights
            with user-friendly design to create a more intuitive discovery experience.
            Whether you're exploring trending titles, uncovering hidden gems,
            or looking for data-backed suggestions, CineAI adapts to your
            viewing style and personal preference.
          </p>
        </div>

        {/* KEY FEATURES */}
        <div className="about-content">
          <h3>Key Features</h3>
          <ul className="features-list" style={{ marginLeft: '70px' }}>
            <li><strong>🔍 Smart Search:</strong> Fast, cached search results with accurate movie details.</li>
            <li><strong>🎯 Intelligent Recommendations:</strong> Suggested movies based on genres, ratings, and user behavior.</li>
            <li><strong>📊 Movie Insights:</strong> Ratings, reviews, and summaries presented in a clean, readable format.</li>
            <li><strong>⚡ Optimized Performance:</strong> Caching ensures instant loading and smooth navigation.</li>
            <li><strong>🌐 Powered by OMDb API:</strong> Access rich movie metadata from a trusted source.</li>
            <li><strong>🎥 Modern UI:</strong> Designed for simplicity, speed, and a delightful user experience.</li>
          </ul>
        </div>

        {/* HOW IT WORKS */}
        <div className="about-content">
          <h3>How CineAI Works</h3>
          <p>
            CineAI combines multiple layers of technology to deliver a seamless
            movie discovery experience:
          </p>
          <ul style={{ marginLeft: '70px' }}>
            <li><strong>Data Layer:</strong> Cached movie datasets + OMDb API for real-time information.</li>
            <li><strong>AI Layer:</strong> Intelligent sorting and recommendation logic for relevant results.</li>
            <li><strong>UI Layer:</strong> A clean, intuitive design focused on accessibility and usability.</li>
            <li><strong>Performance Layer:</strong> Optimized caching reduces API calls and speeds up responses.</li>
          </ul>
        </div>

        {/* TECHNOLOGY STACK */}
        <div className="about-content">
          <h3>Technology Behind CineAI</h3>
          <p>
            CineAI is built using a combination of modern web technologies and
            lightweight AI logic:
          </p>
          <ul style={{ marginLeft: '70px' }}>
            <li><strong>React JS</strong> for a fast and interactive user interface.</li>
            <li><strong>Node.js / Web APIs</strong> for handling external data and backend logic.</li>
            <li><strong>Custom AI Recommendation Logic</strong> powered by similarity matching and heuristics.</li>
            <li><strong>Caching Mechanisms</strong> for efficient performance and reduced load time.</li>
            <li><strong>OMDb API</strong> as the trusted movie data source.</li>
          </ul>
        </div>

        {/* VISION */}
        <div className="about-content">
          <h3>Our Vision</h3>
          <p>
            Beyond simple movie browsing, CineAI aims to evolve into a full-fledged
            AI assistant for entertainment discovery — understanding moods,
            preferences, and viewing patterns to provide highly personalized
            recommendations through advanced AI.
          </p>
        </div>

        {/* FUTURE ENHANCEMENTS */}
        <div className="about-content">
          <h3>Future Enhancements</h3>
          <ul style={{ marginLeft: '70px' }}>
            <li>🎞️ Deep-learning powered recommendation engine</li>
            <li>🗣️ Sentiment analysis of user reviews</li>
            <li>👤 User login & personalized watchlists</li>
            <li>🔔 Daily personalized movie suggestions</li>
            <li>📱 Dedicated mobile app version of CineAI</li>
          </ul>
        </div>
      </div>
    </div>
  );
}



// Profile Page Component
function Profile({ user, logout, setUser }) {
  // local state for profile data (will be loaded from API)
  const [userData, setUserData] = useState(user || null);
  const [loading, setLoading] = useState(false);

  // derived safe fallbacks
  const username = userData?.username || 'User';
  const email = userData?.email || 'Not provided';
  const createdAt = userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A';
  const watchlist = userData?.watchlist || ['Inception', 'The Matrix', 'Interstellar'];
  const recentViews = userData?.recentViews || ['Oppenheimer', 'Dune Part Two'];
  const stats = userData?.stats || { moviesViewed: 42, moviesSearched: 120, recommendationsTaken: 18 };
  const membership = userData?.membership || 'Basic';

  // Fetch fresh profile data from API on mount
  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('cineai_token');
        if (!token) return;
        const resp = await fetch('http://localhost:5000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
          console.error('Failed to fetch profile');
          return;
        }
        const data = await resp.json();
        if (mounted && data.user) {
          setUserData(data.user);
          // update parent app state as well
          if (setUser) setUser(data.user);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [setUser]);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ username: userData?.username || user?.username || '', email: userData?.email || user?.email || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const startEdit = () => {
    setForm({ username: userData?.username || user?.username || '', email: userData?.email || user?.email || '' });
    setError('');
    setSuccess('');
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setError('');
    setSuccess('');
  };

  const saveProfile = async () => {
    setError('');
    setSuccess('');
    if (!form.username.trim() || !form.email.trim()) {
      setError('Username and email are required.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('cineai_token');
      const resp = await fetch('http://localhost:5000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: form.username.trim(), email: form.email.trim() })
      });

      const data = await resp.json();
      if (resp.ok) {
        // update local app state and local profile copy
        setUser(data.user);
        setUserData(data.user);
        setSuccess('Profile updated successfully');
        setEditMode(false);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile save error:', err);
      setError('Network error. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="profile-page">

      {loading && (
        <div className="loading-indicator" style={{ textAlign: 'center', padding: '1rem' }}>
          Loading profile...
        </div>
      )}

      {/* HERO SECTION */}
      <div className="profile-hero">
        <div className="profile-hero-left">
          <div className="profile-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="profile-hero-right">
          <h1>{username}</h1>
          <p className="muted">Member since: {createdAt}</p>
          <p className="membership-badge">Membership: {membership}</p>

          {!editMode ? (
            <button className="btn-secondary edit-profile-btn" onClick={startEdit}>
              ✏️ Edit Profile
            </button>
          ) : (
            <div style={{ marginTop: '0.5rem' }}>
              <button className="btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn-secondary" onClick={cancelEdit} style={{ marginLeft: '0.5rem' }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PROFILE CARD */}
      <div className="profile-card">
        <h2>Account Details</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="profile-info">
          {!editMode ? (
            <>
              <p><strong>Username:</strong> {username}</p>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>Membership Tier:</strong> {membership}</p>
            </>
          ) : (
            <div className="profile-edit-form">
              <label>
                Username
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
            </div>
          )}

          <div className="profile-actions">
            <button className="btn-primary" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* PROFILE STATS */}
      <div className="profile-card">
        <h2>Your Stats</h2>
        <ul className="stats-list">
          <li><strong>Movies Viewed:</strong> {stats.moviesViewed}</li>
          <li><strong>Movies Searched:</strong> {stats.moviesSearched}</li>
          <li><strong>Recommendations Taken:</strong> {stats.recommendationsTaken}</li>
        </ul>
      </div>

      {/* WATCHLIST SECTION */}
      <div className="profile-card">
        <h2>Your Watchlist</h2>
        <ul className="watchlist">
          {watchlist.length > 0 ? (
            watchlist.map((movie, index) => <li key={index}>🎬 {movie}</li>)
          ) : (
            <p className="muted">Your watchlist is empty.</p>
          )}
        </ul>
      </div>

      {/* RECENTLY VIEWED */}
      <div className="profile-card">
        <h2>Recently Viewed</h2>
        <ul className="recent-views">
          {recentViews.length > 0 ? (
            recentViews.map((movie, index) => <li key={index}>🔥 {movie}</li>)
          ) : (
            <p className="muted">No recent activity.</p>
          )}
        </ul>
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
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
function Favorites({ user, onOpen }) {
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
              onOpen={onOpen}
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
function Recommendations({ user, onOpen }) {
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
      // sort AI recommendations by imdb_rating desc when present
      const recs = (data.recommendations || []).slice();
      recs.sort((a, b) => (b.imdb_rating || 0) - (a.imdb_rating || 0));
      setRecommendations(recs);
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
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Movie Card Component
function MovieCard({ movie, showRemoveFavorite, onRemoveFavorite, showAIReason, onOpen }) {
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

      <div className="movie-info" onClick={() => onOpen && onOpen(movie.imdb_id)} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
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
            <button onClick={(e) => { e.stopPropagation(); onRemoveFavorite && onRemoveFavorite(); }} className="btn-danger">
              Remove from Favorites
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(); }}
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

// Movie Details Modal (rendered by App via state)
function MovieDetailsModal({ visible, loading, movie, onClose }) {
  if (!visible) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✖</button>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading details...</div>
        ) : movie?.error ? (
          <div style={{ padding: '1.5rem' }}>
            <h3>Unable to load details</h3>
            <p>{movie.error}</p>
          </div>
        ) : (
          <div className="movie-details">
            <div className="movie-details-left">
              {movie?.poster_url ? (
                <img src={movie.poster_url} alt={movie.title} />
              ) : (
                <div className="no-poster">🎬</div>
              )}
            </div>
            <div className="movie-details-right">
              <h2>{movie?.title} <span className="muted">({movie?.year})</span></h2>
              <br></br>
              <p><strong>Runtime:</strong> {movie?.runtime || 'N/A'}</p>
              <p><strong>Genre:</strong> {movie?.genre || 'N/A'}</p>
              <p><strong>Director:</strong> {movie?.director || 'N/A'}</p>
              <p><strong>Actors:</strong> {movie?.actors || 'N/A'}</p>
              <p><strong>Language:</strong> {movie?.language || 'N/A'}</p>
              {movie?.imdb_rating && <p><strong>IMDB Rating:</strong> {movie.imdb_rating}/10</p>}
              <div className="movie-plot">
                <h4>Plot</h4>
                <p>{movie?.plot || 'No synopsis available.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Site Footer
function Footer() {
  const year = 2025;
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-left">
          <img src="/logo192.png" alt="CineAI" className="footer-logo" />
          <div className="footer-brand">CineAI</div>
          <p className="footer-tag">Smarter movie discovery, personalized for you.</p>
        </div>

        <div className="footer-links">
          <div>
            <h4>Product</h4>
            <ul>
              <li><button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'search' }))} className="link-btn">Search</button></li>
              <li><button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'recommendations' }))} className="link-btn">Recommendations</button></li>
              <li><button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'favorites' }))} className="link-btn">Favorites</button></li>
            </ul>
          </div>

          <div>
            <h4>Company</h4>
            <ul>
              <li><button className="link-btn" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'about' }))}>About</button></li>
              <li><button className="link-btn" onClick={() => {/* TODO: wire privacy page */}}>Privacy</button></li>
              <li><button className="link-btn" onClick={() => {/* TODO: wire terms page */}}>Terms</button></li>
            </ul>
          </div>
        </div>

        <div className="footer-right">
          <h4>Contact</h4>
          <p>support@cineai.example</p>
          <p className="copyright">© {year-2} CineAI</p>
        </div>
      </div>
    </footer>
  );
}

export default App;