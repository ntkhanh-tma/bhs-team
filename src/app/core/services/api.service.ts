import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Member, Holiday, Vacation, VacationType, ReleasePlan, EventPlan } from '../models/models';

interface GatewayResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Member/profile record as returned by the gateway (all fields optional). */
interface RawMember {
  id?: string;
  username?: string;
  name?: string;
  department?: string;
  position?: string;
  dc?: string;
  ip?: string;
  publicIp?: string;
  pcName?: string;
  macAddress?: string;
  email?: string;
  mobile?: string;
  birthday?: string;
}

export interface VacationSubmitPayload {
  username: string;
  month: string;      // MM/YYYY
  type: string;       // VacationType
  addDates: string[]; // YYYY-MM-DD
  removeDates: string[];
}

export interface DatabaseLookups {
  teams: string[];
  roles: string[];
  dcs: string[];
}

export interface ProfileUpdatePayload {
  action: 'updateProfile';
  id: string;
  authUsername: string;
  updates: {
    dc?: string;
    department?: string;
    role?: string;
    username?: string;
    ip?: string;
    publicIp?: string;
    pcName?: string;
    macAddress?: string;
    email?: string;
    mobile?: string;
    birthday?: string;
  };
}

const AVATAR_COLORS = [
  '#003bc4', '#7CC9A7', '#F7C873', '#B48CF2',
  '#F97316', '#EC4899', '#06B6D4', '#84CC16',
  '#8B5CF6', '#EF4444', '#14B8A6', '#F59E0B',
];

const ANIMAL_EMOJIS = [
  '🐶', '🐱', '🐻', '🦊', '🐼', '🐨', '🐯', '🦁',
  '🐸', '🐧', '🦉', '🦅', '🦋', '🐙', '🦄', '🦝',
  '🦘', '🦦', '🦥', '🐿️', '🦔', '🐇', '🦜', '🦩',
  '🐳', '🦭', '🐆', '🦏', '🦒', '🐘',
];

const animalEmoji = (username: string): string => {
  let h = 0;
  for (let i = 0; i < username.length; i++) {
    h = (Math.imul(31, h) + username.charCodeAt(i)) | 0;
  }
  return ANIMAL_EMOJIS[Math.abs(h) % ANIMAL_EMOJIS.length];
};

const VALID_TYPES: VacationType[] = ['Vacation', 'Compensation', 'Special Leave'];

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Everything now goes through the Apps Script gateway. No Google API key and
  // no spreadsheet ID ship to the browser, and the sheet itself is private.
  private readonly gatewayUrl = environment.gatewayUrl;
  private readonly secret = environment.gatewaySecret;

  constructor(private http: HttpClient) {}

  // ── Readers (all via the gateway) ───────────────────────────────────────────

  /**
   * GET the gateway for a read `action`. The secret goes in the query string
   * (not a header) on purpose: a header would trigger a CORS preflight, which
   * Apps Script's redirect-based responses do not satisfy.
   */
  private getFromGateway<T>(action: string, params: Record<string, string> = {}): Observable<GatewayResponse<T>> {
    if (!this.gatewayUrl) {
      console.warn('[ApiService] gatewayUrl not configured — request skipped.');
      return of({ success: false, error: 'gateway not configured' });
    }
    const qs = new URLSearchParams({ action, secret: this.secret, ...params }).toString();
    return this.http.get<GatewayResponse<T>>(`${this.gatewayUrl}?${qs}`).pipe(
      // The data source (Google Sheet, read server-side) fails transiently —
      // rate limits and short-lived errors. Retry with backoff so a single
      // hiccup doesn't surface as empty data, which login would then misreport
      // as "user not found".
      retry({ count: 3, delay: 700 }),
      catchError(err => {
        console.error(`[ApiService] ${action} failed:`, err?.message ?? err);
        return of({ success: false, error: 'request failed' } as GatewayResponse<T>);
      })
    );
  }

  fetchMembers(): Observable<Member[]> {
    return this.getFromGateway<RawMember[]>('members').pipe(
      map(res => this.toMembers(res.data ?? []))
    );
  }

  /** Full record for a single user — the only path that returns sensitive fields. */
  fetchProfile(username: string): Observable<Member | null> {
    return this.getFromGateway<RawMember | null>('profile', { username }).pipe(
      map(res => (res.data ? this.toMembers([res.data])[0] : null))
    );
  }

  fetchHolidays(): Observable<Holiday[]> {
    return this.getFromGateway<{ date: string; name: string; country: string }[]>('holidays').pipe(
      map(res => (res.data ?? [])
        .map(h => ({ date: this.normalizeDate(h.date), name: (h.name || 'Holiday').trim(), country: h.country?.trim() || undefined }))
        .filter(h => !!h.date))
    );
  }

  fetchDatabaseLookups(): Observable<DatabaseLookups> {
    const EXCLUDED_ROLES = ['manager', 'team lead'];
    const EXCLUDED_DCS = ['tma'];
    return this.getFromGateway<DatabaseLookups>('database').pipe(
      retry(2),
      map(res => {
        const d = res.data ?? { teams: [], roles: [], dcs: [] };
        return {
          teams: d.teams ?? [],
          roles: (d.roles ?? []).filter(r => !EXCLUDED_ROLES.includes(r.toLowerCase())),
          dcs:   (d.dcs   ?? []).filter(d2 => !EXCLUDED_DCS.includes(d2.toLowerCase())),
        };
      })
    );
  }

  fetchVacations(): Observable<Vacation[]> {
    return this.getFromGateway<{ username: string; date: string; type: string }[]>('vacations').pipe(
      map(res => (res.data ?? []).map(v => {
        const username = (v.username || '').trim().toLowerCase();
        const date = this.normalizeDate(v.date);
        const rawType = (v.type || '').trim() as VacationType;
        const type: VacationType = VALID_TYPES.includes(rawType) ? rawType : 'Vacation';
        return { id: `${username}_${date}`, username, date, type };
      }).filter(v => !!v.date))
    );
  }

  fetchReleasePlans(): Observable<ReleasePlan[]> {
    return this.getFromGateway<{ date: string; release: string }[]>('releaseplans').pipe(
      map(res => (res.data ?? [])
        .map(r => ({ date: this.normalizeDate(r.date), release: (r.release || '').trim() }))
        .filter(r => !!r.date && !!r.release))
    );
  }

  fetchEventPlans(): Observable<EventPlan[]> {
    return this.getFromGateway<{ date: string; description: string }[]>('eventplans').pipe(
      map(res => (res.data ?? [])
        .map(e => ({ date: this.normalizeDate(e.date), description: (e.description || '').trim() }))
        .filter(e => !!e.date && !!e.description))
    );
  }

  // ── Writers (Apps Script gateway) ─────────────────────────────────────────

  submitVacationChanges(payload: VacationSubmitPayload): Observable<boolean> {
    return this.postToScript(payload);
  }

  updateMemberProfile(payload: ProfileUpdatePayload): Observable<boolean> {
    return this.postToScript(payload);
  }

  private postToScript(payload: object): Observable<boolean> {
    const url = this.gatewayUrl;
    if (!url) {
      console.warn('[ApiService] gatewayUrl not configured — request skipped.');
      return of(false);
    }
    // Secret travels in the body; Content-Type text/plain keeps it a "simple"
    // request so the browser does not preflight (Apps Script has no CORS headers).
    return this.http.post(url, JSON.stringify({ ...payload, secret: this.secret }), {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain' }),
      responseType: 'text',
    }).pipe(
      map(text => {
        try {
          const res: GatewayResponse = JSON.parse(text);
          if (!res.success) console.error('[ApiService] gateway error:', res.error);
          return res.success === true;
        } catch {
          return false;
        }
      }),
      catchError(err => {
        console.error('[ApiService] gateway request failed:', err);
        return of(false);
      })
    );
  }

  // ── Mapping ─────────────────────────────────────────────────────────────────

  /** Maps gateway member/profile records to the Member model + avatar styling. */
  private toMembers(raw: RawMember[]): Member[] {
    return raw
      .filter(r => (r.username ?? '').trim())
      .map((r, i) => ({
        id:         (r.id         ?? '').trim(),
        username:   (r.username   ?? '').trim().toLowerCase(),
        name:       (r.name       ?? '').trim(),
        department: (r.department ?? '').trim(),
        position:   (r.position   ?? '').trim(),
        dc:         r.dc?.trim()         || undefined,
        ip:         r.ip?.trim()         || undefined,
        publicIp:   r.publicIp?.trim()   || undefined,
        pcName:     r.pcName?.trim()     || undefined,
        macAddress: r.macAddress?.trim() || undefined,
        email:      r.email?.trim()      || undefined,
        mobile:     r.mobile?.trim()     || undefined,
        birthday:   r.birthday?.trim()   || undefined,
        daysUsed:   0,
        daysLeft:   0,
        avatarUrl:  animalEmoji((r.username ?? '').trim().toLowerCase()),
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      }));
  }

  /**
   * Converts various date string formats to YYYY-MM-DD.
   * Handles: DD/MM/YYYY, M/D/YYYY, YYYY-MM-DD, and serial numbers (Google Sheets default).
   */
  private normalizeDate(raw: string): string {
    const s = (raw ?? '').trim();
    if (!s) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    if (/^\d{5}$/.test(s)) {
      const epoch = new Date(1899, 11, 30);
      epoch.setDate(epoch.getDate() + parseInt(s, 10));
      return this.toIso(epoch);
    }

    const slash = s.split('/');
    if (slash.length === 3) {
      const [a, b, c] = slash.map(Number);
      const year = c > 1000 ? c : (c < 100 ? 2000 + c : c);
      // Default to day-first (DD/MM/YYYY), matching this app's en-AU convention;
      // fall back to month-first only when the day-first reading is impossible.
      if (b > 12 && a <= 12) return this.toIso(new Date(year, a - 1, b));
      return this.toIso(new Date(year, b - 1, a));
    }

    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? '' : this.toIso(parsed);
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
