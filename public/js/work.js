import { app } from "./firebase-init.js";
import { initThemeToggle } from "./theme-toggle.js";

void app;

function params() {
  return new URLSearchParams(window.location.search);
}

/**
 * @param {HTMLElement} container
 * @param {{ src: string; alt?: string }[]} images
 */
function appendBodyGallery(container, images) {
  if (!images?.length) return;
  const wrap = document.createElement("div");
  wrap.className = "work-body-gallery";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "Project imagery");
  for (const item of images) {
    if (!item?.src) continue;
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    wrap.appendChild(img);
  }
  if (wrap.childElementCount) container.appendChild(wrap);
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
  const m = project.media;
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
