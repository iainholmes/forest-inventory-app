// GeoJSON export.
//
// Produces a GeoJSON FeatureCollection per project. Each plot contributes
// two features:
//   1. A Point at the plot center (lat/lon)
//   2. A Polygon approximating the circular plot boundary at the configured
//      radius
//
// Why both?
//   - Points are best for marker rendering in web maps (Leaflet, Mapbox)
//   - Polygons let GIS users see the actual area sampled, do area-based
//     spatial joins, etc.
//
// Properties on each feature include all plot metadata + computed metrics,
// so a recipient with QGIS can immediately style by tree count, BA/acre,
// dominant species, etc.

import {
  db,
  getProjectPlotsWithTrees,
} from '../db.js';
import { computePlotSummary } from '../compute/plot-metrics.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a GeoJSON FeatureCollection for one project.
 */
export async function buildGeoJson(projectId) {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error('Project not found.');
  const plotsWithTrees = await getProjectPlotsWithTrees(projectId);

  const features = [];
  for (const plot of plotsWithTrees) {
    if (plot.lat == null || plot.lon == null) continue; // skip plots without GPS
    const summary = computePlotSummary(plot.trees || [], project.plot_radius_ft);
    const props = buildPlotProperties(project, plot, summary);

    // Point feature
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [plot.lon, plot.lat], // GeoJSON: [longitude, latitude]
      },
      properties: { ...props, feature_kind: 'plot_center' },
    });

    // Polygon feature (circular approximation)
    const polygonRing = circlePolygon(
      plot.lat,
      plot.lon,
      project.plot_radius_ft
    );
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [polygonRing],
      },
      properties: { ...props, feature_kind: 'plot_area' },
    });
  }

  return {
    type: 'FeatureCollection',
    name: `forest-inventory-${slugify(project.name)}`,
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    metadata: {
      project_id: project.id,
      project_name: project.name,
      site_name: project.site_name || null,
      plot_radius_ft: project.plot_radius_ft,
      dbh_threshold_in: project.dbh_threshold_in,
      exported_at: new Date().toISOString(),
      plot_count: plotsWithTrees.length,
    },
    features,
  };
}

/**
 * Trigger a download of the GeoJSON file for a project.
 */
export async function downloadGeoJson(projectId) {
  const fc = await buildGeoJson(projectId);
  const json = JSON.stringify(fc, null, 2);
  const project = await db.projects.get(projectId);
  const filename = `forest-inventory-${slugify(project.name)}-${isoDate()}.geojson`;
  triggerDownload(json, filename, 'application/geo+json');
  return fc;
}

// ---------------------------------------------------------------------------
// Properties builder
// ---------------------------------------------------------------------------

function buildPlotProperties(project, plot, summary) {
  return {
    project_id: project.id,
    project_name: project.name,
    site_name: project.site_name || null,
    plot_id: plot.id,
    plot_number: plot.id,
    status: plot.status,
    forest_type: plot.forest_type || null,
    plot_radius_ft: project.plot_radius_ft,
    dbh_threshold_in: project.dbh_threshold_in,
    gps_accuracy_m: plot.gps_accuracy_m ?? null,
    slope_pct: plot.slope_pct ?? null,
    aspect_deg: plot.aspect_deg ?? null,
    topographic_position: plot.topographic_position || null,
    disturbance_codes: Array.isArray(plot.disturbance)
      ? plot.disturbance.join(';')
      : plot.disturbance || null,
    tree_count: summary.tree_count,
    tpa: round(summary.tpa, 2),
    ba_per_acre_sqft: round(summary.ba_per_acre, 2),
    qmd_in: round(summary.qmd_in, 2),
    dominant_species_code: summary.dominant_species?.species_code || null,
    dominant_species_label: summary.dominant_species?.species_label || null,
    created_at: plot.created_at || null,
  };
}

// ---------------------------------------------------------------------------
// Geodesy: approximate a circular plot on Earth's surface
// ---------------------------------------------------------------------------
//
// For small plots (radius << Earth radius), a flat-Earth approximation is
// fine. We convert plot radius from feet to meters, then to degrees of
// latitude/longitude separately (longitude degrees scale by cos(lat)).

const FT_TO_M = 0.3048;
const M_PER_DEG_LAT = 111_320; // close enough at all latitudes
const VERTICES = 36; // 36 vertices = ~10° per segment, smooth circle

function circlePolygon(lat, lon, radiusFt) {
  const radiusM = radiusFt * FT_TO_M;
  const dLat = radiusM / M_PER_DEG_LAT;
  const dLon = radiusM / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));

  const ring = [];
  for (let i = 0; i < VERTICES; i++) {
    const theta = (i / VERTICES) * 2 * Math.PI;
    const pointLat = lat + dLat * Math.sin(theta);
    const pointLon = lon + dLon * Math.cos(theta);
    ring.push([pointLon, pointLat]);
  }
  // Close the ring
  ring.push(ring[0]);
  return ring;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round(v, digits) {
  if (!Number.isFinite(v)) return null;
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

function isoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function triggerDownload(text, filename, mime) {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
