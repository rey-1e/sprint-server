const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { THEME_STYLES, SECURE_LAYOUT_BASE_CSS } = require("./config");
const { handleCors, getOrCreateUser } = require("./helpers");

exports.syncUser = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).send();
    try {
        const user = await getOrCreateUser(req);

        if (user.isLegacy) {
            return res.status(400).json({ error: "Missing client version header." });
        }

        const now = admin.firestore.Timestamp.now();
        const isPremium = (user.premiumUntil && user.premiumUntil.toMillis() > now.toMillis()) || false;
        const premiumUntilMillis = user.premiumUntil ? user.premiumUntil.toMillis() : null;

        return res.status(200).json({ 
            success: true, 
            sessionToken: user.sessionToken, 
            email: user.email,
            isPremium: isPremium,
            premiumUntil: premiumUntilMillis
        });
    } catch (err) {
        const isServerError = err.message?.startsWith("ServerError:");
        if (isServerError) {
            const detail = err.message.replace("ServerError:", "");
            return res.status(500).json({ error: "ServerError", detail });
        }
        return res.status(401).json({ error: err.message });
    }
});

exports.getTheme = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).send();

    try {
        const user = await getOrCreateUser(req);
        const { themeName } = req.body;

        if (!themeName || themeName === "default") {
            return res.status(200).json({ success: true, fullCSS: null });
        }

        const now = admin.firestore.Timestamp.now();
        const isPremium = !user.isLegacy && user.premiumUntil && user.premiumUntil.toMillis() > now.toMillis();

        if (!isPremium) {
            return res.status(403).json({ error: "PREMIUM_REQUIRED", message: "This theme requires a Premium subscription." });
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
        if (err.message === "AuthRequired") return res.status(401).json({ error: "AUTH_REQUIRED", message: "Please sign in to access themes." });
        if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
        return res.status(500).json({ error: "Internal Server Error" });
    }
});