import { app } from "./firebase-init.js";

void app;

const STORAGE_KEY = "gals-portfolio-shape-positions-v1";
const DRAG_THRESHOLD = 10;

/** @typedef {{ id: string, shape: string, label: string, defaultPosition: { leftPct: number, topPct: number } }} HomeDraggable */

function loadSavedPositions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return typeof o === "object" && o ? o : {};
  } catch {
    return {};
  }
}

function savePosition(id, leftPct, topPct) {
  const all = loadSavedPositions();
  all[id] = { leftPct, topPct };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * @param {HTMLElement} el
 * @param {HomeDraggable} spec
 * @param {{ width: number, height: number }} stageSize
 */
function placeElement(el, spec, stageSize) {
  const saved = loadSavedPositions()[spec.id];
  const leftPct = saved?.leftPct ?? spec.defaultPosition.leftPct;
  const topPct = saved?.topPct ?? spec.defaultPosition.topPct;
  const w = el.offsetWidth || 120;
  const h = el.offsetHeight || 120;
  const left = (leftPct / 100) * stageSize.width - w / 2;
  const top = (topPct / 100) * stageSize.height - h / 2;
  el.style.left = `${Math.round(Math.max(0, Math.min(stageSize.width - w, left)))}px`;
  el.style.top = `${Math.round(Math.max(0, Math.min(stageSize.height - h, top)))}px`;
}

/**
 * @param {HTMLElement} el
 * @param {HomeDraggable} spec
 * @param {HTMLElement} stage
 */
function attachDrag(el, spec, stage) {
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
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) moved = true;

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
    savePosition(spec.id, leftPct, topPct);

    if (!moved) {
      window.location.href = `./work.html?id=${encodeURIComponent(spec.id)}`;
    }
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", finish);
  el.addEventListener("pointercancel", finish);

  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      window.location.href = `./work.html?id=${encodeURIComponent(spec.id)}`;
    }
  });
}

async function main() {
  const res = await fetch("./js/projects.json", { cache: "no-store" });
  if (!res.ok) throw new Error("projects.json");
  const data = await res.json();

  document.getElementById("site-footer").textContent = data.site.footer;

  const heroName = document.getElementById("hero-name");
  if (heroName) heroName.textContent = data.site.name;

  const line1 = document.getElementById("hero-line1");
  const cheers = document.getElementById("hero-cheers");
  const line2 = document.getElementById("hero-line2");
  if (line1) line1.textContent = data.site.heroLine1;
  if (cheers) cheers.textContent = data.site.heroCheers;
  if (line2) line2.textContent = data.site.heroLine2;

  const portrait = document.getElementById("hero-portrait");
  const wrap = document.getElementById("portrait-wrap");
  if (portrait && wrap) {
    const src = (data.site.portraitSrc || "").trim();
    if (src) {
      portrait.onload = () => wrap.classList.remove("portrait-missing");
      portrait.onerror = () => {
        portrait.removeAttribute("src");
        portrait.alt = "";
        wrap.classList.add("portrait-missing");
      };
      portrait.src = src;
      portrait.alt = data.site.portraitAlt || data.site.name;
    }
  }

  const stage = document.getElementById("drag-stage");
  if (!stage) return;

  /** @type {HomeDraggable[]} */
  const items = data.homeDraggables || [];

  const layout = () => {
    const rect = stage.getBoundingClientRect();
    const size = { width: rect.width, height: rect.height };
    for (const spec of items) {
      const el = stage.querySelector(`[data-project-id="${spec.id}"]`);
      if (el instanceof HTMLElement) placeElement(el, spec, size);
    }
  };

  for (const spec of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `shape-btn shape-${spec.shape}`;
    btn.dataset.projectId = spec.id;
    btn.setAttribute("aria-label", `Open project: ${spec.label.replace(/\n/g, " ")}`);
    btn.setAttribute("tabindex", "0");
    const inner = document.createElement("span");
    inner.className = "shape-inner";
    spec.label.split("\n").forEach((line) => {
      const span = document.createElement("span");
      span.className = "shape-line";
      span.textContent = line;
      inner.appendChild(span);
    });
    btn.appendChild(inner);
    stage.appendChild(btn);
    attachDrag(btn, spec, stage);
  }

  requestAnimationFrame(() => {
    layout();
    requestAnimationFrame(layout);
  });
  window.addEventListener("resize", () => {
    requestAnimationFrame(layout);
  });
}

main().catch((err) => {
  console.error(err);
  const stage = document.getElementById("drag-stage");
  if (stage) {
    stage.innerHTML =
      '<p class="load-error">Could not load the page data. Refresh and try again.</p>';
  }
});
