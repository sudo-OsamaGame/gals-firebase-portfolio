import { app } from "./firebase-init.js";

void app;

/** @typedef {{ id: string, type: 'image' | 'video', src: string, title: string, caption?: string }} Work */

const grid = document.getElementById("grid");
const dialog = document.getElementById("lightbox");
const dialogMedia = document.getElementById("lightbox-media");
const dialogTitle = document.getElementById("lightbox-title");
const dialogCaption = document.getElementById("lightbox-caption");
const closeBtn = document.getElementById("lightbox-close");

function openLightbox(work) {
  dialogTitle.textContent = work.title;
  dialogCaption.textContent = work.caption || "";
  dialogCaption.hidden = !work.caption;

  dialogMedia.replaceChildren();

  if (work.type === "video") {
    const v = document.createElement("video");
    v.src = work.src;
    v.controls = true;
    v.playsInline = true;
    v.setAttribute("controlsList", "nodownload");
    dialogMedia.appendChild(v);
  } else {
    const img = document.createElement("img");
    img.src = work.src;
    img.alt = work.title;
    dialogMedia.appendChild(img);
  }

  dialog.showModal();
}

function closeLightbox() {
  dialog.close();
  dialogMedia.replaceChildren();
}

closeBtn.addEventListener("click", closeLightbox);
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) closeLightbox();
});
dialog.addEventListener("close", () => {
  dialogMedia.querySelectorAll("video").forEach((v) => v.pause());
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && dialog.open) closeLightbox();
});

/**
 * @param {Work} work
 */
function createTile(work) {
  const article = document.createElement("article");
  article.className = "tile";

  if (work.type === "video") {
    const wrap = document.createElement("div");
    wrap.className = "tile-video-wrap";
    const video = document.createElement("video");
    video.src = work.src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.addEventListener("mouseenter", () => video.play().catch(() => {}));
    video.addEventListener("mouseleave", () => {
      video.pause();
      video.currentTime = 0;
    });
    wrap.appendChild(video);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile-expand";
    btn.textContent = "Open";
    btn.addEventListener("click", () => openLightbox(work));
    wrap.appendChild(btn);

    const h2 = document.createElement("h2");
    h2.className = "tile-title";
    h2.textContent = work.title;

    article.append(wrap, h2);
    return article;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tile-thumb";
  btn.addEventListener("click", () => openLightbox(work));

  const img = document.createElement("img");
  img.src = work.src;
  img.alt = work.title;
  img.loading = "lazy";
  img.decoding = "async";
  btn.appendChild(img);

  const h2 = document.createElement("h2");
  h2.className = "tile-title";
  h2.textContent = work.title;

  article.append(btn, h2);
  return article;
}

async function main() {
  const res = await fetch("./js/works.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load works");
  /** @type {Work[]} */
  const works = await res.json();

  grid.replaceChildren();
  for (const work of works) {
    grid.appendChild(createTile(work));
  }
  grid.setAttribute("aria-busy", "false");
}

main().catch((err) => {
  console.error(err);
  grid.setAttribute("aria-busy", "false");
  grid.innerHTML =
    '<p class="error">Could not load the gallery. Refresh and try again.</p>';
});
