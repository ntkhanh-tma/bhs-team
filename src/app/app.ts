import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar.component';
import { LoginDialogComponent } from './shared/components/login-dialog.component';
import { MockDataService } from './core/services/mock-data.service';
import { Member } from './core/models/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, LoginDialogComponent],
  template: `
    <!-- Loading overlay -->
    <div *ngIf="loading" class="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div class="text-center">
        <img src="images/vacation.png" class="w-12 h-12 object-contain mb-3" alt="">
        <p class="text-[#64748B] text-sm">Loading team data…</p>
      </div>
    </div>

    <div class="flex h-screen bg-gray-50 overflow-hidden">
      <app-sidebar></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0">
        <!-- Header -->
        <header class="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-end flex-shrink-0">
          <div *ngIf="currentUser; else loginBtn" class="flex items-center gap-3">
            <span class="text-sm text-[#64748B]">
              Welcome back, <strong class="text-[#1E293B]">{{ fullDisplayName }}</strong>
            </span>
            <button (click)="logout()"
              class="text-sm border border-gray-200 text-[#64748B] hover:text-[#1E293B] px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Logout
            </button>
          </div>
          <ng-template #loginBtn>
            <button (click)="showLoginDialog = true"
              class="text-sm border border-[#003bc4] text-[#003bc4] px-4 py-1.5 rounded-lg hover:bg-[#e8eefb] font-medium">
              Login
            </button>
          </ng-template>
        </header>

        <main class="flex-1 overflow-auto p-6">
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

  get fullDisplayName(): string {
    return this.currentUser ? this.dataService.getFullDisplayName(this.currentUser) : '';
  }

  constructor(private dataService: MockDataService) {}

  ngOnInit(): void {
    this.dataService.authenticatedUser$.subscribe(u => this.currentUser = u);
    this.dataService.loading$.subscribe(l => this.loading = l);
  }

  logout(): void {
    this.dataService.logout();
  }
}
