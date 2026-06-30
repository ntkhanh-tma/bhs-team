# Vacation Planner

A lightweight team vacation scheduling SPA built with **Angular 20** and hosted on **GitHub Pages**. Team members log in with their username, register vacation days on a shared calendar, and see the full team's schedule in a Gantt-style history view. All data lives in a single Google Spreadsheet — no dedicated backend required.

---

## What's built

| Page | What it does |
|---|---|
| **Home** | Monthly calendar showing your vacations, teammates' absences, and public holidays. Right sidebar shows team members with their remaining day counts and today's absentees. |
| **History** | Gantt timeline of all vacation registrations, grouped by month. Filterable by month and member name. The logged-in user's bars are highlighted in purple. |
| **Members** | Cards and a table listing every team member with department, position, and used / remaining vacation days. |

**Auth flow:** Enter your username in the Login dialog. If it matches a row in the Members sheet, you're logged in. No password — designed for internal team use.

**Register vacation:** Pick one or more future workdays in the calendar dialog. Deselecting a day that was already registered removes it from the sheet. Submissions are rate-limited to one per 5 minutes per user (enforced client-side via `localStorage`).

---

## Tech stack

- **Angular 20** — standalone components, lazy-loaded routes, `@angular/build:application` (Vite / esbuild under the hood)
- **Tailwind CSS v3** — utility classes; configured via `tailwind.config.js` + PostCSS
- **Angular Material** — dialogs, form fields, animations
- **RxJS BehaviorSubject** — lightweight in-memory state (no NgRx); single `MockDataService` owns all streams
- **Google Sheets API v4** — read-only data source for members, holidays, and vacation records
- **Google Apps Script** — write proxy for vacation submissions (the Sheets API requires OAuth for writes; Apps Script runs under the sheet owner's account)
- **GitHub Actions + GitHub Pages** — CI/CD; pushes to `main` trigger a production build deployed to the `github-page` branch

---

## Data model

All data lives in **one Google Spreadsheet** with three sheets:

### `Team-Info` — named range `Members`
| Username | Name | Department | Position | Days Used | Days Left | Avatar URL |
|---|---|---|---|---|---|---|
| john | John Smith | Engineering | Senior Dev | 5 | 15 | _(optional)_ |

### `Database` — named range `Holidays`
| Date | Name |
|---|---|
| 01/01/2026 | New Year's Day |

Date format is flexible — the parser handles `M/D/YYYY`, `DD/MM/YYYY`, ISO `YYYY-MM-DD`, and Google Sheets serial numbers.

### `Vacation-Plan`
| Month | Username | Date |
|---|---|---|
| 06/2026 | john | 2026-06-15 |

One row per person per day. Month is `MM/YYYY` for easy grouping. Date is `YYYY-MM-DD`. This sheet is managed by the Apps Script (reads go directly through the Sheets API).

---

## Local development

### Prerequisites
- Node.js 22+
- Angular CLI (`npm install -g @angular/cli`)

### 1 — Clone and install

```bash
git clone <your-repo-url>
cd vacation-planner
npm install
```

### 2 — Create `.env.local`

Copy the template and fill in your values:

```bash
cp .env.example .env.local
```

```
GOOGLE_API_KEY=AIzaSy...          # Google Cloud → APIs & Services → Credentials
GOOGLE_SHEET_ID=1jTy6D...        # From the spreadsheet URL
VACATION_API_URL=https://script.google.com/macros/s/.../exec   # See Apps Script setup below
```

### 3 — Run

```bash
npm start          # runs node scripts/setup-env.js then ng serve
```

`scripts/setup-env.js` reads `.env.local` and writes `src/environments/environment.ts` and `environment.development.ts`. Both files are gitignored — never commit them.

---

## Google Cloud setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Library**
2. Enable **Google Sheets API**
3. **Credentials → Create credentials → API key**
4. Restrict the key to the Sheets API and to your GitHub Pages domain (optional but recommended)
5. In the spreadsheet: **Share → Anyone with the link → Viewer** (required for API key access)

---

## Apps Script setup (vacation writes)

The Sheets API v4 is read-only with an API key. Vacation submissions are routed through a Google Apps Script Web App that runs under the sheet owner's account.

1. Open the Google Spreadsheet → **Extensions → Apps Script**
2. Paste the contents of `apps-script/Code.gs` into the editor (replace any existing code)
3. Save, then **Deploy → New deployment → Web app**
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Copy the deployment URL (looks like `https://script.google.com/macros/s/AKfycbw.../exec`)
5. Paste it into `.env.local` as `VACATION_API_URL=<url>`

> **Re-deploying after code changes:** Every edit requires a new deployment (Deploy → Manage deployments → New version). The URL stays the same for the same deployment; only the version increments.

---

## GitHub Pages deployment

The workflow (`.github/workflows/deploy.yml`) fires on every push to `main`:

1. Installs dependencies
2. Generates environment files from GitHub Actions secrets
3. Builds with `--configuration=production-ci` (fonts inlined, output to `docs/`)
4. Copies `docs/index.html` → `docs/404.html` for SPA deep-link support
5. Force-pushes `docs/` to the `github-page` branch (orphan branch, only contains the build output)

### One-time GitHub configuration

**Actions secrets** — Settings → Secrets and variables → Actions → Repository secrets:

| Secret | Value |
|---|---|
| `GOOGLE_API_KEY` | Your Google API key |
| `GOOGLE_SHEET_ID` | Your spreadsheet ID |
| `VACATION_API_URL` | Your Apps Script Web App URL |

**Pages** — Settings → Pages:
- Source: **Deploy from a branch**
- Branch: `github-page` / `docs`

**Base href** — by default the workflow uses `/<repo-name>/`. If you use a custom domain or a user/org page (served from `/`), add a repository variable `BASE_HREF=/` under Settings → Secrets and variables → Actions → Variables.

---

## Project structure

```
src/
  app/
    app.ts                          # Root component: header, sidebar, router outlet
    app.routes.ts                   # Lazy-loaded routes: /, /history, /members
    app.config.ts                   # provideRouter, provideHttpClient(withFetch()), provideAnimationsAsync()
    core/
      models/models.ts              # Member, Holiday, Vacation, CalendarDay interfaces
      services/
        api.service.ts              # HTTP calls: Sheets API (read) + Apps Script (write)
        mock-data.service.ts        # BehaviorSubject state, auth, display names, submitVacation()
    features/
      home/
        home.component.ts           # Layout shell: calendar + sidebar
        calendar.component.ts       # Monthly grid, vacation dots, holiday markers
      history/
        history.component.ts        # Gantt timeline grouped by month
      members/
        members.component.ts        # Member cards + sortable table
    shared/
      components/
        login-dialog.component.ts         # Username login, shows loading while API fetches
        register-vacation-dialog.component.ts  # Date picker with diff tracking and lock timer
        sidebar.component.ts              # Member list, day counts, today's absentees

  environments/                     # .gitignored — generated by scripts/setup-env.js
    environment.ts                  # production: true
    environment.development.ts      # production: false

scripts/
  setup-env.js                      # Reads .env.local / process.env, writes environment files

apps-script/
  Code.gs                           # Google Apps Script source — paste into Apps Script editor
```

---

## Key design decisions

**Why no NgRx / signals?**  
The app is small and all state flows from a single service. `BehaviorSubject` streams are sufficient and keep the dependency footprint minimal. Migrating to Angular signals is a natural next step if the app grows.

**Why Apps Script for writes?**  
The Sheets API v4 requires OAuth2 for writes, which needs a backend to safely hold the client secret. Apps Script is the zero-backend alternative — it executes server-side under the sheet owner's account and exposes a simple HTTPS endpoint.

**Why `Content-Type: text/plain` for the Apps Script POST?**  
Apps Script Web Apps respond with a 302 redirect before the final response. A `text/plain` body keeps the request "simple" (no CORS preflight), so the browser follows the redirect transparently. Sending `application/json` would trigger a preflight that the redirect doesn't survive.

**Why Tailwind v3 and not v4?**  
Angular's esbuild pipeline doesn't pick up Tailwind v4's `@tailwindcss/postcss` plugin reliably. v3 with `tailwind.config.js` and standard PostCSS works without friction.

**Why `outputPath.browser: ""`?**  
`@angular/build:application` nests output under `docs/browser/` by default, which breaks GitHub Pages routing. Setting `browser: ""` flattens everything into `docs/`.

---

## Known limitations & future work

| Area | Status |
|---|---|
| **Vacation day counts** | `daysUsed` / `daysLeft` come from the Members sheet and are updated optimistically on the client after a submission. They must be updated manually in the sheet to stay accurate long-term. |
| **Authentication** | Username-only login — no password or session token. Suitable for an internal tool on a private team; not suitable for public exposure. |
| **Vacation notes** | The dialog has no note field (removed because the Vacation-Plan sheet has no note column). Add a `Note` column (column D) in the sheet and a fourth field to the Apps Script / `parseVacations()` / dialog to enable it. |
| **Offline / caching** | No service worker. The app requires a live connection to Google Sheets on load. |
| **Write confirmation** | After a successful submission the local state is updated optimistically. The sheet is authoritative; a hard page refresh will always show the server truth. |
| **Rate limiting** | The 5-minute lock is client-side only (`localStorage`). A determined user can bypass it by clearing storage or opening a private tab. Server-side rate limiting would require a proper backend. |
