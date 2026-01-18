# Reading KG PWA

A Progressive Web App for tracking reading progress with offline support.

## Features

- **Book Management**: Create, search, and organize your book library
- **Reading Events**: Track when you finish or stop reading books
- **Offline Support**: Works without internet, syncs when back online
- **PWA**: Install on mobile or desktop for native-like experience
- **Google Auth**: Secure authentication via Supabase

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Deployment**: GitHub Pages (static export)

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase project

### Setup

1. Clone and install:
   ```bash
   git clone <repo-url>
   cd reading-kg-pwa
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. Run database migrations in Supabase SQL Editor:
   ```sql
   -- Copy contents from supabase/migrations/20240101000000_initial_schema.sql
   ```

4. Enable Google OAuth in Supabase Dashboard:
   - Go to Authentication > Providers > Google
   - Configure OAuth credentials

5. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

### GitHub Pages (Quick)

1. Add secrets to repository:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Push to `main` branch - auto deploys via GitHub Actions

## Project Structure

```
reading-kg-pwa/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── auth/         # OAuth callback
│   │   └── login/        # Login page
│   ├── components/       # React components
│   │   ├── BookSelector.tsx
│   │   ├── EndedDialog.tsx
│   │   ├── ReadingFlow.tsx
│   │   └── SyncStatus.tsx
│   ├── lib/              # Core libraries
│   │   ├── auth-context.tsx
│   │   ├── books.ts
│   │   ├── events.ts
│   │   ├── offline-queue.ts
│   │   └── supabase.ts
│   └── types/            # TypeScript types
├── public/               # Static assets & PWA config
├── supabase/             # Database migrations
└── sync-script/          # Python sync utilities
```

## Data Model

- **books**: User's book library
- **reading_events**: Append-only event log (finished, ended, correction)
- **valid_reading_events**: View excluding corrected events

## License

MIT
