// Plot edit view.
//
// Same structure as plot-create but pre-populated from the existing plot
// and calling updatePlot on submit. Doesn't include GPS re-capture in
// the basic edit flow — Sam can manually edit lat/lon if needed via
// re-capturing on a future version, but mostly edits are about
// site-description fields. (Re-capture would be a separate UI choice
// we can add later if needed.)

import { getPlot, getProject, updatePlot } from '../db.js';
import {
  FOREST_TYPES,
  TOPOGRAPHIC_POSITIONS,
  DISTURBANCE_CODES,
} from '../../data/forest-types.js';

export async function renderPlotEdit(container, navigate, params) {
  const plotId = params?.id;
  if (!plotId) {
    container.innerHTML = '<p>No plot specified.</p>';
    return;
  }
  const plot = await getPlot(plotId);
  if (!plot) {
    container.innerHTML = '<p>Plot not found.</p>';
    return;
  }
  const project = await getProject(plot.project_id);
  const forestTypes = FOREST_TYPES[project.species_list_id] || FOREST_TYPES['nc-piedmont'];

  const view = document.createElement('section');
  view.className = 'view view--form';
  view.innerHTML = `
    <header class="form-header">
      <button class="btn btn--ghost" id="cancel-btn">&larr; Cancel</button>
      <h2 class="form-header__title">Edit plot</h2>
    </header>

    <p class="form-context">
      Project: <strong>${escapeHtml(project.name)}</strong>
      &middot; Plot ${plot.id}
    </p>

    <form id="plot-form" class="form" novalidate>

      <div class="form-section">
        <div class="form-section__title">Site description</div>

        <div class="form-row">
          <label for="f-forest-type" class="form-label">Forest community type</label>
          <select id="f-forest-type" name="forest_type" class="form-input">
            <option value="">— Select —</option>
            ${forestTypes.map((ft) => `
              <option value="${ft.code}" ${plot.forest_type === ft.code ? 'selected' : ''}>${escapeHtml(ft.label)}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-row">
          <label for="f-topo" class="form-label">Topographic position</label>
          <select id="f-topo" name="topographic_position" class="form-input">
            <option value="">— Select —</option>
            ${TOPOGRAPHIC_POSITIONS.map((tp) => `
              <option value="${tp.code}" ${plot.topographic_position === tp.code ? 'selected' : ''}>${escapeHtml(tp.label)}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-row form-row--split">
          <div class="form-row__half">
            <label for="f-slope" class="form-label">Slope (degrees)</label>
            <input type="number" id="f-slope" name="slope_deg" class="form-input"
              min="0" max="90" step="1"
              value="${plot.slope_deg ?? ''}" />
          </div>
          <div class="form-row__half">
            <label for="f-aspect" class="form-label">Aspect (degrees)</label>
            <input type="number" id="f-aspect" name="aspect_deg" class="form-input"
              min="0" max="360" step="1"
              value="${plot.aspect_deg ?? ''}" />
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section__title">Disturbance evidence</div>
        <div class="form-row">
          <fieldset class="form-checkbox-group">
            <legend class="visually-hidden">Disturbance evidence</legend>
            ${DISTURBANCE_CODES.map((d) => `
              <label class="form-checkbox-label">
                <input type="checkbox" name="disturbance" value="${d.code}"
                  ${(plot.disturbance_codes || []).includes(d.code) ? 'checked' : ''} />
                <span>${escapeHtml(d.label)}</span>
              </label>
            `).join('')}
          </fieldset>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section__title">Notes</div>
        <div class="form-row">
          <textarea id="f-notes" name="notes" class="form-input form-input--textarea"
            rows="3">${escapeHtml(plot.notes)}</textarea>
        </div>
      </div>

      <div class="form-error" id="form-error" hidden></div>

      <div class="form-actions">
        <button type="submit" class="btn btn--primary" id="save-btn">Save changes</button>
      </div>
    </form>
  `;
  container.appendChild(view);

  document.getElementById('cancel-btn').addEventListener('click', () =>
    navigate('plot-detail', { id: plotId })
  );

  const form = document.getElementById('plot-form');
  const errorEl = document.getElementById('form-error');
  const saveBtn = document.getElementById('save-btn');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errorEl.hidden = true;

    const data = new FormData(form);
    const slopeRaw = data.get('slope_deg');
    const aspectRaw = data.get('aspect_deg');
    const slope_deg = slopeRaw === '' ? null : Number(slopeRaw);
    const aspect_deg = aspectRaw === '' ? null : Number(aspectRaw);

    if (slope_deg !== null && (slope_deg < 0 || slope_deg > 90)) {
      showError('Slope must be between 0 and 90 degrees.');
      return;
    }
    if (aspect_deg !== null && (aspect_deg < 0 || aspect_deg > 360)) {
      showError('Aspect must be between 0 and 360 degrees.');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      await updatePlot(plotId, {
        forest_type: data.get('forest_type') || '',
        slope_deg,
        aspect_deg,
        topographic_position: data.get('topographic_position') || '',
        disturbance_codes: data.getAll('disturbance'),
        notes: (data.get('notes') || '').trim(),
      });
      navigate('plot-detail', { id: plotId });
    } catch (err) {
      console.error('Plot update failed:', err);
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
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
