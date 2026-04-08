# Aponk Red — Arowana Store POS

A point-of-sale and stock management system built for an arowana fish store. Runs as a PWA (Progressive Web App) installable on Android and iOS.

## Tech Stack

- Next.js 15 (App Router) — deployed on Vercel
- Tailwind CSS v4
- Supabase (PostgreSQL + Storage)
- PWA via `@ducanh2912/next-pwa`

## Features

- **POS** — sell individual fish or stock products, apply discounts, cash/transfer payment
- **Fish management** — track individual arowana by ID, tank, size, and photo
- **Product management** — products with optional size variants and stock levels
- **Stock adjustment** — manual stock in/out with notes and adjustment history
- **Expenses** — record daily operational expenses
- **Cash register (EOD)** — end-of-day cash count with discrepancy tracking
- **Reports** — sales and expense reports by date range
- **Inventory report** — stock levels with low stock and out-of-stock indicators
- **Offline support** — cash sales queued in IndexedDB when offline, synced on reconnect
- **Multi-device** — role-based access (owner / admin / cashier) across multiple devices

## Project Structure

```
/
├── app/                  # Next.js App Router
│   ├── (auth)/setup/     # Device registration
│   ├── (app)/            # Main app (pos, fish, products, expenses, eod, reports)
│   └── api/              # Next.js API routes (auth, sales, products, fish, stock, reports…)
├── components/           # Reusable UI components
├── lib/
│   ├── api.ts            # Central fetch client
│   ├── auth.ts           # Server-side auth utilities
│   ├── offline-queue.ts  # IndexedDB offline sale queue
│   ├── supabase/         # Supabase server client + storage helpers
│   └── utils.ts
├── hooks/                # React hooks
├── types/                # Shared TypeScript types
└── public/               # PWA manifest, icons
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Local Development

```bash
npm install
npm run dev
```
