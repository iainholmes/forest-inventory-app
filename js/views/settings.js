// Settings view.
//
// Currently houses backup/restore. Future home for app-level preferences.

import { downloadBackup, restoreBackup } from '../backup.js';
import { db } from '../db.js';

export async function renderSettings(container, navigate) {
  const counts = await getDataCounts();

  const view = document.createElement('section');
  view.className = 'view view--detail';
  view.innerHTML = `
    <header class="detail-header">
      <button class="btn btn--ghost" id="back-btn">&larr; Projects</button>
    </header>

    <div class="detail-title-block">
      <h2 class="detail-title">Settings</h2>
      <div class="detail-site">Backup, restore, and app data on this device</div>
    </div>

    <!-- Local data summary -->
    <div class="detail-section">
      <h3 class="detail-section__title">On this device</h3>
      <div class="data-summary">
        <div class="data-summary__row">
          <span class="data-summary__label">Projects</span>
          <span class="data-summary__value">${counts.projects}</span>
        </div>
        <div class="data-summary__row">
          <span class="data-summary__label">Plots</span>
          <span class="data-summary__value">${counts.plots}</span>
        </div>
        <div class="data-summary__row">
          <span class="data-summary__label">Trees</span>
          <span class="data-summary__value">${counts.trees}</span>
        </div>
        <div class="data-summary__row">
          <span class="data-summary__label">Understory records</span>
          <span class="data-summary__value">${counts.understory}</span>
        </div>
        <div class="data-summary__row">
          <span class="data-summary__label">Photos</span>
          <span class="data-summary__value">${counts.photos}</span>
        </div>
      </div>
    </div>

    <!-- Export -->
    <div class="detail-section">
      <h3 class="detail-section__title">Export backup</h3>
      <p class="form-help">
        Download a JSON file containing all your projects, plots, trees,
        understory, and photo thumbnails. Use this to move data between
        devices (e.g., AirDrop from phone to laptop) or as a safety backup.
      </p>
      <div class="form-row">
        <label class="form-checkbox-label">
          <input type="checkbox" id="include-full-photos" />
          <span>Include full-resolution photos (much larger file)</span>
        </label>
        <p class="form-help">
          Photo thumbnails are always included. Full-res photos can add
          tens to hundreds of MB depending on count.
        </p>
      </div>
      <div class="form-actions">
        <button class="btn btn--primary" id="export-btn">Export backup</button>
      </div>
      <div class="form-status" id="export-status" hidden></div>
    </div>

    <!-- Import -->
    <div class="detail-section">
      <h3 class="detail-section__title">Import backup</h3>
      <p class="form-help">
        Merge a backup file into this device's data. Existing records are
        preserved; new ones are added. Records are matched by content,
        so re-importing the same file is safe — you won't get duplicates.
      </p>
      <div class="form-actions">
        <label class="btn btn--secondary import-btn-label">
          <input type="file" accept="application/json,.json" id="import-input" hidden />
          Choose backup file…
        </label>
      </div>
      <div class="form-status" id="import-status" hidden></div>
    </div>

    <div class="settings-meta">
      <p>
        Backups are JSON files. They contain only your project data —
        no accounts, passwords, or personal information beyond what you've
        entered into the app.
      </p>
    </div>
  `;
  container.appendChild(view);

  // Wire up handlers
  document.getElementById('back-btn').addEventListener('click', () =>
    navigate('projects-list')
  );

  // Export
  const exportBtn = document.getElementById('export-btn');
  const exportStatus = document.getElementById('export-status');
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = 'Building backup…';
    exportStatus.hidden = true;
    try {
      const includeFull = document.getElementById('include-full-photos').checked;
      const backup = await downloadBackup({ includeFullPhotos: includeFull });
      exportStatus.className = 'form-status form-status--success';
      exportStatus.innerHTML = `
        Backup downloaded.
        <strong>${backup.counts.projects}</strong> projects,
        <strong>${backup.counts.plots}</strong> plots,
        <strong>${backup.counts.trees}</strong> trees,
        <strong>${backup.counts.photos}</strong> photos.
      `;
      exportStatus.hidden = false;
    } catch (err) {
      console.error('Export failed:', err);
      exportStatus.className = 'form-status form-status--error';
      exportStatus.textContent = `Export failed: ${err.message || 'unknown error'}.`;
      exportStatus.hidden = false;
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export backup';
    }
  });

  // Import
  const importInput = document.getElementById('import-input');
  const importStatus = document.getElementById('import-status');
  importInput.addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    importStatus.className = 'form-status';
    importStatus.textContent = 'Reading file…';
    importStatus.hidden = false;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      // Confirm before applying — show what's about to happen
      const c = backup.counts || {};
      const confirmed = window.confirm(
        `Import this backup?\n\n` +
        `From: ${backup.exported_at || 'unknown date'}\n` +
        `Contains: ${c.projects || 0} projects, ${c.plots || 0} plots, ${c.trees || 0} trees, ${c.photos || 0} photos\n\n` +
        `Records will be merged with existing data on this device. Re-importing the same file is safe.`
      );
      if (!confirmed) {
        importStatus.hidden = true;
        importInput.value = '';
        return;
      }

      importStatus.textContent = 'Merging into local database…';
      const summary = await restoreBackup(backup);
      importStatus.className = 'form-status form-status--success';
      importStatus.innerHTML = formatImportSummary(summary);
      importStatus.hidden = false;
    } catch (err) {
      console.error('Import failed:', err);
      importStatus.className = 'form-status form-status--error';
      importStatus.textContent = `Import failed: ${err.message || 'unknown error'}.`;
      importStatus.hidden = false;
    } finally {
      importInput.value = '';
    }
  });
}

function formatImportSummary(s) {
  const rows = [
    ['Projects', s.projects],
    ['Plots', s.plots],
    ['Trees', s.trees],
    ['Understory', s.understory],
    ['Photos', s.photos],
  ];
  const lines = rows
    .filter(([, v]) => v.added + v.updated + v.skipped > 0)
    .map(
      ([label, v]) =>
        `<div><strong>${label}:</strong> ${v.added} added, ${v.updated} updated, ${v.skipped} unchanged</div>`
    );
  return `
    <div><strong>Import complete.</strong></div>
    ${lines.join('')}
  `;
}

async function getDataCounts() {
  const [projects, plots, trees, understory, photos] = await Promise.all([
    db.projects.count(),
    db.plots.count(),
    db.trees.count(),
    db.understory.count(),
    db.photos.count(),
  ]);
  return { projects, plots, trees, understory, photos };
}
