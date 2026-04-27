// Projects list view.
//
// Default landing screen. Shows either:
//   - An empty state with a "Create your first project" prompt, or
//   - A list of existing projects with a "New project" button.

import { listProjects, getPlotCount, getProjectTreeCount } from '../db.js';

/**
 * Render the projects list view into the given container element.
 * Caller is responsible for clearing the container before calling.
 */
export async function renderProjectsList(container, navigate) {
  const projects = await listProjects();

  if (projects.length === 0) {
    renderEmptyState(container, navigate);
  } else {
    await renderPopulatedList(container, projects, navigate);
  }
}

function renderEmptyState(container, navigate) {
  const view = document.createElement('section');
  view.className = 'view view--empty';
  view.innerHTML = `
    <div class="empty-card">
      <h2 class="empty-card__title">No projects yet</h2>
      <p class="empty-card__body">
        A <strong>project</strong> is a collection of forest inventory plots
        from one site or campaign &mdash; for example,
        <em>Eno River &mdash; Riparian Forest Inventory</em>.
      </p>
      <p class="empty-card__body">
        Create a project to get started. You can add plots to it once it
        exists.
      </p>
      <button class="btn btn--primary" id="create-first-project-btn">
        Create your first project
      </button>
    </div>
  `;
  container.appendChild(view);
  document
    .getElementById('create-first-project-btn')
    .addEventListener('click', () => navigate('project-create'));
}

async function renderPopulatedList(container, projects, navigate) {
  const view = document.createElement('section');
  view.className = 'view view--list';

  // Heading and "New project" button
  const heading = document.createElement('div');
  heading.className = 'list-heading';
  heading.innerHTML = `
    <h2 class="list-heading__title">Projects</h2>
    <button class="btn btn--primary" id="new-project-btn">+ New project</button>
  `;
  view.appendChild(heading);

  // Project cards
  const list = document.createElement('ul');
  list.className = 'project-list';
  for (const project of projects) {
    const plotCount = await getPlotCount(project.id);
    const treeCount = await getProjectTreeCount(project.id);
    const card = document.createElement('li');
    card.className = 'project-card';
    card.dataset.projectId = String(project.id);
    card.innerHTML = `
      <div class="project-card__main">
        <div class="project-card__name">${escapeHtml(project.name)}</div>
        <div class="project-card__site">${escapeHtml(project.site_name) || '<em>no site</em>'}</div>
      </div>
      <div class="project-card__meta">
        <div class="project-card__plot-count">
          ${plotCount} ${plotCount === 1 ? 'plot' : 'plots'}
        </div>
        ${treeCount > 0 ? `
          <div class="project-card__tree-count">
            ${treeCount} ${treeCount === 1 ? 'tree' : 'trees'}
          </div>
        ` : ''}
        <div class="project-card__access">${formatAccessType(project.access_type)}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      navigate('project-detail', { id: project.id });
    });
    list.appendChild(card);
  }
  view.appendChild(list);
  container.appendChild(view);

  document
    .getElementById('new-project-btn')
    .addEventListener('click', () => navigate('project-create'));
}

// Tiny utilities — kept inline rather than spinning up a utils module
// for two functions.
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
    'university': 'University land',
    other: 'Other',
  };
  return labels[t] || 'Other';
}
