import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';
import { CalendarDay, Holiday, Member, Vacation, VacationType } from '../../core/models/models';
import { MockDataService } from '../../core/services/mock-data.service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <!-- Calendar header -->
      <div class="flex items-center gap-4 mb-4">
        <button (click)="prevMonth()" class="p-1 rounded hover:bg-gray-100 text-[#64748B]">&#8249;</button>
        <div>
          <h2 class="text-lg font-bold text-[#1E293B]">{{ monthLabel }}</h2>
          <p class="text-xs text-[#64748B]">{{ subtitle }}</p>
        </div>
        <button (click)="nextMonth()" class="p-1 rounded hover:bg-gray-100 text-[#64748B]">&#8250;</button>
      </div>

      <!-- Day headers — Sat/Sun tinted -->
      <div class="grid grid-cols-7 mb-1">
        <div *ngFor="let d of dayHeaders; let i = index"
             class="text-center text-xs font-semibold py-2 rounded"
             [class.text-[#64748B]]="i < 5"
             [class.text-slate-400]="i >= 5"
             [class.bg-slate-100]="i >= 5">
          {{ d }}
        </div>
      </div>

      <!-- Days grid -->
      <div class="grid grid-cols-7">
        <div
          *ngFor="let day of calendarDays"
          [class]="getCellClass(day)"
        >
          <ng-container *ngIf="day.date">
            <div class="flex flex-col gap-0.5 h-full">
              <span [class]="getDayNumberClass(day)">{{ day.date.getDate() }}</span>

              <!-- Holiday badges (per country) -->
              <ng-container *ngFor="let h of day.holidays">
                <span [class]="getHolidayBadgeClass(h.country)"
                      class="text-[10px] rounded px-1 py-0.5 font-medium truncate">
                  {{ getCountryFlag(h.country) }}{{ h.name }}
                </span>
              </ng-container>

              <!-- Your vacation badge (type-aware) -->
              <span *ngIf="day.yourVacation"
                    [class]="getYourVacationClass(day.yourVacation.type)"
                    class="text-[10px] rounded px-1 py-0.5 font-medium">
                {{ getYourVacationLabel(day.yourVacation.type) }}
              </span>

              <!-- Others vacations -->
              <ng-container *ngIf="day.othersVacations.length > 0">
                <span *ngFor="let ov of day.othersVacations.slice(0, 2)"
                      class="text-[10px] bg-[#7CC9A7] text-white rounded px-1 py-0.5 font-medium truncate">
                  {{ ov.member.name.split(' ')[0] }}
                </span>
                <span *ngIf="day.othersVacations.length > 2"
                      class="text-[10px] bg-gray-200 text-[#64748B] rounded px-1 py-0.5 font-medium">
                  +{{ day.othersVacations.length - 2 }} more
                </span>
              </ng-container>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
        <div class="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span class="w-3 h-3 rounded-sm bg-[#7CC9A7]"></span> Others
        </div>
        <div class="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span class="w-3 h-3 rounded-sm bg-[#B48CF2]"></span> Vacation
        </div>
        <div class="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span class="w-3 h-3 rounded-sm bg-[#06B6D4]"></span> Compensation
        </div>
        <div class="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span class="w-3 h-3 rounded-sm bg-[#F97316]"></span> Event
        </div>
        <div class="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span class="w-3 h-3 rounded-sm bg-[#F7C873]"></span> 🇦🇺 Holiday
        </div>
        <div class="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span class="w-3 h-3 rounded-sm bg-red-100"></span> 🇻🇳 Holiday
        </div>
        <div class="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span class="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200"></span> Weekend
        </div>
      </div>
    </div>
  `,
})
export class CalendarComponent implements OnInit {
  dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  calendarDays: CalendarDay[] = [];
  viewYear = 0;
  viewMonth = 0;
  currentUser: Member | null = null;

  get monthLabel(): string {
    return new Date(this.viewYear, this.viewMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get subtitle(): string {
    const today = new Date();
    const day = today.getDate();
    const earliestMonth = today.getMonth() + 1 + (day >= 20 ? 2 : 1);
    const label = day >= 20
      ? `Registration opens for the month after next (past the 20th)`
      : `Registration open — next month available before the 20th`;
    const e = { year: today.getFullYear(), month: earliestMonth > 12 ? earliestMonth - 12 : earliestMonth };
    const eLabel = new Date(e.year, e.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `Earliest registerable: ${eLabel}`;
  }

  constructor(private dataService: MockDataService) {}

  ngOnInit(): void {
    const today = new Date();
    // Default to the earliest registerable month so the calendar matches the register dialog
    const offset = today.getDate() >= 20 ? 2 : 1;
    const earliest = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    this.viewYear = earliest.getFullYear();
    this.viewMonth = earliest.getMonth() + 1;

    combineLatest([
      this.dataService.vacations$,
      this.dataService.holidays$,
      this.dataService.authenticatedUser$,
    ]).subscribe(([vacations, holidays, user]) => {
      this.currentUser = user;
      this.buildCalendar(vacations, holidays, user);
    });
  }

  buildCalendar(vacations: Vacation[], holidays: Holiday[], user: Member | null): void {
    const today = new Date();
    const firstDay = new Date(this.viewYear, this.viewMonth - 1, 1);
    const lastDay = new Date(this.viewYear, this.viewMonth, 0);
    const days: CalendarDay[] = [];

    const startDow = firstDay.getDay();
    const leadingBlanks = startDow === 0 ? 6 : startDow - 1;
    for (let i = 0; i < leadingBlanks; i++) {
      days.push(this.emptyDay());
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(this.viewYear, this.viewMonth - 1, d);
      const dateStr = this.dataService.formatDate(date);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isToday = dateStr === this.dataService.formatDate(today);
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dayHolidays = holidays.filter(h => h.date === dateStr);

      const dayVacations = vacations.filter(v => v.date === dateStr);
      const yourVacation = user ? dayVacations.find(v => v.username === user.username) : undefined;
      const othersVacations = dayVacations
        .filter(v => !user || v.username !== user.username)
        .map(v => ({ vacation: v, member: this.dataService.getMemberByUsername(v.username)! }))
        .filter(x => !!x.member);

      days.push({ date, isCurrentMonth: true, isWeekend, isToday, isPast, holidays: dayHolidays, yourVacation, othersVacations });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 0; i < remaining; i++) {
      const date = new Date(this.viewYear, this.viewMonth, i + 1);
      days.push({ date, isCurrentMonth: false, isWeekend: false, isToday: false, isPast: false, holidays: [], yourVacation: undefined, othersVacations: [] });
    }

    this.calendarDays = days;
  }

  emptyDay(): CalendarDay {
    return { date: null as any, isCurrentMonth: false, isWeekend: false, isToday: false, isPast: false, holidays: [], yourVacation: undefined, othersVacations: [] };
  }

  getCellClass(day: CalendarDay): string {
    const base = 'min-h-[80px] p-1.5 border border-gray-100 text-left';
    if (!day.date) return `${base} invisible`;
    if (!day.isCurrentMonth) return `${base} bg-gray-50/50`;
    if (day.isWeekend) return `${base} bg-slate-100 border-slate-200`;
    if (day.isToday) return `${base} bg-blue-50/50 ring-2 ring-[#003bc4] ring-inset`;
    return `${base} bg-white hover:bg-gray-50/50`;
  }

  getDayNumberClass(day: CalendarDay): string {
    const base = 'text-sm font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full';
    if (day.isToday) return `${base} bg-[#003bc4] text-white`;
    if (!day.isCurrentMonth) return `${base} text-gray-300`;
    if (day.isWeekend) return `${base} text-slate-400`;
    return `${base} text-[#1E293B]`;
  }

  getCountryFlag(country?: string): string {
    const c = (country ?? '').toLowerCase();
    if (c.includes('aus') || c === 'au') return '🇦🇺 ';
    if (c.includes('viet') || c === 'vn') return '🇻🇳 ';
    return '';
  }

  getHolidayBadgeClass(country?: string): string {
    const c = (country ?? '').toLowerCase();
    if (c.includes('viet') || c === 'vn') return 'bg-red-100 text-red-700';
    return 'bg-[#F7C873] text-[#92400E]';
  }

  getYourVacationLabel(type: VacationType): string {
    if (type === 'Compensation') return 'Comp';
    if (type === 'Event') return 'Event';
    return 'You';
  }

  getYourVacationClass(type: VacationType): string {
    if (type === 'Compensation') return 'bg-[#06B6D4] text-white';
    if (type === 'Event') return 'bg-[#F97316] text-white';
    return 'bg-[#B48CF2] text-white';
  }

  prevMonth(): void {
    if (this.viewMonth === 1) { this.viewMonth = 12; this.viewYear--; }
    else this.viewMonth--;
    combineLatest([
      this.dataService.vacations$,
      this.dataService.holidays$,
      this.dataService.authenticatedUser$,
    ]).pipe(take(1)).subscribe(([v, h, u]) => this.buildCalendar(v, h, u));
  }

  nextMonth(): void {
    if (this.viewMonth === 12) { this.viewMonth = 1; this.viewYear++; }
    else this.viewMonth++;
    combineLatest([
      this.dataService.vacations$,
      this.dataService.holidays$,
      this.dataService.authenticatedUser$,
    ]).pipe(take(1)).subscribe(([v, h, u]) => this.buildCalendar(v, h, u));
  }
}
