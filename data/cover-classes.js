// Cover class scale (modified Daubenmire / Domin-Krajina ranges).
//
// Used for understory and ground-cover estimation where exact percentages
// aren't measurable but consistent ordinal categorization is. Standard
// in plant ecology.

export const COVER_CLASSES = [
  { code: 'absent', label: 'Absent (0%)', mid_pct: 0 },
  { code: 'trace', label: 'Trace (<1%)', mid_pct: 0.5 },
  { code: '1-5', label: '1–5%', mid_pct: 3 },
  { code: '5-25', label: '5–25%', mid_pct: 15 },
  { code: '25-50', label: '25–50%', mid_pct: 37.5 },
  { code: '50-75', label: '50–75%', mid_pct: 62.5 },
  { code: '75-100', label: '75–100%', mid_pct: 87.5 },
];

export function getCoverClassLabel(code) {
  const c = COVER_CLASSES.find((x) => x.code === code);
  return c ? c.label : code;
}
