import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarDay, Holiday, Member, Vacation } from '../../core/models/models';
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

      <!-- Day headers -->
      <div class="grid grid-cols-7 mb-1">
        <div *ngFor="let d of dayHeaders" class="text-center text-xs font-medium text-[#64748B] py-2">{{ d }}</div>
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

              <!-- Holiday badge -->
              <span *ngIf="day.holiday" class="text-[10px] bg-[#F7C873] text-[#92400E] rounded px-1 py-0.5 font-medium truncate">
                {{ day.holiday.name }}
              </span>

              <!-- Your vacation badge -->
              <span *ngIf="day.yourVacation" class="text-[10px] bg-[#B48CF2] text-white rounded px-1 py-0.5 font-medium">
                You
              </span>

              <!-- Others vacations -->
              <ng-container *ngIf="day.othersVacations.length > 0">
                <span *ngFor="let ov of day.othersVacations.slice(0, 2)" class="text-[10px] bg-[#7CC9A7] text-white rounded px-1 py-0.5 font-medium truncate">
                  {{ ov.member.name.split(' ')[0] }}
                </span>
                <span *ngIf="day.othersVacations.length > 2" class="text-[10px] bg-gray-200 text-[#64748B] rounded px-1 py-0.5 font-medium">
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
          <span class="w-3 h-3 rounded-sm bg-[#7CC9A7]"></span> Vacation (Others)
        </div>
        <div class="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span class="w-3 h-3 rounded-sm bg-[#B48CF2]"></span> Your Days
        </div>
        <div class="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span class="w-3 h-3 rounded-sm bg-[#F7C873]"></span> Public Holiday
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
    const isCurrentMonth = this.viewYear === today.getFullYear() && this.viewMonth === today.getMonth() + 1;
    if (isCurrentMonth && today.getDate() <= 20) return 'Current month – today is before the 20th';
    if (isCurrentMonth) return 'Next month view – today is after the 20th';
    return '';
  }

  constructor(private dataService: MockDataService) {}

  ngOnInit(): void {
    const today = new Date();
    if (today.getDate() > 20) {
      // Show next month
      const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      this.viewYear = next.getFullYear();
      this.viewMonth = next.getMonth() + 1;
    } else {
      this.viewYear = today.getFullYear();
      this.viewMonth = today.getMonth() + 1;
    }

    combineLatest([
      this.dataService.vacations$,
      this.dataService.holidays$,
      this.dataService.authenticatedUser$,
    ]).subscribe(([vacations, holidays, user]) => {
      this.currentUser = user;
      this.buildCalendar(vacations, holidays, user);
    });
  }

  buildCalendar(vacations: any[], holidays: any[], user: Member | null): void {
    const today = new Date();
    const firstDay = new Date(this.viewYear, this.viewMonth - 1, 1);
    const lastDay = new Date(this.viewYear, this.viewMonth, 0);
    const days: CalendarDay[] = [];

    let startDow = firstDay.getDay();
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
      const holiday = holidays.find((h: any) => h.date === dateStr);

      const dayVacations = vacations.filter((v: any) => v.date === dateStr);
      const yourVacation = user ? dayVacations.find((v: any) => v.username === user.username) : undefined;
      const othersVacations = dayVacations
        .filter((v: any) => !user || v.username !== user.username)
        .map((v: any) => ({ vacation: v, member: this.dataService.getMemberByUsername(v.username)! }))
        .filter((x: any) => !!x.member);

      days.push({ date, isCurrentMonth: true, isWeekend, isToday, isPast, holiday, yourVacation, othersVacations });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 0; i < remaining; i++) {
      const d = i + 1;
      const date = new Date(this.viewYear, this.viewMonth, d);
      days.push({ date, isCurrentMonth: false, isWeekend: false, isToday: false, isPast: false, holiday: undefined, yourVacation: undefined, othersVacations: [] });
    }

    this.calendarDays = days;
  }

  emptyDay(): CalendarDay {
    return { date: null as any, isCurrentMonth: false, isWeekend: false, isToday: false, isPast: false, holiday: undefined, yourVacation: undefined, othersVacations: [] };
  }

  getCellClass(day: CalendarDay): string {
    const base = 'min-h-[80px] p-1.5 border border-gray-100 text-left';
    if (!day.date) return `${base} invisible`;
    if (!day.isCurrentMonth) return `${base} bg-gray-50/50`;
    if (day.isWeekend) return `${base} bg-gray-50`;
    if (day.isToday) return `${base} bg-blue-50/50 ring-2 ring-[#4F7DF3] ring-inset`;
    return `${base} bg-white hover:bg-gray-50/50`;
  }

  getDayNumberClass(day: CalendarDay): string {
    const base = 'text-sm font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full';
    if (day.isToday) return `${base} bg-[#4F7DF3] text-white`;
    if (!day.isCurrentMonth) return `${base} text-gray-300`;
    if (day.isWeekend) return `${base} text-gray-400`;
    return `${base} text-[#1E293B]`;
  }

  prevMonth(): void {
    if (this.viewMonth === 1) { this.viewMonth = 12; this.viewYear--; }
    else this.viewMonth--;
    combineLatest([
      this.dataService.vacations$,
      this.dataService.holidays$,
      this.dataService.authenticatedUser$,
    ]).subscribe(([v, h, u]) => this.buildCalendar(v, h, u)).unsubscribe();
  }

  nextMonth(): void {
    if (this.viewMonth === 12) { this.viewMonth = 1; this.viewYear++; }
    else this.viewMonth++;
    combineLatest([
      this.dataService.vacations$,
      this.dataService.holidays$,
      this.dataService.authenticatedUser$,
    ]).subscribe(([v, h, u]) => this.buildCalendar(v, h, u)).unsubscribe();
  }
}
