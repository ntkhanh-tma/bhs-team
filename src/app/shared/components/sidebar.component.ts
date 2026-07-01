import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Holiday, Member, Vacation, VacationType } from '../../core/models/models';
import { MockDataService } from '../../core/services/mock-data.service';

interface NavTile {
  route: string;
  label: string;
  icon: string;
  bg: string;
  border: string;
  text: string;
}

type UpcomingItem =
  | { kind: 'vacation'; date: string; label: string; type: VacationType; monthAbbr: string; dayNum: number }
  | { kind: 'holiday'; date: string; label: string; name: string; monthAbbr: string; dayNum: number; proximity: string; isUrgent: boolean };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="w-52 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 h-full shadow-sm">

      <!-- Brand header -->
      <div class="bg-[#003bc4] px-4 py-3.5 flex items-center gap-2.5 flex-shrink-0">
        <img src="images/vacation.png" class="w-7 h-7 object-contain brightness-0 invert flex-shrink-0" alt="">
        <div>
          <p class="text-sm font-bold text-white leading-tight">BESTMED Vacation</p>
          <p class="text-[10px] text-blue-200">Register. Plan. Relax.</p>
        </div>
      </div>

      <!-- Scrollable middle -->
      <div class="flex-1 overflow-y-auto">

        <!-- Nav tiles — 2×2 grid, each with its own color -->
        <nav class="p-3 grid grid-cols-2 gap-2">
          <a *ngFor="let t of navTiles"
             [routerLink]="t.route"
             routerLinkActive
             #rla="routerLinkActive"
             class="flex flex-col items-center justify-center py-3.5 rounded-xl transition-all cursor-pointer select-none"
             [style.background-color]="t.bg"
             [style.box-shadow]="rla.isActive ? '0 0 0 2.5px ' + t.border : 'none'">
            <img [src]="'images/' + t.icon + '.png'" class="w-7 h-7 object-contain mb-1.5" alt="">
            <span class="text-[11px] font-bold" [style.color]="t.text">{{ t.label }}</span>
          </a>
        </nav>

        <!-- Upcoming: vacations + VN holidays merged, sorted by date -->
        <div *ngIf="currentUser && upcomingItems.length > 0"
             class="border-t border-gray-100 px-3 py-3">
          <p class="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-2.5">Upcoming</p>
          <div class="space-y-2">

            <ng-container *ngFor="let item of upcomingItems">

              <!-- Holiday card -->
              <div *ngIf="item.kind === 'holiday'"
                   class="flex items-center gap-2.5 rounded-lg p-2"
                   [class.bg-red-50]="!asHoliday(item).isUrgent"
                   [class.bg-red-100]="asHoliday(item).isUrgent">
                <div class="w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                     [class.bg-red-400]="!asHoliday(item).isUrgent"
                     [class.bg-red-600]="asHoliday(item).isUrgent">
                  <span class="text-[8px] font-bold text-red-100 uppercase leading-none tracking-wider">{{ item.monthAbbr }}</span>
                  <span class="text-sm font-bold text-white leading-tight">{{ item.dayNum }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-semibold text-[#1E293B] leading-tight"
                     style="overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2">
                    {{ item.name }}
                  </p>
                  <p class="text-[9px] font-semibold leading-tight mt-0.5"
                     [class.text-red-600]="asHoliday(item).isUrgent"
                     [class.text-red-400]="!asHoliday(item).isUrgent">
                    {{ asHoliday(item).proximity }}
                  </p>
                </div>
              </div>

              <!-- Vacation card -->
              <div *ngIf="item.kind === 'vacation'"
                   class="flex items-center gap-2.5 rounded-lg p-2"
                   [style.background-color]="vacTypeBgLight(asVacation(item).type)">
                <div class="w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                     [style.background-color]="vacTypeChip(asVacation(item).type)">
                  <span class="text-[8px] font-bold text-white/70 uppercase leading-none tracking-wider">{{ item.monthAbbr }}</span>
                  <span class="text-sm font-bold text-white leading-tight">{{ item.dayNum }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-semibold leading-tight"
                     [style.color]="vacTypeTextColor(asVacation(item).type)">
                    {{ vacTypeLabel(asVacation(item).type) }}
                  </p>
                  <p class="text-[9px] text-[#94a3b8] leading-tight mt-0.5">Your day off</p>
                </div>
              </div>

            </ng-container>
          </div>

          <p *ngIf="moreItems > 0" class="text-[10px] text-[#94a3b8] mt-2 text-center">
            +{{ moreItems }} more
          </p>
        </div>

      </div>

      <!-- User chip -->
      <div *ngIf="currentUser" class="px-3 py-3 border-t border-gray-100 flex-shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 text-xl flex-shrink-0 select-none">
            {{ currentUser.avatarUrl }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-[#1E293B] truncate" [title]="shortDisplayName">
              {{ shortDisplayName }}
            </p>
            <p class="text-[10px] text-[#64748B] truncate">{{ currentUser.position }}</p>
          </div>
        </div>
      </div>

    </div>
  `,
})
export class SidebarComponent implements OnInit, OnDestroy {
  readonly navTiles: NavTile[] = [
    { route: '/home',     label: 'Home',     icon: 'home',     bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
    { route: '/holidays', label: 'Holidays', icon: 'holidays', bg: '#FFF1F2', border: '#F43F5E', text: '#BE123C' },
    { route: '/history',  label: 'History',  icon: 'history',  bg: '#FDF4FF', border: '#A855F7', text: '#7E22CE' },
    { route: '/members',  label: 'Members',  icon: 'members',  bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  ];

  currentUser: Member | null = null;
  upcomingItems: UpcomingItem[] = [];
  moreItems = 0;

  private destroy$ = new Subject<void>();
  private readonly MAX_ITEMS = 8;

  constructor(private dataService: MockDataService) {}

  ngOnInit(): void {
    this.dataService.authenticatedUser$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      this.currentUser = u;
    });

    combineLatest([
      this.dataService.vacations$,
      this.dataService.holidays$,
      this.dataService.authenticatedUser$,
    ]).pipe(takeUntil(this.destroy$)).subscribe(([vacations, holidays, user]) => {
      this.buildUpcomingItems(vacations, holidays, user);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildUpcomingItems(vacations: Vacation[], holidays: Holiday[], user: Member | null): void {
    const todayStr = this.todayStr();
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const vacItems: UpcomingItem[] = user
      ? vacations
          .filter(v => v.username === user.username && v.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(v => {
            const [y, m, d] = v.date.split('-').map(Number);
            const dt = new Date(y, m - 1, d);
            return {
              kind: 'vacation' as const,
              date: v.date,
              label: this.shortDate(v.date),
              type: v.type,
              monthAbbr: dt.toLocaleDateString('en-US', { month: 'short' }),
              dayNum: d,
            };
          })
      : [];

    const holItems: UpcomingItem[] = holidays
      .filter(h => h.date >= todayStr && this.isVn(h.country))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(h => {
        const [y, m, d] = h.date.split('-').map(Number);
        const hDate = new Date(y, m - 1, d);
        const days = Math.round((hDate.getTime() - todayMidnight) / 86_400_000);
        return {
          kind: 'holiday' as const,
          date: h.date,
          label: this.shortDate(h.date),
          name: h.name,
          monthAbbr: hDate.toLocaleDateString('en-US', { month: 'short' }),
          dayNum: d,
          proximity: this.proximity(days),
          isUrgent: days <= 1,
        };
      });

    const merged = [...vacItems, ...holItems].sort((a, b) => a.date.localeCompare(b.date));
    this.moreItems = Math.max(0, merged.length - this.MAX_ITEMS);
    this.upcomingItems = merged.slice(0, this.MAX_ITEMS);
  }

  asHoliday(item: UpcomingItem) { return item as Extract<UpcomingItem, { kind: 'holiday' }>; }
  asVacation(item: UpcomingItem) { return item as Extract<UpcomingItem, { kind: 'vacation' }>; }

  vacTypeChip(type: VacationType): string {
    if (type === 'Compensation') return '#0E7490';
    if (type === 'Event') return '#C2410C';
    return '#7E22CE';
  }

  vacTypeBgLight(type: VacationType): string {
    if (type === 'Compensation') return '#ECFEFF';
    if (type === 'Event') return '#FFF7ED';
    return '#FAF5FF';
  }

  vacTypeTextColor(type: VacationType): string {
    if (type === 'Compensation') return '#0E7490';
    if (type === 'Event') return '#C2410C';
    return '#7E22CE';
  }

  vacTypeLabel(type: VacationType): string {
    if (type === 'Compensation') return 'Comp Day';
    if (type === 'Event') return 'Event Day';
    return 'Vacation Day';
  }

  private proximity(days: number): string {
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;
    if (days < 14) return 'Next week';
    if (days < 30) return `In ${Math.round(days / 7)} weeks`;
    if (days < 60) return 'Next month';
    return `In ~${Math.round(days / 30)} months`;
  }

  private isVn(country?: string): boolean {
    const c = (country ?? '').toLowerCase();
    return c.includes('viet') || c === 'vn';
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private shortDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  get shortDisplayName(): string {
    return this.currentUser ? this.dataService.getShortDisplayName(this.currentUser) : '';
  }
}
