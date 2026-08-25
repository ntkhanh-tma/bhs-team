import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Member } from '../models/models';
import { toMember, MemberDetailDto } from '../models/api.models';

const REFRESH_KEY = 'bhs_refresh_token';
const ACCESS_KEY = 'bhs_access_token';
const ACCESS_EXPIRY_KEY = 'bhs_access_expires_at';
const USER_KEY = 'bhs_user';

/** Treat a token expiring within this window as already gone. */
const EXPIRY_SKEW_MS = 60_000;

/**
 * The password every reset lands on. Must match AuthService.DefaultPassword in the
 * API — it is shown to the user after a reset, so the two cannot drift.
 */
export const DEFAULT_PASSWORD = 'Password#123';

export interface LoginResult {
  /** True when this member has never set a password (imported from the sheet). */
  mustSetPassword: boolean;
  /** Short-lived, single-purpose token for the password setup screen. */
  passwordSetupToken?: string;
}

interface LoginResponse {
  accessToken?: string;
  expiresAt?: string;
  refreshToken?: string;
  mustSetPassword: boolean;
  passwordSetupToken?: string;
  user?: MemberDetailDto;
}

/**
 * Real authentication, replacing the old "find the typed username in the member
 * list we already downloaded" check.
 *
 * Token storage: the access token, its expiry and the signed-in member are all
 * persisted to localStorage alongside the refresh token, so a page reload resumes
 * the session with no network call at all. An HttpOnly refresh cookie would be the
 * textbook answer but is unusable here — GitHub Pages and Azure App Service are
 * different registrable domains, so the cookie would be third-party and is
 * unreliable in current browsers.
 *
 * Persisting the access token is not the exposure it looks like: the refresh token
 * was already in localStorage and can mint access tokens on demand, so anything
 * able to read one could already read the other. What it buys is real — the API
 * now issues fortnight-long access tokens, and rotating a refresh token is a
 * database write. Restoring from memory instead of calling /auth/refresh on every
 * page load is what keeps Neon's compute suspended between actual changes.
 * Revocation no longer depends on the token being short-lived: the API re-checks
 * each member's security stamp per request, so a password reset kills a stored
 * token immediately.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private accessTokenValue: string | null = null;
  private refreshInFlight$: Observable<string> | null = null;

  private readonly currentUser$$ = new BehaviorSubject<Member | null>(null);
  readonly currentUser$ = this.currentUser$$.asObservable();

  get accessToken(): string | null { return this.accessTokenValue; }
  get currentUser(): Member | null { return this.currentUser$$.value; }

  isAuthenticated(): boolean { return this.currentUser$$.value !== null; }
  isAdmin(): boolean { return this.currentUser$$.value?.accessRole === 'Admin'; }

  private get storedRefreshToken(): string | null {
    return this.read(REFRESH_KEY);
  }

  private setRefreshToken(token: string | null): void {
    this.write(REFRESH_KEY, token);
  }

  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private write(key: string, value: string | null): void {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch { /* private browsing */ }
  }

  /** The stored access token, or null if absent, unparseable or about to expire. */
  private get liveStoredAccessToken(): string | null {
    const token = this.read(ACCESS_KEY);
    const expiresAt = this.read(ACCESS_EXPIRY_KEY);
    if (!token || !expiresAt) return null;

    const expiry = Date.parse(expiresAt);
    if (Number.isNaN(expiry) || expiry - Date.now() <= EXPIRY_SKEW_MS) return null;

    return token;
  }

  private get storedUser(): MemberDetailDto | null {
    const raw = this.read(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as MemberDetailDto; } catch { return null; }
  }

  // ── Session lifecycle ──────────────────────────────────────────────────────

  /**
   * Called once at bootstrap. Always resolves — a failed restore simply means
   * "not signed in".
   *
   * The stored access token is preferred over the refresh token: rotating a refresh
   * token writes two rows, and doing that on every page load is what used to keep
   * the database awake all day. /auth/refresh is now only reached once the access
   * token has actually expired, i.e. about once a fortnight per member.
   */
  restoreSession(): Observable<Member | null> {
    if (!this.base) return of(null);

    const storedUser = this.storedUser;
    const accessToken = this.liveStoredAccessToken;

    if (accessToken && storedUser) {
      this.accessTokenValue = accessToken;
      this.currentUser$$.next(toMember(storedUser, 0));
      return of(this.currentUser);
    }

    if (!this.storedRefreshToken) return of(null);

    return this.refresh$().pipe(
      map(() => this.currentUser),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  login(username: string, password: string): Observable<LoginResult> {
    return this.http
      .post<LoginResponse>(`${this.base}/api/auth/login`, {
        username: username.trim().toLowerCase(),
        password,
      })
      .pipe(map(res => this.applyLogin(res)));
  }

  setInitialPassword(passwordSetupToken: string, newPassword: string): Observable<LoginResult> {
    return this.http
      .post<LoginResponse>(`${this.base}/api/auth/set-initial-password`, {
        passwordSetupToken,
        newPassword,
      })
      .pipe(map(res => this.applyLogin(res)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/api/auth/change-password`, { currentPassword, newPassword })
      .pipe(tap(() => this.clearSession()));
  }

  /**
   * Self-service reset back to {@link DEFAULT_PASSWORD}. The API revokes every
   * session, so the local one is cleared too and the member signs in again.
   */
  resetMyPassword(): Observable<void> {
    return this.http
      .post<void>(`${this.base}/api/auth/reset-my-password`, {})
      .pipe(tap(() => this.clearSession()));
  }

  logout(): void {
    const refreshToken = this.storedRefreshToken;
    if (refreshToken) {
      // Best-effort revoke; the local session is cleared either way.
      this.http.post(`${this.base}/api/auth/logout`, { refreshToken })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.clearSession();
  }

  /** Called by the interceptor when the API rejects a token. */
  forceLogout(): void { this.clearSession(); }

  /**
   * Exchanges the stored refresh token for a fresh access token. Concurrent 401s
   * share a single in-flight request rather than each starting their own rotation
   * (which would invalidate one another).
   */
  refresh$(): Observable<string> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const refreshToken = this.storedRefreshToken;
    if (!refreshToken) return throwError(() => new Error('No refresh token.'));

    this.refreshInFlight$ = this.http
      .post<LoginResponse>(`${this.base}/api/auth/refresh`, { refreshToken })
      .pipe(
        map(res => {
          this.applyLogin(res);
          if (!res.accessToken) throw new Error('Refresh did not return an access token.');
          return res.accessToken;
        }),
        catchError(err => {
          this.clearSession();
          return throwError(() => err);
        }),
        finalize(() => { this.refreshInFlight$ = null; }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshInFlight$;
  }

  /** Re-reads the signed-in member (used after a self-service profile edit). */
  reloadCurrentUser(): Observable<Member | null> {
    if (!this.isAuthenticated()) return of(null);
    return this.http.get<MemberDetailDto>(`${this.base}/api/auth/me`).pipe(
      map(dto => {
        const member = toMember(dto, 0);
        this.currentUser$$.next(member);
        return member;
      }),
      catchError(() => of(this.currentUser)),
    );
  }

  /** Lets DataService patch the cached user after a local update. */
  patchCurrentUser(member: Member): void { this.currentUser$$.next(member); }

  // ── Internals ──────────────────────────────────────────────────────────────

  private applyLogin(res: LoginResponse): LoginResult {
    if (res.mustSetPassword) {
      return { mustSetPassword: true, passwordSetupToken: res.passwordSetupToken };
    }

    this.accessTokenValue = res.accessToken ?? null;
    this.setRefreshToken(res.refreshToken ?? null);

    // Persisted so the next page load can resume without calling the API.
    this.write(ACCESS_KEY, res.accessToken ?? null);
    this.write(ACCESS_EXPIRY_KEY, res.expiresAt ?? null);
    this.write(USER_KEY, res.user ? JSON.stringify(res.user) : null);

    if (res.user) this.currentUser$$.next(toMember(res.user, 0));

    return { mustSetPassword: false };
  }

  private clearSession(): void {
    this.accessTokenValue = null;
    this.setRefreshToken(null);
    this.write(ACCESS_KEY, null);
    this.write(ACCESS_EXPIRY_KEY, null);
    this.write(USER_KEY, null);
    this.currentUser$$.next(null);
  }
}

/** Kept out of the class so the interceptor can chain a retry after refresh. */
export const withRefreshedToken = <T>(
  auth: AuthService,
  retry: (token: string) => Observable<T>,
): Observable<T> => auth.refresh$().pipe(switchMap(retry));
