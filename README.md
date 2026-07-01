# Vacation Planner

A lightweight team vacation scheduling SPA built with **Angular 20** and hosted on **GitHub Pages**. Team members log in with their username, register vacation days on a shared calendar, and see the full team's schedule in a Gantt-style history view. All data lives in a single Google Spreadsheet — no dedicated backend required.

---

## What's built

| Page | What it does |
|---|---|
| **Home** | Monthly calendar showing your vacations, teammates' absences, and public holidays. Right sidebar shows team stats and today's absentees with emoji avatars. |
| **History** | Gantt timeline of all vacation registrations, grouped by month. Filterable by month and member name. The logged-in user's bars are highlighted in purple. |
| **Members** | Team cards (color-coded per team) and a full member table with emoji avatars, team color pills, role, and vacation-used count. Default shows top 10; expand to see all. |
| **Holidays** | List of public holidays loaded from the spreadsheet. |

**Auth flow:** Enter your username in the Login dialog. If it matches a row in the Members sheet, you're logged in — no password. Session is persisted in `localStorage` so users stay logged in across page refreshes and return visits.

**Register vacation:** Pick one or more future workdays in the calendar dialog. Deselecting a registered day removes it from the sheet. Submissions are rate-limited to one per 5 minutes per user (enforced client-side via `localStorage`).

**Vacation types:** Each registration carries a type — `Vacation`, `Compensation`, or `Event` — stored as a fourth column in the Vacation-Plan sheet and displayed as a colored badge throughout the UI.

---

## Tech stack

- **Angular 20** — standalone components, lazy-loaded routes, `@angular/build:application` (Vite / esbuild)
- **Tailwind CSS v3** — utility classes; dynamic team/type colors bound via `[style.xxx]` Angular bindings (Tailwind's JIT purger can't see runtime-computed class names)
- **RxJS BehaviorSubject** — lightweight in-memory state (no NgRx); single `MockDataService` owns all streams
- **Google Sheets API v4** — read-only data source for members, holidays, and vacation records
- **Google Apps Script** — write proxy for vacation submissions (Sheets API requires OAuth for writes; Apps Script runs under the sheet owner's account)
- **GitHub Actions + GitHub Pages** — CI/CD; pushes to `main` trigger a production build deployed to the `github-page` branch

---

## Data model

All data lives in **one Google Spreadsheet** with three sheets:

### `Team-Info` — named range `Members`

Six columns, in order:

| A: ID | B: DC | C: Team | D: Role | E: Display Name | F: Username |
|---|---|---|---|---|---|
| 1 | BHS | Engineering | Senior Dev | John Smith | john |

> **Column C is Team (department), column D is Role (position).** In code, `member.department` maps to column C and `member.position` maps to column D.

### `Database` — named range `Holidays`

| Date | Name | Country |
|---|---|---|
| 01/01/2026 | New Year's Day | Vietnam |

Date format is flexible — the parser handles `M/D/YYYY`, `DD/MM/YYYY`, ISO `YYYY-MM-DD`, and Google Sheets serial numbers. The `Country` field is used to filter VN-only holidays in the sidebar.

### `Vacation-Plan`

| Month | Username | Date | Type |
|---|---|---|---|
| 06/2026 | john | 2026-06-15 | Vacation |

One row per person per day. Month is `MM/YYYY` for grouping. Date is `YYYY-MM-DD`. Type is one of `Vacation`, `Compensation`, `Event` (defaults to `Vacation` if missing or unrecognised). This sheet is managed exclusively by the Apps Script.

---

## Registration lock period

To prevent last-minute changes, registration is locked by the 20th of each month:

- **Before the 20th of month M** — users can register from month M+1 onward
- **On or after the 20th of month M** — users can only register from month M+2 onward

The earliest registerable month is computed by `getEarliestAllowedMonth()` in the dialog and calendar components:

```typescript
getEarliestAllowedMonth(): { year: number; month: number } {
  const today = new Date();
  const offset = today.getDate() >= 20 ? 2 : 1;
  const target = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  return { year: target.getFullYear(), month: target.getMonth() + 1 };
}
```

The register dialog enforces this by:
- Opening at the earliest allowed month (not today's month)
- Blocking backward navigation before that month
- Showing an amber banner when viewing a locked month
- Guarding `toggleDay()` and `onSubmit()` against locked months

---

## Team color system

Each team is assigned a deterministic color derived from its name using a djb2-style hash:

```typescript
const teamColorOf = (name: string): TeamColor => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
};
```

The palette has 10 entries (blue, green, orange, purple, rose, cyan, amber, sky, lime, red). A `FALLBACK_COLOR` (slate) covers members without a team. Colors are applied via `[style.background-color]` / `[style.border-color]` bindings rather than computed Tailwind class names, which would be stripped by the purger.

---

## Animal emoji avatars

Every member gets a deterministic animal emoji as their avatar, derived from their username with the same hash pattern:

```typescript
const animalEmoji = (username: string): string => {
  let h = 0;
  for (let i = 0; i < username.length; i++)
    h = (Math.imul(31, h) + username.charCodeAt(i)) | 0;
  return ANIMAL_EMOJIS[Math.abs(h) % ANIMAL_EMOJIS.length];
};
```

The pool has 30 animals. The emoji is stored in `member.avatarUrl` and rendered inside a `bg-gray-100` rounded circle wherever members appear (sidebar user chip, team card stacks, member table, History Gantt list, Home absentee row).

---

## Sidebar

The sidebar is a self-contained `SidebarComponent` that injects `MockDataService` directly (no `@Input()` props). It subscribes to three streams:

- **authenticatedUser$** — user chip at the bottom (emoji + display name + role)
- **vacations$ + authenticatedUser$** via `combineLatest` — **Your Schedule** section: up to 5 upcoming dates for the logged-in user, each row tinted by vacation type (purple = Vacation, cyan = Compensation, orange = Event)
- **holidays$** — **VN Holidays** section: up to 5 upcoming VN public holidays filtered by `country.includes('viet') || country === 'vn'`, rendered as mini cards with a red date chip (month abbreviation + day number) and a proximity label ("Today!", "Tomorrow", "In X days", "Next week", "In ~X months")

Holiday cards are urgency-tinted: `red-100` background + `red-600` chip for today/tomorrow; `red-50` + `red-400` for future dates.

---

## Apps Script (vacation writes)

`apps-script/Code.gs` handles two operations via `doPost`:

**Add days (`action: "add"`):**
```
month|username|date1,date2,...|type
```
Validates `type` against `['Vacation', 'Compensation', 'Event']`, defaults to `'Vacation'`. Appends one row per date: `[month, username, date, type]`.

**Remove days (`action: "remove"`):**
```
month|username|date1,date2,...
```
Deletes rows matching `username + date` (month field is intentionally ignored to avoid format-mismatch bugs — `7/2026` vs `07/2026`).

The request body is sent as `Content-Type: text/plain` to keep the request "simple" (no CORS preflight). Apps Script follows a 302 redirect before responding; a preflight would not survive that redirect.

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

```bash
cp .env.example .env.local
```

```
GOOGLE_API_KEY=AIzaSy...
GOOGLE_SHEET_ID=1jTy6D...
VACATION_API_URL=https://script.google.com/macros/s/.../exec
```

### 3 — Run

```bash
npm start
```

`scripts/setup-env.js` reads `.env.local` and writes `src/environments/environment.ts` and `environment.development.ts`. Both are gitignored — never commit them.

---

## Google Cloud setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Library**
2. Enable **Google Sheets API**
3. **Credentials → Create credentials → API key**
4. Restrict the key to the Sheets API and your GitHub Pages domain
5. In the spreadsheet: **Share → Anyone with the link → Viewer**

---

## Apps Script setup

1. Open the spreadsheet → **Extensions → Apps Script**
2. Paste `apps-script/Code.gs` (replace all existing code)
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the URL → paste into `.env.local` as `VACATION_API_URL`

> Every code change requires a new deployment version (Deploy → Manage deployments → New version). The URL stays the same.

---

## GitHub Pages deployment

The workflow (`.github/workflows/deploy.yml`) fires on every push to `main`:

1. Installs dependencies
2. Generates environment files from GitHub Actions secrets
3. Builds with `--configuration=production-ci` (output to `docs/`)
4. Copies `docs/index.html` → `docs/404.html` for SPA deep-link support
5. Force-pushes `docs/` to the `github-page` branch

### Secrets (Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `GOOGLE_API_KEY` | Google API key |
| `GOOGLE_SHEET_ID` | Spreadsheet ID |
| `VACATION_API_URL` | Apps Script Web App URL |

### Pages (Settings → Pages)
- Source: **Deploy from a branch**
- Branch: `github-page` / `docs`

If you use a custom domain or a user/org page at `/`, add a repository variable `BASE_HREF=/`.

---

## Project structure

```
src/
  app/
    app.ts                                    # Root: header, sidebar, router outlet, auth state
    app.routes.ts                             # Lazy-loaded routes: /, /history, /members, /holidays
    app.config.ts                             # provideRouter, provideHttpClient, provideAnimationsAsync
    core/
      models/models.ts                        # Member, Holiday, Vacation (with VacationType), CalendarDay
      services/
        api.service.ts                        # Sheets API reads + Apps Script writes; animal emoji hash
        mock-data.service.ts                  # BehaviorSubject state, localStorage auth, submitVacation()
    features/
      home/
        home.component.ts                     # Calendar layout + stats sidebar + absentees
        calendar.component.ts                 # Monthly grid; opens at earliest registerable month
      history/
        history.component.ts                  # Gantt timeline; emoji avatars; color by user/team
      members/
        members.component.ts                  # Team cards (color-coded) + member table + vacation counts
      holidays/
        holidays.component.ts                 # Holiday list
    shared/
      components/
        login-dialog.component.ts             # Username login with loading state
        register-vacation-dialog.component.ts # Date picker with lock period + diff tracking
        sidebar.component.ts                  # Nav + Your Schedule + VN Holidays + user chip

  environments/                               # .gitignored — generated by scripts/setup-env.js

scripts/
  setup-env.js                                # Reads .env.local → writes environment files

apps-script/
  Code.gs                                     # Apps Script: doPost add/remove, doGet for reads
```

---

## Key design decisions

**Why `[style.xxx]` bindings for dynamic colors?**  
Tailwind's JIT purger scans source files for class name strings at build time. Dynamically computed class names (e.g. `bg-${color}-500`) are never seen and get stripped. Angular's `[style.background-color]` binding bypasses the purger entirely and sets inline styles at runtime.

**Why no NgRx / signals?**  
The app is small and all state flows from a single service. `BehaviorSubject` streams keep the dependency footprint minimal. Migrating to Angular signals is a natural next step if the app grows.

**Why Apps Script for writes?**  
The Sheets API v4 requires OAuth2 for writes, which needs a backend to safely hold the client secret. Apps Script is the zero-backend alternative — it executes server-side under the sheet owner's account.

**Why `Content-Type: text/plain` for Apps Script POST?**  
A `text/plain` body keeps the request "simple" (no CORS preflight), so the browser follows Apps Script's 302 redirect transparently. `application/json` would trigger a preflight that the redirect can't survive.

**Why hash-based team colors and emoji avatars?**  
Both are derived deterministically from a string (team name or username) so they are stable across sessions and builds without needing any extra data column in the spreadsheet. Same input always produces the same output.

**Why `outputPath.browser: ""`?**  
`@angular/build:application` nests output under `docs/browser/` by default, breaking GitHub Pages routing. Setting `browser: ""` flattens everything into `docs/`.

---

## Known limitations & future work

| Area | Status |
|---|---|
| **Vacation day counts** | `daysUsed` / `daysLeft` come from the Members sheet and are updated optimistically on the client. Must be updated manually in the sheet for long-term accuracy. |
| **Authentication** | Username-only login — no password or session token. Suitable for an internal tool; not for public exposure. |
| **Lock period is client-side** | The 20th-of-month cutoff is enforced in the browser. The Apps Script does not validate dates, so a user could submit via direct HTTP. |
| **Rate limiting** | The 5-minute submission lock is `localStorage`-only. A user can bypass it by clearing storage or using a private tab. |
| **Offline / caching** | No service worker. The app requires a live Google Sheets connection on load. |
| **Write confirmation** | Local state is updated optimistically after submission. A hard page refresh shows the authoritative server state. |
