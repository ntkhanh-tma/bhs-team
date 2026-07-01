import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';
import { Member, Vacation } from '../../core/models/models';

interface HistoryEntry {
  member: Member;
  vacations: Vacation[];
  dateRange: string;
  dayCount: number;
  ganttOffset: number;
  ganttWidth: number;
  color: string;
}

interface CalendarCell {
  dayNum: number | null;
  dateStr: string;
  entries: HistoryEntry[];
  isWeekend: boolean;
}

interface MonthGroup {
  label: string;
  year: number;
  month: number;
  entries: HistoryEntry[];
  minDay: number;
  maxDay: number;
  calendarCells: CalendarCell[];
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-[#1E293B]">History</h1>
        <p class="text-[#64748B] text-sm mt-1">View past and current vacation registrations.</p>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-3 mb-6 flex-wrap">
        <select [(ngModel)]="filterMonth" (ngModelChange)="applyFilter()"
                class="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#003bc4]">
          <option value="">All Months</option>
          <option *ngFor="let m of availableMonths" [value]="m.key">{{ m.label }}</option>
        </select>
        <div class="relative flex-1 max-w-xs">
          <input [(ngModel)]="searchQuery" (ngModelChange)="applyFilter()"
                 type="text" placeholder="Search member..."
                 class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003bc4] pl-8">
          <span class="absolute left-2.5 top-2.5 text-gray-400 text-sm">&#128269;</span>
        </div>
        <div class="ml-auto flex gap-2">
          <button (click)="viewMode = 'calendar'" [class]="viewMode === 'calendar' ? activeBtn : inactiveBtn">
            &#128197; Calendar
          </button>
          <button (click)="viewMode = 'timeline'" [class]="viewMode === 'timeline' ? activeBtn : inactiveBtn">
            &#9646; Timeline
          </button>
        </div>
      </div>

      <!-- Month groups -->
      <div *ngFor="let group of filteredGroups" class="mb-8">
        <h3 class="text-base font-semibold text-[#1E293B] mb-3">{{ group.label }}</h3>

        <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">

          <!-- ── Timeline view ─────────────────────────────────────────────── -->
          <div *ngIf="viewMode === 'timeline'" class="flex">
            <!-- Left: member list -->
            <div class="w-80 flex-shrink-0 border-r border-gray-100">
              <div *ngFor="let entry of group.entries; let last = last"
                   [class]="'flex items-center gap-3 px-4 py-3' + (last ? '' : ' border-b border-gray-50')">
                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-xl flex-shrink-0 select-none">
                  {{ entry.member.avatarUrl }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-[#1E293B] truncate">{{ entry.member.name }}</p>
                  <p class="text-xs text-[#64748B]">{{ entry.dateRange }}</p>
                </div>
                <span class="text-xs font-semibold px-2 py-1 rounded-full text-white flex-shrink-0"
                      [style.background-color]="entry.color">
                  {{ entry.dayCount }} day{{ entry.dayCount !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>

            <!-- Right: Gantt -->
            <div class="flex-1 min-w-0 relative">
              <div class="flex border-b border-gray-100 px-4 py-2">
                <div *ngFor="let tick of getMonthTicks(group)"
                     class="text-xs text-[#64748B]" [style.width.%]="tick.widthPct">
                  {{ tick.label }}
                </div>
              </div>
              <div *ngFor="let entry of group.entries; let last = last"
                   [class]="'relative flex items-center px-4 h-[54px]' + (last ? '' : ' border-b border-gray-50')">
                <div *ngFor="let tick of getMonthTicks(group)"
                     class="absolute top-0 bottom-0 border-l border-gray-50"
                     [style.left]="tick.leftPct + '%'">
                </div>
                <div class="absolute h-5 rounded-full opacity-90"
                     [style.left]="'calc(' + entry.ganttOffset + '% + 1rem)'"
                     [style.width]="'calc(' + entry.ganttWidth + '% - 2rem * ' + entry.ganttWidth / 100 + ')'"
                     [style.background-color]="entry.color">
                </div>
              </div>
            </div>
          </div>

          <!-- ── Calendar view ─────────────────────────────────────────────── -->
          <div *ngIf="viewMode === 'calendar'" class="p-4">
            <!-- Day-of-week headers -->
            <div class="grid grid-cols-7 mb-1">
              <div *ngFor="let h of dayHeaders; let i = index"
                   class="text-center text-[11px] font-semibold py-1.5 rounded"
                   [class.text-slate-400]="i >= 5"
                   [class.text-[#64748B]]="i < 5"
                   [class.bg-slate-50]="i >= 5">
                {{ h }}
              </div>
            </div>

            <!-- Calendar cells -->
            <div class="grid grid-cols-7 gap-0.5">
              <div *ngFor="let cell of group.calendarCells"
                   class="min-h-[56px] rounded-lg border text-left overflow-hidden"
                   [class.border-transparent]="!cell.dayNum"
                   [class.invisible]="!cell.dayNum"
                   [class.border-gray-100]="!!cell.dayNum && !cell.isWeekend"
                   [class.bg-white]="!!cell.dayNum && !cell.isWeekend"
                   [class.border-slate-200]="!!cell.dayNum && cell.isWeekend"
                   [class.bg-slate-100]="!!cell.dayNum && cell.isWeekend">
                <ng-container *ngIf="cell.dayNum">
                  <p class="text-[10px] font-medium px-1.5 pt-1 leading-none"
                     [class.text-slate-400]="cell.isWeekend"
                     [class.text-[#64748B]]="!cell.isWeekend">
                    {{ cell.dayNum }}
                  </p>
                  <div class="px-1 pb-1 flex flex-wrap gap-0.5 mt-0.5">
                    <div *ngFor="let entry of cell.entries.slice(0, 5)"
                         class="w-5 h-5 rounded-full flex items-center justify-center bg-gray-100 text-sm leading-none select-none"
                         [title]="entry.member.name">
                      {{ entry.member.avatarUrl }}
                    </div>
                    <div *ngIf="cell.entries.length > 5"
                         class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-[#64748B] font-semibold">
                      +{{ cell.entries.length - 5 }}
                    </div>
                  </div>
                </ng-container>
              </div>
            </div>

            <!-- Legend -->
            <div *ngIf="group.entries.length > 0" class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-x-3 gap-y-1.5">
              <div *ngFor="let entry of group.entries"
                   class="flex items-center gap-1.5 text-xs text-[#64748B]">
                <span class="text-base leading-none select-none">{{ entry.member.avatarUrl }}</span>
                <span class="font-medium">{{ entry.member.name.split(' ')[0] }}</span>
                <span class="text-[#94a3b8]">{{ entry.dayCount }}d</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div *ngIf="filteredGroups.length === 0" class="text-center py-16 text-[#64748B]">
        <img src="images/history.png" class="w-12 h-12 object-contain mb-3 mx-auto opacity-40" alt="">
        <p>No vacation history found.</p>
      </div>
    </div>
  `,
})
export class HistoryComponent implements OnInit {
  dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  allGroups: MonthGroup[] = [];
  filteredGroups: MonthGroup[] = [];
  availableMonths: { key: string; label: string }[] = [];
  filterMonth = '';
  searchQuery = '';
  viewMode: 'calendar' | 'timeline' = 'timeline';
  currentUserUsername: string | null = null;

  activeBtn  = 'px-3 py-1.5 text-sm rounded-lg bg-[#003bc4] text-white font-medium';
  inactiveBtn = 'px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-[#64748B] hover:bg-gray-50';

  constructor(private dataService: MockDataService) {}

  ngOnInit(): void {
    this.dataService.authenticatedUser$.subscribe(u => {
      this.currentUserUsername = u?.username ?? null;
      this.buildHistory();
    });
    this.dataService.vacations$.subscribe(() => this.buildHistory());
  }

  buildHistory(): void {
    const raw = this.dataService.getVacationsGroupedByMonth();
    this.allGroups = raw.map(group => {
      const entries: HistoryEntry[] = group.entries.map(e => {
        const dates = e.vacations.map(v => v.date).sort();
        const firstDate = new Date(dates[0]);
        const lastDate  = new Date(dates[dates.length - 1]);
        const daysInMonth = new Date(group.year, group.month, 0).getDate();
        const startDay = firstDate.getDate();
        const endDay   = lastDate.getDate();
        const isYou = e.member.username === (this.currentUserUsername ?? '');
        const color = isYou ? '#B48CF2' : e.member.avatarColor ?? '#7CC9A7';

        let dateRange = '';
        if (dates.length === 1) {
          dateRange = this.formatShortDate(dates[0]);
        } else {
          dateRange = `${this.formatShortDate(dates[0])} – ${this.formatShortDate(dates[dates.length - 1])}`;
        }

        return {
          member: e.member,
          vacations: e.vacations,
          dateRange,
          dayCount: dates.length,
          ganttOffset: ((startDay - 1) / daysInMonth) * 100,
          ganttWidth:  ((endDay - startDay + 1) / daysInMonth) * 100,
          color,
        };
      });

      return {
        label: group.label,
        year:  group.year,
        month: group.month,
        entries,
        minDay: 1,
        maxDay: new Date(group.year, group.month, 0).getDate(),
        calendarCells: this.buildCalendarCells(group.year, group.month, entries),
      };
    });

    this.availableMonths = this.allGroups.map(g => ({ key: `${g.year}-${g.month}`, label: g.label }));
    this.applyFilter();
  }

  private buildCalendarCells(year: number, month: number, entries: HistoryEntry[]): CalendarCell[] {
    const cells: CalendarCell[] = [];
    const firstDay  = new Date(year, month - 1, 1);
    const daysInMon = new Date(year, month, 0).getDate();
    const leadingBlanks = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ dayNum: null, dateStr: '', entries: [], isWeekend: false });
    }

    for (let d = 1; d <= daysInMon; d++) {
      const date = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = date.getDay();
      cells.push({
        dayNum: d,
        dateStr,
        entries: entries.filter(e => e.vacations.some(v => v.date === dateStr)),
        isWeekend: dow === 0 || dow === 6,
      });
    }

    const trailing = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      cells.push({ dayNum: null, dateStr: '', entries: [], isWeekend: false });
    }
    return cells;
  }

  applyFilter(): void {
    let groups = this.allGroups;
    if (this.filterMonth) {
      const [y, m] = this.filterMonth.split('-').map(Number);
      groups = groups.filter(g => g.year === y && g.month === m);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      groups = groups.map(g => ({
        ...g,
        entries: g.entries.filter(e => e.member.name.toLowerCase().includes(q)),
        calendarCells: g.calendarCells.map(c => ({
          ...c,
          entries: c.entries.filter(e => e.member.name.toLowerCase().includes(q)),
        })),
      })).filter(g => g.entries.length > 0);
    }
    this.filteredGroups = groups;
  }

  getMonthTicks(group: MonthGroup): { label: string; widthPct: number; leftPct: number }[] {
    const daysInMonth = group.maxDay;
    const ticks = [1, 5, 10, 15, 20, 25, 30].filter(d => d <= daysInMonth);
    return ticks.map((d, i, arr) => ({
      label: String(d),
      widthPct: i < arr.length - 1
        ? ((arr[i + 1] - d) / daysInMonth) * 100
        : ((daysInMonth - d + 1) / daysInMonth) * 100,
      leftPct: ((d - 1) / daysInMonth) * 100,
    }));
  }

  formatShortDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
