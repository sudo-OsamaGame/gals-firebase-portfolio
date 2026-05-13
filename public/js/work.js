import { app } from "./firebase-init.js";
import { initThemeToggle } from "./theme-toggle.js";

void app;

function params() {
  return new URLSearchParams(window.location.search);
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
 * Map paragraph index → images to show after that paragraph.
 * @param {unknown} bodyMedia
 */
function bodyMediaAfterMap(bodyMedia) {
  /** @type {Map<number, { src: string; alt?: string }[]>} */
  const map = new Map();
  if (!Array.isArray(bodyMedia)) return map;
  for (const block of bodyMedia) {
    if (!block || typeof block !== "object") continue;
    const idx = /** @type {{ afterParagraphIndex?: unknown }} */ (block).afterParagraphIndex;
    const images = /** @type {{ images?: unknown }} */ (block).images;
    if (typeof idx !== "number" || !Array.isArray(images)) continue;
    map.set(idx, /** @type {{ src: string; alt?: string }[]} */ (images));
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
  bodyEl.replaceChildren();
  const paragraphs = project.body || [];
  const mediaAfter = bodyMediaAfterMap(project.bodyMedia);
  for (let i = 0; i < paragraphs.length; i++) {
    const p = document.createElement("p");
    p.textContent = paragraphs[i];
    bodyEl.appendChild(p);
    appendBodyGallery(bodyEl, mediaAfter.get(i));
  }

  mediaEl.replaceChildren();
  mediaEl.classList.remove("work-media--transparent");
  const m = project.media;
  if (m?.transparentPanel) {
    mediaEl.classList.add("work-media--transparent");
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
    img.src = m.src;
    img.alt = m.alt || project.title;
    mediaEl.appendChild(img);
  }
}

main().catch((err) => {
  console.error(err);
  const bodyEl = document.getElementById("work-body");
  if (bodyEl) bodyEl.textContent = "Something went wrong loading this page.";
});
