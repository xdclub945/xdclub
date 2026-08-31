const CONFIG_URL = "/site-config.json";
const THEME_KEY = "xdclub-theme";

export function safeHttpUrl(value) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function getPreferredTheme(storage, media) {
  try {
    const saved = storage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Storage can be blocked by browser privacy settings.
  }

  return media.matches ? "dark" : "light";
}

export async function copyServerAddress(value, clipboard) {
  const address = typeof value === "string" ? value.trim() : "";
  if (!address || typeof clipboard?.writeText !== "function") return false;

  try {
    await clipboard.writeText(address);
    return true;
  } catch {
    return false;
  }
}

function updateThemeButton(button, theme) {
  if (!button) return;

  button.setAttribute("aria-pressed", String(theme === "light"));
  button.setAttribute("aria-label", theme === "dark" ? "切换到白天模式" : "切换到暗黑模式");
  button.title = theme === "dark" ? "切换到白天模式" : "切换到暗黑模式";
}

export function setTheme(theme, root, storage, button) {
  const nextTheme = theme === "light" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;

  try {
    storage.setItem(THEME_KEY, nextTheme);
  } catch {
    // The visual change still works when persistence is unavailable.
  }

  updateThemeButton(button, nextTheme);
}

function setText(root, selector, value) {
  if (typeof value !== "string") return;

  for (const node of root.querySelectorAll(selector)) {
    node.textContent = value;
  }
}

function applyService(root, service) {
  if (!service || typeof service.id !== "string") return;

  const panel = root.querySelector(`[data-service-id="${CSS.escape(service.id)}"]`);
  if (!panel) return;

  setText(panel, '[data-service-field="index"]', service.index);
  setText(panel, '[data-service-field="eyebrow"]', service.eyebrow);
  setText(panel, '[data-service-field="title"]', service.title);
  setText(panel, '[data-service-field="description"]', service.description);

  if (service.preview && typeof service.preview === "object") {
    setText(panel, '[data-service-field="preview-label"]', service.preview.label);
    setText(panel, '[data-service-field="preview-value"]', service.preview.value);
  }

  const action = panel.querySelector('[data-service-field="action"]');
  if (!action) return;

  const destination = safeHttpUrl(service.url);
  if (!destination) {
    action.removeAttribute("href");
    action.removeAttribute("target");
    action.removeAttribute("rel");
    action.setAttribute("aria-disabled", "true");
    action.classList.add("is-disabled");
    action.textContent = typeof service.action === "string" ? service.action : "即将开放";
    return;
  }

  action.href = destination;
  action.target = "_blank";
  action.rel = "noopener noreferrer";
  action.removeAttribute("aria-disabled");
  action.classList.remove("is-disabled");
  action.textContent = typeof service.action === "string" ? `${service.action} ↗` : "访问服务 ↗";
}

export function applyConfig(root, config) {
  if (!root || !config || typeof config !== "object") return;

  if (typeof config.brand === "string") {
    const brand = config.brand.trim();
    if (brand) {
      setText(root, ".brand-xd", brand.slice(0, 2));
      setText(root, ".brand-club", brand.slice(2));
      root.querySelector(".brand")?.setAttribute("aria-label", `${brand}，返回首页`);
    }
  }

  if (config.home && typeof config.home === "object") {
    setText(root, '[data-config="home.eyebrow"]', config.home.eyebrow);
    setText(root, '[data-config="home.titlePrimary"]', config.home.titlePrimary);
    setText(root, '[data-config="home.titleAccent"]', config.home.titleAccent);
    setText(root, '[data-config="home.description"]', config.home.description);
  }

  if (Array.isArray(config.services)) {
    for (const service of config.services) applyService(root, service);
  }

  if (config.surprise && typeof config.surprise === "object") {
    setText(root, '[data-config="surprise.title"]', config.surprise.title);
    setText(root, '[data-config="surprise.button"]', config.surprise.button);
  }

  if (config.footer && typeof config.footer === "object") {
    setText(root, '[data-config="footer.copyright"]', config.footer.copyright);
  }
}

export async function loadConfig(fetcher, root) {
  try {
    const response = await fetcher(CONFIG_URL, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Configuration request failed with ${response.status}`);
    applyConfig(root, await response.json());
  } catch {
    // Keep the safe HTML defaults when configuration cannot be loaded.
  }
}

function setupViewportEffects() {
  const header = document.querySelector(".site-header");
  const reveals = [...document.querySelectorAll("[data-reveal]")];
  const panels = [...document.querySelectorAll(".panel[id]")];
  const navLinks = [...document.querySelectorAll(".section-nav a")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.documentElement.classList.add("effects-ready");

  let headerFrame = 0;
  const syncHeader = () => {
    headerFrame = 0;
    header?.classList.toggle("is-floating", window.scrollY > 20);
  };
  const requestHeaderSync = () => {
    if (!headerFrame) headerFrame = window.requestAnimationFrame(syncHeader);
  };
  syncHeader();
  window.addEventListener("scroll", requestHeaderSync, { passive: true });

  for (const link of navLinks) {
    link.addEventListener("click", (event) => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;

      event.preventDefault();
      history.pushState(null, "", link.hash);
      target.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: target.id === "home" ? "start" : "center",
      });
    });
  }

  if (!("IntersectionObserver" in window)) {
    for (const node of reveals) node.classList.add("is-visible");
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.18 });

  for (const node of reveals) revealObserver.observe(node);

  const sectionRatios = new Map(panels.map((panel) => [panel.id, 0]));
  const sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      sectionRatios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
    }

    const [visibleId, visibleRatio] = [...sectionRatios.entries()]
      .sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!visibleId || visibleRatio === 0) return;

    for (const link of navLinks) {
      const active = link.hash === `#${visibleId}`;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }, { threshold: [0.35, 0.6] });

  for (const panel of panels) sectionObserver.observe(panel);
}

function setupServerCopy() {
  const button = document.querySelector("[data-copy-server]");
  const value = document.querySelector('[data-service-field="preview-value"]');
  const label = button?.querySelector("[data-copy-label]");
  if (!button || !value || !label) return;

  let resetTimer = 0;
  button.addEventListener("click", async () => {
    let clipboard = null;
    try {
      clipboard = navigator.clipboard;
    } catch {
      // Clipboard access can be blocked by browser permissions.
    }

    button.disabled = true;
    const copied = await copyServerAddress(value.textContent, clipboard);
    label.textContent = copied ? "已复制" : "复制失败";
    button.dataset.state = copied ? "success" : "error";
    button.setAttribute("aria-label", copied ? "服务器地址已复制" : "复制服务器地址失败");
    button.disabled = false;

    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      label.textContent = "复制";
      button.removeAttribute("data-state");
      button.setAttribute("aria-label", "复制服务器地址");
    }, 1600);
  });
}

function setupTacPreview() {
  const dialog = document.querySelector("#tac-preview");
  const openButton = document.querySelector("[data-open-tac]");
  const closeButton = document.querySelector("[data-close-tac]");
  if (!dialog || !openButton || !closeButton) return;

  openButton.addEventListener("click", () => {
    if (dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });

  closeButton.addEventListener("click", () => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  });
}

function start() {
  const root = document.documentElement;
  const button = document.querySelector("#theme-toggle");
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const initialTheme = root.dataset.theme || getPreferredTheme(window.localStorage, media);

  root.dataset.theme = initialTheme;
  root.style.colorScheme = initialTheme;
  updateThemeButton(button, initialTheme);

  button?.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme, root, window.localStorage, button);
  });

  media.addEventListener?.("change", (event) => {
    let savedTheme = null;
    try {
      savedTheme = window.localStorage.getItem(THEME_KEY);
    } catch {
      // Continue following the system theme when storage is unavailable.
    }

    if (savedTheme !== "dark" && savedTheme !== "light") {
      const systemTheme = event.matches ? "dark" : "light";
      root.dataset.theme = systemTheme;
      root.style.colorScheme = systemTheme;
      updateThemeButton(button, systemTheme);
    }
  });

  setupViewportEffects();
  setupServerCopy();
  setupTacPreview();
  loadConfig(window.fetch.bind(window), document);
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
