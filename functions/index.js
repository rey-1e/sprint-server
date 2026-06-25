const { analyzeDetailed } = require("./leetcode/ai");
const { analyze, findmybug, sprintAIChat } = require("./core/ai");
const { getTheme } = require("./leetcode/themes");
const { getCodeforcesTheme } = require("./codeforces/themes");
const { syncUser } = require("./user");
const { createRazorpayOrder, verifyPayment } = require("./payments");

// Export endpoints to register on Firebase (identical function names preserved)
exports.analyze = analyze;
exports.analyzeDetailed = analyzeDetailed;
exports.findmybug = findmybug;
exports.getTheme = getTheme;
exports.getCodeforcesTheme = getCodeforcesTheme;
exports.syncUser = syncUser;
exports.createRazorpayOrder = createRazorpayOrder;
exports.verifyPayment = verifyPayment;
exports.sprintAIChat = sprintAIChat;