const express = require("express");
const https = require("https");
const Product = require("../models/Product");

const router = express.Router();

// ── Groq API helper ──────────────────────────────────────────────────────────
async function callGroq(messages) {
  const apiKey = process.env.AI_API_KEY;
  const model  = process.env.GROQ_MODEL || "llama3-8b-8192";

  const payload = JSON.stringify({ model, messages, max_tokens: 512, temperature: 0.7 });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          resolve(json.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate a reply.");
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── System prompt — keeps the bot focused on the shop ───────────────────────
async function buildSystemPrompt() {
  let productList = "";
  try {
    const products = await Product.find({ inStock: true })
      .populate("brand", "name")
      .select("name category brand price unit")
      .lean();
    productList = products
      .map((p) => `- ${p.name} (${p.category}) | Brand: ${p.brand?.name || "Generic"} | ₹${p.price}/${p.unit}`)
      .join("\n");
  } catch (_) { productList = "(product list unavailable)"; }

  return `You are a helpful shop assistant for "Shri Krishna Lighthouse Bhonti", an electrical and electronics shop in Bhonti, India. The shop owner is Anubhav Kanthariya (phone: 8519075190, email: anubhavkanthariya@gmail.com).

You ONLY answer questions related to:
- Products sold in this shop (switches, sockets, wires, MCBs, LED bulbs, tube lights, fans, extension boards, etc.)
- Pricing, availability, brands, and recommendations for electrical/electronics items
- How to place an order, generate a bill, or contact the shop owner

If a question is completely unrelated to electrical/electronics or this shop, politely decline and redirect the user to ask about shop products.

Always be friendly, concise, and helpful. Use ₹ for prices (Indian Rupees). Keep replies under 150 words.

Current in-stock products:
${productList}`;
}

// ── POST /api/bot ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.json({ reply: "Please type a question about our electrical/electronics products." });
    }

    // ── Groq AI path ──────────────────────────────────────────────────────────
    if (process.env.AI_API_KEY) {
      const systemPrompt = await buildSystemPrompt();

      // Build message array: system + recent conversation history + current message
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: message.trim() },
      ];

      const reply = await callGroq(messages);
      return res.json({ reply });
    }

    // ── Offline fallback (no API key) ─────────────────────────────────────────
    const text  = message.trim();
    const lower = text.toLowerCase();

    if (/(hello|hi|hey)/.test(lower)) {
      return res.json({ reply: "Hello! I'm the shop assistant. Ask me about switches, sockets, wires, MCBs, bulbs, or any electrical product and its price." });
    }

    if (lower.includes("price") || lower.includes("rate") || lower.includes("cost")) {
      const words  = lower.split(/\s+/);
      const matches = await Product.find({
        $or: words.map((w) => ({ name: { $regex: w, $options: "i" } })),
      }).limit(5);
      if (matches.length) {
        const lines = matches.map((p) => `${p.name} — ₹${p.price}/${p.unit}`).join("\n");
        return res.json({ reply: `Here's what I found:\n${lines}` });
      }
      return res.json({ reply: "Tell me the product name (e.g. '5-pin socket' or 'MCB') and I'll check the current rate." });
    }

    return res.json({
      reply: "I can only help with questions about our electrical and electronics products. Ask me about switches, sockets, wires, MCBs, bulbs, fans, and prices!",
    });

  } catch (err) {
    console.error("[Bot Error]", err.message);
    res.json({ reply: "Sorry, something went wrong. Please try again in a moment." });
  }
});

module.exports = router;
