# Relay Optimizer

The easiest way to optimize your Nostr relay connections. Test relay speeds, discover what relays your friends use, and publish your configuration in one click.

## Features

- **Speed Testing** - Ping test all your relays instantly to measure latency
- **Friend Analysis** - See which relays your contacts are using and get smart suggestions
- **One-Click Publish** - Update your relay lists (NIP-65, DM, Search) to Nostr in one click
- **Multiple Login Methods** - Support for browser extensions (NIP-07), nsec keys, bunker URIs, and new account creation
- **Relay Type Management**:
  - **Inbox/Outbox Relays** (NIP-65) - Control where you read from and write to
  - **DM Relays** (NIP-17) - Private messaging relay configuration
  - **Search Relays** - Relays optimized for search queries

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Radix UI Components
- TanStack Query
- Nostrify (Nostr SDK)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/relay-optimizer.git
cd relay-optimizer

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm test
```

## Project Structure

```
src/
├── components/
│   ├── auth/              # Login, signup, account switching
│   ├── relay-optimizer/   # Main relay management UI
│   └── ui/                # Reusable UI components (shadcn/ui)
├── hooks/
│   ├── useCurrentUser.ts      # Current user state
│   ├── useUserRelays.ts       # Fetch user's relay lists
│   ├── useContactRelays.ts    # Analyze contacts' relays
│   ├── useRelayPing.ts        # Relay latency testing
│   └── usePublishRelayLists.ts # Publish relay configurations
├── lib/
│   └── relay-utils.ts     # URL normalization, validation
├── types/
│   └── relay-optimizer.ts # TypeScript interfaces
└── pages/
    └── Index.tsx          # Main entry point
```

## Nostr Event Kinds Used

| Kind | Purpose |
|------|---------|
| 0 | User metadata (profile) |
| 3 | Contact list |
| 10002 | Relay list (NIP-65) |
| 10050 | DM relay list |
| 10007 | Search relay list |

## License

MIT
