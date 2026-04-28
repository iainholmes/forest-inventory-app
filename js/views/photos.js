// Plot photos view.
//
// Captures and displays photos for a plot. The intended convention is:
//   - Four cardinal-direction photos at plot center (N, E, S, W)
//   - Optional additional photos with captions
//
// Each photo is stored as both a full-resolution Blob and a 300px
// thumbnail Blob. The thumbnail is what's rendered in the gallery and
// (later) in the cross-project map view; full-res is loaded only when
// the user taps to expand.

import {
  getPlot,
  getProject,
  listPhotosForPlot,
  addPhoto,
  deletePhoto,
} from '../db.js';

const DIRECTIONS = ['N', 'E', 'S', 'W'];

export async function renderPhotos(container, navigate, params) {
  const plotId = params?.plotId;
  if (!plotId) {
    container.innerHTML = '<p>No plot specified.</p>';
    return;
  }
  const plot = await getPlot(plotId);
  if (!plot) {
    container.innerHTML = '<p>Plot not found.</p>';
    return;
  }
  const project = await getProject(plot.project_id);

  const view = document.createElement('section');
  view.className = 'view view--detail';
  await renderInto(view);
  container.appendChild(view);

  async function renderInto(rootEl) {
    const photos = await listPhotosForPlot(plotId);
    const photosByDir = new Map();
    const additional = [];
    for (const p of photos) {
      if (DIRECTIONS.includes(p.direction)) {
        photosByDir.set(p.direction, p);
      } else {
        additional.push(p);
      }
    }

    // Build object URLs for thumbnails so we can render them
    // Keep references to revoke later
    const objectUrls = [];
    function thumbUrl(photo) {
      const url = URL.createObjectURL(photo.thumb || photo.blob);
      objectUrls.push(url);
      return url;
    }

    rootEl.innerHTML = `
      <header class="detail-header">
        <button class="btn btn--ghost" id="back-btn">&larr; Back to plot</button>
      </header>

      <div class="detail-title-block">
        <h2 class="detail-title">Photos</h2>
        <div class="detail-site">Plot ${plot.id} &middot; ${escapeHtml(project.name)}</div>
      </div>

      <!-- Cardinal directions -->
      <div class="detail-section">
        <h3 class="detail-section__title">Cardinal photos</h3>
        <p class="form-help">Standard convention: one photo facing each direction from plot center.</p>
        <div class="photo-grid photo-grid--cardinal">
          ${DIRECTIONS.map((dir) => {
            const photo = photosByDir.get(dir);
            return photo
              ? `<div class="photo-tile" data-photo-id="${photo.id}" data-direction="${dir}">
                  <img src="${thumbUrl(photo)}" alt="Photo facing ${dir}" />
                  <div class="photo-tile__label">${dir}</div>
                  <button class="photo-tile__delete" data-action="delete" data-photo-id="${photo.id}" aria-label="Delete photo">&times;</button>
                </div>`
              : `<label class="photo-tile photo-tile--empty">
                  <input type="file" accept="image/*" capture="environment"
                    data-direction="${dir}" data-action="capture" hidden />
                  <div class="photo-tile__plus">+</div>
                  <div class="photo-tile__label">${dir}</div>
                </label>`;
          }).join('')}
        </div>
      </div>

      <!-- Additional photos -->
      <div class="detail-section">
        <div class="detail-section__header">
          <h3 class="detail-section__title">
            Additional photos <span class="detail-section__count">${additional.length}</span>
          </h3>
          <label class="btn btn--secondary photo-add-btn">
            <input type="file" accept="image/*" capture="environment"
              data-direction="" data-action="capture" hidden />
            + Add photo
          </label>
        </div>
        ${additional.length > 0 ? `
          <div class="photo-grid">
            ${additional.map((p) => `
              <div class="photo-tile" data-photo-id="${p.id}">
                <img src="${thumbUrl(p)}" alt="${escapeAttr(p.caption || 'Photo')}" />
                ${p.caption ? `<div class="photo-tile__caption">${escapeHtml(p.caption)}</div>` : ''}
                <button class="photo-tile__delete" data-action="delete" data-photo-id="${p.id}" aria-label="Delete photo">&times;</button>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="detail-empty">
            <p>No additional photos. Tap <strong>+ Add photo</strong> to add one.</p>
          </div>
        `}
      </div>

      <!-- Status / progress -->
      <div class="form-error" id="photo-status" hidden></div>
    `;

    // Wire up handlers
    rootEl.querySelector('#back-btn').addEventListener('click', () => {
      // Revoke object URLs before unmounting
      for (const u of objectUrls) URL.revokeObjectURL(u);
      navigate('plot-detail', { id: plotId });
    });

    // Capture handlers (file input change events)
    for (const inp of rootEl.querySelectorAll('input[type="file"][data-action="capture"]')) {
      inp.addEventListener('change', async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        const direction = ev.target.dataset.direction || '';
        await handleCapture(file, direction, rootEl, objectUrls);
      });
    }

    // Delete handlers
    for (const btn of rootEl.querySelectorAll('button[data-action="delete"]')) {
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const photoId = Number(btn.dataset.photoId);
        const ok = window.confirm('Delete this photo?');
        if (!ok) return;
        await deletePhoto(photoId);
        for (const u of objectUrls) URL.revokeObjectURL(u);
        rootEl.innerHTML = '';
        await renderInto(rootEl);
      });
    }

    // Tap-to-expand (lightbox)
    for (const tile of rootEl.querySelectorAll('.photo-tile[data-photo-id]')) {
      tile.addEventListener('click', async (ev) => {
        if (ev.target.closest('button')) return; // ignore delete-button taps
        const photoId = Number(tile.dataset.photoId);
        const photos = await listPhotosForPlot(plotId);
        const photo = photos.find((p) => p.id === photoId);
        if (photo) openLightbox(photo);
      });
    }
  }

  async function handleCapture(file, direction, rootEl, objectUrls) {
    const status = rootEl.querySelector('#photo-status');
    status.textContent = 'Processing photo…';
    status.hidden = false;
    status.style.background = 'var(--color-surface-alt)';
    status.style.color = 'var(--color-ink-soft)';

    try {
      const fullBlob = file;
      const thumbBlob = await generateThumbnail(file, 300, 0.7);

      // For "additional" photos, prompt for caption
      let caption = '';
      if (!direction) {
        caption = window.prompt('Caption for this photo (optional):') || '';
      }

      await addPhoto(plotId, fullBlob, thumbBlob, {
        direction,
        caption,
        lat: plot.lat,
        lon: plot.lon,
      });

      // Re-render
      for (const u of objectUrls) URL.revokeObjectURL(u);
      rootEl.innerHTML = '';
      await renderInto(rootEl);
    } catch (err) {
      console.error('Photo capture failed:', err);
      status.textContent = `Could not save photo: ${err.message || 'unknown error'}.`;
      status.style.background = 'var(--color-error-bg)';
      status.style.color = 'var(--color-error)';
    }
  }
}

// ---------------------------------------------------------------------------
// Thumbnail generation
// ---------------------------------------------------------------------------

/**
 * Generate a thumbnail Blob from a source image File or Blob.
 *
 * Resizes to fit within `maxDim` x `maxDim` while preserving aspect ratio.
 * Uses Canvas with image-rendering smoothing.
 *
 * @param {Blob} source       Image File or Blob
 * @param {number} maxDim     Max width or height of thumbnail (px)
 * @param {number} quality    JPEG quality 0..1
 * @returns {Promise<Blob>}   Thumbnail blob (image/jpeg)
 */
async function generateThumbnail(source, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const scale = Math.min(maxDim / w, maxDim / h, 1);
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, tw, th);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error('Thumbnail generation returned no blob.'));
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnailing.'));
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function openLightbox(photo) {
  const url = URL.createObjectURL(photo.blob);
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.innerHTML = `
    <button class="lightbox__close" aria-label="Close">&times;</button>
    <img src="${url}" alt="${escapeAttr(photo.caption || photo.direction || 'Photo')}" />
    ${(photo.direction || photo.caption) ? `
      <div class="lightbox__caption">
        ${photo.direction ? `<strong>Facing ${photo.direction}</strong>` : ''}
        ${photo.caption ? ` — ${escapeHtml(photo.caption)}` : ''}
      </div>
    ` : ''}
  `;
  document.body.appendChild(overlay);

  function close() {
    URL.revokeObjectURL(url);
    overlay.remove();
  }
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay || ev.target.closest('.lightbox__close')) {
      close();
    }
  });
  document.addEventListener('keydown', function escListener(ev) {
    if (ev.key === 'Escape') {
      document.removeEventListener('keydown', escListener);
      close();
    }
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function escapeAttr(str) { return escapeHtml(str); }
