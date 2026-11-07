// Theme switch: "Imperial" (dark, gold line work: the default) or "Parchment" (light). The choice is kept in
// localStorage under its own key so index.html can apply it before the stylesheets load.
(function () {
  const G = window.GM, KEY = "duneGM.theme", root = document.documentElement;
  const isLight = () => root.dataset.theme === "light";
  function label() {
    const b = document.getElementById("themeBtn"); if (!b) return;
    b.textContent = isLight() ? "Imperial" : "Parchment";
    b.title = isLight() ? "Switch to the Imperial theme (dark, gold line work)" : "Switch to the Parchment theme (light)";
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = isLight() ? "#f3ebdd" : "#141116";
  }
  G.actions.theme = () => {
    if (isLight()) delete root.dataset.theme; else root.dataset.theme = "light";
    try { localStorage.setItem(KEY, isLight() ? "light" : "imperial"); } catch (e) {}
    label();
  };
  label();
})();
