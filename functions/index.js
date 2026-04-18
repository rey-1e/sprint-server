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
                    content: "You are an expert code analyst. Your task is to determine the time and space complexity of the provided code snippet. A crucial rule: When analyzing algorithms that operate on an integer input (e.g., input 'int n'), express the complexity in terms of the magnitude of the number ('n'), NOT the number of its digits ('d'). For example, converting a number 'n' to a string is O(log n), not O(d). Reply ONLY with a valid JSON object. Do not include markdown, explanations, or any text outside of the JSON. The JSON object must have two keys: 'time' and 'space'. For example: {\"time\":\"O(n)\", \"space\":\"O(1)\"}"
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