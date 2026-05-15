import { app } from "./firebase-init.js";
import { initThemeToggle } from "./theme-toggle.js";

void app;

function params() {
  return new URLSearchParams(window.location.search);
}

const PLAYGROUND_DRAG_THRESHOLD = 10;

/**
 * @param {string} key
 */
function loadPlaygroundPositions(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return typeof o === "object" && o ? o : {};
  } catch {
    return {};
  }
}

/**
 * @param {string} key
 * @param {string} id
 * @param {number} leftPct
 * @param {number} topPct
 */
function savePlaygroundPosition(key, id, leftPct, topPct) {
  const all = loadPlaygroundPositions(key);
  all[id] = { leftPct, topPct };
  localStorage.setItem(key, JSON.stringify(all));
}

/**
 * @param {HTMLElement} el
 * @param {{ id: string, defaultPosition?: { leftPct?: number, topPct?: number } }} item
 * @param {{ width: number, height: number }} stageSize
 * @param {string} storageKey
 */
function placePlaygroundElement(el, item, stageSize, storageKey) {
  const saved = loadPlaygroundPositions(storageKey)[item.id];
  const leftPct = saved?.leftPct ?? item.defaultPosition?.leftPct ?? 50;
  const topPct = saved?.topPct ?? item.defaultPosition?.topPct ?? 50;
  const w = el.offsetWidth || 120;
  const h = el.offsetHeight || 120;
  const left = (leftPct / 100) * stageSize.width - w / 2;
  const top = (topPct / 100) * stageSize.height - h / 2;
  el.style.left = `${Math.round(Math.max(0, Math.min(stageSize.width - w, left)))}px`;
  el.style.top = `${Math.round(Math.max(0, Math.min(stageSize.height - h, top)))}px`;
}

/**
 * @param {HTMLElement} el
 * @param {{ id: string, defaultPosition?: { leftPct?: number, topPct?: number } }} item
 * @param {HTMLElement} stage
 * @param {string} storageKey
 * @param {() => void} onTap
 */
function attachPlaygroundDrag(el, item, stage, storageKey, onTap) {
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let dragging = false;
  let moved = false;

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    originLeft = el.offsetLeft;
    originTop = el.offsetTop;
    el.classList.add("is-dragging");
    el.style.zIndex = "30";
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > PLAYGROUND_DRAG_THRESHOLD) moved = true;

    const rect = stage.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const nextL = originLeft + dx;
    const nextT = originTop + dy;
    const maxL = rect.width - w;
    const maxT = rect.height - h;
    el.style.left = `${Math.round(Math.max(0, Math.min(maxL, nextL)))}px`;
    el.style.top = `${Math.round(Math.max(0, Math.min(maxT, nextT)))}px`;
  };

  const finish = (e) => {
    if (!dragging) return;
    dragging = false;
    try {
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    el.classList.remove("is-dragging");
    el.style.zIndex = "";

    const rect = stage.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const leftPct = ((el.offsetLeft + w / 2) / rect.width) * 100;
    const topPct = ((el.offsetTop + h / 2) / rect.height) * 100;
    savePlaygroundPosition(storageKey, item.id, leftPct, topPct);

    if (!moved) onTap();
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", finish);
  el.addEventListener("pointercancel", finish);

  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTap();
    }
  });
}

/**
 * @param {string} src
 * @param {string} title
 */
function openVideoDialog(src, title) {
  const dialog = document.createElement("dialog");
  dialog.className = "work-video-dialog";
  const viewport = document.createElement("div");
  viewport.className = "work-video-dialog__viewport";
  const vid = document.createElement("video");
  vid.src = src;
  vid.controls = true;
  vid.playsInline = true;
  vid.setAttribute("aria-label", title || "Video");
  const bar = document.createElement("div");
  bar.className = "work-video-dialog__bar";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "work-video-dialog__close";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => dialog.close());
  bar.appendChild(closeBtn);
  viewport.appendChild(vid);
  dialog.appendChild(viewport);
  dialog.appendChild(bar);
  document.body.appendChild(dialog);
  dialog.addEventListener("close", () => {
    vid.pause();
    vid.removeAttribute("src");
    vid.load();
    dialog.remove();
  });
  dialog.addEventListener("cancel", (ev) => {
    ev.preventDefault();
    dialog.close();
  });
  dialog.showModal();
  queueMicrotask(() => closeBtn.focus());
}

/**
 * @param {object} project
 * @param {HTMLElement} bodyEl
 * @param {HTMLElement} mediaEl
 */
function initSideQuestsPlayground(project, bodyEl, mediaEl) {
  const pg = /** @type {{ items?: unknown[], storageKey?: string }} */ (
    project.playground
  );
  const items = Array.isArray(pg?.items) ? pg.items : [];
  const storageKey =
    typeof pg?.storageKey === "string" && pg.storageKey
      ? pg.storageKey
      : "gals-portfolio-side-quests-positions-v1";

  const stage = document.getElementById("side-quests-stage");
  if (!stage) return;

  mediaEl.replaceChildren();
  mediaEl.hidden = true;

  bodyEl.replaceChildren();
  for (const para of project.body || []) {
    const p = document.createElement("p");
    p.textContent = para;
    bodyEl.appendChild(p);
  }

  stage.replaceChildren();
  stage.hidden = false;
  stage.removeAttribute("aria-hidden");

  const layout = () => {
    const rect = stage.getBoundingClientRect();
    const size = { width: rect.width, height: rect.height };
    for (const raw of items) {
      const item = /** @type {{ id: string, src?: string, label?: string, kind?: string, defaultPosition?: { leftPct?: number, topPct?: number } }} */ (
        raw
      );
      if (!item?.id) continue;
      const el = stage.querySelector(`[data-sq-id="${CSS.escape(item.id)}"]`);
      if (el instanceof HTMLElement) {
        placePlaygroundElement(el, item, size, storageKey);
      }
    }
  };

  for (const raw of items) {
    const item = /** @type {{ id: string, src?: string, poster?: string, label?: string, kind?: string, defaultPosition?: { leftPct?: number, topPct?: number } }} */ (
      raw
    );
    if (!item?.id || !item.src) continue;
    const kind = item.kind === "video" ? "video" : "image";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sq-shape";
    if (kind === "video") btn.classList.add("sq-shape--video");
    btn.dataset.sqId = item.id;
    const label = (item.label || item.id).replace(/\n/g, " ").trim();
    btn.setAttribute("aria-label", `Side quest: ${label}`);
    btn.setAttribute("tabindex", "0");

    if (kind === "video") {
      const poster =
        typeof item.poster === "string" && item.poster ? item.poster : "";
      const thumb = document.createElement("img");
      thumb.src = poster || item.src;
      thumb.alt = "";
      thumb.decoding = "async";
      thumb.setAttribute("aria-hidden", "true");
      const badge = document.createElement("span");
      badge.className = "sq-shape__play-badge";
      badge.textContent = "▶";
      badge.setAttribute("aria-hidden", "true");
      btn.appendChild(thumb);
      btn.appendChild(badge);
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = "";
      img.decoding = "async";
      img.setAttribute("aria-hidden", "true");
      btn.appendChild(img);
    }

    stage.appendChild(btn);
    attachPlaygroundDrag(btn, item, stage, storageKey, () => {
      if (kind === "video") {
        openVideoDialog(item.src, label);
      } else {
        openWorkLightbox([{ src: item.src, alt: label }], 0);
      }
    });
  }

  requestAnimationFrame(() => {
    layout();
    requestAnimationFrame(layout);
  });
  window.addEventListener("resize", () => {
    requestAnimationFrame(layout);
  });
}

/** @type {{ src: string; alt?: string }[]} */
let lightboxSlides = [];
let lightboxIndex = 0;
/** @type {HTMLElement | null} */
let lightboxEl = null;
/** @type {HTMLElement | null} */
let lightboxImgEl = null;
/** @type {HTMLElement | null} */
let lightboxCaptionEl = null;
/** @type {HTMLElement | null} */
let lightboxCounterEl = null;
/** @type {HTMLButtonElement | null} */
let lightboxPrevEl = null;
/** @type {HTMLButtonElement | null} */
let lightboxNextEl = null;
/** @type {(() => void) | null} */
let lightboxKeyHandler = null;
let lightboxTouchStartX = 0;

function getOrCreateLightbox() {
  if (lightboxEl) return lightboxEl;
  const root = document.createElement("div");
  root.className = "work-lightbox";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Image gallery");
  root.hidden = true;
  root.innerHTML = `
    <button type="button" class="work-lightbox__backdrop" aria-label="Close gallery"></button>
    <div class="work-lightbox__content">
      <div class="work-lightbox__toolbar">
        <span class="work-lightbox__counter" aria-live="polite"></span>
        <button type="button" class="work-lightbox__btn work-lightbox__close" aria-label="Close gallery">✕</button>
      </div>
      <div class="work-lightbox__nav">
        <button type="button" class="work-lightbox__btn work-lightbox__prev" aria-label="Previous image">‹</button>
        <button type="button" class="work-lightbox__btn work-lightbox__next" aria-label="Next image">›</button>
      </div>
      <div class="work-lightbox__stage">
        <img class="work-lightbox__img" alt="" decoding="async" />
      </div>
      <p class="work-lightbox__caption"></p>
    </div>
  `;
  document.body.appendChild(root);
  lightboxEl = root;
  lightboxImgEl = root.querySelector(".work-lightbox__img");
  lightboxCaptionEl = root.querySelector(".work-lightbox__caption");
  lightboxCounterEl = root.querySelector(".work-lightbox__counter");
  lightboxPrevEl = root.querySelector(".work-lightbox__prev");
  lightboxNextEl = root.querySelector(".work-lightbox__next");
  const closeBtn = root.querySelector(".work-lightbox__close");
  const backdropBtn = root.querySelector(".work-lightbox__backdrop");

  backdropBtn?.addEventListener("click", () => closeWorkLightbox());
  closeBtn?.addEventListener("click", () => closeWorkLightbox());
  lightboxPrevEl?.addEventListener("click", (e) => {
    e.stopPropagation();
    stepLightbox(-1);
  });
  lightboxNextEl?.addEventListener("click", (e) => {
    e.stopPropagation();
    stepLightbox(1);
  });

  root.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      if (t) lightboxTouchStartX = t.clientX;
    },
    { passive: true },
  );
  root.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - lightboxTouchStartX;
    if (Math.abs(dx) < 48) return;
    if (dx < 0) stepLightbox(1);
    else stepLightbox(-1);
  });

  return root;
}

function renderLightboxSlide() {
  if (!lightboxImgEl || !lightboxCaptionEl || !lightboxCounterEl) return;
  const n = lightboxSlides.length;
  if (n === 0) return;
  const i = ((lightboxIndex % n) + n) % n;
  lightboxIndex = i;
  const slide = lightboxSlides[i];
  lightboxImgEl.src = slide.src;
  lightboxImgEl.alt = slide.alt || `Image ${i + 1} of ${n}`;
  lightboxCaptionEl.textContent = slide.alt || "";
  lightboxCaptionEl.hidden = !slide.alt;
  lightboxCounterEl.textContent = `${i + 1} / ${n}`;
  const one = n <= 1;
  if (lightboxPrevEl) lightboxPrevEl.disabled = one;
  if (lightboxNextEl) lightboxNextEl.disabled = one;
}

function stepLightbox(delta) {
  const n = lightboxSlides.length;
  if (n === 0) return;
  lightboxIndex = (lightboxIndex + delta + n) % n;
  renderLightboxSlide();
}

/**
 * @param {{ src: string; alt?: string }[]} slides
 * @param {number} startIndex
 */
function openWorkLightbox(slides, startIndex) {
  const clean = slides.filter((s) => s?.src);
  if (!clean.length) return;
  getOrCreateLightbox();
  lightboxSlides = clean;
  lightboxIndex = Math.max(0, Math.min(startIndex, clean.length - 1));
  renderLightboxSlide();
  if (!lightboxEl) return;
  lightboxEl.hidden = false;
  document.body.style.overflow = "hidden";

  if (lightboxKeyHandler) {
    document.removeEventListener("keydown", lightboxKeyHandler);
    lightboxKeyHandler = null;
  }
  lightboxKeyHandler = (e) => {
    if (lightboxEl?.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeWorkLightbox();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepLightbox(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      stepLightbox(1);
    }
  };
  document.addEventListener("keydown", lightboxKeyHandler);
  queueMicrotask(() => {
    const close =
      lightboxEl?.querySelector(".work-lightbox__close") ?? null;
    if (close instanceof HTMLButtonElement) close.focus();
  });
}

function closeWorkLightbox() {
  if (lightboxKeyHandler) {
    document.removeEventListener("keydown", lightboxKeyHandler);
    lightboxKeyHandler = null;
  }
  document.body.style.overflow = "";
  if (lightboxEl) lightboxEl.hidden = true;
}

/**
 * @param {HTMLElement} container
 * @param {{ src: string; alt?: string }[]} images
 */
function appendBodyGallery(container, images) {
  if (!images?.length) return;
  const list = images.filter((item) => item?.src);
  if (!list.length) return;
  const wrap = document.createElement("div");
  wrap.className = "work-body-gallery";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "Project imagery — select to enlarge");
  list.forEach((item, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "work-body-gallery__thumb";
    const label = item.alt?.trim() || `Screen ${i + 1} — view larger`;
    btn.setAttribute("aria-label", label);
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.loading = "lazy";
    img.decoding = "async";
    btn.appendChild(img);
    btn.addEventListener("click", () => openWorkLightbox(list, i));
    wrap.appendChild(btn);
  });
  container.appendChild(wrap);
}

/**
 * @param {HTMLElement} container
 * @param {{ src: string; alt?: string; scale?: number } | null | undefined} video
 */
function appendBodyVideo(container, video) {
  if (!video?.src) return;
  const wrap = document.createElement("div");
  wrap.className = "work-body-video";
  const scale =
    typeof video.scale === "number" && video.scale > 0 && video.scale <= 1
      ? video.scale
      : null;
  if (scale !== null) {
    wrap.style.width = `${scale * 100}%`;
    wrap.style.marginLeft = "auto";
    wrap.style.marginRight = "auto";
  }
  const v = document.createElement("video");
  v.src = video.src;
  v.controls = true;
  v.playsInline = true;
  v.setAttribute("aria-label", video.alt || "Project video");
  wrap.appendChild(v);
  container.appendChild(wrap);
}

/**
 * Map paragraph index → optional gallery images and/or inline video after that paragraph.
 * @param {unknown} bodyMedia
 */
function bodyMediaSlotsByParagraph(bodyMedia) {
  /** @type {Map<number, { images?: { src: string; alt?: string }[]; video?: { src: string; alt?: string } }>} */
  const map = new Map();
  if (!Array.isArray(bodyMedia)) return map;
  for (const block of bodyMedia) {
    if (!block || typeof block !== "object") continue;
    const idx = /** @type {{ afterParagraphIndex?: unknown }} */ (block).afterParagraphIndex;
    if (typeof idx !== "number") continue;
    let slot = map.get(idx);
    if (!slot) {
      slot = {};
      map.set(idx, slot);
    }
    const images = /** @type {{ images?: unknown }} */ (block).images;
    if (Array.isArray(images) && images.length) {
      slot.images = /** @type {{ src: string; alt?: string }[]} */ (images);
    }
    const vid = /** @type {{ video?: unknown }} */ (block).video;
    if (vid && typeof vid === "object" && vid !== null && "src" in vid) {
      const src = /** @type {{ src?: unknown }} */ (vid).src;
      if (typeof src === "string" && src) {
        const alt = /** @type {{ alt?: unknown }} */ (vid).alt;
        const scaleRaw = /** @type {{ scale?: unknown }} */ (vid).scale;
        const scale =
          typeof scaleRaw === "number" && scaleRaw > 0 && scaleRaw <= 1
            ? scaleRaw
            : undefined;
        slot.video = {
          src,
          alt: typeof alt === "string" ? alt : undefined,
          scale,
        };
      }
    }
  }
  return map;
}

async function main() {
  initThemeToggle();

  const id = params().get("id");
  const res = await fetch("./js/projects.json", { cache: "no-store" });
  if (!res.ok) throw new Error("projects.json");
  const data = await res.json();
  const project = id && data.projects ? data.projects[id] : null;

  const titleEl = document.getElementById("work-title");
  const bodyEl = document.getElementById("work-body");
  const mediaEl = document.getElementById("work-media");

  if (!project || !titleEl || !bodyEl || !mediaEl) {
    if (titleEl) titleEl.textContent = "Not found";
    if (bodyEl) {
      bodyEl.textContent =
        id ? `No project is configured for “${id}”.` : "Missing ?id= in the URL.";
    }
    return;
  }

  titleEl.textContent = project.title;
  mediaEl.hidden = false;

  if (
    project.playground &&
    typeof project.playground === "object" &&
    Array.isArray(project.playground.items) &&
    project.playground.items.length
  ) {
    initSideQuestsPlayground(project, bodyEl, mediaEl);
    return;
  }

  bodyEl.replaceChildren();
  const paragraphs = project.body || [];
  const bodySlots = bodyMediaSlotsByParagraph(project.bodyMedia);
  for (let i = 0; i < paragraphs.length; i++) {
    const p = document.createElement("p");
    p.textContent = paragraphs[i];
    bodyEl.appendChild(p);
    const slot = bodySlots.get(i);
    appendBodyGallery(bodyEl, slot?.images || []);
    appendBodyVideo(bodyEl, slot?.video);
  }

  mediaEl.replaceChildren();
  mediaEl.classList.remove("work-media--transparent", "work-media--scaled");
  mediaEl.style.removeProperty("--work-hero-scale");
  const m = project.media;
  if (m?.transparentPanel) {
    mediaEl.classList.add("work-media--transparent");
  }
  const heroScale =
    typeof m?.scale === "number" && m.scale > 0 && m.scale <= 1 ? m.scale : null;
  if (heroScale !== null) {
    mediaEl.classList.add("work-media--scaled");
    mediaEl.style.setProperty("--work-hero-scale", `${heroScale * 100}%`);
    if (!m?.transparentPanel) {
      mediaEl.classList.add("work-media--transparent");
    }
  }
  if (m?.type === "video" && m.src) {
    const v = document.createElement("video");
    v.src = m.src;
    v.controls = true;
    v.playsInline = true;
    v.setAttribute("aria-label", m.alt || project.title);
    mediaEl.appendChild(v);
  } else if (m?.src) {
    const img = document.createElement("img");
    const srcDark =
      typeof m.srcDark === "string" && m.srcDark ? m.srcDark : "";
    img.alt = m.alt || project.title;
    if (srcDark) {
      img.dataset.heroTheme = "1";
      img.dataset.heroLight = m.src;
      img.dataset.heroDark = srcDark;
      const theme =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light";
      img.src = theme === "dark" ? srcDark : m.src;
    } else {
      img.src = m.src;
    }
    mediaEl.appendChild(img);
  }
}

main().catch((err) => {
  console.error(err);
  const bodyEl = document.getElementById("work-body");
  if (bodyEl) bodyEl.textContent = "Something went wrong loading this page.";
});
