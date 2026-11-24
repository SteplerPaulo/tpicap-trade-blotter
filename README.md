
# 🚀 Fusion Trading Workspace — Equity Trade Blotter

An equity trade blotter developed as a technical assessment using React, TypeScript, NestJS, and PostgreSQL.

This is an unofficial assessment project using synthetic trade data.

## Features

- Create, amend, and cancel trades
- Search, filter, sort, and paginate trades
- Real-time updates using WebSockets
- Trade audit history
- Net-position summaries
- CSV export for the current page
- Client and server-side validation
- Concurrent update and conflict handling
- Responsive user interface

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| State Management | TanStack Query |
| Data Table | TanStack Table |
| Forms | React Hook Form, Zod |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, Prisma |
| Real-time | Socket.IO |
| Web Server | Nginx |
| Testing | Jest, Vitest |
| Deployment | Docker Compose |

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Run the Application

From the project root:

```bash
docker compose up -d --build --wait
```

Open http://localhost:8080.

Database migrations and 350 synthetic trade records are automatically initialized on first startup.

### Development Mode

Run both frontend and backend with hot reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build --wait
```

Open http://localhost:5173.

### Service Ports

| Service | Port |
| --- | --- |
| Frontend | 8080 |
| Development Frontend | 5173 |
| Backend | 3001 |
| PostgreSQL | 5433 |

### Stop the Application

```bash
docker compose down
```

Database records are preserved.

## Project Structure

```text
.
├── frontend/
├── backend/
├── database/
├── docs/
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```

## Architecture

```text
React + TypeScript
        |
 REST / WebSocket
        |
      NestJS
        |
      Prisma
        |
    PostgreSQL
```

- PostgreSQL serves as the source of truth.
- WebSocket events notify connected clients of trade changes.
- Trade mutations and audit records are saved atomically.
- Optimistic concurrency prevents conflicting updates.
- Cancelled trades are retained for audit purposes.
- Decimal storage and scaled arithmetic improve financial calculation accuracy.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/health | Health check |
| GET | /api/trades | List trades |
| GET | /api/trades/summary | Trade summary |
| GET | /api/trades/:uuid | Get trade |
| GET | /api/trades/:uuid/audit | Audit history |
| POST | /api/trades | Create trade |
| PATCH | /api/trades/:uuid | Amend trade |
| POST | /api/trades/:uuid/cancel | Cancel trade |

### WebSocket

- Namespace: `/trades`
- Event: `trade.changed`

## Testing

### Backend

```bash
cd backend
npm ci
npm run db:generate
npm test
npm run build
```

### Frontend

```bash
cd frontend
npm ci
npm test
npm run build
```

### Verification Results

Verified on November 24, 2026.

| Check | Backend | Frontend |
| --- | ---: | ---: |
| Passing Tests | 96 | 150 |
| Test Suites | 3 | 6 |
| Production Build | Passed | Passed |
| npm Audit Findings | 0 | 0 |

**Total: 246 passing tests across 9 test suites.**

Final browser regression, fresh-volume installation, and production load testing have not been completed.

## Scope and Limitations

This application is intended for technical assessment purposes.

Authentication, authorization, live market data, external trading integrations, and distributed infrastructure are outside the current scope.

The application should not be publicly exposed without appropriate security controls.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [AI Usage Report](docs/AI_USAGE_REPORT.md)
- [Prompt Log](docs/PROMPT_LOG.md)
