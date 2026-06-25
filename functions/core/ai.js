const { onRequest } = require("firebase-functions/v2/https");
const { DEEPSEEK_API_URL } = require("../config");
const { handleCors, getOrCreateUser, checkAndIncrementUsage } = require("../helpers");

exports.analyze = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const user = await getOrCreateUser(req);
        const allowed = await checkAndIncrementUsage(user, "complexity", 15);
        if (!allowed) {
            return res.status(403).json({ error: "LIMIT_REACHED", message: "You have used your 15 free complexity analyses. Upgrade to premium for unlimited access!" });
        }

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

        const responseContent = messageContent.trim();
        const jsonStart = responseContent.indexOf('{');
        const jsonEnd = responseContent.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format from AI");
        
        const cleanJson = responseContent.substring(jsonStart, jsonEnd + 1);
        const parsedData = JSON.parse(cleanJson);
        return res.status(200).json(parsedData);

    } catch (error) {
        console.error("Complexity Analysis Operation Error:", error);
        if (error.message === "AuthRequired") return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in to CodeSprint to analyze.' });
        if (error.message === "Unauthorized") return res.status(401).json({ error: 'Unauthorized', message: 'Session expired. Please log in again.' });
        return res.status(500).json({ error: 'Failed to analyze code' });
    }
});

exports.findmybug = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const user = await getOrCreateUser(req);
        const allowed = await checkAndIncrementUsage(user, "bug", 7);
        if (!allowed) {
            return res.status(403).json({ error: "LIMIT_REACHED", message: "You have used your 7 free debugger checks. Upgrade to premium for unlimited access!" });
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
            model: "deepseek-v4-flash",
            thinking: { type: "disabled" },
            messages:[
                {
                    role: "system",
                    content: `You are an elite, programmatic algorithmic debugger. Your sole job is to identify real logical, syntactic, or runtime errors that would cause a submission to fail.

STRICT CLASSIFICATION RULES:
1. "Bugs" are strictly defined as actual issues that cause compilation failures, runtime crashes, wrong outputs, or performance failures (TLE/MLE).
   - Only report physical syntactic errors (such as missing semicolons, unmatched braces, or unclosed blocks) if they genuinely prevent the code from compiling. 
   - Do not hallucinate or invent syntax errors (such as fake backslashes or typos inside standard comments) where they do not physically exist.
   - This also includes logical bugs like wrong answers, infinite loops, and incomplete implementations.

2. LACK OF IMPLEMENTATION / EMPTY PLACEHOLDERS:
   - If the code is just an empty template, a starter boilerplate, or only contains variable declarations and an empty/dummy return statement (e.g., returning an empty vector, empty list, null, or 0) without actually implementing the algorithm described in the problem context, this is a "Wrong Answer" bug. You must NOT say "There are no errors." Instead, output bullet points stating that the algorithm is unimplemented, incomplete, or a dummy placeholder that will fail on non-empty test cases.

3. "Permissible Variations" are NOT bugs. For example:
   - Returning indices in any order when the problem description explicitly states "You may return the answer in any order" (such as Two Sum) is 100% correct.
   - Any solution that passes all official test cases has ZERO bugs. Do Not hallucinate and put unnecessary points as bugs, it's fine if the code style is different.
   - Do NOT flag alternative, non-traditional, or slightly unoptimized-but-passing approaches as bugs.

4. STRICT BULLET POINT DEDUPLICATION & UNIQUE FINDINGS (CRITICAL):
   - Each bullet point must target a completely distinct, unique root cause.
   - Repetition of the same issue using different words is strictly forbidden.
   - Do not separate a single error into multiple cascading bullet points. Keep your findings clean, unique, and strictly grouped by root cause.
   - Distinct, unrelated physical errors are separate root causes and must be reported on completely separate, unique bullet points.
   - Each bullet point must be extremely short, direct, and limited to a single concise sentence of at most 15 words. No paragraphs or verbose explanations are allowed.
   
5. NO BULLET POINTS FOR CORRECT CODE:
   - If the code is correct, fully implemented, compiles, and passes all test cases, you must not invent, exaggerate, or hallucinate any issues. You are strictly forbidden from writing any analysis, summaries, warnings, or bullet points.
   - You must output EXACTLY and ONLY the four-word phrase:
   There are no errors.
   - If there are no actual compile-breaking or test-failing errors, you must write absolutely nothing else.

6. IF AND ONLY IF THERE ARE ACTUAL, PLATFORM-REJECTING BUGS:
   - Output at most 3 or 4 extremely precise, technical, and constructive bullet points describing only the actual bugs.
   - Start each line with "- ".
   - Do not write any preamble, introduction, or positive bullet points. Only list what is broken.
   - Each bullet point must be a single, short sentence. Do not write paragraphs or multi-sentence descriptions.`
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
        console.error("AI Debugging Execution Error:", error);
        if (error.message === "AuthRequired") {
            return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in to CodeSprint.' });
        }
        if (error.message === "Unauthorized") {
            return res.status(401).json({ error: 'Unauthorized', message: 'Session expired. Please log in again.' });
        }
        return res.status(500).json({ error: `Server error: ${error.message}` });
    }
});

exports.sprintAIChat = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const user = await getOrCreateUser(req);
        const allowed = await checkAndIncrementUsage(user, "chat", 10);
        if (!allowed) {
            return res.status(403).json({ error: "LIMIT_REACHED", message: "You have used your 10 free sprintAI chat queries. Upgrade to premium for unlimited access!" });
        }

        const { message, history } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

        const formattedMessages = [
            {
                role: "system",
                content: `You are sprintAI, embedded inside CodeSprint Extension, try to speak less`
            }
        ];

        if (history && Array.isArray(history)) {
            history.forEach(h => {
                formattedMessages.push({ role: h.role, content: h.content });
            });
        }

        formattedMessages.push({ role: "user", content: message });

        const requestPayload = {
            model: "deepseek-v4-flash",
            thinking: { type: "disabled" },
            messages: formattedMessages
        };

        const apiResponse = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(requestPayload)
        });

        if (!apiResponse.ok) throw new Error(`DeepSeek API responded with status ${apiResponse.status}`);

        const responseData = await apiResponse.json();
        const reply = responseData.choices[0].message.content.trim();

        return res.status(200).json({ reply });

    } catch (error) {
        console.error("SprintAI Chat Error:", error);
        if (error.message === "AuthRequired") return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in to CodeSprint to use AI Chat.' });
        if (error.message === "Unauthorized") return res.status(401).json({ error: 'Unauthorized', message: 'Session expired. Please log in again.' });
        return res.status(500).json({ error: 'Failed to process AI chat query' });
    }
});
