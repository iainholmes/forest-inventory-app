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
        <button class="btn btn--primary" id="add-plot-btn" disabled>
          + Add plot
        </button>
      </div>
      <p class="detail-section__hint">
        Plot capture is part of the next build step. The button is here as a placeholder.
      </p>

      ${plots.length === 0 ? `
        <div class="detail-empty">
          <p>No plots yet. Once plot capture is implemented, plots you add will appear here.</p>
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
  const items = plots.map((p) => `
    <li class="plot-card">
      <div class="plot-card__id">Plot ${escapeHtml(String(p.id))}</div>
      <div class="plot-card__status">${p.status === 'complete' ? 'Complete' : 'In progress'}</div>
    </li>
  `).join('');
  return `<ul class="plot-list">${items}</ul>`;
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
