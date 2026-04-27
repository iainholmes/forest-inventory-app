// Project detail view.
//
// Shown when the user taps a project card on the projects list.
// Displays:
//   - Project metadata (access, plot config, notes)
//   - PROJECT ROLLUP METRICS — aggregate across all plots and trees:
//       Total trees, mean BA/acre with SE, mean TPA with SE, species count
//   - SPECIES COMPOSITION — top species by basal area share
//   - Plot list with per-plot inline metrics so Sam can scan progress
//   - Action menu (edit/delete project)

import {
  getProject,
  getProjectPlotsWithTrees,
  deleteProject,
} from '../db.js';
import { computeProjectSummary } from '../compute/project-metrics.js';
import { computePlotSummary, fmt } from '../compute/plot-metrics.js';

export async function renderProjectDetail(container, navigate, params) {
  const projectId = params?.id;
  if (!projectId) {
    container.innerHTML = '<p>No project specified.</p>';
    return;
  }

  const project = await getProject(projectId);
  if (!project) {
    container.innerHTML = `
      <div class="error-banner">
        <strong>Project not found.</strong>
        <p>It may have been deleted.</p>
      </div>
      <div class="form-actions">
        <button class="btn btn--secondary" id="back-btn">Back to projects</button>
      </div>
    `;
    document
      .getElementById('back-btn')
      .addEventListener('click', () => navigate('projects-list'));
    return;
  }

  const plotsWithTrees = await getProjectPlotsWithTrees(projectId);
  const summary = computeProjectSummary(plotsWithTrees, project.plot_radius_ft);

  const view = document.createElement('section');
  view.className = 'view view--detail';
  view.innerHTML = `
    <header class="detail-header">
      <button class="btn btn--ghost" id="back-btn">&larr; Projects</button>
      <button class="btn btn--ghost detail-header__menu-btn" id="menu-btn" aria-label="Project actions">
        &#8942;
      </button>
    </header>

    <div class="detail-title-block">
      <h2 class="detail-title">${escapeHtml(project.name)}</h2>
      ${project.site_name
        ? `<div class="detail-site">${escapeHtml(project.site_name)}</div>`
        : ''}
    </div>

    <div class="detail-meta-grid">
      <div class="detail-meta">
        <div class="detail-meta__label">Access</div>
        <div class="detail-meta__value">${formatAccessType(project.access_type)}</div>
      </div>
      ${project.permit_ref ? `
        <div class="detail-meta">
          <div class="detail-meta__label">Permit</div>
          <div class="detail-meta__value">${escapeHtml(project.permit_ref)}</div>
        </div>
      ` : ''}
      <div class="detail-meta">
        <div class="detail-meta__label">Plot radius</div>
        <div class="detail-meta__value">${project.plot_radius_ft} ft</div>
      </div>
      <div class="detail-meta">
        <div class="detail-meta__label">DBH threshold</div>
        <div class="detail-meta__value">${project.dbh_threshold_in} in</div>
      </div>
      <div class="detail-meta">
        <div class="detail-meta__label">Species list</div>
        <div class="detail-meta__value">${formatSpeciesList(project.species_list_id)}</div>
      </div>
    </div>

    ${project.notes ? `
      <div class="detail-notes">
        <div class="detail-notes__label">Notes</div>
        <div class="detail-notes__body">${escapeHtml(project.notes)}</div>
      </div>
    ` : ''}

    <!-- Project rollup dashboard -->
    ${summary.total_plots > 0 ? renderRollupDashboard(summary) : ''}

    <!-- Plot list section -->
    <div class="detail-section">
      <div class="detail-section__header">
        <h3 class="detail-section__title">
          Plots <span class="detail-section__count">${summary.total_plots}</span>
        </h3>
        <button class="btn btn--primary" id="add-plot-btn">
          + Add plot
        </button>
      </div>

      ${plotsWithTrees.length === 0 ? `
        <div class="detail-empty">
          <p>No plots yet. Tap <strong>+ Add plot</strong> to capture your first one.</p>
        </div>
      ` : renderPlotsList(plotsWithTrees, project.plot_radius_ft)}
    </div>

    <!-- Action menu -->
    <div class="action-menu" id="action-menu" hidden>
      <button class="action-menu__item" id="edit-project-btn">
        Edit project
      </button>
      <button class="action-menu__item action-menu__item--danger" id="delete-project-btn">
        Delete project
      </button>
    </div>
  `;
  container.appendChild(view);

  // Wire up navigation
  document
    .getElementById('back-btn')
    .addEventListener('click', () => navigate('projects-list'));

  document
    .getElementById('add-plot-btn')
    .addEventListener('click', () => navigate('plot-create', { projectId }));

  for (const card of document.querySelectorAll('.plot-card[data-plot-id]')) {
    card.addEventListener('click', () => {
      const plotId = Number(card.dataset.plotId);
      navigate('plot-detail', { id: plotId });
    });
  }

  // Menu toggle
  const menuBtn = document.getElementById('menu-btn');
  const menu = document.getElementById('action-menu');
  menuBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  document.addEventListener('click', () => {
    menu.hidden = true;
  });

  document
    .getElementById('edit-project-btn')
    .addEventListener('click', () => navigate('project-edit', { id: projectId }));

  document
    .getElementById('delete-project-btn')
    .addEventListener('click', async () => {
      const confirmed = window.confirm(
        `Delete "${project.name}" and all of its plots, trees, photos, and notes?\n\nThis cannot be undone.`
      );
      if (!confirmed) return;
      try {
        await deleteProject(projectId);
        navigate('projects-list');
      } catch (err) {
        console.error('Delete failed:', err);
        window.alert(`Could not delete project: ${err.message || 'unknown error'}.`);
      }
    });
}

// ---------------------------------------------------------------------------
// Project rollup dashboard
// ---------------------------------------------------------------------------

function renderRollupDashboard(s) {
  const completionLabel = s.complete_plots === s.total_plots
    ? 'All plots complete'
    : `${s.complete_plots} of ${s.total_plots} plots complete`;

  return `
    <div class="rollup">
      <div class="rollup__header">
        <h3 class="rollup__title">Project rollup</h3>
        <div class="rollup__caveat">Includes all plots — ${completionLabel}</div>
      </div>

      <div class="rollup-grid">
        <div class="rollup-metric">
          <div class="rollup-metric__value">${s.total_trees}</div>
          <div class="rollup-metric__label">Total trees</div>
        </div>
        <div class="rollup-metric">
          <div class="rollup-metric__value">${fmt(s.mean_tpa, 0)}</div>
          <div class="rollup-metric__label">Mean TPA</div>
          ${s.total_plots > 1 ? `
            <div class="rollup-metric__se">&plusmn; ${fmt(s.se_tpa, 0)} SE</div>
          ` : ''}
        </div>
        <div class="rollup-metric">
          <div class="rollup-metric__value">${fmt(s.mean_ba, 1)}</div>
          <div class="rollup-metric__label">Mean BA / acre</div>
          ${s.total_plots > 1 ? `
            <div class="rollup-metric__se">&plusmn; ${fmt(s.se_ba, 1)} SE</div>
          ` : ''}
        </div>
        <div class="rollup-metric">
          <div class="rollup-metric__value">${s.species_count}</div>
          <div class="rollup-metric__label">Species</div>
        </div>
      </div>

      ${s.species_composition.length > 0 ? renderSpeciesComposition(s.species_composition) : ''}
    </div>
  `;
}

function renderSpeciesComposition(composition) {
  const top = composition.slice(0, 5);
  const rows = top.map((sp) => {
    const sharePercent = (sp.ba_share * 100).toFixed(0);
    return `
      <li class="species-row">
        <div class="species-row__main">
          <div class="species-row__name">${escapeHtml(sp.species_label)}</div>
          <div class="species-row__count">${sp.count} ${sp.count === 1 ? 'tree' : 'trees'}</div>
        </div>
        <div class="species-row__bar-wrap">
          <div class="species-row__bar" style="width: ${sharePercent}%"></div>
        </div>
        <div class="species-row__share">${sharePercent}%</div>
      </li>
    `;
  }).join('');
  const remaining = composition.length - top.length;

  return `
    <div class="species-composition">
      <div class="species-composition__title">Top species by basal area</div>
      <ul class="species-list">${rows}</ul>
      ${remaining > 0 ? `
        <div class="species-composition__more">
          + ${remaining} more ${remaining === 1 ? 'species' : 'species'}
        </div>
      ` : ''}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Plot list with inline per-plot metrics
// ---------------------------------------------------------------------------

function renderPlotsList(plots, plotRadiusFt) {
  // Newest first
  const sorted = [...plots].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || '')
  );
  const items = sorted.map((p) => {
    const ps = computePlotSummary(p.trees || [], plotRadiusFt);
    const date = p.created_at
      ? new Date(p.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '';
    const forestLabel = p.forest_type
      ? formatForestTypeShort(p.forest_type)
      : 'Unspecified type';
    const statusLabel = p.status === 'complete' ? 'Complete' : 'In progress';
    const statusClass = p.status === 'complete' ? 'complete' : 'in-progress';

    return `
      <li class="plot-card plot-card--detailed" data-plot-id="${p.id}">
        <div class="plot-card__main">
          <div class="plot-card__id-row">
            <div class="plot-card__id">Plot ${escapeHtml(String(p.id))}</div>
            <div class="plot-card__status plot-card__status--${statusClass}">${statusLabel}</div>
          </div>
          <div class="plot-card__meta">${escapeHtml(forestLabel)} &middot; ${escapeHtml(date)}</div>
          <div class="plot-card__metrics">
            <span class="plot-card__metric">
              <strong>${ps.tree_count}</strong> trees
            </span>
            <span class="plot-card__metric">
              <strong>${fmt(ps.tpa, 0)}</strong> TPA
            </span>
            <span class="plot-card__metric">
              <strong>${fmt(ps.ba_per_acre, 1)}</strong> BA/ac
            </span>
            ${ps.dominant_species ? `
              <span class="plot-card__metric plot-card__metric--dominant">
                Dominant: <strong>${escapeHtml(ps.dominant_species.species_label)}</strong>
              </span>
            ` : ''}
          </div>
        </div>
      </li>
    `;
  }).join('');
  return `<ul class="plot-list">${items}</ul>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
