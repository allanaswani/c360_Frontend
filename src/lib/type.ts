// The type scale, as numbers.
//
// The scale itself lives in `app/globals.css` as `--t-*` custom properties, and CSS
// should always use those. This mirror exists for the one place that cannot: SVG
// chart primitives. Recharts' `tick={{ fontSize }}` and jsPDF's `setFontSize()` take
// a NUMBER and render it into an SVG/PDF attribute, where a `var(--t-xs)` would be
// silently ignored and the library's own default used instead.
//
// Keep the two in step. If a step changes here it changes in globals.css, and the
// comment there is the authority on what each step is for.

export const TYPE = {
  /** 9.5 — uppercase key-labels, chart threshold captions. */
  micro: 9.5,
  /** 10.5 — axis ticks, dense table headers. */
  xxxs: 10.5,
  /** 11.5 — chart legends, captions, sub-values. */
  xxs: 11.5,
  /** 12.5 — the workhorse: table cells, secondary body. */
  xs: 12.5,
  /** 13.5 — body, form labels, list rows. */
  sm: 13.5,
  /** 15 — card titles, emphasised body, donut centre labels. */
  md: 15,
  /** 17 — section headings. */
  lg: 17,
  /** 21 — page titles. */
  xl: 21,
  /** 26 — the one headline figure on a screen. */
  xxl: 26,
} as const;
