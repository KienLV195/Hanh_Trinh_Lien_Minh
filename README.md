# HÀNH TRÌNH LIÊN MINH

Technical skeleton for a browser-based multiplayer educational adventure. One Host browser renders
the projected game through React and Phaser. Player phones use a lightweight React controller. A
Fastify and Socket.IO server is the authoritative realtime boundary.

Prompt 2 provides infrastructure only. Production lobby logic, character claiming, scoring, seven
mini-games, official educational content, final artwork and audio are intentionally deferred.

## Architecture

```text
Player React UI ─┐
                 ├─ Socket.IO ─ Fastify authoritative server
Host React UI ───┘                    │
      │                               └─ In-memory RoomStateStore boundary
      └─ GameBridge ─ Phaser canvas
```

React owns the DOM shell. Phaser owns only its canvas. Shared protocol and domain packages prevent
frontend and backend contracts from drifting.

## Prerequisites

- Node.js 22 or newer
- pnpm 10 or newer. The repository records pnpm 11.8.0 in `packageManager`.

## Install

```bash
pnpm install
```

Copy `.env.example` to `.env` only when overriding defaults. No secrets are required for local
development.

## Development

Start frontend and backend together:

```bash
pnpm dev
```

Or start them separately:

```bash
pnpm dev:server
pnpm dev:web
```

Local URLs:

- Development landing: `http://localhost:5173/`
- Host: `http://localhost:5173/host`
- Phaser test: `http://localhost:5173/host/DEMO`
- Player: `http://localhost:5173/join`
- Player with room: `http://localhost:5173/play/DEMO`
- Server health: `http://localhost:3001/health`

## Quality commands

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

The Host page is the manual Phaser lifecycle smoke test. Navigate from `/host/DEMO` back to `/`, then
return to the Host route. Only one canvas should exist, it should remain centered at 16:9, and no
duplicate animation should appear.

## Environment variables

| Variable                | Default                 | Purpose                                |
| ----------------------- | ----------------------- | -------------------------------------- |
| `HOST`                  | `0.0.0.0`               | Backend bind address                   |
| `PORT`                  | `3001`                  | Backend port                           |
| `WEB_ORIGIN`            | `http://localhost:5173` | Production CORS origin                 |
| `PROTOCOL_VERSION`      | `1.0.0`                 | Shared protocol compatibility          |
| `STATIC_DIR`            | empty                   | Optional absolute Vite build directory |
| `VITE_SERVER_URL`       | `http://localhost:3001` | Frontend health API URL                |
| `VITE_SOCKET_URL`       | `http://localhost:3001` | Frontend Socket.IO URL                 |
| `VITE_PROTOCOL_VERSION` | `1.0.0`                 | Frontend expected protocol             |

## Folder structure

```text
apps/
  server/              Fastify, Socket.IO and room-store boundaries
  web/                 React routes and Host Phaser integration
packages/
  protocol/            Shared realtime envelopes and event maps
  game-domain/         Locked characters and foundational domain types
  challenge-schema/    Zod challenge definitions and safe public payloads
  level-config/        Seven locked level metadata entries
  asset-manifest/      Asset manifest contracts
  test-fixtures/       Placeholder challenge fixtures
content/
  demo/                Schema-only placeholder content
  official/            Reserved for reviewed academic content
assets/                Empty production asset namespaces
docs/                  Architecture notes
tests/                 Cross-package security tests
```

## Docker

The root `Dockerfile` builds all packages and the Vite application, then runs the Fastify server with
the web build configured as static content.

```bash
docker build -t hanh-trinh-lien-minh .
docker run --rm -p 3001:3001 hanh-trinh-lien-minh
```

Open `http://localhost:3001`. Local development does not require Docker.
