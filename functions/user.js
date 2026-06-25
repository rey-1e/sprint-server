const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
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