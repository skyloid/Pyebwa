# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Standard Workflow
1. First think through the problem, read the codebase for relevant files, and write a plan to projectplan.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the projectplan.md file with a summary of the changes you made and any other relevant information.

## Commands

### Running the Application
```bash
# Development server
npm run dev

# Production server
npm start
```

### Dependencies Installation
```bash
# Initial setup
npm install
```

### Development Commands
```bash
# Start development server with auto-reload
nodemon server.js

# Check server health
curl https://rasin.pyebwa.com/health
```

## Architecture

### Overview
Pyebwa is a web application for managing family genealogy data. It uses Firebase for backend services and supports three languages (English, French, and Haitian Creole). The application runs on Express.js server serving static HTML/CSS/JS files.

### Core Technical Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js with Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **UI Framework**: Material Design 3 with custom CSS
- **Internationalization**: Custom translation system

### Key Architectural Patterns

1. **Server Architecture**:
   - Express.js server on port 9111
   - Static file serving from `/app` directory
   - CORS configuration for cross-domain requests
   - Compression middleware for performance

2. **Data Model**:
   - Users have a `familyTreeId` linking them to their family tree
   - Family trees contain collections of persons with biographical data
   - Firestore security rules enforce user-based access control

3. **Theme System**:
   - Custom Material Design 3 theme using Haitian flag colors (Red #D41125, Blue #00217D)
   - Consistent elevation system and 8px rounded corners
   - Dark mode support

4. **Internationalization**:
   - Three language support (English, French, Haitian Creole)
   - Translation files in `/app/locales/` directory
   - Dynamic language switching

5. **Firebase Integration**:
   - API functions in `/app/js/` files handle all Firestore operations
   - Security rules in `firestore.rules` ensure users can only access their own data
   - Real-time updates for family tree data

### Current Features
- Complete authentication system (login/logout)
- Family tree visualization and management
- Member management (add, edit, view profiles)
- Photo upload and management
- Multi-language interface (EN, FR, HT)
- Responsive design for mobile and desktop
- Real-time data synchronization
- Search functionality
- PDF export capabilities

### File Structure
```
/app/
├── index.html              # Main application entry
├── css/                    # Stylesheets
├── js/                     # JavaScript modules
│   ├── app.js             # Main application logic
│   ├── firebase-config.js # Firebase configuration
│   ├── auth-enhanced.js   # Authentication system
│   ├── tree.js           # Family tree functionality
│   └── ...               # Other feature modules
├── images/                # Static assets
└── locales/              # Translation files
```

### Development State
- Fully functional web application
- Firebase authentication is implemented and working
- Family tree functionality is operational
- Multi-language support is active
- Real-time data synchronization is working

## Server Information
- Server: rasin.pyebwa.com
- Port: 9111
- Environment: Production
- URL: https://rasin.pyebwa.com/app