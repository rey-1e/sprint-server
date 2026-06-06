const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "placeholder_key_id",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_key_secret",
});

const SECURE_LAYOUT_BASE_CSS = `
html[data-lc-theme] {
  --layer-bg-pure: var(--bg-base) !important;
  --layer-bg-gray: var(--bg-base) !important;
  --fill-pure: var(--bg-base) !important;
  --dark-gray-10: var(--bg-base) !important;
  --gray-10: var(--bg-base) !important;

  --layer-01: var(--bg-surface) !important;
  --layer-02: var(--bg-surface) !important;
  --layer-03: var(--bg-surface) !important;
  --dark-gray-20: var(--bg-surface) !important;
  --dark-gray-30: var(--bg-surface) !important;
  --dark-gray-40: var(--bg-surface) !important;
  --gray-20: var(--bg-surface) !important;
  --gray-40: var(--bg-surface) !important;

  --brand-orange: var(--brand-accent) !important;
  --dark-brand-orange: var(--brand-accent) !important;
  --light-brand-orange: var(--brand-accent) !important;
}

html[data-lc-theme] body,
html[data-lc-theme] #__next,
html[data-lc-theme] [class*="bg-dark-layer-bg"],
html[data-lc-theme] [class*="bg-layer-bg"],
html[data-lc-theme] div[class*="bg-zinc-950"],
html[data-lc-theme] div[class*="bg-neutral-950"],
html[data-lc-theme] div[class*="bg-[#1a1a1a]"],
html[data-lc-theme] div[class*="dark:bg-[#1a1a1a]"] {
  background-color: var(--bg-base) !important;
  background-image: none !important;
}

html[data-lc-theme] nav,
html[data-lc-theme] header,
html[data-lc-theme] [class*="bg-dark-layer-1"],
html[data-lc-theme] [class*="bg-lc-layer-01"] {
  background-color: var(--bg-base) !important;
}

html[data-lc-theme] {
  --color-tabset-background: var(--bg-base) !important;
  --color-splitter: var(--bg-base) !important;
  --color-tab-selected-background: var(--bg-surface) !important;
  --color-tab-hover-background: var(--bg-surface) !important;
  --color-tabset-tabbar-background: var(--bg-base) !important;
  --color-tab-selected: #ffffff !important;
  --color-tab-unselected: rgba(255, 255, 255, 0.45) !important;
}

html[data-lc-theme] .bg-sd-background,
html[data-lc-theme] .bg-sd-background-gray,
html[data-lc-theme] .bg-sd-gray-950 {
  background-color: var(--bg-base) !important;
}

html[data-lc-theme] .bg-sd-card,
html[data-lc-theme] .bg-sd-popover,
html[data-lc-theme] .bg-sd-muted,
html[data-lc-theme] .bg-sd-gray-900,
html[data-lc-theme] .bg-sd-gray-800 {
  background-color: var(--bg-surface) !important;
}

html[data-lc-theme] .border-sd-border,
html[data-lc-theme] .border-sd-divider,
html[data-lc-theme] .border-sd-separator-nonopaque,
html[data-lc-theme] .border-sd-gray-700 {
  border-color: var(--border-color) !important;
}

html[data-lc-theme] table,
html[data-lc-theme] thead,
html[data-lc-theme] tbody,
html[data-lc-theme] tr,
html[data-lc-theme] th,
html[data-lc-theme] td,
html[data-lc-theme] [class*="no-scrollbar"],
html[data-lc-theme] .view-lines {
  background-color: transparent !important;
}

html[data-lc-theme] .monaco-editor,
html[data-lc-theme] .monaco-editor-background,
html[data-lc-theme] .monaco-editor .margin,
html[data-lc-theme] .margin-view-overlays {
  background-color: var(--bg-surface) !important;
}

html[data-lc-theme] .monaco-editor .current-line,
html[data-lc-theme] .monaco-editor .view-overlays .current-line,
html[data-lc-theme] .monaco-editor .margin-view-overlays .current-line-margin {
  background-color: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

html[data-lc-theme] .monaco-editor .selected-text,
html[data-lc-theme] .monaco-editor .focused .selected-text,
html[data-lc-theme] .monaco-editor .view-overlays .selected-text,
html[data-lc-theme] div.monaco-editor div.view-overlays div.selected-text,
html[data-lc-theme] ::selection,
html[data-lc-theme] *::selection {
  background-color: color-mix(in srgb, var(--brand-accent) 25%, transparent) !important;
}

html[data-lc-theme] ::-webkit-scrollbar {
  width: 0px !important;
  height: 0px !important;
  display: none !important;
}

html[data-lc-theme] {
  scrollbar-width: none !important;
}
`;

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

    if (clientVersion !== '3.0') {
        return { uid: null, isLegacy: true };
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("AuthRequired");
    }

    const token = authHeader.split("Bearer ")[1];

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
    await userRef.set({
        usage: {
            [feature]: admin.firestore.FieldValue.increment(1)
        }
    }, { merge: true });

    return true;
}

exports.analyze = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const user = await getOrCreateUser(req);
        const allowed = await checkAndIncrementUsage(user, "complexity", 5);
        if (!allowed) {
            return res.status(403).json({ error: "LIMIT_REACHED", message: "You have used your 5 free complexity analyses. Upgrade to premium for unlimited access!" });
        }

        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required' });

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

        const requestPayload = {
            model: "deepseek-coder",
            messages:[
                {
                    role: "system",
                    content: `You are an elite computer science professor and expert performance analyst.
Determine the worst-case Time Complexity and Space Complexity of the provided code snippet using strict Big O notation.

STRICT RULES:
1. TIME COMPLEXITY: Account for worst-case nested loops, recursions, and internal library functions (e.g., sorting is O(n log n), slicing is O(k)). State this as O(expression).
2. SPACE COMPLEXITY: Account only for extra auxiliary memory allocated by your algorithm (hash tables, trees, recursive call stack). Do NOT count the input variables/structures themselves as auxiliary space unless copies are made.
3. Output ONLY a valid JSON object. Do not wrap the JSON in markdown blocks (e.g. no \`\`\`json). Do not add any conversational text.

4. INCOMPLETE OR BROKEN CODE HANDLING:
   - If the code is incomplete, syntactically broken, has mismatched/missing braces, or contains a typo, do not give up. You must analyze the visible, typed operations and instructions currently written to estimate their Big O complexity.

5. NO "N/A" OR PLACEHOLDER OUTPUTS (CRITICAL):
   - Under no circumstances should you output "N/A", "N/A (invalid code)", or similar placeholder indicators. You must always return an exact Big O notation (e.g., "O(1)" for simple variable definitions, standard declarations, returns, or sequential non-looping statements).

6. STRICT PHYSICAL SNIPPET ANALYSIS (CRITICAL):
   - Analyze ONLY the actual, literal operations, loops, variables, and allocations currently written inside the provided code block. 
   - DO NOT analyze what the algorithm "is supposed to do" or its "optimal theoretical counterpart" based on the function name or the problem title (e.g., if the function is named 'twoSum' but contains only standard variable initialization and an empty return statement, the complexity is strictly O(1) Time and O(1) Space).
   - Do not assume a hash map allocation scales to O(N) space unless there is a loop or insertion operation that actually populates it with N items based on the input size. If a hash map is initialized but remains empty or only has constant-size insertions, its auxiliary space complexity is O(1).

EXPECTED OUTPUT FORMAT (No other text):
{
  "time": "O(...)",
  "space": "O(...)"
}`
                },
                { role: "user", content: code }
            ]
        };

        const apiResponse = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(requestPayload)
        });

        if (!apiResponse.ok) throw new Error(`DeepSeek API responded with status ${apiResponse.status}`);

        const responseData = await apiResponse.json();
        const messageContent = responseData.choices[0].message.content;

        const jsonStart = messageContent.indexOf('{');
        const jsonEnd = messageContent.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format from AI");
        
        const parsedData = JSON.parse(messageContent.substring(jsonStart, jsonEnd + 1));
        return res.status(200).json(parsedData);

    } catch (error) {
        if (error.message === "AuthRequired") return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in to LeetCode Sprint to analyze.' });
        if (error.message === "Unauthorized") return res.status(401).json({ error: 'Unauthorized', message: 'Session expired. Please log in again.' });
        return res.status(500).json({ error: 'Failed to analyze code' });
    }
});

exports.analyzeDetailed = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    try {
        const user = await getOrCreateUser(req);
        const allowed = await checkAndIncrementUsage(user, "detailed", 5);
        if (!allowed) {
            return res.status(403).json({ error: "LIMIT_REACHED", message: "You have used your 5 free post-submission analyses. Upgrade to premium for unlimited access!" });
        }

        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required' });

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

        const requestPayload = {
            model: "deepseek-coder",
            messages:[
                {
                    role: "system",
                    content: `You are an expert code reviewer. Analyze the LeetCode submission and return ONLY a valid JSON object. Keep answers VERY SHORT AND CRISP (max 10-15 words per text field):
                    {
                        "summary": "1 short encouraging sentence based on the overall code.",
                        "app_current": "Current data structures used.",
                        "app_suggested": "Optimal data structures to use.",
                        "app_keyidea": "1 short sentence explaining the core logic.",
                        "eff_current": "Current Time/Space complexity.",
                        "eff_suggested": "Optimal Time/Space complexity.",
                        "eff_suggestions": "1 short sentence suggesting how to improve efficiency.",
                        "sty_readability": "1 word evaluation.",
                        "sty_structure": "1 word evaluation.",
                        "sty_suggestions": "1 short sentence on cleanliness."
                    }`
                },
                { role: "user", content: code }
            ]
        };

        const apiResponse = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(requestPayload)
        });

        if (!apiResponse.ok) throw new Error(`DeepSeek API responded with status ${apiResponse.status}`);

        const responseData = await apiResponse.json();
        const messageContent = responseData.choices[0].message.content;

        const jsonStart = messageContent.indexOf('{');
        const jsonEnd = messageContent.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format from AI");
        
        const parsedData = JSON.parse(messageContent.substring(jsonStart, jsonEnd + 1));
        return res.status(200).json(parsedData);

    } catch (error) {
        if (error.message === "AuthRequired") return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in to LeetCode Sprint to analyze submissions.' });
        if (error.message === "Unauthorized") return res.status(401).json({ error: 'Unauthorized', message: 'Session expired. Please log in again.' });
        return res.status(500).json({ error: 'Failed to analyze detailed code' });
    }
});

exports.findmybug = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const user = await getOrCreateUser(req);
        const allowed = await checkAndIncrementUsage(user, "bug", 3);
        if (!allowed) {
            return res.status(403).json({ error: "LIMIT_REACHED", message: "You have used your 3 free debugger checks. Upgrade to premium for unlimited access!" });
        }

        const { code, problemTitle, problemContext } = req.body;
        if (!code) {
            return res.status(400).json({ error: "No code received by server." });
        }

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "Missing DEEPSEEK_API_KEY configuration." });
        }

        const requestPayload = {
            model: "deepseek-coder",
            messages:[
                {
                    role: "system",
                    content: `You are an elite, programmatic algorithmic debugger. Your sole job is to identify real logical, syntactic, or runtime errors that would cause a LeetCode submission to fail.

STRICT CLASSIFICATION RULES:
1. "Bugs" are strictly defined as issues that cause compiler errors, runtime crashes, wrong outputs, or performance failures (TLE/MLE).
   - This includes physical compiler-breaking syntax bugs, hanging characters, unclosed blocks, misplaced operators, missing semicolons, and stray characters (for example: a lone backslash '\\' or any typos outside/inside code blocks) which would trigger a compiler error like "stray '\\' in program". Look extremely closely at the code character-by-character to spot these.
   - This also includes logical bugs like wrong answers, infinite loops, and incomplete implementations.

2. LACK OF IMPLEMENTATION / EMPTY PLACEHOLDERS:
   - If the code is just an empty template, a starter boilerplate, or only contains variable declarations and an empty/dummy return statement (e.g., returning an empty vector, empty list, null, or 0) without actually implementing the algorithm described in the problem context, this is a "Wrong Answer" bug. You must NOT say "There are no errors." Instead, output bullet points stating that the algorithm is unimplemented, incomplete, or a dummy placeholder that will fail on non-empty test cases.

3. "Permissible Variations" are NOT bugs. For example:
   - Returning indices in any order when the problem description explicitly states "You may return the answer in any order" (such as Two Sum) is 100% correct.
   - Any solution that passes all official LeetCode test cases has ZERO bugs.
   - Do NOT flag alternative, non-traditional, or slightly unoptimized-but-passing approaches as bugs.

4. STRICT BULLET POINT DEDUPLICATION & UNIQUE FINDINGS (CRITICAL):
   - Each bullet point must target a completely distinct, unique root cause.
   - Repetition of the same issue using different words is strictly forbidden.
   - Do not separate a single error into multiple cascading bullet points (e.g., if a missing closing brace causes a compilation error, describe it inside a single bullet point. Do not create one bullet for the missing brace and another bullet for the resulting compilation error). Keep your findings clean, unique, and strictly grouped by root cause.
   
5. NO BULLET POINTS FOR CORRECT CODE:
   - If the code is fully implemented, correct, and would successfully compile and pass all test cases on LeetCode, you are strictly forbidden from writing any analysis, summaries, praise, or self-correcting bullet points.
   - You must output EXACTLY and ONLY the four-word phrase:
   There are no errors.
   - Any bullet points, markdown formatting, or trailing text will be interpreted as a compilation failure by the automated extension parser. If there are no errors, you must write absolutely nothing else.

6. IF AND ONLY IF THERE ARE ACTUAL, PLATFORM-REJECTING BUGS:
   - Output at most 3 or 4 extremely precise, technical, and constructive bullet points describing only the actual bugs.
   - Start each line with "- ".
   - Do not write any preamble, introduction, or positive bullet points. Only list what is broken.`
        },
        { 
            role: "user", 
            content: `Problem: ${problemTitle || "Unknown"}\n\nDescription:\n${problemContext || "No description provided."}\n\nUser Code:\n${code}` 
        }
    ]
};

        const apiResponse = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(requestPayload)
        });

        if (!apiResponse.ok) {
            throw new Error(`API Error ${apiResponse.status}`);
        }

        const responseData = await apiResponse.json();
        const messageContent = responseData.choices[0].message.content.trim();
        return res.status(200).json({ feedback: messageContent });

    } catch (error) {
        if (error.message === "AuthRequired") {
            return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in to LeetCode Sprint.' });
        }
        if (error.message === "Unauthorized") {
            return res.status(401).json({ error: 'Unauthorized', message: 'Session expired. Please log in again.' });
        }
        return res.status(500).json({ error: `Server error: ${error.message}` });
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

exports.createRazorpayOrder = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).send();
    
    try {
        await getOrCreateUser(req);
    } catch (authErr) {
        return res.status(401).json({ error: "AUTH_REQUIRED", message: "Sign in required before initiating purchases." });
    }

    const { planType } = req.body; 
    if (planType !== "1day" && planType !== "30days") {
        return res.status(400).json({ error: "Invalid planType selection." });
    }

    const amountInPaise = planType === "1day" ? 4250 : 25500;

    try {
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_sprint_${Date.now()}`
        });
        return res.status(200).json(order);
    } catch (err) {
        return res.status(500).json({ error: "Unable to process payment gateway order." });
    }
});

exports.verifyPayment = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).send();

    try {
        const user = await getOrCreateUser(req);

        if (user.isLegacy) {
            return res.status(401).json({ 
                error: "Missing client version header. Contact support with your payment ID." 
            });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing payment parameters." });
        }

        const paymentRef = db.collection("payments").doc(razorpay_payment_id);
        const paymentDoc = await paymentRef.get();
        if (paymentDoc.exists) {
            return res.status(409).json({ error: "REPLAY_ATTEMPT", message: "This payment transaction has already been credited." });
        }

        const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!razorpaySecret || razorpaySecret === "placeholder_key_secret") {
            return res.status(500).json({ error: "Payment gateway not configured on server." });
        }

        const generatedSignature = crypto
            .createHmac('sha256', razorpaySecret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Tampered or invalid signature parameters." });
        }

        const addedDays = planType === "1day" ? 1 : 30;
        const now = new Date();
        let currentExpiry = new Date(now);

        if (user.premiumUntil) {
            const currentVal = user.premiumUntil.toDate();
            if (currentVal > now) {
                currentExpiry = new Date(currentVal);
            }
        }
        currentExpiry.setDate(currentExpiry.getDate() + addedDays);

        await paymentRef.set({
            userId: user.uid,
            orderId: razorpay_order_id,
            planType: planType,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("users").doc(user.uid).set({
            premiumUntil: admin.firestore.Timestamp.fromDate(currentExpiry),
            lastPaymentId: razorpay_payment_id,
            lastPaymentAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return res.status(200).json({ success: true, expiry: currentExpiry.getTime() });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});