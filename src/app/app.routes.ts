import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login-page.component').then(m => m.LoginPageComponent),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    // The only page that stays public — it contains no personal data.
    path: 'holidays',
    loadComponent: () => import('./features/holidays/holidays.component').then(m => m.HolidaysComponent),
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent),
  },
  {
    path: 'members',
    canActivate: [authGuard],
    loadComponent: () => import('./features/members/members.component').then(m => m.MembersComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    // Lazy so Angular Material lands in its own chunk and never counts against
    // the 700 kB initial-bundle budget that the member-facing app must respect.
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: 'home' },
];
