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

interface MonthGroup {
  label: string;
  year: number;
  month: number;
  entries: HistoryEntry[];
  minDay: number;
  maxDay: number;
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
      <div class="flex items-center gap-3 mb-6">
        <select [(ngModel)]="filterMonth" (ngModelChange)="applyFilter()" class="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#003bc4]">
          <option value="">All Months</option>
          <option *ngFor="let m of availableMonths" [value]="m.key">{{ m.label }}</option>
        </select>
        <div class="relative flex-1 max-w-xs">
          <input
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilter()"
            type="text"
            placeholder="Search member..."
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003bc4] pl-8"
          />
          <span class="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
        </div>
        <div class="ml-auto flex gap-2">
          <button (click)="viewMode = 'calendar'" [class]="viewMode === 'calendar' ? activeBtn : inactiveBtn">Calendar View</button>
          <button (click)="viewMode = 'timeline'" [class]="viewMode === 'timeline' ? activeBtn : inactiveBtn">Timeline View</button>
        </div>
      </div>

      <!-- Content -->
      <div *ngFor="let group of filteredGroups" class="mb-8">
        <h3 class="text-base font-semibold text-[#1E293B] mb-3">{{ group.label }}</h3>

        <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <!-- List + Gantt layout -->
          <div class="flex">
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

            <!-- Right: Gantt timeline -->
            <div class="flex-1 min-w-0 relative">
              <!-- Timeline header -->
              <div class="flex border-b border-gray-100 px-4 py-2">
                <div *ngFor="let tick of getMonthTicks(group)" class="text-xs text-[#64748B]" [style.width.%]="tick.widthPct">
                  {{ tick.label }}
                </div>
              </div>

              <!-- Gantt rows -->
              <div *ngFor="let entry of group.entries; let last = last"
                   [class]="'relative flex items-center px-4 py-3 h-[54px]' + (last ? '' : ' border-b border-gray-50')">
                <!-- Background grid lines -->
                <div *ngFor="let tick of getMonthTicks(group)"
                     class="absolute top-0 bottom-0 border-l border-gray-50"
                     [style.left]="tick.leftPct + '%'">
                </div>
                <!-- Gantt bar -->
                <div
                  class="absolute h-5 rounded-full opacity-90"
                  [style.left]="'calc(' + entry.ganttOffset + '% + 1rem)'"
                  [style.width]="'calc(' + entry.ganttWidth + '% - 2rem * ' + entry.ganttWidth / 100 + ')'"
                  [style.background-color]="entry.color"
                ></div>
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
  allGroups: MonthGroup[] = [];
  filteredGroups: MonthGroup[] = [];
  availableMonths: { key: string; label: string }[] = [];
  filterMonth = '';
  searchQuery = '';
  viewMode: 'calendar' | 'timeline' = 'timeline';
  currentUserUsername: string | null = null;

  activeBtn = 'px-3 py-1.5 text-sm rounded-lg bg-[#003bc4] text-white font-medium';
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
        const lastDate = new Date(dates[dates.length - 1]);
        const daysInMonth = new Date(group.year, group.month, 0).getDate();
        const startDay = firstDate.getDate();
        const endDay = lastDate.getDate();
        const ganttOffset = ((startDay - 1) / daysInMonth) * 100;
        const ganttWidth = ((endDay - startDay + 1) / daysInMonth) * 100;
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
          ganttOffset,
          ganttWidth,
          color,
        };
      });

      return {
        label: group.label,
        year: group.year,
        month: group.month,
        entries,
        minDay: 1,
        maxDay: new Date(group.year, group.month, 0).getDate(),
      };
    });

    this.availableMonths = this.allGroups.map(g => ({ key: `${g.year}-${g.month}`, label: g.label }));
    this.applyFilter();
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
      })).filter(g => g.entries.length > 0);
    }
    this.filteredGroups = groups;
  }

  getMonthTicks(group: MonthGroup): { label: string; widthPct: number; leftPct: number }[] {
    const daysInMonth = group.maxDay;
    const ticks = [1, 5, 10, 15, 20, 25, 30].filter(d => d <= daysInMonth);
    return ticks.map((d, i, arr) => ({
      label: String(d),
      widthPct: i < arr.length - 1 ? ((arr[i + 1] - d) / daysInMonth) * 100 : ((daysInMonth - d + 1) / daysInMonth) * 100,
      leftPct: ((d - 1) / daysInMonth) * 100,
    }));
  }

  formatShortDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

}
