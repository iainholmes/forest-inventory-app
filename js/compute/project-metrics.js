// Project-level forest inventory aggregations.
//
// Aggregates per-plot metrics (basal area per acre, trees per acre) into
// project-level summaries. Mean and standard error are reported across
// plots — this is the standard way fixed-radius plot inventories are
// summarized at the stand or project level.
//
// Conventions:
//   - Plots with zero trees are still counted as plots (they're real
//     samples reporting "no trees ≥ threshold present")
//   - Standard error = sd / sqrt(n)  where n = plot count
//   - Species composition aggregates basal area across ALL trees,
//     not per-plot, then computes share of total

import { computePlotSummary } from './plot-metrics.js';

/**
 * Compute project-level summary across all plots and their trees.
 *
 * @param {Array} plotsWithTrees  Array of plot objects, each with .trees[]
 * @param {number} plotRadiusFt    Plot radius (consistent across project)
 * @returns {object} Project summary
 */
export function computeProjectSummary(plotsWithTrees, plotRadiusFt) {
  const totalPlots = plotsWithTrees.length;
  const completePlots = plotsWithTrees.filter((p) => p.status === 'complete').length;

  if (totalPlots === 0) {
    return {
      total_plots: 0,
      complete_plots: 0,
      total_trees: 0,
      species_count: 0,
      mean_tpa: 0,
      se_tpa: 0,
      mean_ba: 0,
      se_ba: 0,
      species_composition: [],
    };
  }

  // Per-plot summaries
  const perPlot = plotsWithTrees.map((p) =>
    computePlotSummary(p.trees || [], plotRadiusFt)
  );

  // Aggregate basics
  const total_trees = perPlot.reduce((s, ps) => s + ps.tree_count, 0);

  // Mean and SE for TPA and BA/acre
  const tpas = perPlot.map((ps) => ps.tpa);
  const bas = perPlot.map((ps) => ps.ba_per_acre);

  const mean_tpa = mean(tpas);
  const se_tpa = stderr(tpas);
  const mean_ba = mean(bas);
  const se_ba = stderr(bas);

  // Species composition: aggregate basal area by species across all trees
  const speciesAccum = new Map();
  let totalBA = 0;
  for (const plot of plotsWithTrees) {
    for (const t of plot.trees || []) {
      const dbh = t.dbh_in;
      if (!Number.isFinite(dbh) || dbh <= 0) continue;
      const ba = 0.005454 * dbh * dbh;
      totalBA += ba;
      const cur = speciesAccum.get(t.species_code) || {
        species_code: t.species_code,
        species_label: t.species_label || t.species_code,
        count: 0,
        sum_ba: 0,
      };
      cur.count += 1;
      cur.sum_ba += ba;
      speciesAccum.set(t.species_code, cur);
    }
  }

  const species_composition = [...speciesAccum.values()]
    .map((s) => ({
      ...s,
      ba_share: totalBA > 0 ? s.sum_ba / totalBA : 0,
    }))
    .sort((a, b) => b.sum_ba - a.sum_ba);

  return {
    total_plots: totalPlots,
    complete_plots: completePlots,
    total_trees,
    species_count: species_composition.length,
    mean_tpa,
    se_tpa,
    mean_ba,
    se_ba,
    species_composition,
  };
}

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stderr(arr) {
  // Standard error of the mean = sample sd / sqrt(n)
  // For n=1 we have no variability; report 0 rather than NaN.
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const sumSq = arr.reduce((s, x) => s + (x - m) * (x - m), 0);
  const variance = sumSq / (arr.length - 1); // sample variance
  return Math.sqrt(variance) / Math.sqrt(arr.length);
}
