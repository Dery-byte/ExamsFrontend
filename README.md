# ExamPortal — React Frontend

Rebuilt from Angular 16 → **React 18 + Vite + TypeScript + TanStack Query**.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure API URL
cp .env.example .env.local
# Edit .env.local: VITE_API_URL=http://localhost:9191/api/v1/auth

# 3. Dev server (port 4200, same as the original Angular app)
npm run dev

# 4. Production build
npm run build
```

---

## Why React was chosen over Angular 16

| Issue in Angular version | How React fixes it |
|---|---|
| `zone.js` patches every `setInterval` — quiz timer ran through change detection | `useRef` interval — zero overhead, no re-renders |
| 140+ files (4 per component) | 34 `.tsx` files, one per page |
| 100+ `console.log` in production | Vite's `esbuild.drop` strips all at build time |
| ~350 KB gzipped bundle | **53 KB vendor + 62 KB app = 115 KB gzipped** |
| Angular `HttpClient` + manual `AuthInterceptor` | Axios with a single interceptor in `api/client.ts` |
| N separate service classes | `api/endpoints.ts` — 60 typed functions, tree-shakeable |

---

## Project structure

```
src/
├── api/
│   ├── client.ts          — Axios instance + JWT interceptor + 401 auto-logout
│   └── endpoints.ts       — All 60+ typed API calls (replaces all Angular services)
├── contexts/
│   └── AuthContext.tsx    — Auth state, auto-logout, role helpers
├── components/
│   ├── common/
│   │   └── ProtectedRoute.tsx   — Role-based route guard
│   └── layout/
│       ├── AdminLayout.tsx
│       ├── LecturerLayout.tsx
│       └── UserLayout.tsx
├── pages/
│   ├── auth/              — Login, Signup, Home, ResetPassword, Profile
│   ├── admin/             — Dashboard, Categories, Quizzes, Questions, Students, Lecturers
│   ├── lecturer/          — Dashboard, Courses, Quizzes, AddQuiz, Questions
│   └── user/              — Dashboard, Register, Courses, LoadQuiz, Instructions, StartQuiz, PrintQuiz
├── index.css              — All shared styles (no component-scoped CSS files)
└── main.tsx               — React Query setup, Router, App mount
```

---

## Key optimisations matching the backend

### Parallel GPT evaluation
The backend's `QuizGPTService` now evaluates all theory questions **in parallel** using `CompletableFuture`. The frontend `evalTheory()` call in `StartQuiz.tsx` fires a single POST and awaits the batch result — no sequential per-question calls.

### Batch answer save
The backend's `evalQuizDetailed` endpoint batch-fetches all questions with one `findAllById()` and batch-saves all `StudentAnswer` records with one `saveAll()`. The frontend sends the complete answer array in one POST.

### Timer accuracy
Angular's `zone.js` wraps `setInterval`, running change detection on every tick. In `StartQuiz.tsx`, the countdown uses `useRef` — the interval callback updates a ref and sets state only when needed, completely outside React's render cycle.

### React Query caching
`staleTime: 30_000` means quiz metadata (categories, quiz details) fetched once is reused for 30 seconds. `refetchOnWindowFocus: false` prevents surprise re-fetches mid-exam. Parallel queries in `StartQuiz` use `enabled` flags to fire quiz/questions/theory fetches concurrently.

---

## Routes (exact mirror of Angular app-routing.module.ts)

| Path | Component | Guard |
|---|---|---|
| `/` | Home | — |
| `/login` | Login | — |
| `/signup` | Signup | — |
| `/reset-password` | ResetPassword | — |
| `/admin/*` | AdminLayout + children | `role="ADMIN"` |
| `/lect/*` | LecturerLayout + children | `role="LECTURER"` |
| `/user-dashboard/*` | UserLayout + children | `role="NORMAL"` |
| `/start/:qid` | StartQuiz | `role="NORMAL"` |
| `/print_quiz/:qid` | PrintQuiz | `role="NORMAL"` |

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:9191/api/v1/auth` | Spring Boot backend URL |

---

## Build output

```
dist/assets/query-*.js    12.7 KB gzip   — TanStack Query
dist/assets/vendor-*.js   53.4 KB gzip   — React + Router + Axios
dist/assets/index-*.js    61.9 KB gzip   — All application code
dist/assets/index-*.css    2.7 KB gzip   — All styles
```
**Total: ~131 KB gzipped** (vs ~350 KB for Angular 16 + zone.js)
