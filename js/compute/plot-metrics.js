// Plot-level forest inventory computations.
//
// Standard formulas used in fixed-radius plot forestry:
//
//   Basal area of one tree (sq ft) = 0.005454 * DBH²
//     where DBH is in inches. The constant converts (π/4) ÷ 144 sq in/sq ft.
//
//   Plot area (acres) = π * radius² / 43560
//     where radius is in feet.
//
//   Per-acre expansion factor = 1 / plot_area_acres
//
//   Trees per acre (TPA) = (tree count) * expansion factor
//   Basal area per acre (BA/acre, sq ft/acre) =
//     Σ(0.005454 * DBH²) * expansion factor
//
//   Quadratic mean diameter (QMD, inches) =
//     sqrt(Σ(DBH²) / N)
//
// These are the metrics most often reported in forest inventory work
// and the ones consulting hiring managers will recognize on sight.

const SQ_FT_PER_ACRE = 43560;
const BA_CONSTANT = 0.005454; // for DBH in inches → BA in sq ft per tree

/**
 * Compute summary metrics for a list of trees within one plot.
 *
 * @param {Array} trees       Array of tree records (each with dbh_in)
 * @param {number} plotRadiusFt  Plot radius in feet (from project config)
 * @returns {object} Summary including counts and per-acre expansions
 */
export function computePlotSummary(trees, plotRadiusFt) {
  const validTrees = trees.filter((t) => Number.isFinite(t.dbh_in) && t.dbh_in > 0);
  const n = validTrees.length;

  if (n === 0) {
    return {
      tree_count: 0,
      tpa: 0,
      ba_per_acre: 0,
      qmd_in: 0,
      species_count: 0,
      ba_by_species: [],
      dominant_species: null,
    };
  }

  // Plot area in acres
  const plotAreaAc = (Math.PI * plotRadiusFt * plotRadiusFt) / SQ_FT_PER_ACRE;
  const expansion = 1 / plotAreaAc;

  // Sum of basal area and DBH squared
  let sumBA = 0;
  let sumDbhSq = 0;
  const byCode = new Map(); // species_code → { count, sumBA, label }

  for (const t of validTrees) {
    const dbh = t.dbh_in;
    const ba = BA_CONSTANT * dbh * dbh;
    sumBA += ba;
    sumDbhSq += dbh * dbh;
    const cur = byCode.get(t.species_code) || {
      count: 0,
      sumBA: 0,
      label: t.species_label || t.species_code,
    };
    cur.count += 1;
    cur.sumBA += ba;
    byCode.set(t.species_code, cur);
  }

  const tpa = n * expansion;
  const ba_per_acre = sumBA * expansion;
  const qmd_in = Math.sqrt(sumDbhSq / n);

  const ba_by_species = [...byCode.entries()]
    .map(([code, v]) => ({
      species_code: code,
      species_label: v.label,
      count: v.count,
      ba_per_acre: v.sumBA * expansion,
      ba_share: sumBA > 0 ? v.sumBA / sumBA : 0,
    }))
    .sort((a, b) => b.ba_per_acre - a.ba_per_acre);

  const dominant_species = ba_by_species[0] || null;

  return {
    tree_count: n,
    tpa,
    ba_per_acre,
    qmd_in,
    species_count: byCode.size,
    ba_by_species,
    dominant_species,
  };
}

/**
 * Format a number for display, matching the precision conventions
 * commonly used in forest inventory reports.
 */
export function fmt(num, digits = 1) {
  if (num === null || num === undefined || !Number.isFinite(num)) return '—';
  return num.toFixed(digits);
}
