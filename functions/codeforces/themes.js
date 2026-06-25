const { onRequest } = require("firebase-functions/v2/https");
const { handleCors } = require("../helpers");

// Codeforces Theme Palettes — CSS variable values per theme
// These are the pre-calculated input colors that yield correct output under invert(0.92) hue-rotate(180deg)
const CF_THEME_STYLES = {
  midnight: { bgInput: "#e5efff", cardInput: "#d1def4", accentInput: "#0000a1", textInput: "#000000", borderInput: "#b2c3db" },
  nord:     { bgInput: "#ecf7f8", cardInput: "#ddebec", accentInput: "#206275", textInput: "#000000", borderInput: "#b6bed1" },
  ocean:    { bgInput: "#e4eeff", cardInput: "#cad5f6", accentInput: "#16ecff", textInput: "#000000", borderInput: "#98b2d2" },
  mocha:    { bgInput: "#fcf8f6", cardInput: "#efece9", accentInput: "#ffa300", textInput: "#000000", borderInput: "#d7d2d0" },
  obsidian: { bgInput: "#fdffff", cardInput: "#eaf1fe", accentInput: "#cc001a", textInput: "#000000", borderInput: "#c9d3e5" },
  dracula:  { bgInput: "#e6e8f4", cardInput: "#d7d9e8", accentInput: "#870043", textInput: "#000000", borderInput: "#acb0c6" },
  gruvbox:  { bgInput: "#f0f4f5", cardInput: "#e8e8e8", accentInput: "#fa6400", textInput: "#433000", borderInput: "#d7d2d0" },
  forest:   { bgInput: "#f4fff7", cardInput: "#e5f7eb", accentInput: "#3db67e", textInput: "#000000", borderInput: "#bfe2ca" },
  sunset:   { bgInput: "#faebff", cardInput: "#eedbf7", accentInput: "#ff8800", textInput: "#000003", borderInput: "#d3b3e2" },
  cyberpunk:{ bgInput: "#e5e1ff", cardInput: "#c9c3fc", accentInput: "#00ffff", textInput: "#000003", borderInput: "#8e86e4" },
  rosegold: { bgInput: "#fbf1f5", cardInput: "#efe3e8", accentInput: "#3d0000", textInput: "#000000", borderInput: "#dbcbd2" },
  mono:     { bgInput: "#ffffff", cardInput: "#ffffff", accentInput: "#000000", textInput: "#000000", borderInput: "#e4e4e4" },
  solarized:{ bgInput: "#f0ffff", cardInput: "#d7ffff", accentInput: "#58e5db", textInput: "#586868", borderInput: "#c3ffff" },
  indigo:   { bgInput: "#e3e3ff", cardInput: "#cdcdf8", accentInput: "#00007e", textInput: "#000000", borderInput: "#9898e1" },
  emerald:  { bgInput: "#f8ffff", cardInput: "#e2fff6", accentInput: "#1cd994", textInput: "#000000", borderInput: "#bafddf" },
  rust:     { bgInput: "#fff8f6", cardInput: "#fee6e3", accentInput: "#e44305", textInput: "#000000", borderInput: "#efcac4" },
  synthwave:{ bgInput: "#f5ecff", cardInput: "#e3d7f8", accentInput: "#810030", textInput: "#000003", borderInput: "#c2ade4" },
  amethyst: { bgInput: "#f4ecff", cardInput: "#e2d7fc", accentInput: "#0f0072", textInput: "#000000", borderInput: "#c0b0ea" },
  royal:    { bgInput: "#f2e9ff", cardInput: "#ded0ff", accentInput: "#eca500", textInput: "#000000", borderInput: "#b8a1f1" },
  space:    { bgInput: "#ffffff", cardInput: "#e9f1ff", accentInput: "#0047d1", textInput: "#000000", borderInput: "#d6e2f2" }
};

// Structural CSS for the Codeforces inversion theme engine
// This contains only the inversion rules — no color values (those come from CF_THEME_STYLES above)
const CF_STRUCTURAL_CSS = `
/* Apply base inversion to HTML when dark themes are active */
html[data-theme]:not([data-theme="light"]) {
  background-color: var(--bg-input) !important;
  filter: invert(0.92) hue-rotate(180deg) !important;
}

/* Override key container colors */
html[data-theme]:not([data-theme="light"]) body,
html[data-theme]:not([data-theme="light"]) #pageContent {
  background-color: var(--bg-input) !important;
  color: var(--text-input) !important;
}

html[data-theme]:not([data-theme="light"]) .roundbox,
html[data-theme]:not([data-theme="light"]) .sidebarbox,
html[data-theme]:not([data-theme="light"]) .content-with-sidebar,
html[data-theme]:not([data-theme="light"]) .spoiler {
  background-color: var(--card-input) !important;
  border-color: var(--border-input) !important;
}

html[data-theme]:not([data-theme="light"]) a,
html[data-theme]:not([data-theme="light"]) a:visited {
  color: var(--accent-input) !important;
}

/* Keep user rating colors accurate under inversion */
html[data-theme]:not([data-theme="light"]) .user-red { color: #db0000 !important; }
html[data-theme]:not([data-theme="light"]) .user-orange { color: #ff8e00 !important; }
html[data-theme]:not([data-theme="light"]) .user-violet { color: #ff4dff !important; }
html[data-theme]:not([data-theme="light"]) .user-blue { color: #0000db !important; }
html[data-theme]:not([data-theme="light"]) .user-cyan { color: #4fffff !important; }
html[data-theme]:not([data-theme="light"]) .user-green { color: #7fff7f !important; }
html[data-theme]:not([data-theme="light"]) .user-gray { color: #7f7f7f !important; }
html[data-theme]:not([data-theme="light"]) .user-black { color: #000000 !important; }

/* Revert inversion on media to maintain natural colors */
html[data-theme]:not([data-theme="light"]) img:not(.tex-graphics):not(.tex-formula),
html[data-theme]:not([data-theme="light"]) iframe,
html[data-theme]:not([data-theme="light"]) video,
html[data-theme]:not([data-theme="light"]) .avatar,
html[data-theme]:not([data-theme="light"]) [class*="avatar"],
html[data-theme]:not([data-theme="light"]) .user-avatar {
  filter: invert(1) hue-rotate(180deg) !important;
}
`;

exports.getCodeforcesTheme = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).send();

    try {
        const { themeName } = req.body;

        if (!themeName || themeName === "light") {
            return res.status(200).json({ success: true, fullCSS: null });
        }

        const vars = CF_THEME_STYLES[themeName];
        if (!vars) return res.status(404).json({ error: "Codeforces theme not found." });

        const compiledCSS = `
          html[data-theme="${themeName}"] {
            --bg-input: ${vars.bgInput} !important;
            --card-input: ${vars.cardInput} !important;
            --accent-input: ${vars.accentInput} !important;
            --text-input: ${vars.textInput} !important;
            --border-input: ${vars.borderInput} !important;
          }
          ${CF_STRUCTURAL_CSS}
        `;

        return res.status(200).json({ success: true, fullCSS: compiledCSS });
    } catch (err) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
