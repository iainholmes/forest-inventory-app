// Plot establishment view.
//
// Form for creating a new plot under a project. Includes a manual GPS
// capture button — Sam taps "Capture GPS" when he's standing at the plot
// center, the browser asks for location permission, and the result
// (lat/lon and accuracy) is shown inline. Sam can re-capture if he
// doesn't like the accuracy.
//
// On save, the plot is persisted with status='in_progress'. Tree and
// understory entry come in later build steps; for now Sam just records
// the plot establishment data and lands back on the project detail.

import { getProject, createPlot } from '../db.js';
import {
  FOREST_TYPES,
  TOPOGRAPHIC_POSITIONS,
  DISTURBANCE_CODES,
} from '../../data/forest-types.js';

export async function renderPlotCreate(container, navigate, params) {
  const projectId = params?.projectId;
  if (!projectId) {
    container.innerHTML = '<p>No project specified.</p>';
    return;
  }

  const project = await getProject(projectId);
  if (!project) {
    container.innerHTML = '<p>Project not found.</p>';
    return;
  }

  // GPS state — kept in the closure, updated by the capture handler.
  // null until first successful capture.
  let gpsState = {
    lat: null,
    lon: null,
    accuracy_m: null,
    captured_at: null,
    status: 'idle', // idle | acquiring | success | error
    error: null,
  };

  const view = document.createElement('section');
  view.className = 'view view--form';
  view.appendChild(buildFormElement(project));
  container.appendChild(view);

  // Wire up handlers
  document
    .getElementById('cancel-btn')
    .addEventListener('click', () =>
      navigate('project-detail', { id: projectId })
    );

  document
    .getElementById('capture-gps-btn')
    .addEventListener('click', handleCaptureGps);

  const form = document.getElementById('plot-form');
  form.addEventListener('submit', handleSubmit);

  function handleCaptureGps() {
    if (!('geolocation' in navigator)) {
      gpsState = {
        ...gpsState,
        status: 'error',
        error: 'Geolocation is not supported by this browser.',
      };
      renderGpsState();
      return;
    }
    gpsState = { ...gpsState, status: 'acquiring', error: null };
    renderGpsState();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        gpsState = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy_m: position.coords.accuracy,
          captured_at: new Date().toISOString(),
          status: 'success',
          error: null,
        };
        renderGpsState();
      },
      (err) => {
        gpsState = {
          ...gpsState,
          status: 'error',
          error: friendlyGpsError(err),
        };
        renderGpsState();
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  }

  function renderGpsState() {
    const out = document.getElementById('gps-output');
    const btn = document.getElementById('capture-gps-btn');
    if (!out || !btn) return;

    switch (gpsState.status) {
      case 'idle':
        out.innerHTML = '<span class="gps-output__hint">No GPS captured yet.</span>';
        btn.textContent = 'Capture GPS';
        btn.disabled = false;
        break;
      case 'acquiring':
        out.innerHTML = '<span class="gps-output__acquiring">Acquiring location… this can take 10–30 seconds with a clear sky.</span>';
        btn.textContent = 'Acquiring…';
        btn.disabled = true;
        break;
      case 'success': {
        const accClass = accuracyClass(gpsState.accuracy_m);
        out.innerHTML = `
          <div class="gps-output__success">
            <div class="gps-output__coords">
              ${gpsState.lat.toFixed(6)}, ${gpsState.lon.toFixed(6)}
            </div>
            <div class="gps-output__accuracy gps-output__accuracy--${accClass}">
              Accuracy: &plusmn;${gpsState.accuracy_m.toFixed(1)} m
              <span class="gps-output__accuracy-label">(${accuracyLabel(gpsState.accuracy_m)})</span>
            </div>
          </div>
        `;
        btn.textContent = 'Re-capture';
        btn.disabled = false;
        break;
      }
      case 'error':
        out.innerHTML = `
          <div class="gps-output__error">
            ${escapeHtml(gpsState.error || 'GPS capture failed.')}
          </div>
        `;
        btn.textContent = 'Try again';
        btn.disabled = false;
        break;
    }
  }
  renderGpsState(); // initial paint

  async function handleSubmit(ev) {
    ev.preventDefault();
    const errorEl = document.getElementById('form-error');
    const saveBtn = document.getElementById('save-btn');
    errorEl.hidden = true;

    const data = new FormData(form);

    // Disturbance is multi-select via checkboxes; FormData.getAll returns array.
    const disturbance_codes = data.getAll('disturbance');

    // Slope and aspect: optional but if entered must be in valid ranges
    const slopeRaw = data.get('slope_deg');
    const aspectRaw = data.get('aspect_deg');
    const slope_deg = slopeRaw === '' || slopeRaw === null ? null : Number(slopeRaw);
    const aspect_deg = aspectRaw === '' || aspectRaw === null ? null : Number(aspectRaw);

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
      await createPlot(projectId, {
        lat: gpsState.lat,
        lon: gpsState.lon,
        gps_accuracy_m: gpsState.accuracy_m,
        gps_captured_at: gpsState.captured_at,
        forest_type: data.get('forest_type') || '',
        slope_deg,
        aspect_deg,
        topographic_position: data.get('topographic_position') || '',
        disturbance_codes,
        notes: (data.get('notes') || '').trim(),
        status: 'in_progress',
      });
      navigate('project-detail', { id: projectId });
    } catch (err) {
      console.error('Plot creation failed:', err);
      showError(`Could not save plot: ${err.message || 'unknown error'}.`);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save plot';
    }

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
  }
}

function buildFormElement(project) {
  const wrapper = document.createElement('div');
  const forestTypes = FOREST_TYPES[project.species_list_id] || FOREST_TYPES['nc-piedmont'];

  wrapper.innerHTML = `
    <header class="form-header">
      <button class="btn btn--ghost" id="cancel-btn">&larr; Cancel</button>
      <h2 class="form-header__title">New plot</h2>
    </header>

    <p class="form-context">
      Project: <strong>${escapeHtml(project.name)}</strong>
      &middot; ${project.plot_radius_ft} ft radius
      &middot; ${project.dbh_threshold_in} in DBH threshold
    </p>

    <form id="plot-form" class="form" novalidate>

      <!-- GPS capture -->
      <div class="form-section">
        <div class="form-section__title">Plot location</div>
        <div class="form-row">
          <button type="button" class="btn btn--primary" id="capture-gps-btn">
            Capture GPS
          </button>
          <div id="gps-output" class="gps-output"></div>
          <p class="form-help">
            Stand at the plot center and tap to capture GPS. You may need to
            allow location access. Re-capture if accuracy is worse than expected.
          </p>
        </div>
      </div>

      <!-- Site description -->
      <div class="form-section">
        <div class="form-section__title">Site description</div>

        <div class="form-row">
          <label for="f-forest-type" class="form-label">Forest community type</label>
          <select id="f-forest-type" name="forest_type" class="form-input">
            <option value="">— Select —</option>
            ${forestTypes.map((ft) => `
              <option value="${ft.code}">${escapeHtml(ft.label)}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-row">
          <label for="f-topo" class="form-label">Topographic position</label>
          <select id="f-topo" name="topographic_position" class="form-input">
            <option value="">— Select —</option>
            ${TOPOGRAPHIC_POSITIONS.map((tp) => `
              <option value="${tp.code}">${escapeHtml(tp.label)}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-row form-row--split">
          <div class="form-row__half">
            <label for="f-slope" class="form-label">Slope (degrees)</label>
            <input
              type="number"
              id="f-slope"
              name="slope_deg"
              class="form-input"
              min="0"
              max="90"
              step="1"
              placeholder="e.g., 12"
            />
            <p class="form-help">0–90. Use a clinometer for accuracy.</p>
          </div>
          <div class="form-row__half">
            <label for="f-aspect" class="form-label">Aspect (degrees)</label>
            <input
              type="number"
              id="f-aspect"
              name="aspect_deg"
              class="form-input"
              min="0"
              max="360"
              step="1"
              placeholder="e.g., 230"
            />
            <p class="form-help">0–360. Downslope direction from N.</p>
          </div>
        </div>
      </div>

      <!-- Disturbance evidence (multi-select checkboxes) -->
      <div class="form-section">
        <div class="form-section__title">Disturbance evidence</div>
        <div class="form-row">
          <fieldset class="form-checkbox-group">
            <legend class="visually-hidden">Disturbance evidence</legend>
            ${DISTURBANCE_CODES.map((d) => `
              <label class="form-checkbox-label">
                <input type="checkbox" name="disturbance" value="${d.code}" />
                <span>${escapeHtml(d.label)}</span>
              </label>
            `).join('')}
          </fieldset>
          <p class="form-help">Check all that apply.</p>
        </div>
      </div>

      <!-- Notes -->
      <div class="form-section">
        <div class="form-section__title">Notes</div>
        <div class="form-row">
          <textarea
            id="f-notes"
            name="notes"
            class="form-input form-input--textarea"
            rows="3"
            placeholder="Anything notable about this plot."
          ></textarea>
        </div>
      </div>

      <div class="form-error" id="form-error" hidden></div>

      <div class="form-actions">
        <button type="submit" class="btn btn--primary" id="save-btn">
          Save plot
        </button>
      </div>
    </form>
  `;
  return wrapper;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function accuracyClass(accuracyM) {
  if (accuracyM <= 10) return 'good';
  if (accuracyM <= 30) return 'ok';
  return 'poor';
}

function accuracyLabel(accuracyM) {
  if (accuracyM <= 10) return 'Excellent';
  if (accuracyM <= 30) return 'Acceptable';
  return 'Poor — consider re-capturing';
}

function friendlyGpsError(err) {
  switch (err.code) {
    case 1: return 'Location permission denied. Allow location access in your browser settings to capture GPS.';
    case 2: return 'Location unavailable. Check that GPS or location services are enabled on your device.';
    case 3: return 'GPS request timed out. This often means weak signal — try moving to a clearer spot and retry.';
    default: return `GPS error: ${err.message || 'unknown'}.`;
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
