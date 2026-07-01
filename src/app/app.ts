import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './shared/components/sidebar.component';
import { LoginDialogComponent } from './shared/components/login-dialog.component';
import { DataService } from './core/services/data.service';
import { Member } from './core/models/models';

interface ChipColor { bg: string; text: string; }

const CHIP_COLORS: ChipColor[] = [
  { bg: '#EFF6FF', text: '#1D4ED8' },
  { bg: '#F0FDF4', text: '#15803D' },
  { bg: '#FFF7ED', text: '#C2410C' },
  { bg: '#FDF4FF', text: '#7E22CE' },
  { bg: '#FFF1F2', text: '#BE123C' },
  { bg: '#ECFEFF', text: '#0E7490' },
  { bg: '#FFFBEB', text: '#B45309' },
  { bg: '#F0F9FF', text: '#0369A1' },
  { bg: '#F7FEE7', text: '#4D7C0F' },
  { bg: '#FFF0F0', text: '#B91C1C' },
];

const chipColor = (name: string, seed = 0): ChipColor => {
  let h = seed;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return CHIP_COLORS[Math.abs(h) % CHIP_COLORS.length];
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, SidebarComponent, LoginDialogComponent],
  template: `
    <!-- Loading overlay -->
    <div *ngIf="loading" class="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div class="text-center">
        <img src="images/vacation.png" class="w-12 h-12 object-contain mb-3" alt="">
        <p class="text-[#64748B] text-sm">Loading team data…</p>
      </div>
    </div>

    <div class="flex h-screen bg-gray-50 overflow-hidden">

      <!-- Mobile/tablet sidebar backdrop -->
      <div *ngIf="sidebarOpen"
           class="fixed inset-0 bg-black/40 z-30 lg:hidden"
           (click)="sidebarOpen = false">
      </div>

      <!-- Sidebar: overlay on mobile/tablet, inline on desktop.
           lg:translate-x-0 (responsive utility) always wins over the base
           -translate-x-full binding because responsive utilities appear later
           in Tailwind's generated stylesheet. -->
      <div class="fixed lg:static inset-y-0 left-0 z-40 lg:z-auto flex-shrink-0
                  transition-transform duration-200 lg:translate-x-0"
           [class.translate-x-0]="sidebarOpen"
           [class.-translate-x-full]="!sidebarOpen">
        <app-sidebar></app-sidebar>
      </div>

      <div class="flex-1 flex flex-col min-w-0">

        <!-- Header -->
        <header class="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-2 flex-shrink-0">

          <!-- Hamburger (mobile/tablet only) -->
          <button (click)="sidebarOpen = !sidebarOpen"
                  class="lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu">
            <div class="w-5 space-y-[5px]">
              <span class="block h-0.5 bg-gray-600 rounded-full transition-all"
                    [class.w-5]="!sidebarOpen" [class.w-3]="sidebarOpen"></span>
              <span class="block h-0.5 w-5 bg-gray-600 rounded-full"></span>
              <span class="block h-0.5 bg-gray-600 rounded-full transition-all"
                    [class.w-5]="!sidebarOpen" [class.w-3]="sidebarOpen"></span>
            </div>
          </button>

          <!-- Spacer -->
          <div class="flex-1"></div>

          <!-- Logged-in state -->
          <div *ngIf="currentUser; else loginBtn" class="flex items-center gap-2 sm:gap-3">

            <!-- Name + chips (chips hidden on very small screens) -->
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              <span class="text-sm font-semibold text-[#1E293B] hidden sm:inline">{{ currentUser.name }}</span>
              <span *ngIf="currentUser.department"
                    class="hidden md:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full select-none"
                    [style.background-color]="teamChip.bg"
                    [style.color]="teamChip.text">
                {{ currentUser.department }}
              </span>
              <span *ngIf="currentUser.position"
                    class="hidden md:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full select-none"
                    [style.background-color]="roleChip.bg"
                    [style.color]="roleChip.text">
                {{ currentUser.position }}
              </span>
            </div>

            <!-- Profile / settings -->
            <a routerLink="/profile"
               title="My Profile"
               class="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors group flex-shrink-0">
              <img src="images/settings.png"
                   class="w-[18px] h-[18px] object-contain opacity-40 group-hover:opacity-70 transition-opacity" alt="Settings">
            </a>

            <!-- Logout -->
            <button (click)="logout()"
                    class="text-sm border border-gray-200 text-[#64748B] hover:text-[#1E293B] px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
              Logout
            </button>
          </div>

          <!-- Guest state -->
          <ng-template #loginBtn>
            <button (click)="showLoginDialog = true"
                    class="text-sm border border-[#003bc4] text-[#003bc4] px-4 py-1.5 rounded-lg hover:bg-[#e8eefb] font-medium flex-shrink-0">
              Login
            </button>
          </ng-template>

        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-auto p-4 sm:p-6">
          <router-outlet></router-outlet>
        </main>

      </div>
    </div>

    <app-login-dialog
      *ngIf="showLoginDialog"
      (close)="showLoginDialog = false"
      (loggedIn)="showLoginDialog = false"
    ></app-login-dialog>
  `,
})
export class AppComponent implements OnInit {
  showLoginDialog = false;
  currentUser: Member | null = null;
  loading = true;
  sidebarOpen = false;

  teamChip: ChipColor = { bg: '', text: '' };
  roleChip: ChipColor = { bg: '', text: '' };

  constructor(private dataService: DataService, private router: Router) {}

  ngOnInit(): void {
    this.dataService.authenticatedUser$.subscribe(u => {
      this.currentUser = u;
      this.teamChip = u?.department ? chipColor(u.department)     : { bg: '', text: '' };
      this.roleChip = u?.position   ? chipColor(u.position, 5381) : { bg: '', text: '' };
    });
    this.dataService.loading$.subscribe(l => this.loading = l);

    // Close sidebar when navigating (mobile UX)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.sidebarOpen = false);
  }

  logout(): void {
    this.dataService.logout();
  }
}
