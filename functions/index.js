const { onRequest } = require("firebase-functions/v2/https");

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// --- EXISTING ENDPOINT ---
exports.analyze = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

    try {
        const requestPayload = {
            model: "deepseek-coder",
            messages:[
                {
                    role: "system",
                    content: "You are an expert code analyst. Your task is to determine the time and space complexity STRICTLY of the provided code snippet. A crucial rule: Analyze ONLY the actual execution of the written code. If the function body is empty, incomplete, or a boilerplate stub, evaluate its complexity based strictly on that minimal execution (typically O(1) time and O(1) space). Do NOT assume, extrapolate, or guess the complexity of the intended or standard solution based on the function name (e.g., 'twoSum'), class name, or comments. When analyzing algorithms that operate on an integer input (e.g., input 'int n'), express the complexity in terms of the magnitude of the number ('n'), NOT the number of its digits ('d'). For example, converting a number 'n' to a string is O(log n), not O(d). Reply ONLY with a valid JSON object. Do not include markdown, explanations, or any text outside of the JSON. The JSON object must have two keys: 'time' and 'space'. For example: {\"time\":\"O(n)\", \"space\":\"O(1)\"}"
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
        return res.status(500).json({ error: 'Failed to analyze code' });
    }
});

// --- NEW MULTI-TAB SUBMISSION ENDPOINT ---
exports.analyzeDetailed = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

    try {
        const requestPayload = {
            model: "deepseek-coder",
            messages:[
                {
                    role: "system",
                    content: `You are an expert code reviewer. Analyze the LeetCode submission and return ONLY a valid JSON object. Do not include markdown blocks or extra text. Format MUST have exactly these string keys. Keep answers VERY SHORT AND CRISP (max 10-15 words per text field):
                    {
                        "summary": "1 short encouraging sentence based on the overall code.",
                        "app_current": "Current data structures used (e.g., 'Hash Table / Array').",
                        "app_suggested": "Optimal data structures to use (e.g., 'Hash Table / Two Pointers').",
                        "app_keyidea": "1 short sentence explaining the core logic of the ideal approach.",
                        "eff_current": "Current Time/Space complexity (e.g., 'O(NlogN)').",
                        "eff_suggested": "Optimal Time/Space complexity (e.g., 'O(N)').",
                        "eff_suggestions": "1 short sentence suggesting how to improve efficiency.",
                        "sty_readability": "1 word (e.g., 'Excellent', 'Good', 'Needs Work').",
                        "sty_structure": "1 word (e.g., 'Excellent', 'Good', 'Needs Work').",
                        "sty_suggestions": "1 short sentence on code cleanliness or naming conventions."
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
        return res.status(500).json({ error: 'Failed to analyze detailed code' });
    }
});

// --- NEW: WHERE AM I WRONG ENDPOINT ---
exports.findmybug = onRequest({ cors: true }, async (req, res) => {
    try {
        if (req.method !== 'POST') {
            return res.status(200).json({ feedback: "🚨 Error: Method Not Allowed" });
        }
        
        // Extract the context
        const { code, problemTitle, problemContext } = req.body;
        
        if (!code) {
            return res.status(200).json({ feedback: "🚨 Error: No code received by server." });
        }

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            return res.status(200).json({ feedback: "🚨 Server config error: Missing DEEPSEEK_API_KEY." });
        }

        const requestPayload = {
            model: "deepseek-chat",
            messages:[
                {
                    role: "system",
                    content: "You are an expert algorithms debugger. Analyze the user's code strictly against the provided LeetCode problem description to determine if it correctly solves the problem. Focus strictly on whether the code is a fully working, correct solution that satisfies the task requirements. If the code successfully solves the problem, passes all test cases, and is logically correct (even if it uses an inefficient, brute-force O(N^4) approach), you must reply with EXACTLY: 'There are no errors.' Absolutely do NOT recommend optimizations, cleaner style, alternative algorithms, or time/space complexity improvements. If the code is a placeholder stub, does not implement the required logic, returns incorrect answers, fails to satisfy the description, or contains logical/syntax bugs, it is INCORRECT; you must identify what is missing or wrong. Format your feedback into at most 3 or 4 bullet points. Start each point with a dash and a space (e.g., '- '). Do NOT use letters, numbers, or sub-bullets. Keep each bullet point extremely short and crisp (maximum of 12 words per point). Do not write any code, and do not provide the exact solution."
                },
                { 
                    role: "user", 
                    // Inject the problem context alongside the code
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
            const errorText = await apiResponse.text();
            return res.status(200).json({ feedback: `🚨 DeepSeek API Error (${apiResponse.status}): ${errorText}` });
        }

        const responseData = await apiResponse.json();
        
        if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
            return res.status(200).json({ feedback: `🚨 Unexpected API format: ${JSON.stringify(responseData)}` });
        }

        const messageContent = responseData.choices[0].message.content.trim();
        return res.status(200).json({ feedback: messageContent });

    } catch (error) {
        console.error("FindMyBug Fatal Crash: " + error.message);
        return res.status(200).json({ feedback: `🚨 Fatal Server Error: ${error.message}` });
    }
});