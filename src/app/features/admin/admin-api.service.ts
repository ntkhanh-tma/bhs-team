import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AppSettingDto, CountryDto, EventPlanDto, HolidayDto, MemberDetailDto,
  ReleasePlanDto, VacationTypeDto,
} from '../../core/models/api.models';

export interface AdminTeam {
  id: string; name: string; colorHex?: string; displayOrder: number; isActive: boolean;
}

export interface AdminPosition {
  id: string; name: string; displayOrder: number; isActive: boolean;
  /** False for restricted job titles — replaces the old EXCLUDED_ROLES array. */
  isSelectableInProfile: boolean;
  /** True hides the holder from the members directory — replaces the 'manager' filter. */
  isHiddenFromDirectory: boolean;
}

export interface AdminOrigin {
  id: string; name: string; displayOrder: number; isActive: boolean;
  isSelectableInProfile: boolean;
}

export interface AdminVacation {
  id: string; memberId: string; username: string; memberName: string;
  date: string; type: string; isDeleted: boolean; deletedAt?: string;
}

export interface AuditLogEntry {
  id: string; at: string; actorUsername?: string;
  entity: string; entityId: string; action: string; changesJson: string;
}

export interface PagedResult<T> { items: T[]; total: number; page: number; pageSize: number; }

/** Every call here is gated by the Admin policy on the server. */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin`;

  // ── Members ──────────────────────────────────────────────────────────────
  listMembers(): Observable<MemberDetailDto[]> {
    return this.http.get<MemberDetailDto[]>(`${this.base}/members`);
  }
  createMember(body: unknown): Observable<MemberDetailDto> {
    return this.http.post<MemberDetailDto>(`${this.base}/members`, body);
  }
  updateMember(id: string, body: unknown): Observable<MemberDetailDto> {
    return this.http.put<MemberDetailDto>(`${this.base}/members/${id}`, body);
  }
  setAccessRole(id: string, accessRole: string): Observable<void> {
    return this.http.put<void>(`${this.base}/members/${id}/access-role`, { accessRole });
  }
  resetPassword(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/members/${id}/reset-password`, {});
  }
  deactivateMember(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/members/${id}`);
  }

  // ── Lookups ──────────────────────────────────────────────────────────────
  listTeams(): Observable<AdminTeam[]> { return this.http.get<AdminTeam[]>(`${this.base}/teams`); }
  createTeam(b: unknown) { return this.http.post(`${this.base}/teams`, b); }
  updateTeam(id: string, b: unknown) { return this.http.put(`${this.base}/teams/${id}`, b); }
  deleteTeam(id: string) { return this.http.delete<void>(`${this.base}/teams/${id}`); }

  listPositions(): Observable<AdminPosition[]> { return this.http.get<AdminPosition[]>(`${this.base}/positions`); }
  createPosition(b: unknown) { return this.http.post(`${this.base}/positions`, b); }
  updatePosition(id: string, b: unknown) { return this.http.put(`${this.base}/positions/${id}`, b); }
  deletePosition(id: string) { return this.http.delete<void>(`${this.base}/positions/${id}`); }

  listOrigins(): Observable<AdminOrigin[]> { return this.http.get<AdminOrigin[]>(`${this.base}/origins`); }
  createOrigin(b: unknown) { return this.http.post(`${this.base}/origins`, b); }
  updateOrigin(id: string, b: unknown) { return this.http.put(`${this.base}/origins/${id}`, b); }
  deleteOrigin(id: string) { return this.http.delete<void>(`${this.base}/origins/${id}`); }

  listVacationTypes(): Observable<VacationTypeDto[]> {
    return this.http.get<VacationTypeDto[]>(`${this.base}/vacation-types`);
  }
  createVacationType(b: unknown) { return this.http.post(`${this.base}/vacation-types`, b); }
  updateVacationType(id: string, b: unknown) { return this.http.put(`${this.base}/vacation-types/${id}`, b); }
  deleteVacationType(id: string) { return this.http.delete<void>(`${this.base}/vacation-types/${id}`); }

  listCountries(): Observable<CountryDto[]> { return this.http.get<CountryDto[]>(`${this.base}/countries`); }
  createCountry(b: unknown) { return this.http.post(`${this.base}/countries`, b); }
  updateCountry(id: string, b: unknown) { return this.http.put(`${this.base}/countries/${id}`, b); }
  deleteCountry(id: string) { return this.http.delete<void>(`${this.base}/countries/${id}`); }

  // ── Calendar ─────────────────────────────────────────────────────────────
  listHolidays(): Observable<HolidayDto[]> { return this.http.get<HolidayDto[]>(`${this.base}/holidays`); }
  createHoliday(b: unknown) { return this.http.post(`${this.base}/holidays`, b); }
  updateHoliday(id: string, b: unknown) { return this.http.put(`${this.base}/holidays/${id}`, b); }
  deleteHoliday(id: string) { return this.http.delete<void>(`${this.base}/holidays/${id}`); }

  listReleasePlans(): Observable<ReleasePlanDto[]> {
    return this.http.get<ReleasePlanDto[]>(`${this.base}/release-plans`);
  }
  createReleasePlan(b: unknown) { return this.http.post(`${this.base}/release-plans`, b); }
  updateReleasePlan(id: string, b: unknown) { return this.http.put(`${this.base}/release-plans/${id}`, b); }
  deleteReleasePlan(id: string) { return this.http.delete<void>(`${this.base}/release-plans/${id}`); }

  listEventPlans(): Observable<EventPlanDto[]> {
    return this.http.get<EventPlanDto[]>(`${this.base}/event-plans`);
  }
  createEventPlan(b: unknown) { return this.http.post(`${this.base}/event-plans`, b); }
  updateEventPlan(id: string, b: unknown) { return this.http.put(`${this.base}/event-plans/${id}`, b); }
  deleteEventPlan(id: string) { return this.http.delete<void>(`${this.base}/event-plans/${id}`); }

  // ── Vacations ────────────────────────────────────────────────────────────
  listVacations(includeDeleted = true): Observable<AdminVacation[]> {
    return this.http.get<AdminVacation[]>(`${this.base}/vacations?includeDeleted=${includeDeleted}`);
  }
  createVacation(memberId: string, date: string, vacationTypeId: string) {
    return this.http.post(`${this.base}/vacations`, { memberId, date, vacationTypeId });
  }
  deleteVacation(id: string) { return this.http.delete<void>(`${this.base}/vacations/${id}`); }
  restoreVacation(id: string) { return this.http.post<void>(`${this.base}/vacations/${id}/restore`, {}); }

  // ── Settings & audit ─────────────────────────────────────────────────────
  listSettings(): Observable<AppSettingDto[]> {
    return this.http.get<AppSettingDto[]>(`${this.base}/settings`);
  }
  updateSettings(settings: { key: string; value: string }[]): Observable<void> {
    return this.http.put<void>(`${this.base}/settings`, { settings });
  }
  listAuditLogs(page = 1, pageSize = 50): Observable<PagedResult<AuditLogEntry>> {
    return this.http.get<PagedResult<AuditLogEntry>>(
      `${this.base}/audit-logs?page=${page}&pageSize=${pageSize}`);
  }
}
