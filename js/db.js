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
// Plots, trees, understory, photos
// ---------------------------------------------------------------------------
//
// Read helpers we need now for the projects list view (showing plot counts
// per project). Full CRUD for plots/trees/understory/photos comes in
// later build steps.

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
