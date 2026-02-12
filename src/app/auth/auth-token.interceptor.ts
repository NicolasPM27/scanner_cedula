import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

function isApiRequest(url: string): boolean {
  return url.startsWith('/api/') || url.includes('/api/');
}

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (!isApiRequest(req.url)) {
    return next(req);
  }

  return from(authService.getAccessToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return next(req);
      }

      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      return next(cloned);
    })
  );
};
