const { analyze, analyzeDetailed, findmybug } = require("./ai");
const { syncUser, getTheme } = require("./user");
const { createRazorpayOrder, verifyPayment } = require("./payments");

// Export endpoints to register on Firebase (identical to original exports)
exports.analyze = analyze;
exports.analyzeDetailed = analyzeDetailed;
exports.findmybug = findmybug;
exports.getTheme = getTheme;
exports.syncUser = syncUser;
exports.createRazorpayOrder = createRazorpayOrder;
exports.verifyPayment = verifyPayment;