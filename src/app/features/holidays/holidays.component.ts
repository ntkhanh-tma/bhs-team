import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataService } from '../../core/services/data.service';
import { Holiday } from '../../core/models/models';

interface EnrichedHoliday {
  date: string;
  name: string;
  dayOfWeek: string;  // "Wednesday"
  dayNum: number;     // 4
  monthAbbr: string;  // "Jul"
  isToday: boolean;
  daysUntil: number;  // 0 = today, 1 = tomorrow, …
}

interface CountryGroup {
  key: string;          // 'au' | 'vn' | 'other'
  flag: string;
  displayName: string;
  holidays: EnrichedHoliday[];
}

interface MonthGroup {
  label: string;
  year: number;
  month: number;
  countryGroups: CountryGroup[];
  totalCount: number;
}

@Component({
  selector: 'app-holidays',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <!-- Page header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-[#1E293B]">Public Holidays</h1>
        <p class="text-[#64748B] text-sm mt-1">
          Upcoming holidays over the next 6 months
          <span *ngIf="totalCount > 0" class="ml-1">— {{ totalCount }} total</span>
        </p>
      </div>

      <!-- Country filter -->
      <div *ngIf="allCountries.length > 1" class="flex gap-2 mb-6 flex-wrap">
        <button (click)="setFilter('')" [class]="filterBtnClass('')">All</button>
        <button *ngFor="let c of allCountries"
                (click)="setFilter(c.key)"
                [class]="filterBtnClass(c.key)">
          {{ c.flag }} {{ c.name }}
        </button>
      </div>

      <!-- Month groups -->
      <div *ngFor="let group of filteredGroups" class="mb-8">
        <!-- Month header -->
        <div class="flex items-center gap-3 mb-3">
          <h3 class="text-base font-semibold text-[#1E293B]">{{ group.label }}</h3>
          <span class="text-xs text-[#64748B] bg-gray-100 px-2 py-0.5 rounded-full">
            {{ group.totalCount }} holiday{{ group.totalCount !== 1 ? 's' : '' }}
          </span>
        </div>

        <div class="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          <ng-container *ngFor="let cg of group.countryGroups">
            <!-- Country sub-header -->
            <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50/60">
              <span class="text-base leading-none">{{ cg.flag }}</span>
              <span class="text-sm font-medium text-[#1E293B]">{{ cg.displayName }}</span>
              <span class="text-xs text-[#64748B] ml-auto">
                {{ cg.holidays.length }} holiday{{ cg.holidays.length !== 1 ? 's' : '' }}
              </span>
            </div>

            <!-- Holiday rows -->
            <div *ngFor="let h of cg.holidays"
                 class="flex items-center gap-4 px-4 py-3">

              <!-- Date chip -->
              <div class="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center"
                   [class]="getDateChipClass(cg.key, h.isToday)">
                <span class="text-[10px] font-semibold uppercase leading-none">{{ h.monthAbbr }}</span>
                <span class="text-lg font-bold leading-tight">{{ h.dayNum }}</span>
              </div>

              <!-- Holiday name + weekday -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-[#1E293B] truncate">{{ h.name }}</p>
                <p class="text-xs text-[#64748B]">{{ h.dayOfWeek }}</p>
              </div>

              <!-- Proximity badge -->
              <span *ngIf="h.isToday"
                    class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                Today
              </span>
              <span *ngIf="!h.isToday && h.daysUntil <= 7"
                    class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-[#e8eefb] text-[#003bc4] font-medium">
                {{ h.daysUntil === 1 ? 'Tomorrow' : 'In ' + h.daysUntil + ' days' }}
              </span>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="filteredGroups.length === 0" class="text-center py-16 text-[#64748B]">
        <img src="images/holidays.png" class="w-12 h-12 object-contain mb-3 mx-auto opacity-40" alt="">
        <p class="text-sm">No upcoming public holidays in the next 6 months.</p>
      </div>
    </div>
  `,
})
export class HolidaysComponent implements OnInit, OnDestroy {
  monthGroups: MonthGroup[] = [];
  filteredGroups: MonthGroup[] = [];
  allCountries: { key: string; flag: string; name: string }[] = [];
  activeCountryKey = '';
  totalCount = 0;

  private destroy$ = new Subject<void>();

  private readonly COUNTRY_ORDER = ['au', 'vn', 'other'];

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.holidays$.pipe(takeUntil(this.destroy$)).subscribe(holidays => {
      this.buildGroups(holidays);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildGroups(holidays: Holiday[]): void {
    const today = new Date();
    const todayStr = this.dataService.formatDate(today);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    // 6 calendar months ahead (inclusive of current month)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
    const endDateStr = this.dataService.formatDate(endDate);

    const upcoming = holidays
      .filter(h => h.date >= todayStr && h.date <= endDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    this.totalCount = upcoming.length;

    const monthMap = new Map<string, MonthGroup>();

    for (const h of upcoming) {
      const [hy, hm, hd] = h.date.split('-').map(Number);
      const monthKey = `${hy}-${String(hm).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        const d = new Date(hy, hm - 1, 1);
        monthMap.set(monthKey, {
          year: hy,
          month: hm,
          label: d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
          countryGroups: [],
          totalCount: 0,
        });
      }

      const group = monthMap.get(monthKey)!;
      group.totalCount++;

      const hDate = new Date(hy, hm - 1, hd);
      const enriched: EnrichedHoliday = {
        date: h.date,
        name: h.name,
        dayOfWeek:  hDate.toLocaleDateString('en-AU', { weekday: 'long' }),
        dayNum:     hd,
        monthAbbr:  hDate.toLocaleDateString('en-AU', { month: 'short' }),
        isToday:    h.date === todayStr,
        daysUntil:  Math.floor((hDate.getTime() - todayMidnight) / 86_400_000),
      };

      const cKey = this.countryKey(h.country);
      let cg = group.countryGroups.find(c => c.key === cKey);
      if (!cg) {
        const info = this.countryInfo(h.country);
        cg = { key: cKey, flag: info.flag, displayName: info.name, holidays: [] };
        group.countryGroups.push(cg);
      }
      cg.holidays.push(enriched);
    }

    // Sort country groups within each month
    for (const group of monthMap.values()) {
      group.countryGroups.sort(
        (a, b) => this.COUNTRY_ORDER.indexOf(a.key) - this.COUNTRY_ORDER.indexOf(b.key),
      );
    }

    this.monthGroups = Array.from(monthMap.values());

    // Derive unique countries for the filter bar
    const seen = new Set<string>();
    const countries: { key: string; flag: string; name: string }[] = [];
    for (const g of this.monthGroups) {
      for (const cg of g.countryGroups) {
        if (!seen.has(cg.key)) {
          seen.add(cg.key);
          countries.push({ key: cg.key, flag: cg.flag, name: cg.displayName });
        }
      }
    }
    this.allCountries = countries.sort(
      (a, b) => this.COUNTRY_ORDER.indexOf(a.key) - this.COUNTRY_ORDER.indexOf(b.key),
    );

    this.applyFilter();
  }

  setFilter(key: string): void {
    this.activeCountryKey = key;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.activeCountryKey) {
      this.filteredGroups = this.monthGroups;
      return;
    }
    this.filteredGroups = this.monthGroups
      .map(g => {
        const countryGroups = g.countryGroups.filter(cg => cg.key === this.activeCountryKey);
        return {
          ...g,
          countryGroups,
          totalCount: countryGroups.reduce((s, cg) => s + cg.holidays.length, 0),
        };
      })
      .filter(g => g.countryGroups.length > 0);
  }

  private countryKey(country?: string): string {
    const c = (country ?? '').toLowerCase();
    if (c.includes('aus') || c === 'au') return 'au';
    if (c.includes('viet') || c === 'vn') return 'vn';
    return 'other';
  }

  private countryInfo(country?: string): { flag: string; name: string } {
    switch (this.countryKey(country)) {
      case 'au': return { flag: '🇦🇺', name: 'Australia' };
      case 'vn': return { flag: '🇻🇳', name: 'Vietnam' };
      default:   return { flag: '🌐', name: country || 'Other' };
    }
  }

  filterBtnClass(key: string): string {
    const base = 'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors border';
    return key === this.activeCountryKey
      ? `${base} bg-[#003bc4] text-white border-[#003bc4]`
      : `${base} border-gray-200 text-[#64748B] hover:bg-gray-50`;
  }

  getDateChipClass(countryKey: string, isToday: boolean): string {
    if (isToday) return 'bg-[#003bc4] text-white';
    if (countryKey === 'vn') return 'bg-red-50 text-red-700';
    return 'bg-[#FEF9EE] text-[#92400E]';
  }
}
