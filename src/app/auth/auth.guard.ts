import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.init();
  if (authService.isAuthenticated()) {
    return true;
  }

  await authService.login(state.url || '/settings');
  return false;
};

export const adminGuard: CanActivateFn = async (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.init();

  if (!authService.isAuthenticated()) {
    await router.navigate(['/settings']);
    return false;
  }

  if (!authService.isAdmin()) {
    await router.navigate(['/settings']);
    return false;
  }

  return true;
};
