export const THEME_KEY = "gals-portfolio-theme";

const BANNER_LIGHT = "/media/banner.png";
const BANNER_DARK = "/media/banner-dark.png";

/**
 * @param {"light" | "dark"} theme
 */
/**
 * @param {"light" | "dark"} theme
 */
function syncWorkHeroImage(theme) {
  const img = document.querySelector("#work-media img[data-hero-theme]");
  if (!(img instanceof HTMLImageElement)) return;
  const light = img.dataset.heroLight;
  const dark = img.dataset.heroDark;
  if (!light || !dark) return;
  const next = theme === "dark" ? dark : light;
  try {
    const abs = new URL(next, window.location.href).href;
    if (img.src !== abs) img.src = next;
  } catch {
    img.src = next;
  }
}

/**
 * @param {"light" | "dark"} theme
 */
function syncHeroBanner(theme) {
  const el = document.querySelector(".hero-banner");
  if (!(el instanceof HTMLImageElement)) return;
  const light = el.dataset.bannerLight || BANNER_LIGHT;
  const dark = el.dataset.bannerDark || BANNER_DARK;
  const next = theme === "dark" ? dark : light;
  try {
    const abs = new URL(next, window.location.href).href;
    if (el.src !== abs) el.src = next;
  } catch {
    el.src = next;
  }
}

export function readStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "dark" || t === "light") return t;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {"light" | "dark"} theme
 */
export function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }

  syncHeroBanner(t);
  syncWorkHeroImage(t);

  document.querySelectorAll("[data-theme-toggle]").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const dark = t === "dark";
    el.setAttribute("aria-pressed", String(dark));
    el.setAttribute(
      "aria-label",
      dark ? "Switch to light mode" : "Switch to dark mode",
    );
    const label = el.querySelector(".theme-toggle__label");
    if (label) {
      label.textContent = dark ? "Light mode" : "Dark mode";
    }
  });
}

export function initThemeToggle() {
  const stored = readStoredTheme();
  const initial =
    stored ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initial);

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cur =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light";
      applyTheme(cur === "dark" ? "light" : "dark");
    });
  });
}
