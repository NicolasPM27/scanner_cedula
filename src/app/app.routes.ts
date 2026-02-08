import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'data-authorization',
    loadComponent: () => import('./pages/data-authorization/data-authorization.page').then(m => m.DataAuthorizationPage)
  },
  {
    path: 'scanner',
    loadComponent: () => import('./example/scan-cedula.component').then((m) => m.ScanCedulaComponent),
  },
  {
    path: 'verification',
    loadComponent: () => import('./pages/verificacion/verificacion.page').then((m) => m.VerificacionPage),
  },
  {
    path: 'forms/sociodemographic',
    loadComponent: () => import('./pages/forms/sociodemografico-form.page').then((m) => m.SociodemograficoFormPage),
  },
  {
    path: 'forms/contact',
    loadComponent: () => import('./pages/forms/contacto-form.page').then((m) => m.ContactoFormPage),
  },
  {
    path: 'forms/employment',
    loadComponent: () => import('./pages/forms/laboral-form.page').then((m) => m.LaboralFormPage),
  },
  {
    path: 'forms/characterization',
    loadComponent: () => import('./pages/forms/caracterizacion-form.page').then((m) => m.CaracterizacionFormPage),
  },
  {
    path: 'beneficiaries',
    loadComponent: () => import('./pages/beneficiaries/beneficiaries-list.page').then((m) => m.BeneficiariesListPage),
  },
  {
    path: 'beneficiaries/:id',
    loadComponent: () => import('./pages/beneficiaries/beneficiary-detail.page').then((m) => m.BeneficiaryDetailPage),
  },
  {
    path: 'confirmation',
    loadComponent: () => import('./pages/confirmation/confirmation.page').then((m) => m.ConfirmationPage),
  },
  {
    path: 'dev/import-instituciones',
    loadComponent: () => import('./pages/dev/import-instituciones.page').then((m) => m.ImportInstitucionesPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
