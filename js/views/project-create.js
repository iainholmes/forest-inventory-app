// Project creation view.
//
// Form for creating a new project. After submit:
//   - On success, navigate back to the projects list (where the new
//     project will appear).
//   - On failure (e.g., empty name), show an inline error and stay
//     on the form.
//
// Form fields:
//   name           required, free text (e.g., "Eno River — Summer 2026")
//   site_name      optional, free text (e.g., "Eno River State Park")
//   access_type    required, dropdown
//   permit_ref     optional, free text (visible when access_type !== private)
//   species_list   required, dropdown (NC Piedmont vs Southern Appalachian)
//   plot_radius    required, numeric, default 37.2 (1/10 acre)
//   dbh_threshold  required, numeric, default 5
//   notes          optional, free text

import { createProject } from '../db.js';

export function renderProjectCreate(container, navigate) {
  const view = document.createElement('section');
  view.className = 'view view--form';
  view.innerHTML = `
    <header class="form-header">
      <button class="btn btn--ghost" id="cancel-btn">&larr; Cancel</button>
      <h2 class="form-header__title">New project</h2>
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
          placeholder="e.g., Eno River — Summer 2026"
          required
          autocomplete="off"
        />
        <p class="form-help">A label for this fieldwork campaign.</p>
      </div>

      <div class="form-row">
        <label for="f-site" class="form-label">Site name</label>
        <input
          type="text"
          id="f-site"
          name="site_name"
          class="form-input"
          placeholder="e.g., Eno River State Park"
          autocomplete="off"
        />
        <p class="form-help">Where the plots are located.</p>
      </div>

      <div class="form-row">
        <label for="f-access" class="form-label">
          Land access <span class="form-required">*</span>
        </label>
        <select id="f-access" name="access_type" class="form-input" required>
          <option value="private">Private property</option>
          <option value="state-park">State park</option>
          <option value="national-forest">National forest</option>
          <option value="university">University land</option>
          <option value="other">Other</option>
        </select>
        <p class="form-help">
          Honest land-access labeling matters for portfolio defensibility.
        </p>
      </div>

      <div class="form-row" id="permit-row" hidden>
        <label for="f-permit" class="form-label">Permit reference</label>
        <input
          type="text"
          id="f-permit"
          name="permit_ref"
          class="form-input"
          placeholder="e.g., NC State Parks research permit #2026-014"
          autocomplete="off"
        />
        <p class="form-help">If your fieldwork required a permit, record it here.</p>
      </div>

      <div class="form-row">
        <label for="f-species" class="form-label">
          Species reference list <span class="form-required">*</span>
        </label>
        <select id="f-species" name="species_list_id" class="form-input" required>
          <option value="nc-piedmont">NC Piedmont</option>
          <option value="southern-appalachian">Southern Appalachian / Cumberland Plateau</option>
        </select>
        <p class="form-help">
          Determines which species appear in tree-entry autocomplete.
          You can override per-tree if you encounter a species not on the list.
        </p>
      </div>

      <div class="form-row form-row--split">
        <div class="form-row__half">
          <label for="f-radius" class="form-label">Plot radius (ft)</label>
          <input
            type="number"
            id="f-radius"
            name="plot_radius_ft"
            class="form-input"
            value="37.2"
            step="0.1"
            min="1"
            max="200"
            required
          />
          <p class="form-help">Default: 37.2 ft (1/10 acre).</p>
        </div>
        <div class="form-row__half">
          <label for="f-dbh" class="form-label">DBH threshold (in)</label>
          <input
            type="number"
            id="f-dbh"
            name="dbh_threshold_in"
            class="form-input"
            value="5"
            step="0.1"
            min="0"
            max="50"
            required
          />
          <p class="form-help">Min DBH to record.</p>
        </div>
      </div>

      <div class="form-row">
        <label for="f-notes" class="form-label">Notes</label>
        <textarea
          id="f-notes"
          name="notes"
          class="form-input form-input--textarea"
          rows="3"
          placeholder="Anything worth remembering about this project."
        ></textarea>
      </div>

      <div class="form-error" id="form-error" hidden></div>

      <div class="form-actions">
        <button type="submit" class="btn btn--primary" id="save-btn">
          Create project
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
  syncPermitVisibility();

  // Cancel
  document.getElementById('cancel-btn').addEventListener('click', () => {
    navigate('projects-list');
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
      await createProject({
        name,
        site_name: (data.get('site_name') || '').trim(),
        access_type: data.get('access_type'),
        permit_ref: (data.get('permit_ref') || '').trim(),
        species_list_id: data.get('species_list_id'),
        plot_radius_ft: Number(data.get('plot_radius_ft')),
        dbh_threshold_in: Number(data.get('dbh_threshold_in')),
        notes: (data.get('notes') || '').trim(),
      });
      navigate('projects-list');
    } catch (err) {
      console.error('Project creation failed:', err);
      showError(`Could not save project: ${err.message || 'unknown error'}.`);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Create project';
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
}
