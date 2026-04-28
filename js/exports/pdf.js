// PDF report export.
//
// Generates a multi-page PDF summary of a project. Layout:
//   - Page 1 (cover):
//       Title (project name), site, date
//       Project metadata (access, plot config)
//       Project rollup metrics (mean ± SE)
//       Top species composition table
//   - Subsequent pages: one block per plot
//       Plot header (id, status, GPS, forest type)
//       Plot metrics
//       Tree list (compact table)
//       Understory summary
//
// Uses jsPDF, loaded from unpkg as an ES module. Pure client-side; no
// server dependency.
//
// Design constraints (intentional):
//   - Letter size, portrait, 0.75" margins
//   - Helvetica throughout (jsPDF's default; embeds well, predictable
//     metrics; Sam can swap fonts later if he adds a custom-font step)
//   - Single-column body
//   - Tabular numerics so figures align column-wise when readers scan

import { db, getProjectPlotsWithTrees, getUnderstoryForPlot } from './db.js';
import { computePlotSummary } from './compute/plot-metrics.js';
import { computeProjectSummary } from './compute/project-metrics.js';
import { findSpeciesByCode } from '../data/species-index.js';
import { getCoverClassLabel } from '../data/cover-classes.js';

// jsPDF as ES module
import { jsPDF } from 'https://unpkg.com/jspdf@2.5.2/dist/jspdf.es.min.js';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const PAGE = {
  width: 612,    // 8.5" * 72 dpi
  height: 792,   // 11" * 72 dpi
  margin: 54,    // 0.75"
};

const COLORS = {
  ink: '#1a1a1a',
  inkSoft: '#555555',
  inkFaint: '#888888',
  accent: '#2d4a2b',
  accentPale: '#dde6dc',
  divider: '#cccccc',
};

const FONT = {
  sizeBase: 10,
  sizeSmall: 8,
  sizeLarge: 14,
  sizeTitle: 22,
  sizeSubtitle: 12,
  sizeH3: 11,
  lineHeight: 14,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function downloadProjectPdf(projectId) {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error('Project not found.');
  const plotsWithTrees = await getProjectPlotsWithTrees(projectId);
  const summary = computeProjectSummary(plotsWithTrees, project.plot_radius_ft);

  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });

  const ctx = {
    doc,
    cursorY: PAGE.margin,
    project,
    plotsWithTrees,
    summary,
  };

  drawCoverPage(ctx);

  for (const plot of plotsWithTrees) {
    const plotSummary = computePlotSummary(plot.trees || [], project.plot_radius_ft);
    const understory = await getUnderstoryForPlot(plot.id);
    drawPlotBlock(ctx, plot, plotSummary, understory);
  }

  drawFooterAllPages(doc, project);

  const filename = `forest-inventory-${slugify(project.name)}-${isoDate()}.pdf`;
  doc.save(filename);
  return filename;
}

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

function drawCoverPage(ctx) {
  const { doc, project, summary } = ctx;
  ctx.cursorY = PAGE.margin;

  // Header band
  doc.setFillColor(COLORS.accent);
  doc.rect(0, 0, PAGE.width, 32, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Forest Inventory Report', PAGE.margin, 21);

  ctx.cursorY = 32 + 32;

  // Title
  doc.setTextColor(COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT.sizeTitle);
  const titleLines = doc.splitTextToSize(project.name, contentWidth());
  doc.text(titleLines, PAGE.margin, ctx.cursorY);
  ctx.cursorY += titleLines.length * (FONT.sizeTitle * 1.15);

  // Subtitle: site
  if (project.site_name) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT.sizeSubtitle);
    doc.setTextColor(COLORS.inkSoft);
    doc.text(project.site_name, PAGE.margin, ctx.cursorY);
    ctx.cursorY += FONT.sizeSubtitle * 1.4;
  }

  // Date generated
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT.sizeSmall);
  doc.setTextColor(COLORS.inkFaint);
  doc.text(`Generated ${formatDate(new Date())}`, PAGE.margin, ctx.cursorY);
  ctx.cursorY += FONT.sizeSmall * 2.5;

  // Project metadata block
  drawSectionHeader(ctx, 'Project Configuration');
  drawMetaGrid(ctx, [
    ['Access', formatAccessType(project.access_type)],
    ['Permit reference', project.permit_ref || '—'],
    ['Plot radius', `${project.plot_radius_ft} ft`],
    ['DBH threshold', `${project.dbh_threshold_in} in`],
    ['Species list', formatSpeciesList(project.species_list_id)],
    ['Plots collected', `${summary.complete_plots} of ${summary.total_plots} complete`],
  ]);

  // Rollup metrics
  ctx.cursorY += 12;
  drawSectionHeader(ctx, 'Rollup Across All Plots');
  drawMetricBoxes(ctx, summary);

  // Species composition
  if (summary.species_composition.length > 0) {
    ctx.cursorY += 12;
    drawSectionHeader(ctx, 'Species Composition (by Basal Area)');
    drawSpeciesTable(ctx, summary.species_composition);
  }

  // Notes
  if (project.notes) {
    ctx.cursorY += 12;
    drawSectionHeader(ctx, 'Project Notes');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT.sizeBase);
    doc.setTextColor(COLORS.ink);
    const lines = doc.splitTextToSize(project.notes, contentWidth());
    doc.text(lines, PAGE.margin, ctx.cursorY);
    ctx.cursorY += lines.length * FONT.lineHeight;
  }
}

// ---------------------------------------------------------------------------
// Plot block
// ---------------------------------------------------------------------------

function drawPlotBlock(ctx, plot, plotSummary, understory) {
  const { doc } = ctx;
  // Each plot on its own page
  doc.addPage();
  ctx.cursorY = PAGE.margin;

  // Header band
  doc.setFillColor(COLORS.accent);
  doc.rect(0, 0, PAGE.width, 32, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(ctx.project.name, PAGE.margin, 21);
  ctx.cursorY = 32 + 24;

  // Plot title row
  doc.setTextColor(COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT.sizeLarge);
  doc.text(`Plot ${plot.id}`, PAGE.margin, ctx.cursorY);

  // Status pill on right
  const statusLabel = plot.status === 'complete' ? 'COMPLETE' : 'IN PROGRESS';
  doc.setFontSize(FONT.sizeSmall);
  doc.setFont('helvetica', 'bold');
  const pillW = doc.getTextWidth(statusLabel) + 12;
  const pillX = PAGE.width - PAGE.margin - pillW;
  doc.setFillColor(plot.status === 'complete' ? COLORS.accentPale : '#eeeeee');
  doc.roundedRect(pillX, ctx.cursorY - 10, pillW, 14, 3, 3, 'F');
  doc.setTextColor(plot.status === 'complete' ? COLORS.accent : COLORS.inkSoft);
  doc.text(statusLabel, pillX + 6, ctx.cursorY);

  ctx.cursorY += FONT.sizeLarge * 1.6;

  // Plot metadata grid
  const gpsStr = plot.lat != null && plot.lon != null
    ? `${plot.lat.toFixed(5)}, ${plot.lon.toFixed(5)}` +
      (plot.gps_accuracy_m != null ? ` (±${plot.gps_accuracy_m.toFixed(0)} m)` : '')
    : '—';
  const slopeAspect = (plot.slope_pct != null || plot.aspect_deg != null)
    ? `${plot.slope_pct != null ? plot.slope_pct + '%' : '—'} slope, ${plot.aspect_deg != null ? plot.aspect_deg + '°' : '—'} aspect`
    : '—';
  const distArr = Array.isArray(plot.disturbance) ? plot.disturbance : [];
  drawMetaGrid(ctx, [
    ['GPS', gpsStr],
    ['Forest type', formatForestTypeShort(plot.forest_type)],
    ['Slope / Aspect', slopeAspect],
    ['Topographic position', plot.topographic_position || '—'],
    ['Disturbance', distArr.length > 0 ? distArr.join(', ') : '—'],
    ['Captured', plot.created_at ? formatDate(new Date(plot.created_at)) : '—'],
  ]);

  // Plot metrics
  ctx.cursorY += 10;
  drawSectionHeader(ctx, 'Plot Metrics');
  drawPlotMetricBoxes(ctx, plotSummary);

  // Tree list
  if ((plot.trees || []).length > 0) {
    ctx.cursorY += 14;
    drawSectionHeader(ctx, `Trees (${plot.trees.length})`);
    drawTreeTable(ctx, plot.trees);
  }

  // Understory
  if (understory) {
    ctx.cursorY += 14;
    drawSectionHeader(ctx, 'Understory');
    const rows = [];
    if (understory.regeneration_dominant || understory.regeneration_cover) {
      rows.push(['Regeneration', understory.regeneration_dominant || '—', getCoverClassLabel(understory.regeneration_cover) || '—']);
    }
    if (understory.shrub_dominant || understory.shrub_cover) {
      rows.push(['Shrub layer', understory.shrub_dominant || '—', getCoverClassLabel(understory.shrub_cover) || '—']);
    }
    if (understory.herbaceous_dominant || understory.herbaceous_cover) {
      rows.push(['Herbaceous', understory.herbaceous_dominant || '—', getCoverClassLabel(understory.herbaceous_cover) || '—']);
    }
    if (rows.length > 0) {
      drawTable(ctx, ['Stratum', 'Dominant species', 'Cover'], rows, [110, 270, 124]);
    }
    if (understory.invasive_present) {
      ctx.cursorY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT.sizeBase);
      doc.setTextColor('#a13b1f');
      doc.text(`Invasives present: `, PAGE.margin, ctx.cursorY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.ink);
      doc.text(understory.invasive_species || '(noted)', PAGE.margin + 100, ctx.cursorY);
      ctx.cursorY += FONT.lineHeight;
    }
  }

  // Plot notes
  if (plot.notes) {
    ctx.cursorY += 10;
    drawSectionHeader(ctx, 'Notes');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT.sizeBase);
    doc.setTextColor(COLORS.ink);
    const lines = doc.splitTextToSize(plot.notes, contentWidth());
    doc.text(lines, PAGE.margin, ctx.cursorY);
    ctx.cursorY += lines.length * FONT.lineHeight;
  }
}

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

function drawSectionHeader(ctx, title) {
  const { doc } = ctx;
  ensureSpace(ctx, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT.sizeH3);
  doc.setTextColor(COLORS.accent);
  doc.text(title.toUpperCase(), PAGE.margin, ctx.cursorY);
  ctx.cursorY += 4;
  doc.setDrawColor(COLORS.divider);
  doc.setLineWidth(0.5);
  doc.line(PAGE.margin, ctx.cursorY, PAGE.width - PAGE.margin, ctx.cursorY);
  ctx.cursorY += 12;
}

function drawMetaGrid(ctx, pairs) {
  const { doc } = ctx;
  const colWidth = contentWidth() / 2;
  doc.setFontSize(FONT.sizeSmall);
  let row = 0;
  for (let i = 0; i < pairs.length; i += 2) {
    ensureSpace(ctx, 28);
    const left = pairs[i];
    const right = pairs[i + 1];
    drawMetaPair(ctx, PAGE.margin, ctx.cursorY, left[0], left[1], colWidth - 8);
    if (right) {
      drawMetaPair(ctx, PAGE.margin + colWidth, ctx.cursorY, right[0], right[1], colWidth - 8);
    }
    ctx.cursorY += 28;
    row += 1;
  }
}

function drawMetaPair(ctx, x, y, label, value, w) {
  const { doc } = ctx;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT.sizeSmall);
  doc.setTextColor(COLORS.inkFaint);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT.sizeBase);
  doc.setTextColor(COLORS.ink);
  const valLines = doc.splitTextToSize(String(value), w);
  doc.text(valLines.slice(0, 2), x, y + 12);
}

function drawMetricBoxes(ctx, summary) {
  const { doc } = ctx;
  ensureSpace(ctx, 70);
  const items = [
    { value: String(summary.total_trees), label: 'TOTAL TREES', se: null },
    { value: fmtNum(summary.mean_tpa, 0), label: 'MEAN TPA', se: summary.total_plots > 1 ? `± ${fmtNum(summary.se_tpa, 0)} SE` : null },
    { value: fmtNum(summary.mean_ba, 1), label: 'MEAN BA / ACRE', se: summary.total_plots > 1 ? `± ${fmtNum(summary.se_ba, 1)} SE` : null },
    { value: String(summary.species_count), label: 'SPECIES', se: null },
  ];
  drawBoxes(ctx, items);
}

function drawPlotMetricBoxes(ctx, ps) {
  ensureSpace(ctx, 70);
  drawBoxes(ctx, [
    { value: String(ps.tree_count), label: 'TREES', se: null },
    { value: fmtNum(ps.tpa, 0), label: 'TPA', se: null },
    { value: fmtNum(ps.ba_per_acre, 1), label: 'BA / ACRE', se: null },
    { value: fmtNum(ps.qmd_in, 1), label: 'QMD (IN)', se: null },
  ]);
}

function drawBoxes(ctx, items) {
  const { doc } = ctx;
  const cw = contentWidth();
  const gap = 8;
  const boxW = (cw - gap * (items.length - 1)) / items.length;
  const boxH = 56;
  let x = PAGE.margin;
  for (const item of items) {
    doc.setFillColor('#f6f4ee');
    doc.roundedRect(x, ctx.cursorY, boxW, boxH, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(COLORS.accent);
    doc.text(item.value, x + boxW / 2, ctx.cursorY + 24, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT.sizeSmall);
    doc.setTextColor(COLORS.inkFaint);
    doc.text(item.label, x + boxW / 2, ctx.cursorY + 38, { align: 'center' });
    if (item.se) {
      doc.setFontSize(7);
      doc.text(item.se, x + boxW / 2, ctx.cursorY + 48, { align: 'center' });
    }
    x += boxW + gap;
  }
  ctx.cursorY += boxH + 4;
}

function drawSpeciesTable(ctx, composition) {
  const { doc } = ctx;
  const top = composition.slice(0, 10);
  const headers = ['Species', 'Trees', 'BA share'];
  const colW = [contentWidth() - 130, 60, 70];
  const rows = top.map((sp) => [
    sp.species_label,
    String(sp.count),
    `${(sp.ba_share * 100).toFixed(0)}%`,
  ]);
  drawTable(ctx, headers, rows, colW);
}

function drawTreeTable(ctx, trees) {
  const headers = ['#', 'Species', 'Sci. name', 'DBH (in)', 'Crown', 'Cond.'];
  const colW = [22, 130, 130, 56, 50, 116];
  const rows = trees.map((t, i) => {
    const sp = findSpeciesByCode(t.species_code);
    return [
      String(i + 1),
      t.species_label || (sp?.common ?? ''),
      sp && sp.scientific !== '—' ? sp.scientific : '',
      fmtNum(t.dbh_in, 1),
      t.crown_class || '—',
      t.condition || '—',
    ];
  });
  drawTable(ctx, headers, rows, colW);
}

function drawTable(ctx, headers, rows, colWidths) {
  const { doc } = ctx;
  const rowH = 16;
  ensureSpace(ctx, rowH * 2);

  // Header
  doc.setFillColor(COLORS.accentPale);
  doc.rect(PAGE.margin, ctx.cursorY, contentWidth(), rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT.sizeSmall);
  doc.setTextColor(COLORS.accent);
  let x = PAGE.margin + 4;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x, ctx.cursorY + 11);
    x += colWidths[i];
  }
  ctx.cursorY += rowH;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT.sizeSmall);
  for (const row of rows) {
    ensureSpace(ctx, rowH);
    doc.setDrawColor(COLORS.divider);
    doc.setLineWidth(0.25);
    doc.line(PAGE.margin, ctx.cursorY + rowH, PAGE.width - PAGE.margin, ctx.cursorY + rowH);
    x = PAGE.margin + 4;
    for (let i = 0; i < row.length; i++) {
      doc.setTextColor(COLORS.ink);
      const text = String(row[i] ?? '');
      const lines = doc.splitTextToSize(text, colWidths[i] - 8);
      doc.text(lines.slice(0, 1), x, ctx.cursorY + 11);
      x += colWidths[i];
    }
    ctx.cursorY += rowH;
  }
  ctx.cursorY += 4;
}

function drawFooterAllPages(doc, project) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.inkFaint);
    doc.text(
      `${project.name}`,
      PAGE.margin,
      PAGE.height - 24
    );
    doc.text(
      `Page ${i} of ${total}`,
      PAGE.width - PAGE.margin,
      PAGE.height - 24,
      { align: 'right' }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function contentWidth() {
  return PAGE.width - 2 * PAGE.margin;
}

function ensureSpace(ctx, needed) {
  const bottomLimit = PAGE.height - PAGE.margin - 40;
  if (ctx.cursorY + needed > bottomLimit) {
    ctx.doc.addPage();
    ctx.cursorY = PAGE.margin;
  }
}

function fmtNum(v, digits) {
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

function formatAccessType(t) {
  const labels = {
    private: 'Private property',
    'state-park': 'State park',
    'national-forest': 'National forest',
    university: 'University land',
    other: 'Other',
  };
  return labels[t] || 'Other';
}

function formatSpeciesList(id) {
  const labels = {
    'nc-piedmont': 'NC Piedmont',
    'southern-appalachian': 'Southern Appalachian / Cumberland Plateau',
  };
  return labels[id] || id;
}

function formatForestTypeShort(code) {
  if (!code) return '—';
  return code.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

function isoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
