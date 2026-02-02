import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'scanner',
    loadComponent: () => import('./example/scan-cedula.component').then((m) => m.ScanCedulaComponent),
  },
  {
    path: '',
    redirectTo: 'scanner',
    pathMatch: 'full',
  },
];
