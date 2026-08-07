import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, retry, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Member, Holiday, Vacation, ReleasePlan, EventPlan } from '../models/models';
import {
  EventPlanDto, HolidayDto, LookupsDto, MemberDetailDto, MemberSummaryDto,
  ReleasePlanDto, VacationDto, VacationTypeDto, toMember,
} from '../models/api.models';

/** Self-service profile edit. Undefined fields are left unchanged by the API. */
export interface ProfileUpdatePayload {
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
  username?: string;
}

export interface VacationBatchResult {
  added: number;
  removed: number;
  skipped: string[];
}

export interface DatabaseLookups {
  teams: string[];
  roles: string[];
  dcs: string[];
}

/**
 * Client for the .NET API.
 *
 * Two Apps Script workarounds are gone: the `?secret=` query parameter (the
 * gateway could not read headers) and the `Content-Type: text/plain` body hack
 * (which dodged a CORS preflight the gateway could not answer). Requests are now
 * ordinary JSON with a bearer token attached by the auth interceptor, and errors
 * arrive as non-2xx ProblemDetails instead of `{success:false}` with HTTP 200.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private lookups$?: Observable<LookupsDto>;
  private vacationTypes: VacationTypeDto[] = [];

  private get configured(): boolean {
    if (!this.base) {
      console.warn('[ApiService] apiBaseUrl not configured — request skipped.');
      return false;
    }
    return true;
  }

  /**
   * Transient failures still happen (Neon cold starts, App Service warm-up), so
   * the retry that commit 6d15ef1 added for the sheet is still worth having.
   */
  private get<T>(path: string, fallback: T): Observable<T> {
    if (!this.configured) return of(fallback);

    return this.http.get<T>(`${this.base}${path}`).pipe(
      retry({ count: 3, delay: 700 }),
      catchError(err => {
        console.error(`[ApiService] GET ${path} failed:`, err?.message ?? err);
        return of(fallback);
      }),
    );
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  fetchMembers(): Observable<Member[]> {
    return this.get<MemberSummaryDto[]>('/api/members', [])
      .pipe(map(rows => rows.map((row, i) => toMember(row, i))));
  }

  /** The signed-in member's own record, including their PII. */
  fetchProfile(): Observable<Member | null> {
    if (!this.configured) return of(null);

    return this.http.get<MemberDetailDto>(`${this.base}/api/members/me`).pipe(
      map(dto => toMember(dto, 0)),
      catchError(() => of(null)),
    );
  }

  fetchHolidays(): Observable<Holiday[]> {
    return this.get<HolidayDto[]>('/api/holidays', []).pipe(
      map(rows => rows.map(h => ({
        date: h.date,
        name: (h.name || 'Holiday').trim(),
        country: h.country || h.countryCode || undefined,
      }))),
    );
  }

  fetchVacations(): Observable<Vacation[]> {
    return this.get<VacationDto[]>('/api/vacations', []).pipe(
      map(rows => rows.map(v => ({
        id: v.id,
        username: (v.username || '').trim().toLowerCase(),
        date: v.date,
        type: v.type,
      }))),
    );
  }

  fetchReleasePlans(): Observable<ReleasePlan[]> {
    return this.get<ReleasePlanDto[]>('/api/release-plans', [])
      .pipe(map(rows => rows.map(r => ({ date: r.date, release: r.release }))));
  }

  fetchEventPlans(): Observable<EventPlan[]> {
    return this.get<EventPlanDto[]>('/api/event-plans', [])
      .pipe(map(rows => rows.map(e => ({ date: e.date, description: e.description }))));
  }

  /**
   * Cached because the register dialog needs the vacation-type ids on every
   * submit. The API already filters to selectable rows, so the old
   * EXCLUDED_ROLES / EXCLUDED_DCS client-side filtering is gone.
   */
  fetchLookups(): Observable<LookupsDto> {
    if (!this.lookups$) {
      const empty: LookupsDto = {
        teams: [], positions: [], origins: [], vacationTypes: [], countries: [],
      };
      this.lookups$ = this.get<LookupsDto>('/api/lookups', empty).pipe(
        tap(lookups => { this.vacationTypes = lookups.vacationTypes ?? []; }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.lookups$;
  }

  /** Shape kept for the profile editor's existing dropdown bindings. */
  fetchDatabaseLookups(): Observable<DatabaseLookups> {
    return this.fetchLookups().pipe(
      map(l => ({
        teams: l.teams.map(t => t.name),
        roles: l.positions.map(p => p.name),
        dcs: l.origins.map(o => o.name),
      })),
    );
  }

  getVacationTypes(): VacationTypeDto[] { return this.vacationTypes; }

  resolveVacationTypeId(name: string): string | undefined {
    const match = this.vacationTypes.find(
      t => t.name.toLowerCase() === (name ?? '').trim().toLowerCase());
    return match?.id;
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Add and remove days in one call. The API enforces the lock period, throttle
   * and weekend/past/holiday rules that used to live only in the browser, so a
   * rejection here arrives as 422 or 429 rather than silently succeeding.
   */
  submitVacationChanges(
    vacationTypeId: string, addDates: string[], removeDates: string[],
  ): Observable<VacationBatchResult> {
    return this.http.post<VacationBatchResult>(`${this.base}/api/vacations/batch`, {
      vacationTypeId, addDates, removeDates,
    });
  }

  updateMemberProfile(updates: ProfileUpdatePayload): Observable<Member> {
    return this.http
      .put<MemberDetailDto>(`${this.base}/api/members/me`, updates)
      .pipe(map(dto => toMember(dto, 0)));
  }
}
