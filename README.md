# Notes App Backend

A comprehensive, full-featured notes application backend built with Express.js and MongoDB. This backend provides a complete API for managing notes, categories, tags, user authentication, sharing, and collaboration features.

## 🚀 Features

### Core Features
- **User Authentication & Authorization**
  - JWT-based authentication with refresh tokens
  - User registration, login, logout
  - Password reset functionality
  - Email verification
  - Role-based access control

- **Notes Management**
  - Full CRUD operations for notes
  - Rich text content support (text, markdown, HTML)
  - Note versioning and history
  - Soft delete with restore capability
  - Note templates and duplication
  - Bulk operations

- **Categories System**
  - Hierarchical categories (nested categories)
  - Color coding and icons
  - Category-based filtering
  - Archive/unarchive functionality

- **Tagging System**
  - Dynamic tag creation and management
  - Tag-based search and filtering
  - Tag popularity tracking
  - Tag suggestions based on content
  - Bulk tag operations

- **Advanced Search**
  - Full-text search across notes
  - Search by title, content, tags, categories
  - Advanced filtering options
  - Search history and saved searches

- **Sharing & Collaboration**
  - Share notes via unique links
  - Permission levels (view, edit, comment)
  - Public/private note settings
  - Collaborative editing capabilities
  - Share expiration dates

### Security Features
- Input validation and sanitization
- Rate limiting on all endpoints
- CORS configuration
- Helmet for security headers
- Password strength requirements
- XSS and injection protection

### Performance Features
- Database indexing strategy
- Pagination for large datasets
- Response compression
- Optimized MongoDB queries
- Caching strategies

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, bcrypt
- **Validation**: Joi, express-validator
- **Logging**: Winston
- **Rate Limiting**: express-rate-limit
- **Testing**: Jest, Supertest

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd notes-app-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/notes-app
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   # ... other variables
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/logout` | Logout user |
| POST | `/auth/refresh-token` | Refresh access token |
| GET | `/auth/me` | Get current user profile |
| PUT | `/auth/profile` | Update user profile |
| PUT | `/auth/change-password` | Change password |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |

### Notes Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notes` | Get all notes (with filtering) |
| POST | `/notes` | Create new note |
| GET | `/notes/:id` | Get single note |
| PUT | `/notes/:id` | Update note |
| DELETE | `/notes/:id` | Delete note (soft delete) |
| GET | `/notes/stats` | Get note statistics |
| GET | `/notes/deleted` | Get deleted notes |
| PUT | `/notes/:id/restore` | Restore deleted note |
| POST | `/notes/:id/duplicate` | Duplicate note |

### Categories Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | Get all categories |
| POST | `/categories` | Create new category |
| GET | `/categories/:id` | Get single category |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |
| GET | `/categories/hierarchy` | Get category tree |
| GET | `/categories/stats` | Get category statistics |

### Tags Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tags` | Get all tags |
| POST | `/tags` | Create new tag |
| GET | `/tags/:id` | Get single tag |
| PUT | `/tags/:id` | Update tag |
| DELETE | `/tags/:id` | Delete tag |
| GET | `/tags/popular` | Get popular tags |
| GET | `/tags/search` | Search tags |
| POST | `/tags/suggestions` | Get tag suggestions |

### Sharing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notes/:id/share` | Create share link |
| PUT | `/notes/:id/share` | Update share settings |
| DELETE | `/notes/:id/share` | Revoke share link |
| GET | `/shared/:shareId` | Get shared note |
| POST | `/notes/:id/collaborators` | Add collaborator |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/notes-app |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_REFRESH_SECRET` | JWT refresh secret | - |
| `JWT_EXPIRE` | JWT expiration time | 24h |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |

## 🏗 Project Structure

```
notes-app-backend/
├── src/
│   ├── controllers/          # Route controllers
│   │   ├── authController.js
│   │   ├── noteController.js
│   │   ├── categoryController.js
│   │   ├── tagController.js
│   │   └── shareController.js
│   ├── middleware/           # Custom middleware
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── models/              # Mongoose models
│   │   ├── User.js
│   │   ├── Note.js
│   │   ├── Category.js
│   │   └── Tag.js
│   ├── routes/              # Route definitions
│   │   ├── auth.js
│   │   ├── notes.js
│   │   ├── categories.js
│   │   ├── tags.js
│   │   └── share.js
│   ├── utils/               # Utility functions
│   │   ├── database.js
│   │   ├── logger.js
│   │   └── helpers.js
│   └── app.js               # Express app setup
├── config/
│   └── config.js            # Configuration
├── tests/                   # Test files
├── logs/                    # Log files
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔒 Security

This application implements several security measures:

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive validation using Joi
- **Rate Limiting**: Configurable rate limits per endpoint
- **Security Headers**: Helmet.js for security headers
- **CORS**: Configurable CORS settings
- **Password Security**: bcrypt with configurable salt rounds
- **XSS Protection**: Input sanitization
- **Error Handling**: Secure error responses

## 🚀 Deployment

### Using PM2 (Recommended)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Create ecosystem file:
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'notes-app-backend',
       script: 'src/app.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 5000
       }
     }]
   };
   ```

3. Start with PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```

### Using Docker

1. Create Dockerfile:
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. Build and run:
   ```bash
   docker build -t notes-app-backend .
   docker run -p 5000:5000 notes-app-backend
   ```

## 📊 Monitoring

The application includes:

- **Health Check**: `/health` endpoint
- **Logging**: Winston logger with file and console transports
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Monitoring**: Request logging with Morgan

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please create an issue in the repository or contact the development team.

## 🔄 Changelog

### v1.0.0
- Initial release
- Complete notes management system
- User authentication and authorization
- Categories and tags system
- Sharing and collaboration features
- Comprehensive API documentation
