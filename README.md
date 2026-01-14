# My Trip Handler 🗺️

A modern trip planning web application built with React, TypeScript, and Google APIs. Plan your trips, save them to Google Drive, and visualize your itinerary on interactive maps.

**[Live Demo](https://him1231.github.io/my_trip_handler/)** (coming soon)

## Features

- 🔐 **Google Sign-In** - Secure OAuth 2.0 authentication
- 🗺️ **Interactive Maps** - Plan routes with Google Maps
- 📁 **Cloud Storage** - Save trips to your Google Drive
- 📅 **Itinerary Planning** - Day-by-day trip organization
- 💰 **Budget Tracking** - Track expenses per trip
- 🤝 **Trip Sharing** - Share trips with friends
- 📸 **Photo Storage** - Attach photos to locations
- 🤖 **AI Suggestions** - Get trip recommendations (coming soon)

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Data Fetching**: TanStack Query
- **Maps**: Google Maps JavaScript API
- **Auth**: Google OAuth 2.0 (PKCE)
- **Storage**: Google Drive API
- **Hosting**: GitHub Pages

## Quick Start

### Prerequisites

- Node.js 18+ (recommended: 20+)
- A Google Cloud account

### 1. Clone and Install

```bash
git clone https://github.com/him1231/my_trip_handler.git
cd my_trip_handler
npm install
```

### 2. Set Up Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Google Drive API

#### Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application**
4. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://yourusername.github.io`
5. Add authorized redirect URIs:
   - `http://localhost:5173`
   - `https://yourusername.github.io/my_trip_handler`
6. Copy the **Client ID**

#### Create API Key

1. Click **Create Credentials > API key**
2. Click **Restrict key**
3. Under **Application restrictions**, select **HTTP referrers**
4. Add your domains:
   - `localhost:5173`
   - `yourusername.github.io/*`
5. Under **API restrictions**, select:
   - Maps JavaScript API
   - Places API
6. Copy the **API Key**

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_MAPS_API_KEY=your-api-key
VITE_AVIATIONSTACK_API_KEY=your-aviationstack-api-key  # Optional: Get free API key from https://aviationstack.com/
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run tests |

## Project Structure

```
my_trip_handler/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks
│   ├── pages/          # Route pages
│   ├── services/       # API integrations
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── .claude/            # Claude Code configuration
│   ├── agents/         # AI agents for code review
│   ├── commands/       # Custom slash commands
│   ├── hooks/          # Automation hooks
│   └── skills/         # Domain knowledge
└── .github/workflows/  # CI/CD pipelines
```

## Security

This app runs entirely in your browser. Your data is:

- ✅ Stored in YOUR Google Drive (not our servers)
- ✅ Protected by Google's OAuth 2.0
- ✅ Only accessible by you (using `drive.file` scope)

**API Keys in Public Repo**: The Google API key in this repo is domain-restricted. It only works on authorized domains (localhost and the GitHub Pages URL).

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Write tests for new features
- Keep PRs focused and small
- Update documentation as needed

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [React Google Maps](https://react-google-maps-api-docs.netlify.app/) for map components
- [Vite](https://vitejs.dev/) for blazing fast builds
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) for AI-assisted development
