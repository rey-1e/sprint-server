const { onRequest } = require("firebase-functions/v2/https");
const { DEEPSEEK_API_URL } = require("../config");
const { handleCors } = require("../helpers");

exports.analyzeDetailed = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required' });

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

        const requestPayload = {
            model: "deepseek-v4-flash",
            thinking: { type: "disabled" },
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

        const responseContent = messageContent.trim();
        const jsonStart = responseContent.indexOf('{');
        const jsonEnd = responseContent.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format from AI");
        
        const cleanJson = responseContent.substring(jsonStart, jsonEnd + 1);
        const parsedData = JSON.parse(cleanJson);
        return res.status(200).json(parsedData);

    } catch (error) {
        console.error("Detailed Submission Evaluation Error:", error);
        return res.status(500).json({ error: 'Failed to analyze detailed code' });
    }
});