# Admin Access for Testing (UniPilot)

## Option 1: With backend (Node.js + SQLite) — recommended

1. Install and seed: `npm install` then `npm run seed`
2. Start API: `npm run server` (http://localhost:3001)
3. In `.env` set: `VITE_BACKEND_URL=http://localhost:3001`
4. Start frontend: `npm run dev`

**Logins after seed:**

| Role    | Email                   | Password     |
|---------|-------------------------|--------------|
| Admin   | admin@unipilot.local    | Admin123!    |
| Student | student@unipilot.local | Student123!  |

---

## Demo mode (no backend)

When the app runs **without** `VITE_BACKEND_URL` (or with an empty value), it uses **demo mode** with in-browser storage.

### Admin login (Demo)

- **Email:** `admin@unipilot.local` (or any email that **starts with** `admin@`, e.g. `admin@test.com`)
- **Password:** any (ignored in demo)

After login you will have:
- **Admin Panel** in the sidebar
- **Full course tree** on the Subject Tree page (entire catalog)
- **Catalog CRUD** in Admin: Add / Edit / Delete catalog courses (credit hours, order, prerequisite)

### Student login (Demo)

- **Email:** any email that does **not** start with `admin@` (e.g. `student@test.com`)
- **Password:** any

Students see:
- **Subject Tree** with only their enrolled courses and hour totals (enrolled vs catalog)
- **Courses** page: “Available courses” (from catalog) with **Enroll** locked until the previous course in the tree is enrolled

---

## With real backend

Use your backend’s admin user (e.g. a user with `role: 'admin'`).  
Catalog and course-tree APIs are:

- `GET/POST /api/catalog/courses` — list, create
- `GET/PATCH/DELETE /api/catalog/courses/:id` — get, update, delete  
Catalog course body: `course_code`, `course_name`, `department`, `description`, `credit_hours`, `order`, `prerequisite_id`.

- `GET /api/student/courses` — list enrolled (optional: `catalog_course_id`, `credit_hours` for tree and prerequisites)
