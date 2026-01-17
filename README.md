# Impromptu Speech Question Generator

A Next.js web application for generating random impromptu speaking questions with 5 difficulty levels. Perfect for educational settings where students practice impromptu speaking skills.

## Features

- **5 Difficulty Levels** (L1-L5): From simple personal questions to complex analytical topics
- **Question Types**:
  - Simple questions (L1, L2, L5): Fixed questions from database
  - Template-based questions (L3, L4): Dynamic questions generated from templates with variables
- **Question Locking**: Prevents questions from repeating within a configurable time window
- **Admin Dashboard**: 
  - Manage question bank (add, edit, delete, bulk operations)
  - Batch import/export (CSV support)
  - Select mode with Shift+Click range selection
  - Review feedback (thumbs up/down votes)
  - Configure settings (lock duration, max number)
- **Feedback System**: Students can vote on question quality
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 16.1.3 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **Authentication**: iron-session
- **Styling**: Tailwind CSS 4
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Impromptu
```

2. Install dependencies:
```bash
npm install
```

3. Seed the database with sample questions:
```bash
npm run seed
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change the default password immediately after first login in production!

## Project Structure

```
Impromptu/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── admin/        # Admin dashboard
│   │   ├── api/          # API routes
│   │   └── page.tsx      # Public homepage
│   └── lib/
│       ├── db.ts         # Database operations
│       └── session.ts    # Session management
├── scripts/
│   └── seed.ts           # Database seeding script
├── data/
│   └── impromptu.db      # SQLite database (gitignored)
└── public/               # Static assets
```

## Database Schema

- `questions` - Simple questions for L1, L2, L5
- `question_templates` - Templates for L3, L4
- `template_history` - Tracks shown template+variable combinations
- `question_history` - Tracks shown simple questions
- `feedback` - User votes (thumbs up/down)
- `users` - Admin authentication
- `settings` - Application configuration

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and configure the build
4. Add environment variables if needed
5. Deploy!

**Note**: SQLite works on Vercel for serverless functions, but consider using a persistent database (like PostgreSQL) for production with multiple instances or for better reliability.

### Environment Variables

No environment variables required by default. The app uses SQLite with a local database file.

For production, you may want to:
- Use a proper database (PostgreSQL, MySQL)
- Configure session secrets
- Set up proper authentication

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with sample questions

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the project maintainer.
