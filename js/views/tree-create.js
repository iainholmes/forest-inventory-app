// Tree entry view.
//
// Optimized for repeated entry. Sam taps "+ Add tree", types a species,
// enters DBH, taps crown class and condition, taps Save & next. The form
// resets and stays on the same page so he can immediately enter the next
// tree. A running plot total (tree count, BA/acre, TPA) is shown at the
// top so Sam can sanity-check his work in real time.
//
// Two save options:
//   "Save & next"    — saves the tree and resets the form to add another
//   "Save & finish"  — saves the tree and navigates back to plot-detail
//
// Both save the same data; the difference is post-save navigation.

import {
  getPlot,
  getProject,
  createTree,
  listTreesForPlot,
} from '../db.js';
import { searchSpecies, findSpeciesByCode } from '../../data/species-index.js';
import { computePlotSummary, fmt } from '../compute/plot-metrics.js';

const CROWN_CLASSES = [
  { code: 'D', label: 'Dominant' },
  { code: 'C', label: 'Codominant' },
  { code: 'I', label: 'Intermediate' },
  { code: 'S', label: 'Suppressed' },
];

const CONDITIONS = [
  { code: 'healthy', label: 'Healthy' },
  { code: 'stressed', label: 'Stressed' },
  { code: 'declining', label: 'Declining' },
  { code: 'dead-standing', label: 'Dead (standing)' },
  { code: 'snag', label: 'Snag' },
];

export async function renderTreeCreate(container, navigate, params) {
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

  // Selected species in the autocomplete (closure-scoped state)
  let selectedSpecies = null;

  const view = document.createElement('section');
  view.className = 'view view--form';
  await renderInto(view);
  container.appendChild(view);

  async function renderInto(rootEl) {
    const trees = await listTreesForPlot(plotId);
    const summary = computePlotSummary(trees, project.plot_radius_ft);

    rootEl.innerHTML = `
      <header class="form-header">
        <button class="btn btn--ghost" id="back-btn">&larr; Back to plot</button>
        <h2 class="form-header__title">Add tree</h2>
      </header>

      <p class="form-context">
        Plot ${plot.id} &middot; ${project.plot_radius_ft} ft radius
        &middot; ${project.dbh_threshold_in}" DBH threshold
      </p>

      <!-- Running totals -->
      <div class="metrics-grid metrics-grid--compact">
        <div class="metric">
          <div class="metric__value">${summary.tree_count}</div>
          <div class="metric__label">Trees</div>
        </div>
        <div class="metric">
          <div class="metric__value">${fmt(summary.tpa, 0)}</div>
          <div class="metric__label">TPA</div>
        </div>
        <div class="metric">
          <div class="metric__value">${fmt(summary.ba_per_acre, 1)}</div>
          <div class="metric__label">BA/ac</div>
        </div>
        <div class="metric">
          <div class="metric__value">${fmt(summary.qmd_in, 1)}</div>
          <div class="metric__label">QMD</div>
        </div>
      </div>

      <form id="tree-form" class="form" novalidate>

        <div class="form-section">
          <div class="form-section__title">Species</div>
          <div class="form-row">
            <input
              type="text"
              id="f-species-search"
              class="form-input"
              placeholder="Type to search (e.g., red m, quer, loblolly)"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
            />
            <ul id="species-suggestions" class="autocomplete-list" hidden></ul>
            <input type="hidden" name="species_code" id="f-species-code" />
            <input type="hidden" name="species_label" id="f-species-label" />
            <div class="selected-species" id="selected-species" hidden>
              <span class="selected-species__common"></span>
              <span class="selected-species__sci"></span>
              <button type="button" class="selected-species__clear" id="clear-species-btn" aria-label="Clear species">&times;</button>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section__title">Measurements</div>

          <div class="form-row">
            <label for="f-dbh" class="form-label">DBH (inches) <span class="form-required">*</span></label>
            <input
              type="number"
              id="f-dbh"
              name="dbh_in"
              class="form-input form-input--large"
              inputmode="decimal"
              step="0.1"
              min="0"
              max="120"
              required
              placeholder="e.g., 12.4"
            />
            <p class="form-help">Threshold: ${project.dbh_threshold_in}". Trees below this go unrecorded.</p>
          </div>

          <div class="form-row">
            <label class="form-label">Crown class</label>
            <div class="button-group" role="radiogroup" id="crown-class-group">
              ${CROWN_CLASSES.map((c) => `
                <button type="button" class="button-group__btn"
                  data-value="${c.code}" role="radio" aria-checked="false">
                  <span class="button-group__code">${c.code}</span>
                  <span class="button-group__label">${c.label}</span>
                </button>
              `).join('')}
            </div>
            <input type="hidden" name="crown_class" id="f-crown-class" />
          </div>

          <div class="form-row">
            <label class="form-label">Condition</label>
            <div class="button-group button-group--wrap" role="radiogroup" id="condition-group">
              ${CONDITIONS.map((c) => `
                <button type="button" class="button-group__btn button-group__btn--wide"
                  data-value="${c.code}" role="radio" aria-checked="false">
                  ${c.label}
                </button>
              `).join('')}
            </div>
            <input type="hidden" name="condition" id="f-condition" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section__title">Notes (optional)</div>
          <div class="form-row">
            <input type="text" id="f-notes" name="notes" class="form-input"
              placeholder="e.g., forked, fire scar, seed-bearing" />
          </div>
        </div>

        <div class="form-error" id="form-error" hidden></div>

        <div class="form-actions form-actions--double">
          <button type="button" class="btn btn--secondary" id="save-finish-btn">
            Save &amp; finish
          </button>
          <button type="submit" class="btn btn--primary" id="save-next-btn">
            Save &amp; next
          </button>
        </div>
      </form>

      <!-- Latest entered trees, oldest at bottom -->
      ${trees.length > 0 ? `
        <div class="recent-trees">
          <div class="recent-trees__label">Just added (${trees.length})</div>
          <ol class="recent-trees__list">
            ${trees.slice().reverse().slice(0, 6).map((t) => `
              <li>
                <strong>${escapeHtml(t.species_label || t.species_code)}</strong>
                · ${Number(t.dbh_in).toFixed(1)}"
                ${t.crown_class ? ` · ${t.crown_class}` : ''}
              </li>
            `).join('')}
            ${trees.length > 6 ? `<li class="recent-trees__more">… and ${trees.length - 6} more</li>` : ''}
          </ol>
        </div>
      ` : ''}
    `;

    wireUp(rootEl);
  }

  function wireUp(rootEl) {
    const searchInput = rootEl.querySelector('#f-species-search');
    const suggestionsList = rootEl.querySelector('#species-suggestions');
    const selectedBlock = rootEl.querySelector('#selected-species');
    const speciesCodeInput = rootEl.querySelector('#f-species-code');
    const speciesLabelInput = rootEl.querySelector('#f-species-label');
    const clearSpeciesBtn = rootEl.querySelector('#clear-species-btn');
    const dbhInput = rootEl.querySelector('#f-dbh');
    const crownGroup = rootEl.querySelector('#crown-class-group');
    const crownInput = rootEl.querySelector('#f-crown-class');
    const conditionGroup = rootEl.querySelector('#condition-group');
    const conditionInput = rootEl.querySelector('#f-condition');
    const errorEl = rootEl.querySelector('#form-error');
    const form = rootEl.querySelector('#tree-form');
    const saveNextBtn = rootEl.querySelector('#save-next-btn');
    const saveFinishBtn = rootEl.querySelector('#save-finish-btn');
    const backBtn = rootEl.querySelector('#back-btn');

    backBtn.addEventListener('click', () => {
      navigate('plot-detail', { id: plotId });
    });

    // -------- Species autocomplete --------

    function renderSuggestions(query) {
      const results = searchSpecies(project.species_list_id, query, 8);
      if (results.length === 0) {
        suggestionsList.innerHTML = '<li class="autocomplete-list__none">No matches</li>';
        suggestionsList.hidden = false;
        return;
      }
      suggestionsList.innerHTML = results.map((sp) => `
        <li class="autocomplete-list__item" data-code="${sp.code}" data-label="${escapeAttr(sp.common)}">
          <span class="autocomplete-list__common">${escapeHtml(sp.common)}</span>
          ${sp.scientific && sp.scientific !== '—' ? `
            <span class="autocomplete-list__sci"><em>${escapeHtml(sp.scientific)}</em></span>
          ` : ''}
        </li>
      `).join('');
      suggestionsList.hidden = false;
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value;
      if (q.length === 0) {
        suggestionsList.hidden = true;
        return;
      }
      renderSuggestions(q);
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.length > 0) renderSuggestions(searchInput.value);
    });

    suggestionsList.addEventListener('click', (ev) => {
      const item = ev.target.closest('.autocomplete-list__item');
      if (!item) return;
      const code = item.dataset.code;
      const label = item.dataset.label;
      const sp = findSpeciesByCode(code);
      selectSpecies(sp || { code, common: label, scientific: '—' });
    });

    function selectSpecies(sp) {
      selectedSpecies = sp;
      speciesCodeInput.value = sp.code;
      speciesLabelInput.value = sp.common;
      selectedBlock.querySelector('.selected-species__common').textContent = sp.common;
      const sciSpan = selectedBlock.querySelector('.selected-species__sci');
      if (sp.scientific && sp.scientific !== '—') {
        sciSpan.innerHTML = `<em>${escapeHtml(sp.scientific)}</em>`;
        sciSpan.hidden = false;
      } else {
        sciSpan.hidden = true;
      }
      selectedBlock.hidden = false;
      searchInput.value = '';
      searchInput.hidden = true;
      suggestionsList.hidden = true;
      // Move focus to DBH for fast entry
      dbhInput.focus();
    }

    function clearSpecies() {
      selectedSpecies = null;
      speciesCodeInput.value = '';
      speciesLabelInput.value = '';
      selectedBlock.hidden = true;
      searchInput.hidden = false;
      searchInput.value = '';
      searchInput.focus();
    }

    clearSpeciesBtn.addEventListener('click', clearSpecies);

    // -------- Crown / condition button groups --------

    function wireButtonGroup(groupEl, hiddenInput) {
      groupEl.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.button-group__btn');
        if (!btn) return;
        for (const b of groupEl.querySelectorAll('.button-group__btn')) {
          b.classList.remove('button-group__btn--selected');
          b.setAttribute('aria-checked', 'false');
        }
        btn.classList.add('button-group__btn--selected');
        btn.setAttribute('aria-checked', 'true');
        hiddenInput.value = btn.dataset.value;
      });
    }
    wireButtonGroup(crownGroup, crownInput);
    wireButtonGroup(conditionGroup, conditionInput);

    // -------- Save handlers --------

    async function saveTree() {
      errorEl.hidden = true;
      if (!speciesCodeInput.value) {
        showError('Pick a species first.');
        searchInput.focus();
        return false;
      }
      const dbhRaw = dbhInput.value;
      const dbh = Number(dbhRaw);
      if (!dbhRaw || !Number.isFinite(dbh) || dbh <= 0) {
        showError('Enter a valid DBH.');
        dbhInput.focus();
        return false;
      }
      if (dbh < project.dbh_threshold_in) {
        const ok = window.confirm(
          `DBH ${dbh.toFixed(1)}" is below the project threshold of ${project.dbh_threshold_in}".\n\nSave anyway?`
        );
        if (!ok) return false;
      }

      try {
        await createTree(plotId, {
          species_code: speciesCodeInput.value,
          species_label: speciesLabelInput.value,
          dbh_in: dbh,
          crown_class: crownInput.value,
          condition: conditionInput.value,
          notes: (form.notes.value || '').trim(),
        });
        return true;
      } catch (err) {
        console.error('Tree creation failed:', err);
        showError(`Could not save tree: ${err.message || 'unknown error'}.`);
        return false;
      }
    }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      saveNextBtn.disabled = true;
      saveFinishBtn.disabled = true;
      saveNextBtn.textContent = 'Saving…';
      const ok = await saveTree();
      if (ok) {
        // Reset form and re-render in place to update running totals
        await renderInto(view);
        // After re-render the focus dance starts again — focus the species search
        const newSearch = view.querySelector('#f-species-search');
        if (newSearch) newSearch.focus();
      } else {
        saveNextBtn.disabled = false;
        saveFinishBtn.disabled = false;
        saveNextBtn.textContent = 'Save & next';
      }
    });

    saveFinishBtn.addEventListener('click', async () => {
      saveNextBtn.disabled = true;
      saveFinishBtn.disabled = true;
      saveFinishBtn.textContent = 'Saving…';
      const ok = await saveTree();
      if (ok) {
        navigate('plot-detail', { id: plotId });
      } else {
        saveNextBtn.disabled = false;
        saveFinishBtn.disabled = false;
        saveFinishBtn.textContent = 'Save & finish';
      }
    });

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
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
function escapeAttr(str) { return escapeHtml(str); }
