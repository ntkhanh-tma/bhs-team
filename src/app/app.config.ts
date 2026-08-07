import {
  ApplicationConfig, inject, provideAppInitializer,
  provideBrowserGlobalErrorListeners, provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { SettingsService } from './core/services/settings.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // Pull server-driven configuration and restore any existing session before
    // the first route resolves, so guards see the real auth state and components
    // never render against stale hardcoded defaults.
    provideAppInitializer(async () => {
      const settings = inject(SettingsService);
      const auth = inject(AuthService);

      await Promise.all([
        firstValueFrom(settings.load()).catch(() => null),
        firstValueFrom(auth.restoreSession()).catch(() => null),
      ]);
    }),
  ],
};
