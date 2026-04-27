// Forest community types, organized by regional species list.
//
// These are the options Sam sees in the "Forest type" dropdown when
// establishing a plot. They reflect the dominant community types he's
// likely to encounter in each region. Not exhaustive — a senior ecologist
// would split these further (e.g. dry-mesic vs. mesic oak-hickory) —
// but a reasonable working set for entry-level forest assessment.
//
// References:
//   NC Piedmont: Schafale & Weakley (1990), "Classification of the Natural
//     Communities of North Carolina, Third Approximation," NC Natural
//     Heritage Program. Adapted; simplified for field use.
//   Southern Appalachian / Cumberland: Schafale (2012) and standard
//     Cumberland Plateau forestry typologies.

export const FOREST_TYPES = {
  'nc-piedmont': [
    { code: 'mesic-mixed-hardwood', label: 'Mesic mixed hardwood' },
    { code: 'dry-oak-hickory', label: 'Dry oak-hickory' },
    { code: 'dry-mesic-oak-hickory', label: 'Dry-mesic oak-hickory' },
    { code: 'bottomland-hardwood', label: 'Bottomland hardwood' },
    { code: 'mesic-slope-forest', label: 'Mesic slope forest' },
    { code: 'loblolly-pine', label: 'Loblolly pine (planted or natural)' },
    { code: 'mixed-pine-hardwood', label: 'Mixed pine-hardwood' },
    { code: 'early-successional', label: 'Early successional / old field' },
    { code: 'riparian', label: 'Riparian / streamside' },
    { code: 'other', label: 'Other / mixed' },
  ],
  'southern-appalachian': [
    { code: 'cove-hardwood', label: 'Cove hardwood' },
    { code: 'northern-hardwood', label: 'Northern hardwood' },
    { code: 'mesic-oak', label: 'Mesic oak forest' },
    { code: 'chestnut-oak-ridge', label: 'Chestnut oak ridge' },
    { code: 'dry-pine-oak', label: 'Dry pine-oak (Virginia / pitch / shortleaf)' },
    { code: 'hemlock', label: 'Hemlock forest' },
    { code: 'mixed-mesophytic', label: 'Mixed mesophytic (Cumberland)' },
    { code: 'bottomland-hardwood', label: 'Bottomland hardwood' },
    { code: 'rhododendron-thicket', label: 'Rhododendron / heath thicket' },
    { code: 'early-successional', label: 'Early successional / old field' },
    { code: 'other', label: 'Other / mixed' },
  ],
};

export function getForestTypeLabel(regionId, code) {
  const list = FOREST_TYPES[regionId] || FOREST_TYPES['nc-piedmont'];
  const entry = list.find((t) => t.code === code);
  return entry ? entry.label : code;
}

export const TOPOGRAPHIC_POSITIONS = [
  { code: 'ridge', label: 'Ridge top' },
  { code: 'upper-slope', label: 'Upper slope' },
  { code: 'mid-slope', label: 'Mid-slope' },
  { code: 'lower-slope', label: 'Lower slope' },
  { code: 'toe-slope', label: 'Toe-slope' },
  { code: 'bottomland', label: 'Bottomland / floodplain' },
  { code: 'flat', label: 'Flat / level' },
];

export const DISTURBANCE_CODES = [
  { code: 'timber-harvest', label: 'Recent timber harvest' },
  { code: 'fire', label: 'Fire (prescribed or wildfire)' },
  { code: 'windthrow', label: 'Windthrow / blowdown' },
  { code: 'pest-disease', label: 'Pest or disease damage' },
  { code: 'beaver', label: 'Beaver activity' },
  { code: 'human-other', label: 'Other human disturbance' },
  { code: 'none', label: 'None observed' },
];

export function getTopoLabel(code) {
  const t = TOPOGRAPHIC_POSITIONS.find((x) => x.code === code);
  return t ? t.label : code;
}

export function getDisturbanceLabel(code) {
  const d = DISTURBANCE_CODES.find((x) => x.code === code);
  return d ? d.label : code;
}
