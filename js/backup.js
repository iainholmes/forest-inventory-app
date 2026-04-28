// Backup and restore.
//
// Exports the entire local database as a JSON file (with optional full-res
// photo blobs encoded as base64), and restores from such a file.
//
// MERGE STRATEGY:
//   Imports are idempotent — re-importing the same backup is a no-op.
//   Records are matched by content fingerprints, not auto-increment IDs:
//     - Projects:  match by created_at timestamp
//     - Plots:     match by (project_fingerprint, created_at)
//     - Trees:     match by (plot_fingerprint, list_index)  [trees are immutable]
//     - Understory: match by plot_fingerprint (one per plot)
//     - Photos:    match by (plot_fingerprint, captured_at, direction)
//
//   Where matches exist, we prefer the record with the newer `updated_at`
//   (or skip if no updated_at present, like for trees and photos).
//
// PHOTO BLOBS:
//   Default backup includes thumbnails only — thumbnails are tiny (~30KB)
//   and sufficient for cross-device sync and the future map view. The full-
//   resolution blobs are excluded by default to keep backups under a few MB
//   even with hundreds of photos.
//
//   Sam can opt into "Full backup with photos" for archival, which includes
//   full-res blobs. These backups can be very large (tens to hundreds of MB).

import { db } from './db.js';

const BACKUP_FORMAT_VERSION = 1;

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

/**
 * Build a backup object from the current database state.
 *
 * @param {object} options
 * @param {boolean} options.includeFullPhotos  Whether to include full-res
 *                                              photo blobs (in addition to
 *                                              thumbnails). Default false.
 * @returns {Promise<object>} A serializable backup payload
 */
export async function buildBackup({ includeFullPhotos = false } = {}) {
  const projects = await db.projects.toArray();
  const plots = await db.plots.toArray();
  const trees = await db.trees.toArray();
  const understory = await db.understory.toArray();
  const photos = await db.photos.toArray();

  // Encode photo blobs as base64. Thumbnails always; full-res optional.
  const photosOut = [];
  for (const p of photos) {
    const out = {
      plot_id: p.plot_id,
      direction: p.direction || '',
      caption: p.caption || '',
      lat: p.lat ?? null,
      lon: p.lon ?? null,
      captured_at: p.captured_at,
      thumb_b64: p.thumb ? await blobToBase64(p.thumb) : null,
      thumb_mime: p.thumb ? p.thumb.type || 'image/jpeg' : null,
      blob_b64: null,
      blob_mime: null,
    };
    if (includeFullPhotos && p.blob) {
      out.blob_b64 = await blobToBase64(p.blob);
      out.blob_mime = p.blob.type || 'image/jpeg';
    }
    photosOut.push(out);
  }

  return {
    backup_format_version: BACKUP_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    app: 'forest-inventory-app',
    includes_full_photos: includeFullPhotos,
    counts: {
      projects: projects.length,
      plots: plots.length,
      trees: trees.length,
      understory: understory.length,
      photos: photos.length,
    },
    projects,
    plots,
    trees,
    understory,
    photos: photosOut,
  };
}

/**
 * Trigger a download of the backup as a JSON file.
 */
export async function downloadBackup({ includeFullPhotos = false } = {}) {
  const backup = await buildBackup({ includeFullPhotos });
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = makeBackupFilename(includeFullPhotos);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return backup;
}

function makeBackupFilename(includeFullPhotos) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = includeFullPhotos ? '-full' : '';
  return `forest-inventory-${yyyy}-${mm}-${dd}${suffix}.json`;
}

// ---------------------------------------------------------------------------
// IMPORT
// ---------------------------------------------------------------------------

/**
 * Restore database state from a backup payload, merging by content
 * fingerprints. Returns a summary of what was applied.
 *
 * @param {object} backup
 * @returns {Promise<object>} Summary with counts: { added, updated, skipped }
 */
export async function restoreBackup(backup) {
  validateBackup(backup);

  const summary = {
    projects: { added: 0, updated: 0, skipped: 0 },
    plots: { added: 0, updated: 0, skipped: 0 },
    trees: { added: 0, updated: 0, skipped: 0 },
    understory: { added: 0, updated: 0, skipped: 0 },
    photos: { added: 0, updated: 0, skipped: 0 },
  };

  // Map of fingerprint -> local id, populated as we import.
  // Used to remap foreign keys.
  const projectIdMap = new Map();   // backup project_id -> local project_id
  const plotIdMap = new Map();       // backup plot_id -> local plot_id

  // ---------- Projects ----------
  const localProjects = await db.projects.toArray();
  const localProjectsByFp = new Map(
    localProjects.map((p) => [projectFingerprint(p), p])
  );

  for (const bp of backup.projects || []) {
    const fp = projectFingerprint(bp);
    const existing = localProjectsByFp.get(fp);
    if (existing) {
      // Update if backup is newer
      if (isNewer(bp.updated_at, existing.updated_at)) {
        const { id, ...rest } = bp;
        await db.projects.update(existing.id, rest);
        summary.projects.updated += 1;
      } else {
        summary.projects.skipped += 1;
      }
      projectIdMap.set(bp.id, existing.id);
    } else {
      const { id, ...rest } = bp;
      const newId = await db.projects.add(rest);
      projectIdMap.set(bp.id, newId);
      summary.projects.added += 1;
    }
  }

  // ---------- Plots ----------
  const localPlots = await db.plots.toArray();
  const localPlotsByFp = new Map();
  for (const lp of localPlots) {
    const proj = localProjects.find((p) => p.id === lp.project_id);
    if (proj) {
      const fp = plotFingerprint(projectFingerprint(proj), lp);
      localPlotsByFp.set(fp, lp);
    }
  }

  for (const bp of backup.plots || []) {
    const newProjectId = projectIdMap.get(bp.project_id);
    if (!newProjectId) {
      summary.plots.skipped += 1;
      continue;
    }
    const sourceProject = (backup.projects || []).find((p) => p.id === bp.project_id);
    if (!sourceProject) {
      summary.plots.skipped += 1;
      continue;
    }
    const fp = plotFingerprint(projectFingerprint(sourceProject), bp);
    const existing = localPlotsByFp.get(fp);
    const plotData = { ...bp, project_id: newProjectId };
    delete plotData.id;
    if (existing) {
      if (isNewer(bp.updated_at, existing.updated_at)) {
        await db.plots.update(existing.id, plotData);
        summary.plots.updated += 1;
      } else {
        summary.plots.skipped += 1;
      }
      plotIdMap.set(bp.id, existing.id);
    } else {
      const newId = await db.plots.add(plotData);
      plotIdMap.set(bp.id, newId);
      summary.plots.added += 1;
    }
  }

  // ---------- Trees ----------
  // Trees are matched by plot + ordinal index. Since trees are immutable
  // (no edit, only add/delete), if a tree exists at index N in plot P,
  // we trust it's the same tree.
  const treesByBackupPlot = groupBy(backup.trees || [], (t) => t.plot_id);
  for (const [backupPlotId, plotTrees] of treesByBackupPlot) {
    const localPlotId = plotIdMap.get(backupPlotId);
    if (!localPlotId) {
      summary.trees.skipped += plotTrees.length;
      continue;
    }
    const existingTrees = await db.trees
      .where('plot_id')
      .equals(localPlotId)
      .sortBy('id');
    const sortedBackupTrees = [...plotTrees].sort((a, b) => a.id - b.id);

    for (let i = 0; i < sortedBackupTrees.length; i++) {
      const bt = sortedBackupTrees[i];
      if (existingTrees[i]) {
        // Already a tree at this index — assume same, skip
        summary.trees.skipped += 1;
      } else {
        const { id, ...rest } = bt;
        rest.plot_id = localPlotId;
        await db.trees.add(rest);
        summary.trees.added += 1;
      }
    }
  }

  // ---------- Understory ----------
  for (const bu of backup.understory || []) {
    const localPlotId = plotIdMap.get(bu.plot_id);
    if (!localPlotId) {
      summary.understory.skipped += 1;
      continue;
    }
    const existing = await db.understory
      .where('plot_id')
      .equals(localPlotId)
      .first();
    const data = { ...bu, plot_id: localPlotId };
    delete data.id;
    if (existing) {
      if (isNewer(bu.updated_at, existing.updated_at)) {
        await db.understory.update(existing.id, data);
        summary.understory.updated += 1;
      } else {
        summary.understory.skipped += 1;
      }
    } else {
      await db.understory.add(data);
      summary.understory.added += 1;
    }
  }

  // ---------- Photos ----------
  for (const bp of backup.photos || []) {
    const localPlotId = plotIdMap.get(bp.plot_id);
    if (!localPlotId) {
      summary.photos.skipped += 1;
      continue;
    }
    // Match by (plot, captured_at, direction)
    const existing = await db.photos
      .where('plot_id')
      .equals(localPlotId)
      .filter(
        (p) =>
          p.captured_at === bp.captured_at &&
          (p.direction || '') === (bp.direction || '')
      )
      .first();
    if (existing) {
      summary.photos.skipped += 1;
      continue;
    }
    // Build photo record from base64
    const thumbBlob = bp.thumb_b64
      ? base64ToBlob(bp.thumb_b64, bp.thumb_mime || 'image/jpeg')
      : null;
    const fullBlob = bp.blob_b64
      ? base64ToBlob(bp.blob_b64, bp.blob_mime || 'image/jpeg')
      : thumbBlob; // fall back: if we only have thumb, use it as the "blob" too
    if (!fullBlob && !thumbBlob) {
      summary.photos.skipped += 1;
      continue;
    }
    await db.photos.add({
      plot_id: localPlotId,
      direction: bp.direction || '',
      caption: bp.caption || '',
      lat: bp.lat ?? null,
      lon: bp.lon ?? null,
      captured_at: bp.captured_at,
      thumb: thumbBlob,
      blob: fullBlob,
    });
    summary.photos.added += 1;
  }

  return summary;
}

// ---------------------------------------------------------------------------
// FINGERPRINTS & UTILITIES
// ---------------------------------------------------------------------------

function projectFingerprint(p) {
  // created_at is millisecond-precision ISO; effectively unique per device
  // For projects without created_at (shouldn't happen), fall back to name
  return `${p.created_at || ''}|${p.name || ''}`;
}

function plotFingerprint(projectFp, plot) {
  return `${projectFp}::${plot.created_at || ''}`;
}

function isNewer(a, b) {
  // Both ISO strings; lexicographic comparison works.
  if (!a) return false;
  if (!b) return true;
  return a > b;
}

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Backup file is not valid JSON.');
  }
  if (backup.app !== 'forest-inventory-app') {
    throw new Error('This file does not appear to be a Forest Inventory backup.');
  }
  if (!Number.isInteger(backup.backup_format_version)) {
    throw new Error('Backup is missing a format version.');
  }
  if (backup.backup_format_version > BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Backup was created by a newer app version (format ${backup.backup_format_version}). Please update before importing.`
    );
  }
  if (!Array.isArray(backup.projects)) {
    throw new Error('Backup is malformed: missing projects array.');
  }
}

// Blob <-> base64 helpers
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // result is "data:<mime>;base64,<payload>"
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to encode blob as base64.'));
        return;
      }
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(b64, mime) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
