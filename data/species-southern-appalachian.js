// Tree species reference list — Southern Appalachian / Cumberland Plateau.
//
// Covers dominant species in cove hardwood, mixed mesophytic, mesic oak,
// dry pine-oak ridge, northern hardwood, and Cumberland Plateau forest
// types. Substantial overlap with the Piedmont list but emphasizes
// species more characteristic of mountain elevations and the Plateau's
// distinct mesophytic flora.
//
// References: Schafale (2012), NC Natural Heritage Program; Braun (1950),
// "Deciduous Forests of Eastern North America"; standard Cumberland
// Plateau and Southern Appalachian dendrology references.

export const SOUTHERN_APPALACHIAN_SPECIES = [
  // Oaks
  { code: 'quercus-alba', common: 'White oak', scientific: 'Quercus alba', group: 'oak' },
  { code: 'quercus-rubra', common: 'Northern red oak', scientific: 'Quercus rubra', group: 'oak' },
  { code: 'quercus-velutina', common: 'Black oak', scientific: 'Quercus velutina', group: 'oak' },
  { code: 'quercus-coccinea', common: 'Scarlet oak', scientific: 'Quercus coccinea', group: 'oak' },
  { code: 'quercus-montana', common: 'Chestnut oak', scientific: 'Quercus montana', group: 'oak' },
  { code: 'quercus-falcata', common: 'Southern red oak', scientific: 'Quercus falcata', group: 'oak' },
  { code: 'quercus-imbricaria', common: 'Shingle oak', scientific: 'Quercus imbricaria', group: 'oak' },
  { code: 'quercus-marilandica', common: 'Blackjack oak', scientific: 'Quercus marilandica', group: 'oak' },
  { code: 'quercus-stellata', common: 'Post oak', scientific: 'Quercus stellata', group: 'oak' },
  { code: 'quercus-muehlenbergii', common: 'Chinkapin oak', scientific: 'Quercus muehlenbergii', group: 'oak' },

  // Hickories
  { code: 'carya-tomentosa', common: 'Mockernut hickory', scientific: 'Carya tomentosa', group: 'hickory' },
  { code: 'carya-glabra', common: 'Pignut hickory', scientific: 'Carya glabra', group: 'hickory' },
  { code: 'carya-ovata', common: 'Shagbark hickory', scientific: 'Carya ovata', group: 'hickory' },
  { code: 'carya-cordiformis', common: 'Bitternut hickory', scientific: 'Carya cordiformis', group: 'hickory' },
  { code: 'carya-laciniosa', common: 'Shellbark hickory', scientific: 'Carya laciniosa', group: 'hickory' },
  { code: 'carya-ovalis', common: 'Red hickory', scientific: 'Carya ovalis', group: 'hickory' },

  // Pines (mountain emphasis)
  { code: 'pinus-strobus', common: 'Eastern white pine', scientific: 'Pinus strobus', group: 'pine' },
  { code: 'pinus-rigida', common: 'Pitch pine', scientific: 'Pinus rigida', group: 'pine' },
  { code: 'pinus-virginiana', common: 'Virginia pine', scientific: 'Pinus virginiana', group: 'pine' },
  { code: 'pinus-echinata', common: 'Shortleaf pine', scientific: 'Pinus echinata', group: 'pine' },
  { code: 'pinus-pungens', common: 'Table mountain pine', scientific: 'Pinus pungens', group: 'pine' },

  // Other conifers
  { code: 'tsuga-canadensis', common: 'Eastern hemlock', scientific: 'Tsuga canadensis', group: 'softwood' },
  { code: 'tsuga-caroliniana', common: 'Carolina hemlock', scientific: 'Tsuga caroliniana', group: 'softwood' },
  { code: 'picea-rubens', common: 'Red spruce', scientific: 'Picea rubens', group: 'softwood' },
  { code: 'abies-fraseri', common: 'Fraser fir', scientific: 'Abies fraseri', group: 'softwood' },
  { code: 'juniperus-virginiana', common: 'Eastern red cedar', scientific: 'Juniperus virginiana', group: 'softwood' },

  // Maples (mountain emphasis)
  { code: 'acer-saccharum', common: 'Sugar maple', scientific: 'Acer saccharum', group: 'maple' },
  { code: 'acer-rubrum', common: 'Red maple', scientific: 'Acer rubrum', group: 'maple' },
  { code: 'acer-pensylvanicum', common: 'Striped maple', scientific: 'Acer pensylvanicum', group: 'maple' },
  { code: 'acer-spicatum', common: 'Mountain maple', scientific: 'Acer spicatum', group: 'maple' },
  { code: 'acer-saccharinum', common: 'Silver maple', scientific: 'Acer saccharinum', group: 'maple' },
  { code: 'acer-negundo', common: 'Boxelder', scientific: 'Acer negundo', group: 'maple' },

  // Cove hardwoods — mixed mesophytic core
  { code: 'liriodendron-tulipifera', common: 'Tulip poplar', scientific: 'Liriodendron tulipifera', group: 'hardwood' },
  { code: 'fagus-grandifolia', common: 'American beech', scientific: 'Fagus grandifolia', group: 'hardwood' },
  { code: 'tilia-americana', common: 'American basswood', scientific: 'Tilia americana', group: 'hardwood' },
  { code: 'tilia-heterophylla', common: 'White basswood', scientific: 'Tilia heterophylla', group: 'hardwood' },
  { code: 'aesculus-flava', common: 'Yellow buckeye', scientific: 'Aesculus flava', group: 'hardwood' },
  { code: 'magnolia-acuminata', common: 'Cucumber tree', scientific: 'Magnolia acuminata', group: 'hardwood' },
  { code: 'magnolia-fraseri', common: 'Fraser magnolia', scientific: 'Magnolia fraseri', group: 'hardwood' },
  { code: 'magnolia-tripetala', common: 'Umbrella magnolia', scientific: 'Magnolia tripetala', group: 'hardwood' },

  // Northern hardwoods
  { code: 'betula-alleghaniensis', common: 'Yellow birch', scientific: 'Betula alleghaniensis', group: 'hardwood' },
  { code: 'betula-lenta', common: 'Sweet birch', scientific: 'Betula lenta', group: 'hardwood' },
  { code: 'betula-nigra', common: 'River birch', scientific: 'Betula nigra', group: 'hardwood' },
  { code: 'prunus-serotina', common: 'Black cherry', scientific: 'Prunus serotina', group: 'hardwood' },
  { code: 'fraxinus-americana', common: 'White ash', scientific: 'Fraxinus americana', group: 'hardwood' },
  { code: 'fraxinus-pennsylvanica', common: 'Green ash', scientific: 'Fraxinus pennsylvanica', group: 'hardwood' },

  // Riparian and bottomland
  { code: 'platanus-occidentalis', common: 'American sycamore', scientific: 'Platanus occidentalis', group: 'hardwood' },
  { code: 'salix-nigra', common: 'Black willow', scientific: 'Salix nigra', group: 'hardwood' },
  { code: 'alnus-serrulata', common: 'Hazel alder', scientific: 'Alnus serrulata', group: 'hardwood' },
  { code: 'populus-deltoides', common: 'Eastern cottonwood', scientific: 'Populus deltoides', group: 'hardwood' },
  { code: 'populus-grandidentata', common: 'Bigtooth aspen', scientific: 'Populus grandidentata', group: 'hardwood' },
  { code: 'nyssa-sylvatica', common: 'Black gum', scientific: 'Nyssa sylvatica', group: 'hardwood' },

  // Other major hardwoods
  { code: 'liquidambar-styraciflua', common: 'Sweetgum', scientific: 'Liquidambar styraciflua', group: 'hardwood' },
  { code: 'sassafras-albidum', common: 'Sassafras', scientific: 'Sassafras albidum', group: 'hardwood' },
  { code: 'oxydendrum-arboreum', common: 'Sourwood', scientific: 'Oxydendrum arboreum', group: 'hardwood' },
  { code: 'cornus-florida', common: 'Flowering dogwood', scientific: 'Cornus florida', group: 'hardwood' },
  { code: 'cornus-alternifolia', common: 'Alternate-leaf dogwood', scientific: 'Cornus alternifolia', group: 'hardwood' },
  { code: 'ostrya-virginiana', common: 'Eastern hophornbeam', scientific: 'Ostrya virginiana', group: 'hardwood' },
  { code: 'carpinus-caroliniana', common: 'American hornbeam', scientific: 'Carpinus caroliniana', group: 'hardwood' },
  { code: 'cercis-canadensis', common: 'Eastern redbud', scientific: 'Cercis canadensis', group: 'hardwood' },
  { code: 'ilex-opaca', common: 'American holly', scientific: 'Ilex opaca', group: 'hardwood' },
  { code: 'ulmus-americana', common: 'American elm', scientific: 'Ulmus americana', group: 'hardwood' },
  { code: 'ulmus-rubra', common: 'Slippery elm', scientific: 'Ulmus rubra', group: 'hardwood' },
  { code: 'ulmus-alata', common: 'Winged elm', scientific: 'Ulmus alata', group: 'hardwood' },
  { code: 'celtis-occidentalis', common: 'Hackberry', scientific: 'Celtis occidentalis', group: 'hardwood' },
  { code: 'juglans-nigra', common: 'Black walnut', scientific: 'Juglans nigra', group: 'hardwood' },
  { code: 'juglans-cinerea', common: 'Butternut', scientific: 'Juglans cinerea', group: 'hardwood' },

  // Cumberland Plateau distinctive species
  { code: 'castanea-dentata', common: 'American chestnut', scientific: 'Castanea dentata', group: 'hardwood' },
  { code: 'castanea-pumila', common: 'Allegheny chinkapin', scientific: 'Castanea pumila', group: 'hardwood' },
  { code: 'asimina-triloba', common: 'Pawpaw', scientific: 'Asimina triloba', group: 'hardwood' },
  { code: 'halesia-tetraptera', common: 'Carolina silverbell', scientific: 'Halesia tetraptera', group: 'hardwood' },
  { code: 'halesia-monticola', common: 'Mountain silverbell', scientific: 'Halesia monticola', group: 'hardwood' },
  { code: 'cladrastis-kentukea', common: 'Yellowwood', scientific: 'Cladrastis kentukea', group: 'hardwood' },
  { code: 'gymnocladus-dioicus', common: 'Kentucky coffeetree', scientific: 'Gymnocladus dioicus', group: 'hardwood' },
  { code: 'aesculus-octandra', common: 'Sweet buckeye', scientific: 'Aesculus octandra', group: 'hardwood' },
  { code: 'amelanchier-arborea', common: 'Downy serviceberry', scientific: 'Amelanchier arborea', group: 'hardwood' },
  { code: 'amelanchier-laevis', common: 'Allegheny serviceberry', scientific: 'Amelanchier laevis', group: 'hardwood' },

  // Locusts and mulberries
  { code: 'robinia-pseudoacacia', common: 'Black locust', scientific: 'Robinia pseudoacacia', group: 'hardwood' },
  { code: 'gleditsia-triacanthos', common: 'Honey locust', scientific: 'Gleditsia triacanthos', group: 'hardwood' },
  { code: 'morus-rubra', common: 'Red mulberry', scientific: 'Morus rubra', group: 'hardwood' },

  // Persimmon
  { code: 'diospyros-virginiana', common: 'Persimmon', scientific: 'Diospyros virginiana', group: 'hardwood' },

  // Heath family — important understory at canopy size on Plateau
  { code: 'kalmia-latifolia', common: 'Mountain laurel', scientific: 'Kalmia latifolia', group: 'shrub' },
  { code: 'rhododendron-maximum', common: 'Rosebay rhododendron', scientific: 'Rhododendron maximum', group: 'shrub' },
  { code: 'rhododendron-catawbiense', common: 'Catawba rhododendron', scientific: 'Rhododendron catawbiense', group: 'shrub' },
  { code: 'vaccinium-arboreum', common: 'Sparkleberry', scientific: 'Vaccinium arboreum', group: 'shrub' },

  // Less common but encountered
  { code: 'crataegus-spp', common: 'Hawthorn (genus)', scientific: 'Crataegus spp.', group: 'hardwood' },
  { code: 'malus-coronaria', common: 'Sweet crabapple', scientific: 'Malus coronaria', group: 'hardwood' },
  { code: 'malus-angustifolia', common: 'Southern crabapple', scientific: 'Malus angustifolia', group: 'hardwood' },
  { code: 'aralia-spinosa', common: 'Devil\u2019s walking stick', scientific: 'Aralia spinosa', group: 'hardwood' },

  // Non-native escapes
  { code: 'ailanthus-altissima', common: 'Tree of heaven (non-native)', scientific: 'Ailanthus altissima', group: 'invasive' },
  { code: 'paulownia-tomentosa', common: 'Princess tree (non-native)', scientific: 'Paulownia tomentosa', group: 'invasive' },
  { code: 'albizia-julibrissin', common: 'Mimosa (non-native)', scientific: 'Albizia julibrissin', group: 'invasive' },
  { code: 'pyrus-calleryana', common: 'Callery pear (non-native)', scientific: 'Pyrus calleryana', group: 'invasive' },
  { code: 'ligustrum-sinense', common: 'Chinese privet (non-native)', scientific: 'Ligustrum sinense', group: 'invasive' },

  // Catch-all
  { code: 'unknown-hardwood', common: 'Unknown hardwood', scientific: '—', group: 'unknown' },
  { code: 'unknown-conifer', common: 'Unknown conifer', scientific: '—', group: 'unknown' },
  { code: 'unknown', common: 'Unknown / unidentified', scientific: '—', group: 'unknown' },
];
