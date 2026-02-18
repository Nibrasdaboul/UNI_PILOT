# UniPilot Backend (Node.js + SQLite)

Run the API so the React app can use a real database instead of demo mode.

## Setup

```bash
cd server
npm install
```

## Seed users (run once)

```bash
npm run seed
```

Creates:
- **Admin:** `admin@unipilot.local` / `Admin123!`
- **Student:** `student@unipilot.local` / `Student123!`

## Start the API

```bash
npm start
```

Server runs at **http://localhost:3001**.

## Use with the frontend

1. In project root (`frontend-vite`), create or edit `.env`:
   ```
   VITE_BACKEND_URL=http://localhost:3001
   ```
2. Restart the Vite dev server (`npm run dev`).
3. Open the app and log in with the seeded accounts.

## Database

- **SQLite** file: `server/unipilot.db` (created on first run).
- Tables: `users`, `catalog_courses`, `student_courses`.

## API base

All routes are under `/api`:
- `POST /api/auth/register` – register (role: student)
- `POST /api/auth/login` – login (returns `access_token`, `user`)
- `GET /api/auth/me` – current user (Bearer token)
- `GET /api/catalog/courses` – list catalog (no auth)
- `POST/PATCH/DELETE /api/catalog/courses` – admin only
- `GET/POST/DELETE /api/student/courses` – student enrollments
- `GET /api/admin/stats`, `GET /api/admin/users`, etc. – admin only
