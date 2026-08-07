import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Member, Holiday, Vacation, VacationType, ReleasePlan, EventPlan } from '../models/models';
import { ApiService, ProfileUpdatePayload } from './api.service';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';

/**
 * Application state. The public surface is unchanged from the Apps Script era so
 * the feature components did not need rewriting — what changed underneath is that
 * authentication is real and the bulk reads now require a token, so loading is
 * triggered by sign-in rather than by the constructor.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);

  private membersSubject      = new BehaviorSubject<Member[]>([]);
  private holidaysSubject     = new BehaviorSubject<Holiday[]>([]);
  private vacationsSubject    = new BehaviorSubject<Vacation[]>([]);
  private releasePlansSubject = new BehaviorSubject<ReleasePlan[]>([]);
  private eventPlansSubject   = new BehaviorSubject<EventPlan[]>([]);
  private loading$$           = new BehaviorSubject<boolean>(false);
  private loadError$$         = new BehaviorSubject<boolean>(false);

  readonly members$           = this.membersSubject.asObservable();
  readonly holidays$          = this.holidaysSubject.asObservable();
  readonly vacations$         = this.vacationsSubject.asObservable();
  readonly releasePlans$      = this.releasePlansSubject.asObservable();
  readonly eventPlans$        = this.eventPlansSubject.asObservable();
  readonly authenticatedUser$ = this.auth.currentUser$;
  readonly loading$           = this.loading$$.asObservable();
  /** True when the data load failed — distinct from "not signed in". */
  readonly loadError$         = this.loadError$$.asObservable();

  constructor() {
    // Load whenever a session appears, clear when it goes away. Replaces the
    // unconditional constructor fetch, which cannot work now that the bulk
    // endpoints require a bearer token.
    this.auth.currentUser$.subscribe(user => {
      if (user) this.loadRemoteData();
      else this.clear();
    });
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  reload(): void {
    if (this.auth.isAuthenticated()) this.loadRemoteData();
  }

  private clear(): void {
    this.membersSubject.next([]);
    this.vacationsSubject.next([]);
    this.releasePlansSubject.next([]);
    this.eventPlansSubject.next([]);
    this.loading$$.next(false);
    this.loadError$$.next(false);
  }

  private loadRemoteData(): void {
    this.loading$$.next(true);
    this.loadError$$.next(false);

    combineLatest([
      this.api.fetchMembers(),
      this.api.fetchHolidays(),
      this.api.fetchVacations(),
      this.api.fetchReleasePlans(),
      this.api.fetchEventPlans(),
      this.api.fetchLookups(),
    ]).subscribe({
      next: ([members, holidays, vacations, releasePlans, eventPlans]) => {
        this.membersSubject.next(members);
        this.holidaysSubject.next(holidays);
        this.vacationsSubject.next(vacations);
        this.releasePlansSubject.next(releasePlans);
        this.eventPlansSubject.next(eventPlans);
        this.loadError$$.next(members.length === 0);
        this.loading$$.next(false);
      },
      error: () => {
        this.loadError$$.next(true);
        this.loading$$.next(false);
      },
    });
  }

  /** Public holidays are readable without a session, for the guest holidays page. */
  loadPublicHolidays(): void {
    this.api.fetchHolidays().subscribe(h => this.holidaysSubject.next(h));
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  get currentUser(): Member | null { return this.auth.currentUser; }
  get loading(): boolean { return this.loading$$.value; }

  logout(): void { this.auth.logout(); }

  // ── Vacation submission ────────────────────────────────────────────────────

  /**
   * The 5-minute throttle now lives on the server
   * (Member.LastVacationSubmissionAt) and is returned as HTTP 429. This local
   * value only drives the countdown label.
   */
  getLockRemainingMs(_username: string): number { return 0; }

  submitVacation(
    addDates: string[],
    removeDates: string[],
    _month: string,
    type: VacationType,
  ): Observable<{ success: boolean; error?: string }> {
    const user = this.auth.currentUser;
    if (!user) return of({ success: false, error: 'You must be logged in to submit.' });

    if (addDates.length === 0 && removeDates.length === 0) {
      return of({ success: false, error: 'No changes to submit.' });
    }

    // Vacation types are admin-managed rows now, so resolve the name to its id.
    return this.api.fetchLookups().pipe(
      switchMap(() => {
        const typeId = this.api.resolveVacationTypeId(type)
          ?? this.api.getVacationTypes()[0]?.id;

        if (!typeId) {
          return of({ success: false, error: 'No vacation types are configured.' });
        }

        return this.api.submitVacationChanges(typeId, addDates, removeDates).pipe(
          tap(() => this.reload()),
          map(result => {
            if (result.skipped.length > 0 && result.added === 0 && result.removed === 0) {
              return { success: false, error: result.skipped.join(' ') };
            }
            return { success: true };
          }),
          catchError(err => of({ success: false, error: describeError(err) })),
        );
      }),
    );
  }

  // ── Profile update ─────────────────────────────────────────────────────────

  updateMemberProfile(
    updates: ProfileUpdatePayload,
  ): Observable<{ success: boolean; error?: string }> {
    if (!this.auth.currentUser) return of({ success: false, error: 'Not logged in.' });

    return this.api.updateMemberProfile(updates).pipe(
      tap(updated => {
        this.auth.patchCurrentUser(updated);
        this.membersSubject.next(
          this.membersSubject.value.map(m => (m.id === updated.id ? { ...m, ...updated } : m)),
        );
      }),
      map(() => ({ success: true })),
      catchError(err => of({ success: false, error: describeError(err) })),
    );
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  getMemberByUsername(username: string): Member | undefined {
    return this.membersSubject.value.find(m => m.username === username);
  }

  getTodayAbsentees(): { member: Member; vacation: Vacation }[] {
    const today = this.formatDate(new Date());
    return this.vacationsSubject.value
      .filter(v => v.date === today)
      .map(v => ({ vacation: v, member: this.getMemberByUsername(v.username)! }))
      .filter(x => !!x.member);
  }

  getVacationsGroupedByMonth(): {
    label: string; year: number; month: number;
    entries: { member: Member; vacations: Vacation[] }[];
  }[] {
    const today = new Date();
    const monthMap = new Map<string, { year: number; month: number; entries: Map<string, Vacation[]> }>();

    this.vacationsSubject.value.forEach(v => {
      const [year, month] = v.date.split('-').map(Number);
      const key = `${year}-${month}`;
      if (!monthMap.has(key)) monthMap.set(key, { year, month, entries: new Map() });
      const md = monthMap.get(key)!;
      if (!md.entries.has(v.username)) md.entries.set(v.username, []);
      md.entries.get(v.username)!.push(v);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, data]) => {
        const d = new Date(data.year, data.month - 1, 1);
        const isCurrent = data.year === today.getFullYear() && data.month === today.getMonth() + 1;
        return {
          label: d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) + (isCurrent ? ' (Current)' : ''),
          year: data.year,
          month: data.month,
          entries: Array.from(data.entries.entries())
            .map(([username, vacations]) => ({
              member: this.getMemberByUsername(username)!,
              vacations: vacations.sort((a, b) => a.date.localeCompare(b.date)),
            }))
            .filter(e => !!e.member),
        };
      });
  }

  formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

/** Surfaces the API's ProblemDetails message instead of a generic failure string. */
export function describeError(err: unknown): string {
  const problem = (err as { error?: { detail?: string; title?: string } })?.error;
  if (problem?.detail) return problem.detail;
  if (problem?.title) return problem.title;

  const status = (err as { status?: number })?.status;
  if (status === 0) return 'Cannot reach the server. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}
