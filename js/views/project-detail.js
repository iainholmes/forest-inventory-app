// Project detail view.
//
// Shown when the user taps a project card on the projects list.
// Displays project metadata and the list of plots within it.
// At this build stage, plots cannot yet be added — that comes in step 4.

import {
  getProject,
  listPlotsForProject,
  deleteProject,
} from '../db.js';

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

  const plots = await listPlotsForProject(projectId);

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

    <div class="detail-section">
      <div class="detail-section__header">
        <h3 class="detail-section__title">
          Plots <span class="detail-section__count">${plots.length}</span>
        </h3>
        <button class="btn btn--primary" id="add-plot-btn">
          + Add plot
        </button>
      </div>

      ${plots.length === 0 ? `
        <div class="detail-empty">
          <p>No plots yet. Tap <strong>+ Add plot</strong> to capture your first one.</p>
        </div>
      ` : renderPlotsList(plots)}
    </div>

    <!-- Actions menu (hidden by default, toggled by the menu button) -->
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

  // Add plot
  document
    .getElementById('add-plot-btn')
    .addEventListener('click', () => navigate('plot-create', { projectId }));

  // Plot cards — navigate to plot detail on tap
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
  // Close menu on outside click
  document.addEventListener('click', () => {
    menu.hidden = true;
  });

  // Edit
  document
    .getElementById('edit-project-btn')
    .addEventListener('click', () => navigate('project-edit', { id: projectId }));

  // Delete (with confirmation)
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

function renderPlotsList(plots) {
  // Newest first
  const sorted = [...plots].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || '')
  );
  const items = sorted.map((p) => {
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
    return `
      <li class="plot-card" data-plot-id="${p.id}">
        <div class="plot-card__main">
          <div class="plot-card__id">Plot ${escapeHtml(String(p.id))}</div>
          <div class="plot-card__meta">${escapeHtml(forestLabel)} &middot; ${escapeHtml(date)}</div>
        </div>
        <div class="plot-card__status plot-card__status--${p.status === 'complete' ? 'complete' : 'in-progress'}">
          ${statusLabel}
        </div>
      </li>
    `;
  }).join('');
  return `<ul class="plot-list">${items}</ul>`;
}

// Shorten forest type code into a short readable string for plot cards.
// Full label lookups come from data/forest-types.js but we don't import
// it here just for shortening — keep this view dependency-light.
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
  if (!str) return '';
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
