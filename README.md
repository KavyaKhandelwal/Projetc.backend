# Notes API

A RESTful API for managing notes built with Node.js, Express, and MongoDB.

## Features

- ✅ Create, Read, Update, Delete notes
- ✅ Search and filter notes
- ✅ Category-based organization
- ✅ Important note marking
- ✅ Pagination support
- ✅ Input validation
- ✅ Error handling
- ✅ Security middleware

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Express-validator
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **Environment**: Dotenv

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd notes-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/notes-app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all notes (with filtering & pagination) |
| GET | `/api/notes/:id` | Get a specific note |
| POST | `/api/notes` | Create a new note |
| PUT | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |
| PATCH | `/api/notes/:id/toggle-important` | Toggle important status |
| GET | `/api/notes/category/:category` | Get notes by category |

### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `category`: Filter by category (personal, work, study, other)
- `isImportant`: Filter by importance (true/false)
- `search`: Search in title and content

### Note Schema

```json
{
  "title": "string (required, max 100 chars)",
  "content": "string (required)",
  "category": "personal|work|study|other (default: personal)",
  "isImportant": "boolean (default: false)",
  "tags": ["array of strings"],
  "color": "hex color code (default: #ffffff)"
}
```

## Example Usage

### Create a Note
```bash
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Note",
    "content": "This is the content of my first note",
    "category": "personal",
    "isImportant": true,
    "tags": ["important", "todo"],
    "color": "#ffeb3b"
  }'
```

### Get All Notes
```bash
curl http://localhost:3000/api/notes?page=1&limit=5&category=personal
```

### Update a Note
```bash
curl -X PUT http://localhost:3000/api/notes/note-id \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "Updated content"
  }'
```

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── models/          # Database models
├── routes/          # Express routes
├── middlewares/     # Custom middleware
├── services/        # Business logic
├── utils/           # Utility functions
├── validators/      # Request validation
└── app.js           # Express app setup
```

## Scripts

- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon
- `npm test`: Run tests (to be implemented)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/notes-app |
| JWT_SECRET | JWT secret key | your-secret-key |
| JWT_EXPIRE | JWT expiration time | 7d |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License. 