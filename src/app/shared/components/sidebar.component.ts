import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Holiday, Member, Vacation, VacationType } from '../../core/models/models';
import { MockDataService } from '../../core/services/mock-data.service';

interface UpcomingVacation {
  label: string;
  type: VacationType;
}

interface VnHoliday {
  name: string;
  monthAbbr: string;
  dayNum: number;
  proximity: string;
  isUrgent: boolean;  // today or tomorrow → show highlighted
}

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

        <!-- Nav links -->
        <nav class="p-3 space-y-1">
          <a routerLink="/home" routerLinkActive="bg-[#e8eefb] text-[#003bc4] font-semibold"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748B] hover:bg-gray-50 transition-colors">
            <img src="images/home.png" class="w-5 h-5 object-contain flex-shrink-0" alt=""> Home
          </a>
          <a routerLink="/holidays" routerLinkActive="bg-[#e8eefb] text-[#003bc4] font-semibold"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748B] hover:bg-gray-50 transition-colors">
            <img src="images/holidays.png" class="w-5 h-5 object-contain flex-shrink-0" alt=""> Holidays
          </a>
          <a routerLink="/history" routerLinkActive="bg-[#e8eefb] text-[#003bc4] font-semibold"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748B] hover:bg-gray-50 transition-colors">
            <img src="images/history.png" class="w-5 h-5 object-contain flex-shrink-0" alt=""> History
          </a>
          <a routerLink="/members" routerLinkActive="bg-[#e8eefb] text-[#003bc4] font-semibold"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748B] hover:bg-gray-50 transition-colors">
            <img src="images/members.png" class="w-5 h-5 object-contain flex-shrink-0" alt=""> Members
          </a>
        </nav>

        <!-- Your Schedule -->
        <div *ngIf="currentUser && upcomingVacations.length > 0"
             class="border-t border-gray-100 px-3 py-3">
          <p class="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-2">Your Schedule</p>
          <div class="space-y-1">
            <div *ngFor="let v of upcomingVacations"
                 class="flex items-center gap-2 rounded-lg px-2 py-1.5"
                 [style.background-color]="vacTypeBg(v.type)">
              <span class="text-[10px] font-medium text-[#64748B] w-11 flex-shrink-0">{{ v.label }}</span>
              <span class="text-[10px] font-semibold"
                    [style.color]="vacTypeTextColor(v.type)">
                {{ v.type === 'Compensation' ? 'Comp' : v.type }}
              </span>
            </div>
          </div>
          <p *ngIf="moreVacations > 0" class="text-[10px] text-[#94a3b8] mt-1.5 text-center">
            +{{ moreVacations }} more
          </p>
        </div>

        <!-- VN Public Holidays -->
        <div *ngIf="upcomingVnHolidays.length > 0"
             class="border-t border-gray-100 px-3 py-3">
          <p class="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-2.5">&#127758; VN Holidays</p>
          <div class="space-y-2">
            <div *ngFor="let h of upcomingVnHolidays"
                 class="flex items-center gap-2.5 rounded-lg p-2"
                 [class.bg-red-50]="!h.isUrgent"
                 [class.bg-red-100]="h.isUrgent">

              <!-- Date chip -->
              <div class="w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                   [class.bg-red-400]="!h.isUrgent"
                   [class.bg-red-600]="h.isUrgent">
                <span class="text-[8px] font-bold text-red-100 uppercase leading-none tracking-wider">{{ h.monthAbbr }}</span>
                <span class="text-sm font-bold text-white leading-tight">{{ h.dayNum }}</span>
              </div>

              <!-- Name + proximity -->
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-semibold text-[#1E293B] leading-tight"
                   style="overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2">
                  {{ h.name }}
                </p>
                <p class="text-[9px] font-semibold leading-tight mt-0.5"
                   [class.text-red-600]="h.isUrgent"
                   [class.text-red-400]="!h.isUrgent">
                  {{ h.proximity }}
                </p>
              </div>
            </div>
          </div>
          <p *ngIf="moreHolidays > 0" class="text-[10px] text-[#94a3b8] mt-2 text-center">
            +{{ moreHolidays }} more
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
  currentUser: Member | null = null;
  upcomingVacations: UpcomingVacation[] = [];
  upcomingVnHolidays: VnHoliday[] = [];
  moreVacations = 0;
  moreHolidays = 0;

  private destroy$ = new Subject<void>();
  private readonly MAX_ITEMS = 5;

  constructor(private dataService: MockDataService) {}

  ngOnInit(): void {
    this.dataService.authenticatedUser$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      this.currentUser = u;
    });

    combineLatest([
      this.dataService.vacations$,
      this.dataService.authenticatedUser$,
    ]).pipe(takeUntil(this.destroy$)).subscribe(([vacations, user]) => {
      this.buildUpcomingVacations(vacations, user);
    });

    this.dataService.holidays$.pipe(takeUntil(this.destroy$)).subscribe(h => {
      this.buildUpcomingVnHolidays(h);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildUpcomingVacations(vacations: Vacation[], user: Member | null): void {
    if (!user) { this.upcomingVacations = []; this.moreVacations = 0; return; }
    const todayStr = this.todayStr();
    const all = vacations
      .filter(v => v.username === user.username && v.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    this.moreVacations = Math.max(0, all.length - this.MAX_ITEMS);
    this.upcomingVacations = all.slice(0, this.MAX_ITEMS)
      .map(v => ({ label: this.shortDate(v.date), type: v.type }));
  }

  private buildUpcomingVnHolidays(holidays: Holiday[]): void {
    const todayStr = this.todayStr();
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const all = holidays
      .filter(h => h.date >= todayStr && this.isVn(h.country))
      .sort((a, b) => a.date.localeCompare(b.date));

    this.moreHolidays = Math.max(0, all.length - this.MAX_ITEMS);
    this.upcomingVnHolidays = all.slice(0, this.MAX_ITEMS).map(h => {
      const [y, m, d] = h.date.split('-').map(Number);
      const hDate = new Date(y, m - 1, d);
      const days = Math.round((hDate.getTime() - todayMidnight) / 86_400_000);
      return {
        name: h.name,
        monthAbbr: hDate.toLocaleDateString('en-US', { month: 'short' }),
        dayNum: d,
        proximity: this.proximity(days),
        isUrgent: days <= 1,
      };
    });
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

  vacTypeBg(type: VacationType): string {
    if (type === 'Compensation') return '#ECFEFF';
    if (type === 'Event') return '#FFF7ED';
    return '#FAF5FF';
  }

  vacTypeTextColor(type: VacationType): string {
    if (type === 'Compensation') return '#0E7490';
    if (type === 'Event') return '#C2410C';
    return '#7E22CE';
  }

  get shortDisplayName(): string {
    return this.currentUser ? this.dataService.getShortDisplayName(this.currentUser) : '';
  }
}
