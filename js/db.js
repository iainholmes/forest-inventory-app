// Forest Inventory app — data layer.
//
// Wraps Dexie (IndexedDB) for projects, plots, trees, understory, photos.
// All data is stored locally on the user's device — there is no server,
// no cloud sync, no account.
//
// Schema versioning: Dexie uses an integer version number. Bump it whenever
// the schema changes (add tables, add indexed fields). Migrations are
// declarative — Dexie figures out what to do based on schema diffs.

import Dexie from 'https://unpkg.com/dexie@4.0.8/dist/modern/dexie.mjs';

export const db = new Dexie('forest-inventory');

// Version 1 schema.
//
// In Dexie's stores() syntax, the string defines indexed fields:
//   ++id        auto-incrementing primary key
//   &field      unique index
//   field       indexed field (queryable via .where())
//   *field      multi-entry index (for array-valued fields)
// Fields not listed here are still stored on the record, just not indexed.
db.version(1).stores({
  projects: '++id, name, created_at',
  plots: '++id, project_id, status, created_at',
  trees: '++id, plot_id, species_code',
  understory: '++id, &plot_id', // unique: one understory record per plot
  photos: '++id, plot_id, direction',
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/**
 * Create a new project.
 * @param {object} data  Project fields (name, site_name, access_type, etc.)
 * @returns {Promise<number>} The new project's id.
 */
export async function createProject(data) {
  const now = new Date().toISOString();
  const project = {
    name: data.name,
    site_name: data.site_name || '',
    access_type: data.access_type || 'private',
    permit_ref: data.permit_ref || '',
    species_list_id: data.species_list_id || 'nc-piedmont',
    plot_radius_ft: data.plot_radius_ft ?? 37.2, // 1/10 acre default
    dbh_threshold_in: data.dbh_threshold_in ?? 5,
    notes: data.notes || '',
    created_at: now,
    updated_at: now,
  };
  return await db.projects.add(project);
}

/**
 * List all projects, ordered by most recently created first.
 */
export async function listProjects() {
  return await db.projects.orderBy('created_at').reverse().toArray();
}

/**
 * Get a single project by id.
 */
export async function getProject(id) {
  return await db.projects.get(id);
}

/**
 * Update a project's fields. Only the keys present in `updates` are changed.
 */
export async function updateProject(id, updates) {
  const next = { ...updates, updated_at: new Date().toISOString() };
  return await db.projects.update(id, next);
}

/**
 * Delete a project AND all of its plots, trees, understory, and photos.
 * This is a hard delete; there is no undo. Wrapped in a transaction so
 * partial failures roll back cleanly.
 */
export async function deleteProject(id) {
  return await db.transaction(
    'rw',
    [db.projects, db.plots, db.trees, db.understory, db.photos],
    async () => {
      const plots = await db.plots.where('project_id').equals(id).toArray();
      const plotIds = plots.map((p) => p.id);
      await db.trees.where('plot_id').anyOf(plotIds).delete();
      await db.understory.where('plot_id').anyOf(plotIds).delete();
      await db.photos.where('plot_id').anyOf(plotIds).delete();
      await db.plots.where('project_id').equals(id).delete();
      await db.projects.delete(id);
    }
  );
}

// ---------------------------------------------------------------------------
// Plots
// ---------------------------------------------------------------------------

/**
 * Create a new plot under a given project.
 * @param {number} projectId
 * @param {object} data  Plot fields (forest_type, slope_deg, aspect_deg, etc.)
 * @returns {Promise<number>} The new plot's id.
 */
export async function createPlot(projectId, data) {
  const now = new Date().toISOString();
  const plot = {
    project_id: projectId,
    // GPS
    lat: data.lat ?? null,
    lon: data.lon ?? null,
    gps_accuracy_m: data.gps_accuracy_m ?? null,
    gps_captured_at: data.gps_captured_at ?? null,
    // Site description
    forest_type: data.forest_type || '',
    slope_deg: data.slope_deg ?? null,
    aspect_deg: data.aspect_deg ?? null,
    topographic_position: data.topographic_position || '',
    disturbance_codes: data.disturbance_codes || [],
    notes: data.notes || '',
    // Workflow
    status: data.status || 'in_progress',
    created_at: now,
    updated_at: now,
    completed_at: null,
  };
  return await db.plots.add(plot);
}

/**
 * Get a single plot by id.
 */
export async function getPlot(id) {
  return await db.plots.get(id);
}

/**
 * Update a plot's fields. Only the keys present in `updates` are changed.
 */
export async function updatePlot(id, updates) {
  const next = { ...updates, updated_at: new Date().toISOString() };
  return await db.plots.update(id, next);
}

/**
 * Delete a plot AND all of its trees, understory, and photos.
 * Hard delete; no undo. Wrapped in a transaction.
 */
export async function deletePlot(id) {
  return await db.transaction(
    'rw',
    [db.plots, db.trees, db.understory, db.photos],
    async () => {
      await db.trees.where('plot_id').equals(id).delete();
      await db.understory.where('plot_id').equals(id).delete();
      await db.photos.where('plot_id').equals(id).delete();
      await db.plots.delete(id);
    }
  );
}

// ---------------------------------------------------------------------------
// Project-level aggregations
// ---------------------------------------------------------------------------

/**
 * Get all plots in a project together with their trees, in a single
 * efficient pass. Returns an array of plots, each with a `trees` array.
 *
 * Used by project-level rollup metrics.
 */
export async function getProjectPlotsWithTrees(projectId) {
  const plots = await db.plots.where('project_id').equals(projectId).toArray();
  if (plots.length === 0) return [];
  const plotIds = plots.map((p) => p.id);
  const allTrees = await db.trees.where('plot_id').anyOf(plotIds).toArray();
  // Group trees by plot_id
  const byPlot = new Map();
  for (const t of allTrees) {
    if (!byPlot.has(t.plot_id)) byPlot.set(t.plot_id, []);
    byPlot.get(t.plot_id).push(t);
  }
  for (const p of plots) {
    p.trees = byPlot.get(p.id) || [];
  }
  return plots;
}

/**
 * Total tree count across a project (across all plots).
 */
export async function getProjectTreeCount(projectId) {
  const plots = await db.plots.where('project_id').equals(projectId).toArray();
  if (plots.length === 0) return 0;
  const plotIds = plots.map((p) => p.id);
  return await db.trees.where('plot_id').anyOf(plotIds).count();
}

// ---------------------------------------------------------------------------
// Understory
// ---------------------------------------------------------------------------
//
// One understory record per plot (1:1, enforced by &plot_id unique index).
// Captures regeneration, shrub layer, herbaceous layer, and invasives.

/**
 * Insert or replace the understory record for a plot.
 */
export async function upsertUnderstory(plotId, data) {
  const existing = await db.understory.where('plot_id').equals(plotId).first();
  const record = {
    plot_id: plotId,
    regeneration_dominant: data.regeneration_dominant || '',
    regeneration_cover: data.regeneration_cover || '',
    shrub_dominant: data.shrub_dominant || '',
    shrub_cover: data.shrub_cover || '',
    herbaceous_dominant: data.herbaceous_dominant || '',
    herbaceous_cover: data.herbaceous_cover || '',
    invasive_present: !!data.invasive_present,
    invasive_species: data.invasive_species || '',
    notes: data.notes || '',
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    return await db.understory.update(existing.id, record);
  } else {
    record.created_at = record.updated_at;
    return await db.understory.add(record);
  }
}

export async function getUnderstoryForPlot(plotId) {
  return await db.understory.where('plot_id').equals(plotId).first();
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------
//
// Photos are stored as Blobs in IndexedDB. We store both a full-resolution
// Blob and a thumbnail Blob. The thumbnail is what's rendered in lists and
// future map views; the full-res is shown when the user taps to expand.
//
// Cardinal-direction photos (N/E/S/W) are first-class — Sam captures one
// in each direction at plot center. Additional photos can be added with
// captions.

/**
 * Add a photo to a plot.
 *
 * @param {number} plotId
 * @param {Blob} fullBlob       Original-resolution photo
 * @param {Blob} thumbBlob      Thumbnail generated at capture
 * @param {object} meta          { direction, caption, lat, lon }
 */
export async function addPhoto(plotId, fullBlob, thumbBlob, meta = {}) {
  const photo = {
    plot_id: plotId,
    blob: fullBlob,
    thumb: thumbBlob,
    direction: meta.direction || '',
    caption: meta.caption || '',
    lat: meta.lat ?? null,
    lon: meta.lon ?? null,
    captured_at: new Date().toISOString(),
  };
  return await db.photos.add(photo);
}

/**
 * List photos for a plot, in capture order.
 */
export async function listPhotosForPlot(plotId) {
  return await db.photos.where('plot_id').equals(plotId).sortBy('id');
}

/**
 * Get the count of photos in a plot.
 */
export async function getPhotoCount(plotId) {
  return await db.photos.where('plot_id').equals(plotId).count();
}

/**
 * Delete a photo by id.
 */
export async function deletePhoto(id) {
  return await db.photos.delete(id);
}

// ---------------------------------------------------------------------------
// Trees
// ---------------------------------------------------------------------------

/**
 * Create a new tree under a given plot.
 * @param {number} plotId
 * @param {object} data  Tree fields (species_code, dbh_in, etc.)
 * @returns {Promise<number>} The new tree's id.
 */
export async function createTree(plotId, data) {
  const tree = {
    plot_id: plotId,
    species_code: data.species_code,
    species_label: data.species_label || '', // denormalized for export convenience
    dbh_in: Number(data.dbh_in),
    height_class: data.height_class || '',
    height_ft: data.height_ft ? Number(data.height_ft) : null,
    crown_class: data.crown_class || '',
    condition: data.condition || '',
    notes: data.notes || '',
    created_at: new Date().toISOString(),
  };
  return await db.trees.add(tree);
}

/**
 * List all trees in a plot. Returns in insertion order (id ascending).
 */
export async function listTreesForPlot(plotId) {
  return await db.trees.where('plot_id').equals(plotId).sortBy('id');
}

/**
 * Delete a single tree.
 */
export async function deleteTree(id) {
  return await db.trees.delete(id);
}

/**
 * Get tree count for a plot.
 */
export async function getTreeCount(plotId) {
  return await db.trees.where('plot_id').equals(plotId).count();
}

// ---------------------------------------------------------------------------
// Other helpers used by future build steps
// ---------------------------------------------------------------------------

export async function listPlotsForProject(projectId) {
  return await db.plots.where('project_id').equals(projectId).toArray();
}

export async function getPlotCount(projectId) {
  return await db.plots.where('project_id').equals(projectId).count();
}

// ---------------------------------------------------------------------------
// Storage persistence
// ---------------------------------------------------------------------------

/**
 * Request that the browser treat this app's data as persistent (less likely
 * to be evicted under storage pressure). On most platforms this is granted
 * automatically once the user installs the app to their home screen.
 *
 * Returns true if persistence is granted, false otherwise. Never throws.
 */
export async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
