const crypto = require("crypto");
const { admin, db } = require("./config");

function handleCors(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Client-Version");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return true;
    }
    return false;
}

async function getOrCreateUser(req) {
    const clientVersion = req.headers['x-client-version'];
    const authHeader = req.headers.authorization;

    if (clientVersion && clientVersion !== '3.0') {
        return { uid: null, isLegacy: true };
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("AuthRequired");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
        throw new Error("Unauthorized");
    }
    const token = parts[1];

    const userQuery = await db.collection("users").where("sessionToken", "==", token).limit(1).get();
    if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const data = userDoc.data();
        if (!data.usage || typeof data.usage !== 'object') {
            data.usage = { complexity: 0, detailed: 0, bug: 0 };
        }
        return { uid: userDoc.id, ...data };
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { uid, email } = decodedToken;

        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();

        let sessionToken;
        let userData;

        if (!doc.exists) {
            sessionToken = crypto.randomBytes(32).toString('hex');
            userData = {
                email: email || "",
                premiumUntil: null,
                sessionToken: sessionToken,
                usage: { complexity: 0, detailed: 0, bug: 0 },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await userRef.set(userData);
        } else {
            userData = doc.data();
            if (!userData.sessionToken) {
                sessionToken = crypto.randomBytes(32).toString('hex');
                await userRef.update({ sessionToken });
                userData.sessionToken = sessionToken;
            } else {
                sessionToken = userData.sessionToken;
            }
        }

        if (!userData.usage || typeof userData.usage !== 'object') {
            userData.usage = { complexity: 0, detailed: 0, bug: 0 };
        }

        return { uid, ...userData, sessionToken };
    } catch (err) {
        console.error("User Authentication Failed:", err);
        const msg = err?.message || "";
        const isAuthError = (
            msg.includes("Firebase ID token") ||
            msg.includes("expired") ||
            msg.includes("invalid-argument") ||
            msg.includes("auth/") ||
            err?.code === "auth/id-token-expired" ||
            err?.errorInfo?.code?.startsWith("auth/")
        );
        if (isAuthError) {
            throw new Error("Unauthorized");
        }
        throw new Error("ServerError:" + msg);
    }
}

async function checkAndIncrementUsage(user, feature, limit) {
    if (user.isLegacy) return true;

    const now = admin.firestore.Timestamp.now();
    if (user.premiumUntil && user.premiumUntil.toMillis() > now.toMillis()) {
        return true; 
    }

    const currentUsage = (user.usage && user.usage[feature]) || 0;
    if (currentUsage >= limit) {
        return false; 
    }

    const userRef = db.collection("users").doc(user.uid);
    
    await userRef.update({
        [`usage.${feature}`]: admin.firestore.FieldValue.increment(1)
    });

    return true;
}

module.exports = {
  handleCors,
  getOrCreateUser,
  checkAndIncrementUsage
};