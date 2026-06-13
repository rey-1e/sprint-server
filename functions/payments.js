const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { db, razorpay } = require("./config");
const { handleCors, getOrCreateUser } = require("./helpers");

exports.createRazorpayOrder = onRequest({ cors: false }, async (req, res) => {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).send();
    
    try {
        await getOrCreateUser(req);
    } catch (authErr) {
        return res.status(401).json({ error: "AUTH_REQUIRED", message: "Sign in required before initiating purchases." });
    }

    const { planType } = req.body; 
    if (planType !== "1day" && planType !== "30days" && planType !== "monthly" && planType !== "month" && planType !== "1month") {
        return res.status(400).json({ error: "Invalid planType selection." });
    }

    const amountInPaise = planType === "1day" ? 1200 : 7500;

    try {
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_sprint_${Date.now()}`
        });
        return res.status(200).json(order);
    } catch (err) {
        console.error("Razorpay Order Creation Error:", err);
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
        console.error("Razorpay Payment Verification Error:", err);
        return res.status(500).json({ error: err.message });
    }
});