import { app } from "./firebase-init.js";

void app;

function params() {
  return new URLSearchParams(window.location.search);
}

async function main() {
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
  for (const para of project.body || []) {
    const p = document.createElement("p");
    p.textContent = para;
    bodyEl.appendChild(p);
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
