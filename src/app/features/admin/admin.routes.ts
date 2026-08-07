import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', redirectTo: 'members', pathMatch: 'full' },
      {
        path: 'members',
        loadComponent: () =>
          import('./pages/admin-members.component').then(m => m.AdminMembersComponent),
      },
      {
        path: 'vacations',
        loadComponent: () =>
          import('./pages/admin-vacations.component').then(m => m.AdminVacationsComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/admin-settings.component').then(m => m.AdminSettingsComponent),
      },
      {
        path: 'audit-log',
        loadComponent: () =>
          import('./pages/admin-audit-log.component').then(m => m.AdminAuditLogComponent),
      },
      // Everything else is the generic table driven by an EntityConfig.
      {
        path: ':entity',
        loadComponent: () =>
          import('./pages/admin-entity.component').then(m => m.AdminEntityComponent),
      },
    ],
  },
];
