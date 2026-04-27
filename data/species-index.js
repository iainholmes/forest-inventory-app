// Species reference data — index module.
//
// Looks up the appropriate species list by region and provides a search
// helper used by the tree-entry autocomplete.

import { NC_PIEDMONT_SPECIES } from './species-nc-piedmont.js';
import { SOUTHERN_APPALACHIAN_SPECIES } from './species-southern-appalachian.js';

const LISTS = {
  'nc-piedmont': NC_PIEDMONT_SPECIES,
  'southern-appalachian': SOUTHERN_APPALACHIAN_SPECIES,
};

export function getSpeciesList(regionId) {
  return LISTS[regionId] || NC_PIEDMONT_SPECIES;
}

/**
 * Look up a species entry by its code, searching across all regions
 * (so a tree entered against one region still resolves if the project
 * later switches lists).
 */
export function findSpeciesByCode(code) {
  for (const list of Object.values(LISTS)) {
    const hit = list.find((s) => s.code === code);
    if (hit) return hit;
  }
  return null;
}

/**
 * Search a species list by free text. Matches are scored against both
 * common and scientific names. Case-insensitive, prefix-preferred, then
 * substring. Returns up to `limit` results.
 *
 * Examples:
 *   "red m"   → "Red maple", "Red mulberry"
 *   "quer"    → all Quercus
 *   "loblolly"→ "Loblolly pine"
 */
export function searchSpecies(regionId, query, limit = 10) {
  const list = getSpeciesList(regionId);
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, limit);

  const scored = [];
  for (const sp of list) {
    const common = sp.common.toLowerCase();
    const sci = sp.scientific.toLowerCase();
    let score = 0;
    if (common.startsWith(q)) score = 100;
    else if (sci.startsWith(q)) score = 90;
    else if (common.includes(q)) score = 60;
    else if (sci.includes(q)) score = 50;
    // Token-prefix match (e.g. "red m" matches "red maple")
    else {
      const tokens = common.split(/\s+/);
      if (tokens.some((t) => t.startsWith(q))) score = 70;
    }
    if (score > 0) scored.push({ sp, score });
  }
  scored.sort((a, b) => b.score - a.score || a.sp.common.localeCompare(b.sp.common));
  return scored.slice(0, limit).map((s) => s.sp);
}
