import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { applyBrandTheme } from './app/highcharts.theme';

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
applyBrandTheme();
