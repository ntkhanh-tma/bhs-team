import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex flex-col lg:flex-row gap-6">
      <nav class="lg:w-56 shrink-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-[#94A3B8] mb-2 px-3">
          Administration
        </p>
        <ul class="flex lg:flex-col gap-1 overflow-x-auto">
          <li *ngFor="let link of links">
            <a [routerLink]="link.path" routerLinkActive="bg-[#EEF2FF] text-[#003bc4] font-semibold"
               class="block whitespace-nowrap px-3 py-2 rounded-lg text-sm text-[#475569] hover:bg-gray-100">
              {{ link.label }}
            </a>
          </li>
        </ul>
      </nav>

      <section class="flex-1 min-w-0">
        <router-outlet />
      </section>
    </div>
  `,
})
export class AdminShellComponent {
  readonly links = [
    { path: 'members', label: 'Members' },
    { path: 'vacations', label: 'Vacations' },
    { path: 'holidays', label: 'Holidays' },
    { path: 'release-plans', label: 'Release plans' },
    { path: 'event-plans', label: 'Event plans' },
    { path: 'teams', label: 'Teams' },
    { path: 'positions', label: 'Positions' },
    { path: 'origins', label: 'Origins' },
    { path: 'vacation-types', label: 'Vacation types' },
    { path: 'countries', label: 'Countries' },
    { path: 'settings', label: 'Settings' },
    { path: 'audit-log', label: 'Audit log' },
  ];
}
