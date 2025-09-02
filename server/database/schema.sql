-- database/schema.sql
-- Create CineAI Database
CREATE DATABASE IF NOT EXISTS cineai;
USE cineai;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Movies Cache Table (to store frequently accessed movie data)
CREATE TABLE movies_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    imdb_id VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    year INT,
    genre VARCHAR(255),
    director VARCHAR(255),
    actors TEXT,
    plot TEXT,
    poster_url VARCHAR(500),
    imdb_rating DECIMAL(3,1),
    runtime VARCHAR(20),
    language VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_imdb_id (imdb_id),
    INDEX idx_genre (genre),
    INDEX idx_year (year)
);

-- User Favorites Table
CREATE TABLE user_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    imdb_id VARCHAR(20) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_movie (user_id, imdb_id),
    INDEX idx_user_id (user_id),
    INDEX idx_imdb_id (imdb_id)
);

-- User Search History (optional - for better recommendations)
CREATE TABLE search_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    search_query VARCHAR(500),
    search_type ENUM('title', 'ai_prompt', 'genre_filter') DEFAULT 'title',
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_searched_at (searched_at)
);

-- AI Recommendations Cache (to avoid repeated API calls)
CREATE TABLE ai_recommendations_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_hash VARCHAR(64) UNIQUE NOT NULL,
    user_prompt TEXT NOT NULL,
    recommendations JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX idx_prompt_hash (prompt_hash),
    INDEX idx_expires_at (expires_at)
);