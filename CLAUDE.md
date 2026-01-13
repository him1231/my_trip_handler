# My Trip Handler

> A trip planning web application with Google Maps, Google Drive storage, and OAuth authentication.

## Quick Facts

- **Stack**: React 18, TypeScript, Vite, Tailwind CSS
- **Hosting**: GitHub Pages (static site)
- **Auth**: Google OAuth 2.0 (client-side PKCE)
- **Storage**: Google Drive API (user's own Drive)
- **Maps**: Google Maps JavaScript API
- **Test Command**: `npm test`
- **Lint Command**: `npm run lint`
- **Build Command**: `npm run build`
- **Dev Server**: `npm run dev`

## Key Directories

- `src/components/` - React components
- `src/hooks/` - Custom React hooks (useGoogleAuth, useGoogleDrive, useGoogleMaps)
- `src/pages/` - Route pages
- `src/services/` - Google API integrations
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

## Code Style

- TypeScript strict mode enabled
- Prefer `interface` over `type` (except unions/intersections)
- No `any` - use `unknown` instead
- Use early returns, avoid nested conditionals
- Prefer composition over inheritance

## Environment Variables

```bash
# Safe to expose in public repo (restricted to domain)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_MAPS_API_KEY=your-maps-api-key
```

## Git Conventions

- **Main branch**: `main` (protected, deployed to GitHub Pages)
- **Development**: `develop` (feature integration)
- **Branch naming**: `{initials}/{description}` (e.g., `jd/add-map-view`)
- **Commit format**: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)

## Critical Rules

### Google API Integration
- NEVER store OAuth client secret (not needed for client-side flow)
- API keys must be domain-restricted in Google Cloud Console
- Always handle token expiration and refresh
- Request minimum required OAuth scopes

### Error Handling
- NEVER swallow errors silently
- Always show user feedback for API errors
- Log errors for debugging
- Handle offline/network errors gracefully

### UI States
- Always handle: loading, error, empty, success states
- Show loading ONLY when no data exists
- Every list needs an empty state
- Handle Google API rate limits gracefully

### Mutations
- Disable buttons during async operations
- Show loading indicator on buttons
- Always have onError handler with user feedback
- Sync changes to Google Drive when online

## Testing

- Write failing test first (TDD)
- Use factory pattern: `getMockX(overrides)`
- Test behavior, not implementation
- Mock Google API responses
- Run tests before committing

## Skill Activation

Before implementing ANY task, check if relevant skills apply:

- Creating tests → `testing-patterns` skill
- Building forms → `formik-patterns` skill
- Google API integration → `google-apis` skill
- Debugging issues → `systematic-debugging` skill
- UI components → `react-ui-patterns` skill
- Component library → `core-components` skill

## Common Commands

```bash
# Development
npm run dev          # Start dev server (localhost:5173)
npm test             # Run tests
npm run lint         # Run linter
npm run typecheck    # Check types
npm run build        # Build for production

# Git
git checkout develop         # Switch to develop
git checkout -b feature/x    # Create feature branch
```

## Features Roadmap

- [ ] Google OAuth sign-in
- [ ] Trip creation and management
- [ ] Interactive map with Google Maps
- [ ] Itinerary planning (day-by-day)
- [ ] Budget/expense tracking
- [ ] Save trips to Google Drive
- [ ] Trip sharing with others
- [ ] Photo storage and gallery
- [ ] AI-powered trip suggestions
