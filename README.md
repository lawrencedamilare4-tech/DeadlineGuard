# DeadlineGuard

A smart storage deadline protection system for Filecoin. Monitor your storage agreements, get alerts before expiry, and automate renewals.

## Features

- **Storage Weather Dashboard** - Real-time monitoring of your storage conditions
- **Deadline Alerts** - Automatic notifications before storage agreements expire
- **Forecast Engine** - Predict storage runway and future expiry dates
- **Agent Automation** - Autonomous file management and renewal
- **Cost Simulator** - Calculate storage costs and plan your budget
- **Provider Management** - Compare and select optimal storage providers

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account
- Filecoin wallet (optional, for actual storage)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/deadlineguard.git
cd deadlineguard
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Supabase and API keys:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_GROQ_API_KEY=your_groq_api_key
```

5. Start development server
```bash
npm run dev
```

## Project Structure

```
src/
├── components/       # React components
│   ├── common/      # Shared UI components
│   ├── dashboard/   # Dashboard components
│   ├── file/        # File management components
│   ├── layout/      # Layout components
│   └── landing/     # Landing page components
├── engines/         # Business logic engines
│   ├── weatherEngine.js    # Storage monitoring
│   ├── agentEngine.js      # Automation
│   └── forecastEngine.js   # Predictions
├── services/        # External service integrations
│   ├── ai/         # AI services (Groq)
│   ├── filecoin/   # Filecoin integration
│   └── supabase/   # Database services
├── hooks/          # Custom React hooks
├── pages/          # Page components
└── utils/          # Utility functions
```

## Pages

- **Landing Page** (`/`) - Marketing homepage
- **Dashboard** (`/dashboard`) - Main control panel
- **Files** (`/files`) - File management
- **Settings** (`/settings`) - User preferences

## Services

### Filecoin Services
- Storage management
- Provider selection
- Payment processing
- File retrieval
- Verification

### AI Services
- Groq integration for intelligent reports

### Supabase Services
- Authentication
- Database operations
- Real-time updates

## Building for Production

```bash
npm run build
npm run preview
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
