(() => {
  const root = document.documentElement;
  let savedTheme = null;

  try {
    savedTheme = localStorage.getItem("xdclub-theme");
  } catch {
    // Browser privacy settings may block storage.
  }

  const systemPrefersDark = typeof matchMedia === "function"
    && matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme === "dark" || savedTheme === "light"
    ? savedTheme
    : systemPrefersDark ? "dark" : "light";

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
})();
