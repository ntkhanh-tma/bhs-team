import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Member, Holiday, Vacation } from '../models/models';

interface SheetsResponse {
  range: string;
  majorDimension: string;
  values: string[][];
}

interface AppsScriptResponse {
  success: boolean;
  data?: { month: string; username: string; date: string }[];
  error?: string;
}

export interface VacationSubmitPayload {
  username: string;
  month: string;      // MM/YYYY
  addDates: string[]; // YYYY-MM-DD
  removeDates: string[];
}

const AVATAR_COLORS = [
  '#4F7DF3', '#7CC9A7', '#F7C873', '#B48CF2',
  '#F97316', '#EC4899', '#06B6D4', '#84CC16',
  '#8B5CF6', '#EF4444', '#14B8A6', '#F59E0B',
];

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = `https://sheets.googleapis.com/v4/spreadsheets/${environment.googleSheetId}/values`;
  private readonly key = environment.googleApiKey;

  constructor(private http: HttpClient) {}

  // ── Readers (Sheets API v4, read-only API key) ────────────────────────────

  fetchMembers(): Observable<Member[]> {
    const url = `${this.base}/Team-Info!Members?key=${this.key}`;
    return this.http.get<SheetsResponse>(url).pipe(
      map(res => this.parseMembers(res.values ?? [])),
      catchError(err => {
        console.error('[ApiService] fetchMembers failed:', err?.error?.error?.message ?? err.message);
        return of([]);
      })
    );
  }

  fetchHolidays(): Observable<Holiday[]> {
    const url = `${this.base}/Database!Holidays?key=${this.key}`;
    return this.http.get<SheetsResponse>(url).pipe(
      map(res => this.parseHolidays(res.values ?? [])),
      catchError(err => {
        console.error('[ApiService] fetchHolidays failed:', err?.error?.error?.message ?? err.message);
        return of([]);
      })
    );
  }

  fetchVacations(): Observable<Vacation[]> {
    const url = `${this.base}/Vacation-Plan!A:C?key=${this.key}`;
    return this.http.get<SheetsResponse>(url).pipe(
      map(res => this.parseVacations(res.values ?? [])),
      catchError(err => {
        console.error('[ApiService] fetchVacations failed:', err?.error?.error?.message ?? err.message);
        return of([]);
      })
    );
  }

  // ── Writer (Apps Script Web App, handles authentication server-side) ──────

  /**
   * POSTs vacation changes to the Apps Script web app.
   * Uses Content-Type: text/plain to avoid a CORS preflight request —
   * Apps Script redirects (302) and only the final response has CORS headers.
   */
  submitVacationChanges(payload: VacationSubmitPayload): Observable<boolean> {
    const url = environment.vacationApiUrl;
    if (!url) {
      console.warn('[ApiService] VACATION_API_URL not configured — submission skipped.');
      return of(false);
    }
    return this.http.post(url, JSON.stringify(payload), {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain' }),
      responseType: 'text',
    }).pipe(
      map(text => {
        try {
          const res: AppsScriptResponse = JSON.parse(text);
          if (!res.success) console.error('[ApiService] submitVacationChanges:', res.error);
          return res.success === true;
        } catch {
          return false;
        }
      }),
      catchError(err => {
        console.error('[ApiService] submitVacationChanges failed:', err);
        return of(false);
      })
    );
  }

  // ── Parsers ───────────────────────────────────────────────────────────────

  private parseMembers(rows: string[][]): Member[] {
    if (!rows.length) return [];
    return rows.slice(1)
      .filter(r => r[0]?.trim())
      .map((row, i) => ({
        username:    (row[0] ?? '').trim().toLowerCase(),
        name:        (row[1] ?? '').trim(),
        department:  (row[2] ?? '').trim(),
        position:    (row[3] ?? '').trim(),
        daysUsed:    parseInt(row[4] ?? '0', 10) || 0,
        daysLeft:    parseInt(row[5] ?? '0', 10) || 0,
        avatarUrl:   (row[6] ?? '').trim(),
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      }));
  }

  private parseHolidays(rows: string[][]): Holiday[] {
    if (!rows.length) return [];
    return rows.slice(1)
      .filter(r => r[0]?.trim())
      .map(row => ({
        date: this.normalizeDate(row[0]),
        name: (row[1] ?? 'Holiday').trim(),
      }))
      .filter(h => !!h.date);
  }

  private parseVacations(rows: string[][]): Vacation[] {
    if (!rows.length) return [];
    // Header: Month | Username | Date
    return rows.slice(1)
      .filter(r => r[1]?.trim() && r[2]?.trim())
      .map(row => {
        const username = row[1].trim().toLowerCase();
        const date = row[2].trim();
        return { id: `${username}_${date}`, username, date };
      });
  }

  /**
   * Converts various date string formats to YYYY-MM-DD.
   * Handles: M/D/YYYY, DD/MM/YYYY, YYYY-MM-DD, and serial numbers (Google Sheets default).
   */
  private normalizeDate(raw: string): string {
    const s = (raw ?? '').trim();
    if (!s) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // Google Sheets serial number (days since Dec 30 1899)
    if (/^\d{5}$/.test(s)) {
      const epoch = new Date(1899, 11, 30);
      epoch.setDate(epoch.getDate() + parseInt(s, 10));
      return this.toIso(epoch);
    }

    const slash = s.split('/');
    if (slash.length === 3) {
      const [a, b, c] = slash.map(Number);
      if (c > 1000) return this.toIso(new Date(c, a - 1, b));   // M/D/YYYY
      if (a > 12)   return this.toIso(new Date(c, b - 1, a));   // DD/MM/YYYY
      return this.toIso(new Date(c, a - 1, b));                  // ambiguous → M/D/YYYY
    }

    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? '' : this.toIso(parsed);
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
