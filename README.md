# 🎬 CineAI - AI-Powered Movie Recommendation Platform

> Discover your next favorite movie with the power of artificial intelligence

CineAI is a modern web application that combines traditional movie search with intelligent AI recommendations. Simply describe what you're in the mood for - like "a dark thriller with a plot twist" or "feel-good comedy for family night" - and let our AI find the perfect movies for you.

## ✨ Features

### 🤖 AI-Powered Recommendations
- **Natural Language Processing**: Ask in plain English - "I want something like Inception but funnier"
- **Mood-Based Suggestions**: Get recommendations based on your current mood
- **Smart Filtering**: AI understands complex preferences and finds perfect matches

### 🔍 Advanced Movie Search
- **Real-time Search**: Instant results as you type
- **Multiple Filters**: Genre, year, rating, language
- **Detailed Information**: Cast, plot, ratings, and more

### 👤 Personalized Experience
- **User Accounts**: Secure registration and login system
- **Favorites List**: Save movies you want to watch later
- **Persistent Storage**: Your preferences are remembered across sessions

### 📱 Modern Interface
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Beautiful UI**: Clean, modern design with smooth animations
- **Intuitive Navigation**: Easy to use for all age groups

## 🛠️ Tech Stack

### Frontend
- **React.js** - Modern UI library
- **CSS3** - Custom styling with gradients and animations
- **Responsive Design** - Mobile-first approach

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MySQL** - Relational database
- **JWT** - Secure authentication

### APIs & AI
- **Groq API** - Fast AI language model for recommendations
- **OMDb API** - Comprehensive movie database
- **RESTful Architecture** - Clean API design

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- OMDb API Key
- Groq API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/CineAI.git
   cd CineAI
   ```

2. **Set up the Backend**
   ```bash
   cd server
   npm install
   ```

3. **Set up the Frontend**
   ```bash
   cd ../client
   npm install
   ```

4. **Configure Environment Variables**
   
   Create a `.env` file in the `server` folder:
   ```env
   # Server Configuration
   PORT=5000
   
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=cineai
   
   # JWT Secret (generate a random 64-character string)
   JWT_SECRET=your_jwt_secret_here
   
   # API Keys
   OMDB_API_KEY=your_omdb_api_key
   GROQ_API_KEY=your_groq_api_key
   ```

5. **Set up MySQL Database**
   
   Create the database and run the schema:
   ```sql
   CREATE DATABASE cineai;
   USE cineai;
   
   -- Users table
   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(50) UNIQUE NOT NULL,
     email VARCHAR(100) UNIQUE NOT NULL,
     password VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Favorites table
   CREATE TABLE favorites (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     movie_id VARCHAR(20) NOT NULL,
     movie_title VARCHAR(255) NOT NULL,
     movie_poster VARCHAR(500),
     added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
     UNIQUE KEY unique_user_movie (user_id, movie_id)
   );
   
   -- Movie cache table
   CREATE TABLE movie_cache (
     id INT AUTO_INCREMENT PRIMARY KEY,
     imdb_id VARCHAR(20) UNIQUE NOT NULL,
     movie_data JSON NOT NULL,
     cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR)
   );
   ```

6. **Start the Application**
   
   Backend (Terminal 1):
   ```bash
   cd server
   npm run dev
   ```
   
   Frontend (Terminal 2):
   ```bash
   cd client
   npm start
   ```

7. **Access the Application**
   
   Open your browser and navigate to `http://localhost:3000`

## 🔑 API Keys Setup

### OMDb API Key
1. Visit [OMDb API](http://www.omdbapi.com/apikey.aspx)
2. Select the FREE tier (1,000 requests/day)
3. Enter your email and verify
4. Copy the 8-character key to your `.env` file

### Groq API Key
1. Go to [Groq Console](https://console.groq.com/)
2. Sign up with your email
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy the key (starts with `gsk_`) to your `.env` file

## 📖 Usage Examples

### AI Recommendations
```
"I want a sci-fi movie like Blade Runner"
"Suggest a romantic comedy for date night"
"Dark psychological thriller with great acting"
"Family-friendly adventure movie from the 90s"
"Movies similar to The Matrix but more recent"
```

### Search & Filter
- Search by movie title
- Filter by genre, year, or rating
- Sort by popularity or release date
- View detailed movie information with cast and plot

## 🏗️ Project Structure

```
CineAI/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Styling
│   │   └── index.js       # Entry point
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   └── package.json
├── server/                 # Node.js Backend
│   ├── routes/
│   │   ├── auth.js        # Authentication routes
│   │   ├── movies.js      # Movie search routes
│   │   ├── recommendations.js # AI recommendation routes
│   │   └── favorites.js   # User favorites routes
│   ├── config/
│   │   └── database.js    # MySQL configuration
│   ├── server.js          # Main server file
│   ├── schema.sql         # Database schema
│   └── package.json
├── README.md
└── .gitignore
```

## 🔐 Security Features

- **Password Hashing**: bcrypt for secure password storage
- **JWT Authentication**: Secure token-based authentication
- **Environment Variables**: Sensitive data protected from version control
- **Input Validation**: Prevents SQL injection and XSS attacks
- **CORS Configuration**: Controlled cross-origin requests

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Movies
- `GET /api/movies/search?q={query}` - Search movies by title
- `GET /api/movies/{id}` - Get detailed movie information
- `GET /api/movies/trending` - Get trending movies

### Recommendations
- `POST /api/recommendations` - Get AI-powered recommendations
- Body: `{ "prompt": "your natural language request" }`

### Favorites
- `GET /api/favorites` - Get user's favorite movies
- `POST /api/favorites` - Add movie to favorites
- `DELETE /api/favorites/{movieId}` - Remove from favorites

## 🚀 Deployment

### Development
```bash
# Backend
cd server && npm run dev

# Frontend
cd client && npm start
```

### Production Ready
- **Frontend**: Deploy to Vercel, Netlify, or GitHub Pages
- **Backend**: Deploy to Heroku, Railway, or DigitalOcean
- **Database**: Use PlanetScale, AWS RDS, or DigitalOcean MySQL

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Future Enhancements

- [ ] **Advanced AI Features**
  - Sentiment analysis for better mood matching
  - Learning from user preferences over time
  - Multi-language support for international movies

- [ ] **Social Features**
  - User reviews and ratings
  - Share recommendations with friends
  - Movie watchlists and collections

- [ ] **Enhanced Discovery**
  - Trending movies dashboard
  - Genre-based recommendations
  - Actor/director-based suggestions

- [ ] **Technical Improvements**
  - Redis caching for better performance
  - Real-time notifications
  - Progressive Web App (PWA) support

## 🐛 Known Issues

- Movie poster images may occasionally fail to load due to external API limitations
- AI recommendations work best with specific, descriptive prompts
- Free API tiers have rate limits (OMDb: 1000/day, Groq: varies by plan)

## 📊 Performance

- **Fast AI Responses**: Groq provides sub-second recommendation generation
- **Efficient Caching**: Movie data cached for 24 hours to reduce API calls
- **Optimized Queries**: Database queries optimized for quick search results
- **Responsive Design**: Smooth performance across all device sizes

## 🧪 Testing

```bash
# Run frontend tests
cd client
npm test

# Backend API testing
cd server
npm test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OMDb API](http://www.omdbapi.com/) for comprehensive movie data
- [Groq](https://groq.com/) for lightning-fast AI inference
- [React](https://reactjs.org/) for the amazing frontend framework
- [Express.js](https://expressjs.com/) for the robust backend framework
- [MySQL](https://www.mysql.com/) for reliable data storage

## 📞 Contact

**Project Link**: [https://github.com/YOUR_USERNAME/CineAI](https://github.com/YOUR_USERNAME/CineAI)

---

<div align="center">

**⭐ If you found this project helpful, please give it a star! ⭐**

**Made with ❤️ for movie lovers everywhere**

*CineAI - Where AI meets Cinema* 🎭

</div>

## 🎯 Quick Demo

1. **Register/Login** → Create your account
2. **Try AI Recommendations** → "I want a mind-bending sci-fi movie"
3. **Search Movies** → Type any movie title
4. **Add Favorites** → Save movies for later
5. **Enjoy!** → Discover amazing movies with AI power