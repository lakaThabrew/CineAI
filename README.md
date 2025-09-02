# 🎬 CineAI - AI-Powered Movie Recommendation Platform

> Discover your next favorite movie with the power of artificial intelligence

CineAI is a modern web application that combines traditional movie search with intelligent AI recommendations. Simply describe what you're in the mood for - like "a dark thriller with a plot twist" or "feel-good comedy for family night" - and let our AI find the perfect movies for you.

<div align="center">
<img src="cineai_home.png" alt="CineAI Banner" style="width: auto; height:1000px;">
</div>

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

### 🎨 Frontend
- **React.js** - Modern UI library
- **CSS3** - Custom styling with gradients and animations
- **Responsive Design** - Mobile-first approach

### </> Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MySQL** - Relational database
- **JWT** - Secure authentication

### 🔐 APIs & AI
- **Groq API** - Fast AI language model for recommendations
- **OMDb API** - Comprehensive movie database
- **RESTful Architecture** - Clean API design

## 🚀 Quick Start

### 🧩 Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- OMDb API Key
- Groq API Key

### ⬇️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lakaThabrew/CineAI.git
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
   
   Create the database and tables:
   ```sql
   CREATE DATABASE cineai;
   USE cineai;
   
   -- Run the schema.sql file provided in the server folder
   SOURCE server/schema.sql;
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
3. Navigate to the "API Keys" section
4. Create a new API key
5. Copy the key (starts with `gsk_`) to your `.env` file

## 📖 Usage Examples

### 🦾 AI Recommendations
```
"I want a sci-fi movie like Blade Runner."
"Suggest a romantic comedy for date night."
"Dark psychological thriller with great acting"
"Family-friendly adventure movie"
"90s action movies with good soundtracks"
```

### 🔍 Search & Filter
- Search by movie title
- Filter by genre, year, or rating
- Sort by popularity or release date
- View detailed movie information

## 🏗️ Project Structure

```
CineAI/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Styling
│   │   └── index.js       # Entry point
│   ├── public/
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
- **Environment Variables**: Sensitive data protected
- **Input Validation**: Prevents SQL injection and XSS attacks
- **CORS Configuration**: Controlled cross-origin requests

## 🚀 Deployment

### Development
```bash
# Backend
cd server && npm run dev

# Frontend
cd client && npm start
```

### Production
- **Frontend**: Deploy to Vercel, Netlify, or GitHub Pages
- **Backend**: Deploy to Heroku, Railway, or DigitalOcean
- **Database**: Use MySQL on cloud platforms or the local server

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
  - Caching layer for better performance
  - Real-time notifications
  - Progressive Web App (PWA) support

## 🐛 Known Issues

- Movie poster images may occasionally fail to load
- AI recommendations work best with specific, descriptive prompts
- Free API tiers have rate limits (OMDb: 1000/day, Groq: varies)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OMDb API](http://www.omdbapi.com/) for comprehensive movie data
- [Groq](https://groq.com/) for lightning-fast AI inference
- [React](https://reactjs.org/) for the amazing frontend framework
- [Express.js](https://expressjs.com/) for the robust backend framework

## 📞 Contact

**Project Creator**: Lakmana Thabrew
- GitHub: [@lakaThabrew](https://github.com/lakaThabrew)
- Email: lakmanathabrew123@gmail.com

**Project Link**: [https://github.com/lakaThabrew/CineAI](https://github.com/lakaThabrew/CineAI)

---

<div align="center">

**⭐ If you found this project helpful, please give it a star! ⭐**

**Made with ❤️ for movie lovers everywhere**

</div>
