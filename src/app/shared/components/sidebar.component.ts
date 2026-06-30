import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Member } from '../../core/models/models';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="w-52 flex-shrink-0 flex flex-col bg-white border-r border-gray-100 h-full">
      <!-- Logo -->
      <div class="p-5 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🌴</span>
          <div>
            <p class="text-sm font-bold text-[#1E293B]">Vacation Planner</p>
            <p class="text-[10px] text-[#64748B]">Register. Plan. Relax.</p>
          </div>
        </div>
      </div>

      <!-- Nav links -->
      <nav class="flex-1 p-3 space-y-1">
        <a routerLink="/home" routerLinkActive="bg-[#EEF2FF] text-[#4F7DF3] font-semibold"
           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748B] hover:bg-gray-50 transition-colors">
          <span>🏠</span> Home
        </a>
        <a routerLink="/holidays" routerLinkActive="bg-[#EEF2FF] text-[#4F7DF3] font-semibold"
           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748B] hover:bg-gray-50 transition-colors">
          <span>📅</span> Holidays
        </a>
        <a routerLink="/history" routerLinkActive="bg-[#EEF2FF] text-[#4F7DF3] font-semibold"
           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748B] hover:bg-gray-50 transition-colors">
          <span>📋</span> History
        </a>
        <a routerLink="/members" routerLinkActive="bg-[#EEF2FF] text-[#4F7DF3] font-semibold"
           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748B] hover:bg-gray-50 transition-colors">
          <span>👥</span> Members
        </a>
      </nav>

      <!-- Logged-in user chip at bottom -->
      <div *ngIf="currentUser" class="p-4 border-t border-gray-100">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
               [style.background-color]="currentUser.avatarColor">
            {{ getInitials(currentUser.name) }}
          </div>
          <div class="min-w-0 flex-1">
            <!-- "Name (Team)" format in sidebar -->
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
export class SidebarComponent {
  @Input() currentUser: Member | null = null;
  @Input() dataService!: MockDataService;

  get shortDisplayName(): string {
    return this.currentUser && this.dataService
      ? this.dataService.getShortDisplayName(this.currentUser)
      : '';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}
