import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from './calendar.component';
import { MockDataService } from '../../core/services/mock-data.service';
import { Member, Vacation } from '../../core/models/models';
import { RegisterVacationDialogComponent } from '../../shared/components/register-vacation-dialog.component';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CalendarComponent, RegisterVacationDialogComponent],
  template: `
    <div class="flex gap-6 h-full">
      <!-- Main calendar area -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-[#1E293B]">Welcome! Plan your time off.</h1>
            <p class="text-[#64748B] text-sm mt-1">View team availability and register your vacation.</p>
          </div>
          <button
            *ngIf="currentUser"
            (click)="showRegisterDialog = true"
            class="flex items-center gap-2 bg-[#4F7DF3] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-600 whitespace-nowrap"
          >
            + Register Vacation
          </button>
        </div>
        <app-calendar></app-calendar>
      </div>

      <!-- Right sidebar -->
      <div class="w-56 flex-shrink-0 space-y-4">
        <!-- This Month stats -->
        <div class="bg-white rounded-xl border border-gray-100 p-4">
          <p class="text-sm font-semibold text-[#1E293B] mb-3">This Month</p>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl">👥</span>
              <div>
                <p class="text-xl font-bold text-[#1E293B]">{{ memberCount }}</p>
                <p class="text-xs text-[#64748B]">Members</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-2xl">🏖️</span>
              <div>
                <p class="text-xl font-bold text-[#1E293B]">{{ vacationCount }}</p>
                <p class="text-xs text-[#64748B]">Vacations</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-2xl">📅</span>
              <div>
                <p class="text-xl font-bold text-[#1E293B]">{{ holidayCount }}</p>
                <p class="text-xs text-[#64748B]">Holidays</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Today section -->
        <div class="bg-white rounded-xl border border-gray-100 p-4">
          <p class="text-sm font-semibold text-[#1E293B] mb-1">Today</p>
          <p class="text-xs text-[#64748B] mb-3">{{ todayAbsentees.length }} members absent</p>
          <div class="flex flex-wrap gap-1">
            <div
              *ngFor="let a of todayAbsentees.slice(0, 3)"
              class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              [style.background-color]="a.member.avatarColor"
              [title]="a.member.name"
            >
              {{ getInitials(a.member.name) }}
            </div>
            <div *ngIf="todayAbsentees.length > 3" class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-[#64748B] font-medium">
              +{{ todayAbsentees.length - 3 }}
            </div>
          </div>
          <p *ngIf="todayAbsentees.length === 0" class="text-xs text-[#64748B]">Everyone is in today!</p>
        </div>

        <!-- Your days left (when logged in) -->
        <div *ngIf="currentUser" class="bg-white rounded-xl border border-gray-100 p-4">
          <p class="text-sm font-semibold text-[#1E293B] mb-2">Your Days Left</p>
          <p class="text-3xl font-bold text-[#B48CF2]">{{ currentUser.daysLeft }}</p>
          <p class="text-xs text-[#64748B]">{{ currentUser.daysUsed }} used this year</p>
        </div>
      </div>
    </div>

    <!-- Register Vacation Dialog -->
    <app-register-vacation-dialog
      *ngIf="showRegisterDialog"
      (close)="showRegisterDialog = false"
      (submitted)="onVacationRegistered()"
    ></app-register-vacation-dialog>
  `,
})
export class HomeComponent implements OnInit {
  showRegisterDialog = false;
  currentUser: Member | null = null;
  memberCount = 0;
  vacationCount = 0;
  holidayCount = 0;
  todayAbsentees: { member: Member; vacation: Vacation }[] = [];

  constructor(private dataService: MockDataService) {}

  ngOnInit(): void {
    this.dataService.authenticatedUser$.subscribe(u => this.currentUser = u);
    this.dataService.members$.subscribe(m => this.memberCount = m.length);

    combineLatest([this.dataService.vacations$, this.dataService.holidays$]).subscribe(([vacations, holidays]) => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      this.vacationCount = [...new Set(vacations.filter(v => v.date.startsWith(prefix)).map(v => v.username))].length;
      this.holidayCount = holidays.filter(h => h.date.startsWith(prefix)).length;
      this.todayAbsentees = this.dataService.getTodayAbsentees();
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  onVacationRegistered(): void {
    this.todayAbsentees = this.dataService.getTodayAbsentees();
  }
}
