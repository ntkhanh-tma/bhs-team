# Security Notes

This is a **static site** (Angular on GitHub Pages). It has no server of its
own. Everything it needs to run — code, config, any key baked into the bundle —
is downloaded to every visitor and can be read from DevTools. That single fact
drives everything below.

## The core limitation: a static site cannot keep a secret

Any value the browser must hold (an API key, the gateway secret, a decryption
key) is public. Route guards and the username "login" are **UI conveniences,
not access controls** — the browser is under the visitor's control. The only
real trust boundary is code that runs somewhere the visitor cannot see: here,
the Google Apps Script gateway (`apps-script/Code.gs`), which runs as the sheet
owner.

## What was wrong (audit, 2026-07-09)

1. **Full employee PII was world-readable.** The spreadsheet was shared "anyone
   with the link", so the entire `Team-Info` tab — names, usernames, internal
   IPs, public IPs, PC names, MAC addresses, BHS emails, mobile numbers,
   birthdays — was downloadable by anyone, with no key, via Google's public CSV
   export/gviz endpoints. The spreadsheet ID shipped in the JS bundle. Rotating
   the API key did **not** address this.
2. **Unauthenticated write endpoint.** The Apps Script was public and did no
   authentication. `handleUpdateProfile` authorized writes on `id` +
   `authUsername` taken from the request body — both public from (1) — so anyone
   could overwrite any teammate's profile. `handleVacation` trusted a
   client-supplied `username`, so anyone could edit anyone's leave.
3. **"Login" is not authentication.** It is just typing a known username; no
   secret is involved.
4. **API key + all data shipped to the browser**, requiring the sheet to be
   public for the client-side key to work.
5. **API Ninjas key** shipped in the bundle (still does — see below).

## Fixes applied in this repo

- **All sheet access now goes through the gateway.** `ApiService` no longer
  calls `sheets.googleapis.com`; every read is a gateway `action` and every
  write posts to it. **No Google API key or spreadsheet ID ships in the bundle**
  anymore (`googleApiKey` / `googleSheetId` removed from the environment,
  `setup-env.js`, and `deploy.yml`). This lets the sheet be made **private**.
- **The gateway requires a shared secret** (`APP_SECRET` script property,
  mirrored by the `GATEWAY_SECRET` build secret). Requests without it are
  rejected (fail-closed — if no secret is configured, nothing is served).
- **Sensitive columns are withheld from the bulk member list.** The `members`
  action returns only id/name/team/role/username. IP, public IP, PC name, MAC,
  email, mobile and birthday are returned **only** by the single-user `profile`
  action, so they can no longer be scraped in one request. The members hover
  card no longer shows colleagues' IP/mobile.
- **Writes are validated server-side** (date format checks; type whitelist).
- **CSP** dropped `sheets.googleapis.com` from `connect-src`.

## Honest limits of these fixes (why they are necessary but not sufficient)

The gateway secret is injected into the published bundle, so a determined
visitor can still extract it — it is **obfuscation, not confidentiality**. With
it they could still call the gateway. What the fix genuinely buys:

- The zero-effort "export the whole sheet as CSV" attack is gone (sheet private).
- The most sensitive fields aren't in any bulk response.
- The secret rotates independently of Google Cloud; the gateway can add
  rate-limiting/logging.

But because the "login" is still just a username (not a credential), the gateway
cannot truly tell one user from another. Anyone who extracts the secret can
still request individual profiles or submit writes on another user's behalf.
**Closing that requires real authentication** — see below.

## Required owner actions (cannot be done in code)

1. **Set the `APP_SECRET` script property** in the Apps Script project and the
   matching `GATEWAY_SECRET` GitHub Actions secret.
2. **Make the spreadsheet private** (Share → General access → Restricted). The
   gateway reads it as you; the app never touches it directly.
3. **Delete the now-unused secrets:** `GOOGLE_API_KEY`, `GOOGLE_SHEET_ID`.
4. **Rotate the API Ninjas key** (`API_NINJAS_KEY`) — it shipped in the bundle
   and should be considered burned. Better: proxy the riddle call through the
   gateway so the key stops shipping at all.
5. **Purge history is optional.** The old key/sheet ID live in past `deploy:`
   commits; rotation + privatizing the sheet is the real remedy.

## The real next step: authentication

To actually protect per-user data, add an identity the client cannot forge.
Options, cheapest first:

- **Per-user PIN/password** stored (hashed) in the sheet; the gateway verifies
  it before returning a profile or accepting a write. Simple, no external deps.
- **Google Sign-In**: deploy the web app with "Execute as: Me, Access: Anyone
  with a Google account" and read `Session.getActiveUser().getEmail()` in the
  gateway to bind requests to a real identity — no client secret at all.
- **A real backend / auth provider** if the app grows beyond a small team.

Until one of these is in place, treat the gateway secret as a speed bump and do
not put anything in the sheet that would be damaging if leaked to a determined
insider.
