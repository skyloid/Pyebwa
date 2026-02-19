# Pyebwa - Family Tree Application

A multilingual family tree platform supporting English, French, and Haitian Creole.

## Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3, Material Icons
- **Backend**: Node.js, Express 4.x
- **Database**: Firebase Firestore
- **Storage**: Google Cloud Storage
- **Auth**: Firebase Authentication
- **Email**: SendGrid

## Project Structure

```
├── app/                  # Main web application
│   ├── css/              # Stylesheets
│   ├── js/               # Client-side JavaScript
│   ├── images/           # Static assets
│   └── index.html        # App entry point
├── server/               # Express backend
│   ├── api/              # API route handlers
│   ├── middleware/        # Express middleware
│   └── services/         # Business logic & Firebase
├── pyebwa.com/           # Public-facing website
├── mobile-app/           # React Native / Expo mobile app
├── __tests__/            # Jest test suites
└── server.js             # Main server entry point
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Environment Variables

See `.env.example` for all required configuration. Key variables:

- `FIREBASE_*` - Firebase project config and admin credentials
- `SESSION_SECRET` / `JWT_SECRET` - Auth security
- `SENDGRID_API_KEY` - Email service
- `ADMIN_SETUP_KEY` - Admin promotion endpoint

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm test` | Run test suite |
| `npm run test:coverage` | Run tests with coverage report |

## License

MIT
