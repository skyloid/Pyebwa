# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.com

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
# iOS
npx react-native run-ios

# Android  
npx react-native run-android
```

### Dependencies Installation
```bash
# Initial setup
npm install

# iOS-specific setup (required after installing new native dependencies)
cd ios && pod install && cd ..
```

## Architecture

### Overview
Pyebwa App is a React Native application for managing family genealogy data. It uses Firebase for backend services and supports three languages (English, French, and Haitian Creole).

### Core Technical Stack
- **React Native**: Cross-platform mobile framework
- **Firebase**: Authentication, Firestore database, and Storage
- **React Native Paper**: Material Design 3 components
- **i18next**: Internationalization

### Key Architectural Patterns

1. **Data Model**:
   - Users have a `familyTreeId` linking them to their family tree
   - Family trees contain collections of persons with biographical data
   - Firestore security rules enforce user-based access control

2. **Theme System**:
   - Custom Material Design 3 theme using Haitian flag colors (Red #D41125, Blue #00217D)
   - Consistent elevation system and 8px rounded corners

3. **Internationalization**:
   - Three language support configured in `src/services/i18n.js`
   - Translation files in `src/locales/` directory
   - Default language: English

4. **Firebase Integration**:
   - API functions in `src/services/firebaseApi.js` handle all Firestore operations
   - Security rules in `firestore.rules` ensure users can only access their own data
   - Helper function `getUserFamilyTreeId()` validates tree access

### Current Development State
- LoginScreen and AddPersonScreen UI components are implemented
- Firebase authentication integration is pending
- Navigation setup between screens needs to be implemented
- Core Firebase API functions are ready but not yet connected to UI

## Server Information
- This server is rasin.pyebwa.com