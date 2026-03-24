# Aponk Red — Arowana Store POS

A point-of-sale and stock management system built for an arowana fish store. Runs as a PWA (Progressive Web App) installable on Android and iOS.

## Tech Stack

**Frontend**
- Next.js 15 (App Router) — deployed on Vercel
- Tailwind CSS v4
- PWA via `@ducanh2912/next-pwa`

**Backend**
- ASP.NET Core Web API (.NET 10) — deployed on Railway
- JWT Bearer authentication
- Supabase (PostgreSQL) via REST API

## Features

- **POS** — sell individual fish or stock products, apply discounts, cash/transfer payment
- **Fish management** — track individual arowana by ID, tank, size, and photo
- **Product management** — products with optional size variants and stock levels
- **Stock adjustment** — manual stock in/out with notes and adjustment history
- **Expenses** — record daily operational expenses
- **Cash register (EOD)** — end-of-day cash count with discrepancy tracking
- **Reports** — sales and expense reports by date range
- **Inventory report** — stock levels with low stock and out-of-stock indicators
- **Admin** — manage registered devices and store settings
- **Offline support** — cash sales queued in IndexedDB when offline, synced on reconnect
- **Multi-device** — role-based access (owner / admin / cashier) across multiple devices

## Project Structure

```
/
├── app/                  # Next.js App Router pages
│   ├── (auth)/setup/     # Device registration
│   └── (app)/            # Main app (pos, fish, products, stock, expenses, eod, reports, admin)
├── components/           # Reusable UI components
├── lib/
│   ├── api.ts            # Central fetch client (JWT injection + Railway base URL)
│   ├── auth.ts           # Server-side auth utilities
│   └── offline-queue.ts  # IndexedDB offline sale queue
├── backend/              # ASP.NET Core Web API
│   ├── Controllers/      # 11 API controllers
│   ├── Models/           # Domain models
│   ├── Services/         # SupabaseService, TokenService
│   └── Middleware/       # DeviceAuthMiddleware
└── public/               # PWA manifest, icons
```

## Environment Variables

**Frontend (Vercel)**
```
NEXT_PUBLIC_BACKEND_URL=https://your-railway-app.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Backend (Railway)**
```
Supabase__Url=https://your-project.supabase.co
Supabase__ServiceRoleKey=your-service-role-key
Jwt__Secret=your-jwt-secret
Jwt__Issuer=AponkRed
Jwt__Audience=AponkRed
Cors__AllowedOrigins__0=https://your-vercel-app.vercel.app
```

## Local Development

**Frontend**
```bash
npm install
npm run dev
```

**Backend**
```bash
cd backend
dotnet run
```
