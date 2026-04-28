// CSV export.
//
// Generates flat CSV tables suitable for ingestion into R, Python, Stata,
// or Excel. Three CSVs per project (or per app, depending on scope):
//   - plots.csv        One row per plot, with metadata + computed metrics
//   - trees.csv        One row per tree, joinable to plots by plot_id
//   - understory.csv   One row per plot's understory observations
//
// Conventions:
//   - All field names use snake_case
//   - Empty fields are empty strings (not "NA", "null", etc.) — let the
//     downstream reader handle missing-value semantics
//   - Numeric fields are unquoted; strings that may contain commas are
//     quoted with embedded double-quotes escaped as ""
//   - Newlines in text fields are stripped (replaced with " ")
//   - Decimal values use periods (locale-independent)

import {
  db,
  getProjectPlotsWithTrees,
  getUnderstoryForPlot,
} from './db.js';
import { computePlotSummary } from './compute/plot-metrics.js';
import { findSpeciesByCode } from '../data/species-index.js';
import { getCoverClassLabel } from '../data/cover-classes.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export all data across all projects as three CSVs, packaged into a
 * single download as a text-bundle (one CSV per section) or as separate
 * files. We use the separate-files approach: emit three files in
 * succession.
 *
 * @param {object} options
 * @param {number|null} options.projectId  If provided, scope to one project
 * @returns {Promise<object>} { plotsCsv, treesCsv, understoryCsv }
 */
export async function buildCsvExports({ projectId = null } = {}) {
  const projects = projectId
    ? [await db.projects.get(projectId)].filter(Boolean)
    : await db.projects.toArray();

  const plotRows = [];
  const treeRows = [];
  const understoryRows = [];

  for (const project of projects) {
    const plotsWithTrees = await getProjectPlotsWithTrees(project.id);
    for (const plot of plotsWithTrees) {
      const summary = computePlotSummary(plot.trees || [], project.plot_radius_ft);
      plotRows.push(buildPlotRow(project, plot, summary));
      for (let i = 0; i < (plot.trees || []).length; i++) {
        const tree = plot.trees[i];
        treeRows.push(buildTreeRow(project, plot, tree, i + 1));
      }
      const understory = await getUnderstoryForPlot(plot.id);
      if (understory) {
        understoryRows.push(buildUnderstoryRow(project, plot, understory));
      }
    }
  }

  return {
    plotsCsv: rowsToCsv(PLOT_COLUMNS, plotRows),
    treesCsv: rowsToCsv(TREE_COLUMNS, treeRows),
    understoryCsv: rowsToCsv(UNDERSTORY_COLUMNS, understoryRows),
  };
}

/**
 * Trigger downloads of the three CSVs.
 */
export async function downloadCsvExports({ projectId = null } = {}) {
  const { plotsCsv, treesCsv, understoryCsv } = await buildCsvExports({ projectId });
  const date = isoDate();
  const suffix = projectId ? '-project' : '';
  triggerDownload(plotsCsv, `forest-inventory-plots${suffix}-${date}.csv`, 'text/csv');
  // Stagger downloads — some browsers block rapid successive auto-downloads
  await sleep(150);
  triggerDownload(treesCsv, `forest-inventory-trees${suffix}-${date}.csv`, 'text/csv');
  await sleep(150);
  triggerDownload(understoryCsv, `forest-inventory-understory${suffix}-${date}.csv`, 'text/csv');
  return { plots: plotRowCount(plotsCsv), trees: plotRowCount(treesCsv), understory: plotRowCount(understoryCsv) };
}

// ---------------------------------------------------------------------------
// Column definitions (single source of truth — header order = data order)
// ---------------------------------------------------------------------------

const PLOT_COLUMNS = [
  'project_id', 'project_name', 'site_name', 'plot_radius_ft', 'dbh_threshold_in',
  'plot_id', 'plot_number', 'status', 'forest_type',
  'lat', 'lon', 'gps_accuracy_m',
  'slope_pct', 'aspect_deg', 'topographic_position',
  'disturbance_codes', 'access_notes',
  'tree_count', 'tpa', 'ba_per_acre_sqft', 'qmd_in', 'dominant_species_code', 'dominant_species_label',
  'created_at', 'updated_at', 'plot_notes',
];

const TREE_COLUMNS = [
  'project_id', 'project_name', 'plot_id', 'plot_number', 'tree_index',
  'species_code', 'species_label', 'species_scientific',
  'dbh_in', 'crown_class', 'condition', 'notes',
];

const UNDERSTORY_COLUMNS = [
  'project_id', 'project_name', 'plot_id', 'plot_number',
  'regeneration_dominant', 'regeneration_cover_class', 'regeneration_cover_pct',
  'shrub_dominant', 'shrub_cover_class', 'shrub_cover_pct',
  'herbaceous_dominant', 'herbaceous_cover_class', 'herbaceous_cover_pct',
  'invasive_present', 'invasive_species', 'understory_notes',
  'updated_at',
];

// ---------------------------------------------------------------------------
// Row builders
// ---------------------------------------------------------------------------

function buildPlotRow(project, plot, summary) {
  return {
    project_id: project.id,
    project_name: project.name,
    site_name: project.site_name || '',
    plot_radius_ft: project.plot_radius_ft,
    dbh_threshold_in: project.dbh_threshold_in,
    plot_id: plot.id,
    plot_number: plot.id, // current convention: plot_id == plot_number
    status: plot.status,
    forest_type: plot.forest_type || '',
    lat: plot.lat ?? '',
    lon: plot.lon ?? '',
    gps_accuracy_m: plot.gps_accuracy_m ?? '',
    slope_pct: plot.slope_pct ?? '',
    aspect_deg: plot.aspect_deg ?? '',
    topographic_position: plot.topographic_position || '',
    disturbance_codes: Array.isArray(plot.disturbance) ? plot.disturbance.join(';') : (plot.disturbance || ''),
    access_notes: plot.access_notes || '',
    tree_count: summary.tree_count,
    tpa: round(summary.tpa, 2),
    ba_per_acre_sqft: round(summary.ba_per_acre, 2),
    qmd_in: round(summary.qmd_in, 2),
    dominant_species_code: summary.dominant_species?.species_code || '',
    dominant_species_label: summary.dominant_species?.species_label || '',
    created_at: plot.created_at || '',
    updated_at: plot.updated_at || '',
    plot_notes: plot.notes || '',
  };
}

function buildTreeRow(project, plot, tree, index) {
  const sp = findSpeciesByCode(tree.species_code);
  return {
    project_id: project.id,
    project_name: project.name,
    plot_id: plot.id,
    plot_number: plot.id,
    tree_index: index,
    species_code: tree.species_code || '',
    species_label: tree.species_label || (sp ? sp.common : '') || '',
    species_scientific: sp && sp.scientific !== '—' ? sp.scientific : '',
    dbh_in: round(tree.dbh_in, 2),
    crown_class: tree.crown_class || '',
    condition: tree.condition || '',
    notes: tree.notes || '',
  };
}

function buildUnderstoryRow(project, plot, u) {
  return {
    project_id: project.id,
    project_name: project.name,
    plot_id: plot.id,
    plot_number: plot.id,
    regeneration_dominant: u.regeneration_dominant || '',
    regeneration_cover_class: u.regeneration_cover || '',
    regeneration_cover_pct: coverMidpoint(u.regeneration_cover),
    shrub_dominant: u.shrub_dominant || '',
    shrub_cover_class: u.shrub_cover || '',
    shrub_cover_pct: coverMidpoint(u.shrub_cover),
    herbaceous_dominant: u.herbaceous_dominant || '',
    herbaceous_cover_class: u.herbaceous_cover || '',
    herbaceous_cover_pct: coverMidpoint(u.herbaceous_cover),
    invasive_present: u.invasive_present ? 'TRUE' : 'FALSE',
    invasive_species: u.invasive_species || '',
    understory_notes: u.notes || '',
    updated_at: u.updated_at || '',
  };
}

// ---------------------------------------------------------------------------
// CSV serialization
// ---------------------------------------------------------------------------

function rowsToCsv(columns, rows) {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvField(row[c])).join(','));
  }
  return lines.join('\n');
}

function csvField(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // Strip newlines
  s = s.replace(/\r?\n/g, ' ');
  // Quote if contains comma, quote, or starts with whitespace
  if (s.includes(',') || s.includes('"') || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round(v, digits) {
  if (!Number.isFinite(v)) return '';
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
}

function coverMidpoint(code) {
  // Midpoints map (kept inline; avoid coupling to data/cover-classes.js
  // for this single field — but if we ever change the scale, update here.)
  const map = {
    'absent': 0, 'trace': 0.5, '1-5': 3, '5-25': 15,
    '25-50': 37.5, '50-75': 62.5, '75-100': 87.5,
  };
  return code in map ? map[code] : '';
}

function isoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function triggerDownload(text, filename, mime) {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function plotRowCount(csv) {
  // Number of rows = lines - 1 (header)
  return Math.max(0, csv.split('\n').length - 1);
}
