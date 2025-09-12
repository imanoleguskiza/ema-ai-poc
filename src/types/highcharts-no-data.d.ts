import 'highcharts';

declare module 'highcharts' {
  interface Chart {
    showNoData(str?: string): void;
    hideNoData(): void;
    hasData(): boolean;
  }
}
