import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';
import { Member } from '../../core/models/models';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-[#1E293B]">Members</h1>
        <p class="text-[#64748B] text-sm mt-1">View all members and their information.</p>
      </div>

      <!-- Filters -->
      <div class="flex gap-3 mb-6">
        <div class="relative flex-1 max-w-xs">
          <input
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilter()"
            type="text"
            placeholder="Search members..."
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] pl-8"
          />
          <span class="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
        </div>
        <select [(ngModel)]="filterDept" (ngModelChange)="applyFilter()" class="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4F7DF3]">
          <option value="">All Departments</option>
          <option *ngFor="let d of departments" [value]="d">{{ d }}</option>
        </select>
      </div>

      <!-- Top summary cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <div *ngFor="let m of featuredMembers" class="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              [style.background-color]="m.avatarColor"
            >
              {{ getInitials(m.name) }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-[#1E293B] truncate">{{ m.name }}</p>
              <p class="text-xs text-[#64748B] truncate">{{ m.position }}</p>
              <p class="text-xs text-[#64748B] truncate">{{ m.department }}</p>
            </div>
          </div>
          <p class="text-sm font-bold" [style.color]="getDaysColor(m.daysLeft)">{{ m.daysLeft }} days left</p>
        </div>

        <!-- View all card -->
        <div class="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100" (click)="showAll = !showAll">
          <span class="text-2xl text-gray-300">+</span>
          <p class="text-xs text-[#64748B] text-center">View All Members</p>
          <p class="text-xs font-semibold text-[#4F7DF3]">{{ allMembers.length }} members</p>
        </div>
      </div>

      <!-- Data table -->
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="text-left text-xs font-semibold text-[#64748B] px-4 py-3">Name</th>
              <th class="text-left text-xs font-semibold text-[#64748B] px-4 py-3">Department</th>
              <th class="text-left text-xs font-semibold text-[#64748B] px-4 py-3">Position</th>
              <th class="text-right text-xs font-semibold text-[#64748B] px-4 py-3">Days Used</th>
              <th class="text-right text-xs font-semibold text-[#64748B] px-4 py-3">Days Left</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let m of displayedMembers" class="border-b border-gray-50 hover:bg-gray-50/50 last:border-0">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    [style.background-color]="m.avatarColor"
                  >
                    {{ getInitials(m.name) }}
                  </div>
                  <span class="text-sm font-medium text-[#1E293B]">{{ m.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-[#64748B]">{{ m.department }}</td>
              <td class="px-4 py-3 text-sm text-[#64748B]">{{ m.position }}</td>
              <td class="px-4 py-3 text-sm text-right text-[#1E293B] font-medium">{{ m.daysUsed }}</td>
              <td class="px-4 py-3 text-right">
                <span class="text-sm font-semibold" [style.color]="getDaysColor(m.daysLeft)">{{ m.daysLeft }} days</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!showAll && filteredMembers.length > tableLimit" class="px-4 py-3 border-t border-gray-100 text-center">
          <button (click)="showAll = true" class="text-sm text-[#4F7DF3] font-medium hover:underline">
            View all members &rarr;
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MembersComponent implements OnInit {
  allMembers: Member[] = [];
  filteredMembers: Member[] = [];
  featuredMembers: Member[] = [];
  departments: string[] = [];
  searchQuery = '';
  filterDept = '';
  showAll = false;
  tableLimit = 5;

  get displayedMembers(): Member[] {
    return this.showAll ? this.filteredMembers : this.filteredMembers.slice(0, this.tableLimit);
  }

  constructor(private dataService: MockDataService) {}

  ngOnInit(): void {
    this.dataService.members$.subscribe(members => {
      this.allMembers = members;
      this.featuredMembers = members.slice(0, 6);
      this.departments = [...new Set(members.map(m => m.department))].sort();
      this.applyFilter();
    });
  }

  applyFilter(): void {
    let result = this.allMembers;
    if (this.filterDept) {
      result = result.filter(m => m.department === this.filterDept);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.position.toLowerCase().includes(q)
      );
    }
    this.filteredMembers = result;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getDaysColor(days: number): string {
    if (days <= 3) return '#EF4444';
    if (days <= 7) return '#F97316';
    return '#7CC9A7';
  }
}
