// Understory edit view.
//
// One understory record per plot. Captures:
//   - Tree regeneration (dominant species + cover class)
//   - Shrub layer (dominant + cover)
//   - Herbaceous layer (dominant + cover)
//   - Invasive species presence (with species)
//
// Dominant species are free text: many useful species (especially herbs
// and shrubs) aren't on our tree-focused reference list, and forcing
// structured selection would slow Sam down. We capture what he sees.

import {
  getPlot,
  getProject,
  getUnderstoryForPlot,
  upsertUnderstory,
} from '../db.js';
import { COVER_CLASSES } from '../../data/cover-classes.js';

export async function renderUnderstoryEdit(container, navigate, params) {
  const plotId = params?.plotId;
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
  const existing = await getUnderstoryForPlot(plotId) || {};

  const view = document.createElement('section');
  view.className = 'view view--form';
  view.innerHTML = `
    <header class="form-header">
      <button class="btn btn--ghost" id="cancel-btn">&larr; Cancel</button>
      <h2 class="form-header__title">Understory</h2>
    </header>

    <p class="form-context">
      Project: <strong>${escapeHtml(project.name)}</strong>
      &middot; Plot ${plot.id}
    </p>

    <form id="understory-form" class="form" novalidate>

      <div class="form-section">
        <div class="form-section__title">Tree regeneration</div>
        <p class="form-section__hint">
          Seedlings and saplings of canopy species below the DBH threshold.
        </p>
        <div class="form-row">
          <label for="f-regen-dom" class="form-label">Dominant species</label>
          <input type="text" id="f-regen-dom" name="regeneration_dominant"
            class="form-input"
            value="${escapeAttr(existing.regeneration_dominant)}"
            placeholder="e.g., Red maple, white oak"
            autocomplete="off" />
        </div>
        ${renderCoverSelect('regeneration_cover', existing.regeneration_cover)}
      </div>

      <div class="form-section">
        <div class="form-section__title">Shrub layer</div>
        <p class="form-section__hint">
          Woody species not reaching canopy size.
        </p>
        <div class="form-row">
          <label for="f-shrub-dom" class="form-label">Dominant species</label>
          <input type="text" id="f-shrub-dom" name="shrub_dominant"
            class="form-input"
            value="${escapeAttr(existing.shrub_dominant)}"
            placeholder="e.g., Mountain laurel, blueberry"
            autocomplete="off" />
        </div>
        ${renderCoverSelect('shrub_cover', existing.shrub_cover)}
      </div>

      <div class="form-section">
        <div class="form-section__title">Herbaceous layer</div>
        <p class="form-section__hint">
          Non-woody plants on the forest floor.
        </p>
        <div class="form-row">
          <label for="f-herb-dom" class="form-label">Dominant species</label>
          <input type="text" id="f-herb-dom" name="herbaceous_dominant"
            class="form-input"
            value="${escapeAttr(existing.herbaceous_dominant)}"
            placeholder="e.g., Christmas fern, partridgeberry"
            autocomplete="off" />
        </div>
        ${renderCoverSelect('herbaceous_cover', existing.herbaceous_cover)}
      </div>

      <div class="form-section">
        <div class="form-section__title">Invasive species</div>
        <div class="form-row">
          <label class="form-checkbox-label">
            <input type="checkbox" id="f-invasive-present" name="invasive_present"
              ${existing.invasive_present ? 'checked' : ''} />
            <span>Invasive species present in plot</span>
          </label>
        </div>
        <div class="form-row" id="invasive-species-row" ${!existing.invasive_present ? 'hidden' : ''}>
          <label for="f-invasive-species" class="form-label">Which species</label>
          <input type="text" id="f-invasive-species" name="invasive_species"
            class="form-input"
            value="${escapeAttr(existing.invasive_species)}"
            placeholder="e.g., Japanese stiltgrass, multiflora rose"
            autocomplete="off" />
          <p class="form-help">List dominant or notable invasives observed.</p>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section__title">Notes (optional)</div>
        <div class="form-row">
          <textarea id="f-notes" name="notes"
            class="form-input form-input--textarea"
            rows="3"
            placeholder="Anything notable about understory composition or condition.">${escapeHtml(existing.notes)}</textarea>
        </div>
      </div>

      <div class="form-error" id="form-error" hidden></div>

      <div class="form-actions">
        <button type="submit" class="btn btn--primary" id="save-btn">
          Save understory
        </button>
      </div>
    </form>
  `;
  container.appendChild(view);

  document.getElementById('cancel-btn').addEventListener('click', () =>
    navigate('plot-detail', { id: plotId })
  );

  // Show/hide invasive species field based on checkbox
  const invasiveCheckbox = document.getElementById('f-invasive-present');
  const invasiveRow = document.getElementById('invasive-species-row');
  invasiveCheckbox.addEventListener('change', () => {
    invasiveRow.hidden = !invasiveCheckbox.checked;
  });

  const form = document.getElementById('understory-form');
  const errorEl = document.getElementById('form-error');
  const saveBtn = document.getElementById('save-btn');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errorEl.hidden = true;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const data = new FormData(form);
    try {
      await upsertUnderstory(plotId, {
        regeneration_dominant: (data.get('regeneration_dominant') || '').trim(),
        regeneration_cover: data.get('regeneration_cover') || '',
        shrub_dominant: (data.get('shrub_dominant') || '').trim(),
        shrub_cover: data.get('shrub_cover') || '',
        herbaceous_dominant: (data.get('herbaceous_dominant') || '').trim(),
        herbaceous_cover: data.get('herbaceous_cover') || '',
        invasive_present: data.get('invasive_present') === 'on',
        invasive_species: (data.get('invasive_species') || '').trim(),
        notes: (data.get('notes') || '').trim(),
      });
      navigate('plot-detail', { id: plotId });
    } catch (err) {
      console.error('Understory save failed:', err);
      errorEl.textContent = `Could not save: ${err.message || 'unknown error'}.`;
      errorEl.hidden = false;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save understory';
    }
  });
}

function renderCoverSelect(name, currentValue) {
  return `
    <div class="form-row">
      <label class="form-label">Cover class</label>
      <select name="${name}" class="form-input">
        <option value="">— Select —</option>
        ${COVER_CLASSES.map((c) => `
          <option value="${c.code}" ${currentValue === c.code ? 'selected' : ''}>${escapeHtml(c.label)}</option>
        `).join('')}
      </select>
    </div>
  `;
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
function escapeAttr(str) { return escapeHtml(str); }
