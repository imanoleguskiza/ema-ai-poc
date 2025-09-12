import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHighcharts } from 'highcharts-angular';
import { provideHttpClient, withFetch,  withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch(),withInterceptors([authInterceptor])),
    provideHighcharts({
      modules: () => [import('highcharts/esm/modules/no-data-to-display')],
    }),
  ]
};
