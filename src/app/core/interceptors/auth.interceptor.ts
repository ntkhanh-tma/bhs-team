import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Endpoints that must never trigger a refresh-and-retry loop. */
const isAuthEndpoint = (url: string) => url.includes('/api/auth/');

/**
 * Attaches the bearer token to API calls and transparently refreshes it once on a
 * 401. A real CORS policy makes the Authorization header possible at all — the
 * old Apps Script gateway had to smuggle a shared secret through the query string
 * because it could not read headers.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApiCall = !!environment.apiBaseUrl && req.url.startsWith(environment.apiBaseUrl);

  if (!isApiCall) return next(req);

  const token = auth.accessToken;
  const authorized = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      return auth.refresh$().pipe(
        switchMap(fresh =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } }))),
        catchError(() => {
          auth.forceLogout();
          return throwError(() => error);
        }),
      );
    }),
  );
};
