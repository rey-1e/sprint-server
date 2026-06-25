const { onRequest } = require("firebase-functions/v2/https");
const { handleCors } = require("../helpers");

// LeetCode Theme Palettes — served from server for security
const THEME_STYLES = {
  amethyst: { bgBase: "#0d0b18", bgSurface: "#1a1631", border: "#231e42", brand: "#9d4edd" },
  forest: { bgBase: "#07100b", bgSurface: "#12271a", border: "#1a3625", brand: "#10b981" },
  sunset: { bgBase: "#120d0d", bgSurface: "#281d1d", border: "#342525", brand: "#ff6b6b" },
  space: { bgBase: "#050a12", bgSurface: "#0f1a30", border: "#162545", brand: "#3b82f6" },
  cyberpunk: { bgBase: "#04040a", bgSurface: "#161628", border: "#22223a", brand: "#ff007f" },
  obsidian: { bgBase: "#050505", bgSurface: "#141414", border: "#1c1c1c", brand: "#e5e5e5" },
  dracula: { bgBase: "#1e1f29", bgSurface: "#343746", border: "#3e4254", brand: "#ff79c6" },
  nord: { bgBase: "#1e222b", bgSurface: "#3b4252", border: "#434c5e", brand: "#88c0d0" },
  gruvbox: { bgBase: "#1d2021", bgSurface: "#3c3836", border: "#504945", brand: "#fe8019" },
  solarflare: { bgBase: "#100606", bgSurface: "#240e0e", border: "#2f1313", brand: "#ffb000" },
  monokai: { bgBase: "#121212", bgSurface: "#272727", border: "#333333", brand: "#a6e22e" },
  plum: { bgBase: "#0c060c", bgSurface: "#1e101e", border: "#281628", brand: "#ec4899" },
  ocean: { bgBase: "#02090c", bgSurface: "#08212c", border: "#0c2d3c", brand: "#06b6d4" },
  toxic: { bgBase: "#070907", bgSurface: "#141b14", border: "#1a241a", brand: "#39ff14" },
  rosegold: { bgBase: "#0d090a", bgSurface: "#21171a", border: "#2b1f22", brand: "#f43f5e" },
  aurora: { bgBase: "#030a0a", bgSurface: "#0a2020", border: "#0d2b2b", brand: "#2dd4bf" },
  cyber2077: { bgBase: "#0a0a0c", bgSurface: "#1b1b22", border: "#24242d", brand: "#f3e600" },
  royal: { bgBase: "#060514", bgSurface: "#130f3a", border: "#1a144d", brand: "#6366f1" },
  vampire: { bgBase: "#080101", bgSurface: "#180303", border: "#210404", brand: "#ef4444" },
  abyssal: { bgBase: "#04080f", bgSurface: "#0d1629", border: "#121e38", brand: "#00d4ff" },
  "void-orchid": { bgBase: "#0a0005", bgSurface: "#200f27", border: "#2b1434", brand: "#bf5fff" },
  phosphor: { bgBase: "#070c06", bgSurface: "#152712", border: "#1c3418", brand: "#7fff00" },
  gilded: { bgBase: "#080a10", bgSurface: "#181d2c", border: "#20263a", brand: "#c8a96e" },
  sakura: { bgBase: "#0a0608", bgSurface: "#21111b", border: "#2c1624", brand: "#ff4d8f" },
  "deep-horizon": { bgBase: "#060811", bgSurface: "#101b33", border: "#162446", brand: "#4fc3f7" },
  starfield: { bgBase: "#09070e", bgSurface: "#1d162e", border: "#271e3e", brand: "#a78bfa" },
  ember: { bgBase: "#080505", bgSurface: "#1f110d", border: "#2a1711", brand: "#ff6a00" },
  cryo: { bgBase: "#030810", bgSurface: "#091c34", border: "#0d2647", brand: "#00e5ff" },
  "onyx-gold": { bgBase: "#0b0b0b", bgSurface: "#1e1e1e", border: "#272727", brand: "#d4af37" },
  jade: { bgBase: "#060a0a", bgSurface: "#122222", border: "#182e2e", brand: "#14f0b0" },
  "crimson-mist": { bgBase: "#0d070a", bgSurface: "#26161b", border: "#321d24", brand: "#ff8fab" },
  "phantom-reef": { bgBase: "#070a0d", bgSurface: "#162033", border: "#1e2b46", brand: "#56cfe1" },
  ancient: { bgBase: "#0c0a07", bgSurface: "#282213", border: "#352d19", brand: "#e8c84a" },
  "indigo-fog": { bgBase: "#06060a", bgSurface: "#141425", border: "#1b1b33", brand: "#818cf8" },
  "pure-void": { bgBase: "#090909", bgSurface: "#1d1d1d", border: "#252525", brand: "#f0f0f0" },
  bioluminescence: { bgBase: "#050a08", bgSurface: "#12271c", border: "#193626", brand: "#00ff9f" },
  arcane: { bgBase: "#0b080d", bgSurface: "#23182b", border: "#2f203a", brand: "#e879f9" },
  "polar-dawn": { bgBase: "#06090c", bgSurface: "#111b26", border: "#172433", brand: "#38bdf8" },
  "rad-moss": { bgBase: "#090a06", bgSurface: "#1e2212", border: "#282e18", brand: "#b5e853" }
};

const SECURE_LAYOUT_BASE_CSS = require("./layout-css");

exports.getTheme = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).send();

    try {
        const { themeName } = req.body;

        if (!themeName || themeName === "default") {
            return res.status(200).json({ success: true, fullCSS: null });
        }

        const vars = THEME_STYLES[themeName];
        if (!vars) return res.status(404).json({ error: "Theme config not found." });

        const compiledCSS = `
          :root, html[data-lc-theme="${themeName}"] {
            --bg-base: ${vars.bgBase} !important;
            --bg-surface: ${vars.bgSurface} !important;
            --border-color: ${vars.border} !important;
            --brand-accent: ${vars.brand} !important;
          }
          ${SECURE_LAYOUT_BASE_CSS}
        `;

        return res.status(200).json({ success: true, fullCSS: compiledCSS });
    } catch (err) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
