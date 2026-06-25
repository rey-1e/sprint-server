const admin = require("firebase-admin");
const Razorpay = require("razorpay");

admin.initializeApp();
const db = admin.firestore();

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "placeholder_key_id",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_key_secret",
});

module.exports = {
  admin,
  db,
  DEEPSEEK_API_URL,
  razorpay
};