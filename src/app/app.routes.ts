import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'holidays',
    loadComponent: () => import('./features/holidays/holidays.component').then(m => m.HolidaysComponent),
  },
  {
    path: 'history',
    loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent),
  },
  {
    path: 'members',
    loadComponent: () => import('./features/members/members.component').then(m => m.MembersComponent),
  },
  { path: '**', redirectTo: 'home' },
];
