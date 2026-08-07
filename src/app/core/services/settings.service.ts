import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppSettingDto, configureAvatars } from '../models/api.models';

export interface TeamColor { bg: string; border: string; text: string; }

/**
 * Server-driven configuration. Every value here used to be a hardcoded constant
 * in the bundle; an admin can now change any of them and the change takes effect
 * on the next page load without a redeploy.
 *
 * The booking values are mirrored client-side purely to grey out days and show a
 * countdown — the API is the authority and returns 422/429 regardless.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  readonly lockDayOfMonth = signal(20);
  readonly throttleMinutes = signal(5);
  readonly allowWeekends = signal(false);
  readonly allowPastDates = signal(false);
  readonly allowHolidays = signal(false);
  readonly maxMonthsAhead = signal(12);
  readonly upcomingWindowDays = signal(30);
  readonly holidayCountryCodes = signal<string[]>(['VN']);
  readonly teamColors = signal<TeamColor[]>([]);
  readonly loaded = signal(false);

  /** Bootstrapped before the app renders; never blocks startup on failure. */
  load(): Observable<AppSettingDto[]> {
    if (!environment.apiBaseUrl) return of([]);

    return this.http
      .get<AppSettingDto[]>(`${environment.apiBaseUrl}/api/settings/public`)
      .pipe(
        tap(settings => this.apply(settings)),
        catchError(() => of([])),
      );
  }

  private apply(settings: AppSettingDto[]): void {
    const byKey = new Map(settings.map(s => [s.key, s.value]));

    const int = (key: string, fallback: number) => {
      const parsed = Number.parseInt(byKey.get(key) ?? '', 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const bool = (key: string, fallback: boolean) => {
      const raw = byKey.get(key);
      return raw === 'true' ? true : raw === 'false' ? false : fallback;
    };
    const json = <T>(key: string, fallback: T): T => {
      const raw = byKey.get(key);
      if (!raw) return fallback;
      try { return JSON.parse(raw) as T; } catch { return fallback; }
    };

    this.lockDayOfMonth.set(int('booking.lockDayOfMonth', 20));
    this.throttleMinutes.set(int('booking.throttleMinutes', 5));
    this.allowWeekends.set(bool('booking.allowWeekends', false));
    this.allowPastDates.set(bool('booking.allowPastDates', false));
    this.allowHolidays.set(bool('booking.allowHolidays', false));
    this.maxMonthsAhead.set(int('booking.maxMonthsAhead', 12));
    this.upcomingWindowDays.set(int('sidebar.upcomingWindowDays', 30));
    this.holidayCountryCodes.set(json<string[]>('sidebar.holidayCountryCodes', ['VN']));
    this.teamColors.set(json<TeamColor[]>('ui.teamColors', []));

    configureAvatars(
      json<string[]>('ui.avatarColors', []),
      json<string[]>('ui.avatarEmojis', []),
    );

    this.loaded.set(true);
  }

  /** Replaces the hardcoded `isVn()` check in the sidebar. */
  isSidebarCountry(countryCode?: string, countryName?: string): boolean {
    const codes = this.holidayCountryCodes().map(c => c.toLowerCase());
    if (codes.length === 0) return true;

    const code = (countryCode ?? '').toLowerCase();
    const name = (countryName ?? '').toLowerCase();
    return codes.some(c => c === code || (c === 'vn' && name.includes('viet')));
  }

  /**
   * Earliest month that may be booked: before the lock day of month M the
   * earliest is M+1; on or after it, M+2.
   */
  earliestBookableMonth(today = new Date()): Date {
    const offset = today.getDate() >= this.lockDayOfMonth() ? 2 : 1;
    return new Date(today.getFullYear(), today.getMonth() + offset, 1);
  }
}
