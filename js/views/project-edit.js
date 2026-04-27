// Project edit view.
//
// Same form as project-create, but pre-populated with the existing
// project's values, and on submit calls updateProject instead of
// createProject. Cancel returns to the project detail view.

import { getProject, updateProject } from '../db.js';

export async function renderProjectEdit(container, navigate, params) {
  const projectId = params?.id;
  if (!projectId) {
    container.innerHTML = '<p>No project specified.</p>';
    return;
  }

  const project = await getProject(projectId);
  if (!project) {
    container.innerHTML = '<p>Project not found.</p>';
    return;
  }

  const view = document.createElement('section');
  view.className = 'view view--form';
  view.innerHTML = `
    <header class="form-header">
      <button class="btn btn--ghost" id="cancel-btn">&larr; Cancel</button>
      <h2 class="form-header__title">Edit project</h2>
    </header>

    <form id="project-form" class="form" novalidate>
      <div class="form-row">
        <label for="f-name" class="form-label">
          Project name <span class="form-required">*</span>
        </label>
        <input
          type="text"
          id="f-name"
          name="name"
          class="form-input"
          value="${escapeAttr(project.name)}"
          required
          autocomplete="off"
        />
      </div>

      <div class="form-row">
        <label for="f-site" class="form-label">Site name</label>
        <input
          type="text"
          id="f-site"
          name="site_name"
          class="form-input"
          value="${escapeAttr(project.site_name)}"
          autocomplete="off"
        />
      </div>

      <div class="form-row">
        <label for="f-access" class="form-label">
          Land access <span class="form-required">*</span>
        </label>
        <select id="f-access" name="access_type" class="form-input" required>
          <option value="private" ${project.access_type === 'private' ? 'selected' : ''}>Private property</option>
          <option value="state-park" ${project.access_type === 'state-park' ? 'selected' : ''}>State park</option>
          <option value="national-forest" ${project.access_type === 'national-forest' ? 'selected' : ''}>National forest</option>
          <option value="university" ${project.access_type === 'university' ? 'selected' : ''}>University land</option>
          <option value="other" ${project.access_type === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>

      <div class="form-row" id="permit-row" ${project.access_type === 'private' ? 'hidden' : ''}>
        <label for="f-permit" class="form-label">Permit reference</label>
        <input
          type="text"
          id="f-permit"
          name="permit_ref"
          class="form-input"
          value="${escapeAttr(project.permit_ref)}"
          autocomplete="off"
        />
      </div>

      <div class="form-row">
        <label for="f-species" class="form-label">
          Species reference list <span class="form-required">*</span>
        </label>
        <select id="f-species" name="species_list_id" class="form-input" required>
          <option value="nc-piedmont" ${project.species_list_id === 'nc-piedmont' ? 'selected' : ''}>NC Piedmont</option>
          <option value="southern-appalachian" ${project.species_list_id === 'southern-appalachian' ? 'selected' : ''}>Southern Appalachian / Cumberland Plateau</option>
        </select>
      </div>

      <div class="form-row form-row--split">
        <div class="form-row__half">
          <label for="f-radius" class="form-label">Plot radius (ft)</label>
          <input
            type="number"
            id="f-radius"
            name="plot_radius_ft"
            class="form-input"
            value="${project.plot_radius_ft}"
            step="0.1"
            min="1"
            max="200"
            required
          />
        </div>
        <div class="form-row__half">
          <label for="f-dbh" class="form-label">DBH threshold (in)</label>
          <input
            type="number"
            id="f-dbh"
            name="dbh_threshold_in"
            class="form-input"
            value="${project.dbh_threshold_in}"
            step="0.1"
            min="0"
            max="50"
            required
          />
        </div>
      </div>

      <div class="form-row">
        <label for="f-notes" class="form-label">Notes</label>
        <textarea
          id="f-notes"
          name="notes"
          class="form-input form-input--textarea"
          rows="3"
        >${escapeHtml(project.notes)}</textarea>
      </div>

      <div class="form-error" id="form-error" hidden></div>

      <div class="form-actions">
        <button type="submit" class="btn btn--primary" id="save-btn">
          Save changes
        </button>
      </div>
    </form>
  `;
  container.appendChild(view);

  // Show/hide permit field based on access type
  const accessSelect = document.getElementById('f-access');
  const permitRow = document.getElementById('permit-row');
  function syncPermitVisibility() {
    permitRow.hidden = accessSelect.value === 'private';
  }
  accessSelect.addEventListener('change', syncPermitVisibility);

  // Cancel returns to detail
  document.getElementById('cancel-btn').addEventListener('click', () => {
    navigate('project-detail', { id: projectId });
  });

  // Submit
  const form = document.getElementById('project-form');
  const errorEl = document.getElementById('form-error');
  const saveBtn = document.getElementById('save-btn');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errorEl.hidden = true;

    const data = new FormData(form);
    const name = (data.get('name') || '').trim();
    if (!name) {
      showError('Project name is required.');
      document.getElementById('f-name').focus();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      await updateProject(projectId, {
        name,
        site_name: (data.get('site_name') || '').trim(),
        access_type: data.get('access_type'),
        permit_ref: (data.get('permit_ref') || '').trim(),
        species_list_id: data.get('species_list_id'),
        plot_radius_ft: Number(data.get('plot_radius_ft')),
        dbh_threshold_in: Number(data.get('dbh_threshold_in')),
        notes: (data.get('notes') || '').trim(),
      });
      navigate('project-detail', { id: projectId });
    } catch (err) {
      console.error('Project update failed:', err);
      showError(`Could not save: ${err.message || 'unknown error'}.`);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
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

function escapeAttr(str) {
  return escapeHtml(str);
}
