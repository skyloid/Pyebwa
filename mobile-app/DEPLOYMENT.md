# Mobile Deployment

This Expo package is deployed with the standard Expo and EAS workflow.

## Prerequisites

- Expo account
- EAS CLI
- App store credentials as needed

## Commands

- `npm install`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npx eas build --platform android`
- `npx eas build --platform ios`

## Notes

- The mobile package uses local auth/profile persistence for development.
- The production web platform uses Supabase/Postgres.
