// Plot detail view.
//
// Shown when the user taps a plot card on the project detail view.
// Displays:
//   - Plot metadata (GPS, forest type, slope/aspect, disturbance, notes)
//   - Running plot totals (tree count, BA/acre, TPA, dominant species)
//   - Tree list (one entry per tree, with delete affordance)
//   - "+ Add tree" button to navigate to tree-create
//   - Action menu: Edit plot, Mark complete / Mark in progress, Delete plot

import {
  getPlot,
  getProject,
  listTreesForPlot,
  deleteTree,
  deletePlot,
  updatePlot,
} from '../db.js';
import { computePlotSummary, fmt } from '../compute/plot-metrics.js';
import { findSpeciesByCode } from '../../data/species-index.js';

export async function renderPlotDetail(container, navigate, params) {
  const plotId = params?.id;
  if (!plotId) {
    container.innerHTML = '<p>No plot specified.</p>';
    return;
  }

  const plot = await getPlot(plotId);
  if (!plot) {
    container.innerHTML = `
      <div class="error-banner">
        <strong>Plot not found.</strong>
        <p>It may have been deleted.</p>
      </div>
    `;
    return;
  }

  const project = await getProject(plot.project_id);
  const trees = await listTreesForPlot(plotId);
  const summary = computePlotSummary(trees, project.plot_radius_ft);

  const view = document.createElement('section');
  view.className = 'view view--detail';
  view.appendChild(buildView(plot, project, trees, summary));
  container.appendChild(view);

  // Wire up handlers
  document.getElementById('back-btn').addEventListener('click', () =>
    navigate('project-detail', { id: plot.project_id })
  );

  // Action menu
  const menuBtn = document.getElementById('menu-btn');
  const menu = document.getElementById('action-menu');
  menuBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  document.addEventListener('click', () => {
    menu.hidden = true;
  });

  // Edit plot (next build step — placeholder for now)
  document.getElementById('edit-plot-btn').addEventListener('click', () => {
    navigate('plot-edit', { id: plotId });
  });

  // Toggle completion
  document.getElementById('toggle-complete-btn').addEventListener('click', async () => {
    const newStatus = plot.status === 'complete' ? 'in_progress' : 'complete';
    const updates = { status: newStatus };
    if (newStatus === 'complete') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    await updatePlot(plotId, updates);
    // Re-render the view in place
    container.innerHTML = '';
    renderPlotDetail(container, navigate, params);
  });

  // Delete plot
  document.getElementById('delete-plot-btn').addEventListener('click', async () => {
    const confirmed = window.confirm(
      `Delete this plot and all of its trees and photos?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deletePlot(plotId);
      navigate('project-detail', { id: plot.project_id });
    } catch (err) {
      console.error('Delete failed:', err);
      window.alert(`Could not delete plot: ${err.message || 'unknown error'}.`);
    }
  });

  // Add tree
  document.getElementById('add-tree-btn').addEventListener('click', () => {
    navigate('tree-create', { plotId });
  });

  // Per-tree delete handlers
  for (const btn of document.querySelectorAll('.tree-row__delete')) {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const treeId = Number(btn.dataset.treeId);
      const confirmed = window.confirm('Delete this tree?');
      if (!confirmed) return;
      await deleteTree(treeId);
      // Re-render
      container.innerHTML = '';
      renderPlotDetail(container, navigate, params);
    });
  }
}

function buildView(plot, project, trees, summary) {
  const wrapper = document.createElement('div');

  const gpsBlock = plot.lat != null
    ? `
      <div class="detail-meta">
        <div class="detail-meta__label">GPS</div>
        <div class="detail-meta__value detail-meta__value--mono">
          ${plot.lat.toFixed(6)}, ${plot.lon.toFixed(6)}
        </div>
        <div class="detail-meta__sub">
          &plusmn;${plot.gps_accuracy_m?.toFixed(1) || '—'} m
        </div>
      </div>
    `
    : `
      <div class="detail-meta">
        <div class="detail-meta__label">GPS</div>
        <div class="detail-meta__value detail-meta__value--missing">Not captured</div>
      </div>
    `;

  const forestTypeLabel = plot.forest_type
    ? formatForestTypeShort(plot.forest_type)
    : '—';

  const slopeAspect = (plot.slope_deg != null || plot.aspect_deg != null)
    ? `${plot.slope_deg ?? '—'}° / ${plot.aspect_deg ?? '—'}°`
    : '—';

  const disturbanceText = (plot.disturbance_codes && plot.disturbance_codes.length)
    ? plot.disturbance_codes.map(formatDisturbance).join(', ')
    : 'None recorded';

  const status = plot.status === 'complete' ? 'Complete' : 'In progress';

  wrapper.innerHTML = `
    <header class="detail-header">
      <button class="btn btn--ghost" id="back-btn">&larr; ${escapeHtml(project.name)}</button>
      <button class="btn btn--ghost detail-header__menu-btn" id="menu-btn" aria-label="Plot actions">
        &#8942;
      </button>
    </header>

    <div class="detail-title-block">
      <h2 class="detail-title">Plot ${plot.id}</h2>
      <div class="detail-site">
        <span class="status-pill status-pill--${plot.status === 'complete' ? 'complete' : 'in-progress'}">${status}</span>
      </div>
    </div>

    <div class="detail-meta-grid">
      ${gpsBlock}
      <div class="detail-meta">
        <div class="detail-meta__label">Forest type</div>
        <div class="detail-meta__value">${escapeHtml(forestTypeLabel)}</div>
      </div>
      <div class="detail-meta">
        <div class="detail-meta__label">Slope / Aspect</div>
        <div class="detail-meta__value">${slopeAspect}</div>
      </div>
      <div class="detail-meta">
        <div class="detail-meta__label">Topography</div>
        <div class="detail-meta__value">${escapeHtml(formatTopo(plot.topographic_position))}</div>
      </div>
    </div>

    ${plot.disturbance_codes && plot.disturbance_codes.length ? `
      <div class="detail-notes">
        <div class="detail-notes__label">Disturbance evidence</div>
        <div class="detail-notes__body">${escapeHtml(disturbanceText)}</div>
      </div>
    ` : ''}

    ${plot.notes ? `
      <div class="detail-notes">
        <div class="detail-notes__label">Notes</div>
        <div class="detail-notes__body">${escapeHtml(plot.notes)}</div>
      </div>
    ` : ''}

    <!-- Plot summary metrics -->
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric__value">${summary.tree_count}</div>
        <div class="metric__label">Trees</div>
      </div>
      <div class="metric">
        <div class="metric__value">${fmt(summary.tpa, 0)}</div>
        <div class="metric__label">Trees / acre</div>
      </div>
      <div class="metric">
        <div class="metric__value">${fmt(summary.ba_per_acre, 1)}</div>
        <div class="metric__label">BA / acre (sq ft)</div>
      </div>
      <div class="metric">
        <div class="metric__value">${fmt(summary.qmd_in, 1)}</div>
        <div class="metric__label">QMD (in)</div>
      </div>
    </div>

    ${summary.dominant_species ? `
      <div class="dominant-species">
        <span class="dominant-species__label">Dominant by basal area:</span>
        <strong>${escapeHtml(summary.dominant_species.species_label)}</strong>
        (${(summary.dominant_species.ba_share * 100).toFixed(0)}%)
      </div>
    ` : ''}

    <!-- Trees section -->
    <div class="detail-section">
      <div class="detail-section__header">
        <h3 class="detail-section__title">
          Trees <span class="detail-section__count">${trees.length}</span>
        </h3>
        <button class="btn btn--primary" id="add-tree-btn">+ Add tree</button>
      </div>

      ${trees.length === 0 ? `
        <div class="detail-empty">
          <p>No trees yet. Tap <strong>+ Add tree</strong> to start recording.</p>
        </div>
      ` : renderTreesList(trees)}
    </div>

    <!-- Action menu -->
    <div class="action-menu" id="action-menu" hidden>
      <button class="action-menu__item" id="edit-plot-btn">
        Edit plot
      </button>
      <button class="action-menu__item" id="toggle-complete-btn">
        ${plot.status === 'complete' ? 'Mark in progress' : 'Mark complete'}
      </button>
      <button class="action-menu__item action-menu__item--danger" id="delete-plot-btn">
        Delete plot
      </button>
    </div>
  `;
  return wrapper;
}

function renderTreesList(trees) {
  const items = trees.map((t, i) => {
    const sci = (() => {
      const sp = findSpeciesByCode(t.species_code);
      return sp && sp.scientific !== '—' ? sp.scientific : '';
    })();
    return `
      <li class="tree-row">
        <div class="tree-row__index">#${i + 1}</div>
        <div class="tree-row__main">
          <div class="tree-row__species">${escapeHtml(t.species_label || t.species_code)}</div>
          ${sci ? `<div class="tree-row__sci"><em>${escapeHtml(sci)}</em></div>` : ''}
        </div>
        <div class="tree-row__dbh">${Number(t.dbh_in).toFixed(1)}"</div>
        <button class="tree-row__delete" data-tree-id="${t.id}" aria-label="Delete tree">&times;</button>
      </li>
    `;
  }).join('');
  return `<ul class="tree-list">${items}</ul>`;
}

// -------- formatting helpers --------

function formatForestTypeShort(code) {
  const shortNames = {
    'mesic-mixed-hardwood': 'Mesic mixed hardwood',
    'dry-oak-hickory': 'Dry oak-hickory',
    'dry-mesic-oak-hickory': 'Dry-mesic oak-hickory',
    'bottomland-hardwood': 'Bottomland hardwood',
    'mesic-slope-forest': 'Mesic slope',
    'loblolly-pine': 'Loblolly pine',
    'mixed-pine-hardwood': 'Mixed pine-hardwood',
    'early-successional': 'Early successional',
    'riparian': 'Riparian',
    'cove-hardwood': 'Cove hardwood',
    'northern-hardwood': 'Northern hardwood',
    'mesic-oak': 'Mesic oak',
    'chestnut-oak-ridge': 'Chestnut oak ridge',
    'dry-pine-oak': 'Dry pine-oak',
    'hemlock': 'Hemlock',
    'mixed-mesophytic': 'Mixed mesophytic',
    'rhododendron-thicket': 'Rhododendron thicket',
    'other': 'Other',
  };
  return shortNames[code] || code;
}

function formatTopo(code) {
  if (!code) return '—';
  const labels = {
    ridge: 'Ridge top',
    'upper-slope': 'Upper slope',
    'mid-slope': 'Mid-slope',
    'lower-slope': 'Lower slope',
    'toe-slope': 'Toe-slope',
    bottomland: 'Bottomland',
    flat: 'Flat',
  };
  return labels[code] || code;
}

function formatDisturbance(code) {
  const labels = {
    'timber-harvest': 'Recent timber harvest',
    fire: 'Fire',
    windthrow: 'Windthrow',
    'pest-disease': 'Pest / disease',
    beaver: 'Beaver activity',
    'human-other': 'Other human disturbance',
    none: 'None observed',
  };
  return labels[code] || code;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
