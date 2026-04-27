// Tree species reference list — North Carolina Piedmont.
//
// Covers the dominant and frequent tree species encountered in mixed
// hardwood, oak-hickory, mesic slope, bottomland, and pine-hardwood
// communities across the Piedmont physiographic province.
//
// Source basis: Radford, Ahles & Bell, "Manual of the Vascular Flora of
// the Carolinas" (1968); cross-checked against NC Natural Heritage
// Program community classifications and standard NC dendrology references.
// Common names follow USDA PLANTS database where they differ from regional
// usage.
//
// Each entry has:
//   code         stable machine identifier (kebab-case Latin name)
//   common       common name (sentence case)
//   scientific   binomial in italics-friendly form
//   group        loose grouping for filtering (oak, hickory, pine, etc.)
//
// Sam can override per-tree if he encounters a species not on this list.

export const NC_PIEDMONT_SPECIES = [
  // Oaks
  { code: 'quercus-alba', common: 'White oak', scientific: 'Quercus alba', group: 'oak' },
  { code: 'quercus-rubra', common: 'Northern red oak', scientific: 'Quercus rubra', group: 'oak' },
  { code: 'quercus-velutina', common: 'Black oak', scientific: 'Quercus velutina', group: 'oak' },
  { code: 'quercus-falcata', common: 'Southern red oak', scientific: 'Quercus falcata', group: 'oak' },
  { code: 'quercus-coccinea', common: 'Scarlet oak', scientific: 'Quercus coccinea', group: 'oak' },
  { code: 'quercus-stellata', common: 'Post oak', scientific: 'Quercus stellata', group: 'oak' },
  { code: 'quercus-marilandica', common: 'Blackjack oak', scientific: 'Quercus marilandica', group: 'oak' },
  { code: 'quercus-phellos', common: 'Willow oak', scientific: 'Quercus phellos', group: 'oak' },
  { code: 'quercus-nigra', common: 'Water oak', scientific: 'Quercus nigra', group: 'oak' },
  { code: 'quercus-michauxii', common: 'Swamp chestnut oak', scientific: 'Quercus michauxii', group: 'oak' },
  { code: 'quercus-montana', common: 'Chestnut oak', scientific: 'Quercus montana', group: 'oak' },
  { code: 'quercus-pagoda', common: 'Cherrybark oak', scientific: 'Quercus pagoda', group: 'oak' },
  { code: 'quercus-shumardii', common: 'Shumard oak', scientific: 'Quercus shumardii', group: 'oak' },
  { code: 'quercus-lyrata', common: 'Overcup oak', scientific: 'Quercus lyrata', group: 'oak' },

  // Hickories
  { code: 'carya-tomentosa', common: 'Mockernut hickory', scientific: 'Carya tomentosa', group: 'hickory' },
  { code: 'carya-glabra', common: 'Pignut hickory', scientific: 'Carya glabra', group: 'hickory' },
  { code: 'carya-ovata', common: 'Shagbark hickory', scientific: 'Carya ovata', group: 'hickory' },
  { code: 'carya-cordiformis', common: 'Bitternut hickory', scientific: 'Carya cordiformis', group: 'hickory' },
  { code: 'carya-pallida', common: 'Sand hickory', scientific: 'Carya pallida', group: 'hickory' },
  { code: 'carya-ovalis', common: 'Red hickory', scientific: 'Carya ovalis', group: 'hickory' },

  // Pines
  { code: 'pinus-taeda', common: 'Loblolly pine', scientific: 'Pinus taeda', group: 'pine' },
  { code: 'pinus-echinata', common: 'Shortleaf pine', scientific: 'Pinus echinata', group: 'pine' },
  { code: 'pinus-virginiana', common: 'Virginia pine', scientific: 'Pinus virginiana', group: 'pine' },
  { code: 'pinus-strobus', common: 'Eastern white pine', scientific: 'Pinus strobus', group: 'pine' },
  { code: 'pinus-rigida', common: 'Pitch pine', scientific: 'Pinus rigida', group: 'pine' },
  { code: 'pinus-palustris', common: 'Longleaf pine', scientific: 'Pinus palustris', group: 'pine' },

  // Maples
  { code: 'acer-rubrum', common: 'Red maple', scientific: 'Acer rubrum', group: 'maple' },
  { code: 'acer-saccharum', common: 'Sugar maple', scientific: 'Acer saccharum', group: 'maple' },
  { code: 'acer-floridanum', common: 'Southern sugar maple', scientific: 'Acer floridanum', group: 'maple' },
  { code: 'acer-negundo', common: 'Boxelder', scientific: 'Acer negundo', group: 'maple' },
  { code: 'acer-saccharinum', common: 'Silver maple', scientific: 'Acer saccharinum', group: 'maple' },
  { code: 'acer-leucoderme', common: 'Chalk maple', scientific: 'Acer leucoderme', group: 'maple' },

  // Other major hardwoods
  { code: 'liriodendron-tulipifera', common: 'Tulip poplar', scientific: 'Liriodendron tulipifera', group: 'hardwood' },
  { code: 'liquidambar-styraciflua', common: 'Sweetgum', scientific: 'Liquidambar styraciflua', group: 'hardwood' },
  { code: 'fagus-grandifolia', common: 'American beech', scientific: 'Fagus grandifolia', group: 'hardwood' },
  { code: 'platanus-occidentalis', common: 'American sycamore', scientific: 'Platanus occidentalis', group: 'hardwood' },
  { code: 'fraxinus-americana', common: 'White ash', scientific: 'Fraxinus americana', group: 'hardwood' },
  { code: 'fraxinus-pennsylvanica', common: 'Green ash', scientific: 'Fraxinus pennsylvanica', group: 'hardwood' },
  { code: 'nyssa-sylvatica', common: 'Black gum', scientific: 'Nyssa sylvatica', group: 'hardwood' },
  { code: 'nyssa-aquatica', common: 'Water tupelo', scientific: 'Nyssa aquatica', group: 'hardwood' },
  { code: 'ulmus-americana', common: 'American elm', scientific: 'Ulmus americana', group: 'hardwood' },
  { code: 'ulmus-rubra', common: 'Slippery elm', scientific: 'Ulmus rubra', group: 'hardwood' },
  { code: 'ulmus-alata', common: 'Winged elm', scientific: 'Ulmus alata', group: 'hardwood' },
  { code: 'celtis-occidentalis', common: 'Hackberry', scientific: 'Celtis occidentalis', group: 'hardwood' },
  { code: 'celtis-laevigata', common: 'Sugarberry', scientific: 'Celtis laevigata', group: 'hardwood' },
  { code: 'tilia-americana', common: 'Basswood', scientific: 'Tilia americana', group: 'hardwood' },
  { code: 'aesculus-flava', common: 'Yellow buckeye', scientific: 'Aesculus flava', group: 'hardwood' },
  { code: 'magnolia-virginiana', common: 'Sweet bay magnolia', scientific: 'Magnolia virginiana', group: 'hardwood' },
  { code: 'magnolia-grandiflora', common: 'Southern magnolia', scientific: 'Magnolia grandiflora', group: 'hardwood' },
  { code: 'magnolia-acuminata', common: 'Cucumber tree', scientific: 'Magnolia acuminata', group: 'hardwood' },
  { code: 'sassafras-albidum', common: 'Sassafras', scientific: 'Sassafras albidum', group: 'hardwood' },
  { code: 'oxydendrum-arboreum', common: 'Sourwood', scientific: 'Oxydendrum arboreum', group: 'hardwood' },
  { code: 'cercis-canadensis', common: 'Eastern redbud', scientific: 'Cercis canadensis', group: 'hardwood' },
  { code: 'cornus-florida', common: 'Flowering dogwood', scientific: 'Cornus florida', group: 'hardwood' },
  { code: 'ostrya-virginiana', common: 'Eastern hophornbeam', scientific: 'Ostrya virginiana', group: 'hardwood' },
  { code: 'carpinus-caroliniana', common: 'American hornbeam', scientific: 'Carpinus caroliniana', group: 'hardwood' },
  { code: 'ilex-opaca', common: 'American holly', scientific: 'Ilex opaca', group: 'hardwood' },
  { code: 'ilex-decidua', common: 'Possumhaw', scientific: 'Ilex decidua', group: 'hardwood' },

  // Birch and other riparian
  { code: 'betula-nigra', common: 'River birch', scientific: 'Betula nigra', group: 'hardwood' },
  { code: 'betula-lenta', common: 'Sweet birch', scientific: 'Betula lenta', group: 'hardwood' },
  { code: 'betula-alleghaniensis', common: 'Yellow birch', scientific: 'Betula alleghaniensis', group: 'hardwood' },
  { code: 'alnus-serrulata', common: 'Hazel alder', scientific: 'Alnus serrulata', group: 'hardwood' },
  { code: 'salix-nigra', common: 'Black willow', scientific: 'Salix nigra', group: 'hardwood' },
  { code: 'populus-deltoides', common: 'Eastern cottonwood', scientific: 'Populus deltoides', group: 'hardwood' },
  { code: 'populus-grandidentata', common: 'Bigtooth aspen', scientific: 'Populus grandidentata', group: 'hardwood' },

  // Fruit / Rosaceae
  { code: 'prunus-serotina', common: 'Black cherry', scientific: 'Prunus serotina', group: 'hardwood' },
  { code: 'prunus-pensylvanica', common: 'Pin cherry', scientific: 'Prunus pensylvanica', group: 'hardwood' },
  { code: 'malus-coronaria', common: 'Sweet crabapple', scientific: 'Malus coronaria', group: 'hardwood' },
  { code: 'amelanchier-arborea', common: 'Downy serviceberry', scientific: 'Amelanchier arborea', group: 'hardwood' },
  { code: 'crataegus-spp', common: 'Hawthorn (genus)', scientific: 'Crataegus spp.', group: 'hardwood' },

  // Walnut family
  { code: 'juglans-nigra', common: 'Black walnut', scientific: 'Juglans nigra', group: 'hardwood' },
  { code: 'juglans-cinerea', common: 'Butternut', scientific: 'Juglans cinerea', group: 'hardwood' },

  // Cypress and other softwoods
  { code: 'taxodium-distichum', common: 'Bald cypress', scientific: 'Taxodium distichum', group: 'softwood' },
  { code: 'juniperus-virginiana', common: 'Eastern red cedar', scientific: 'Juniperus virginiana', group: 'softwood' },
  { code: 'tsuga-canadensis', common: 'Eastern hemlock', scientific: 'Tsuga canadensis', group: 'softwood' },

  // Persimmon, locust, mulberry
  { code: 'diospyros-virginiana', common: 'Persimmon', scientific: 'Diospyros virginiana', group: 'hardwood' },
  { code: 'robinia-pseudoacacia', common: 'Black locust', scientific: 'Robinia pseudoacacia', group: 'hardwood' },
  { code: 'gleditsia-triacanthos', common: 'Honey locust', scientific: 'Gleditsia triacanthos', group: 'hardwood' },
  { code: 'morus-rubra', common: 'Red mulberry', scientific: 'Morus rubra', group: 'hardwood' },
  { code: 'morus-alba', common: 'White mulberry (non-native)', scientific: 'Morus alba', group: 'hardwood' },

  // Ericaceae shrubs reaching tree size
  { code: 'kalmia-latifolia', common: 'Mountain laurel', scientific: 'Kalmia latifolia', group: 'shrub' },
  { code: 'rhododendron-maximum', common: 'Rosebay rhododendron', scientific: 'Rhododendron maximum', group: 'shrub' },
  { code: 'vaccinium-arboreum', common: 'Sparkleberry', scientific: 'Vaccinium arboreum', group: 'shrub' },

  // Misc native
  { code: 'castanea-dentata', common: 'American chestnut', scientific: 'Castanea dentata', group: 'hardwood' },
  { code: 'castanea-pumila', common: 'Allegheny chinkapin', scientific: 'Castanea pumila', group: 'hardwood' },
  { code: 'asimina-triloba', common: 'Pawpaw', scientific: 'Asimina triloba', group: 'hardwood' },
  { code: 'halesia-tetraptera', common: 'Carolina silverbell', scientific: 'Halesia tetraptera', group: 'hardwood' },
  { code: 'tilia-heterophylla', common: 'White basswood', scientific: 'Tilia heterophylla', group: 'hardwood' },

  // Non-native escapes commonly encountered
  { code: 'ailanthus-altissima', common: 'Tree of heaven (non-native)', scientific: 'Ailanthus altissima', group: 'invasive' },
  { code: 'paulownia-tomentosa', common: 'Princess tree (non-native)', scientific: 'Paulownia tomentosa', group: 'invasive' },
  { code: 'albizia-julibrissin', common: 'Mimosa (non-native)', scientific: 'Albizia julibrissin', group: 'invasive' },
  { code: 'melia-azedarach', common: 'Chinaberry (non-native)', scientific: 'Melia azedarach', group: 'invasive' },
  { code: 'broussonetia-papyrifera', common: 'Paper mulberry (non-native)', scientific: 'Broussonetia papyrifera', group: 'invasive' },
  { code: 'pyrus-calleryana', common: 'Callery pear (non-native)', scientific: 'Pyrus calleryana', group: 'invasive' },
  { code: 'ligustrum-sinense', common: 'Chinese privet (non-native)', scientific: 'Ligustrum sinense', group: 'invasive' },

  // Sentinel species at lower frequency but encountered in Piedmont
  { code: 'aralia-spinosa', common: 'Devil\u2019s walking stick', scientific: 'Aralia spinosa', group: 'hardwood' },
  { code: 'gymnocladus-dioicus', common: 'Kentucky coffeetree', scientific: 'Gymnocladus dioicus', group: 'hardwood' },
  { code: 'catalpa-bignonioides', common: 'Southern catalpa', scientific: 'Catalpa bignonioides', group: 'hardwood' },
  { code: 'cladrastis-kentukea', common: 'Yellowwood', scientific: 'Cladrastis kentukea', group: 'hardwood' },
  { code: 'cotinus-obovatus', common: 'American smoketree', scientific: 'Cotinus obovatus', group: 'hardwood' },

  // Catch-all for unknowns at tree-entry time
  { code: 'unknown-hardwood', common: 'Unknown hardwood', scientific: '—', group: 'unknown' },
  { code: 'unknown-conifer', common: 'Unknown conifer', scientific: '—', group: 'unknown' },
  { code: 'unknown', common: 'Unknown / unidentified', scientific: '—', group: 'unknown' },
];
