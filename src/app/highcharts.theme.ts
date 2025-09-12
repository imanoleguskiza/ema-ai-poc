import * as Highcharts from 'highcharts';

export const BRAND_COLORS = [
  '#80b9de', '#009aa4', '#0072bc', '#00dfed', '#19a3fc',
  '#7bf7ff', '#005b96', '#ccf9fb', '#19a3fc', '#00dfed'
];
export const BRAND_GREY_TEXT = '#586671';
export const BRAND_GREY_NEUTRAL = '#abb3b8';
export const BRAND_WHITE_NEUTRAL = '#ffffff';

export function applyBrandTheme() {
  Highcharts.setOptions({
    colors: BRAND_COLORS,                         
    chart: {
      style: { fontFamily: 'inherit', color: BRAND_GREY_TEXT }
    },
    title: {
      style: { fontSize: '22px', fontWeight: '900', color: BRAND_GREY_TEXT }
    },
    subtitle: {
      style: { fontSize: '12px', fontWeight: '400', color: BRAND_GREY_TEXT }
    },
    legend: {
      itemStyle: { fontSize: '12px', fontWeight: '400', color: BRAND_GREY_TEXT }
    },
    tooltip: {
      style: { fontSize: '12px', fontWeight: '400', color: BRAND_WHITE_NEUTRAL }
    },
    yAxis: { labels: { style: { fontSize: '12px', fontWeight: '400', color: BRAND_GREY_TEXT } } },
    xAxis: { labels: { style: { fontSize: '12px', fontWeight: '400', color: BRAND_GREY_TEXT } } },
  });
}
