// scripts/cmds/creator/hfkeyadd.js — Set / update HuggingFace API token
// Usage: .hfkeyadd hf_xxx...

const path = require("path");
const axios = require("axios");
const HFKey = require(path.join(process.cwd(), "utils", "HFKey.js"));

module.exports.config = {
    name: "hfkeyadd",
    version: "1.0.0",
    author: "sekro",
    countDown: 5,
    role: 3,
    usePrefix: true,
    description: "Set the HuggingFace API token for image/audio fallback models.",
    category: "creator",
    guide: { en: "{pn} <hf_token>  e.g: {pn} hf_xxxx..." },
};

module.exports.ncStart = async ({ api, event, args }) => {
    const token = (args[0] || "").trim();

    if (!token) {
        const current = HFKey.get();
        const masked = current
            ? `${current.slice(0, 6)}...${current.slice(-4)}`
            : "not set";
        return api.sendMessage(
            [
                "🤗 HuggingFace Token Manager",
                "",
                `📌 Current token: ${masked}`,
                "",
                "Usage: .hfkeyadd <token>",
                "Get a free token at: https://hf.co/settings/tokens",
                "Choose type: Read (enough for inference)",
            ].join("\n"),
            event.threadID, event.messageID
        );
    }

    if (!token.startsWith("hf_")) {
        return api.sendMessage(
            "❌ Invalid token format.\n🔎 HuggingFace tokens start with \"hf_\"\nGet one at: https://hf.co/settings/tokens",
            event.threadID, event.messageID
        );
    }

    await api.sendMessage("🔄 Testing HuggingFace token... ⏳", event.threadID);

    // Quick test: try to ping a simple model
    let testOk = false;
    let testModel = "openai/whisper-large-v3";
    try {
        const res = await axios.get(
            `https://api-inference.huggingface.co/models/${testModel}`,
            {
                timeout: 10000,
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        testOk = res.status === 200;
    } catch (e) {
        const status = e.response?.status;
        // 503 = model loading (but token valid), 200 = ok, 401 = bad token
        if (status === 503) testOk = true;
        else if (status === 401 || status === 403) {
            return api.sendMessage(
                "❌ Token rejected by HuggingFace!\n🔎 Make sure you copied the full token from:\nhttps://hf.co/settings/tokens",
                event.threadID, event.messageID
            );
        } else {
            testOk = true; // assume ok for other errors
        }
    }

    HFKey.set(token);
    const masked = `${token.slice(0, 6)}...${token.slice(-4)}`;

    return api.sendMessage(
        [
            "✅ HuggingFace token saved! 🎉🤗",
            "",
            `🔑 Token: [ ${masked} ]`,
            `📅 Saved: ${new Date().toLocaleDateString("en-GB")}`,
            `📊 Status: ${testOk ? "✔️ VALID" : "⚠️ Could not verify — saved anyway"}`,
            "",
            "This token enables:",
            "  🖼️  Image fallback: BLIP, ViT-GPT2, Phi-3 Vision",
            "  🎙️  Audio fallback: Whisper Large v3",
            "  💬  Chat fallback: Llama-3, Mistral-7B, Phi-3",
        ].join("\n"),
        event.threadID, event.messageID
    );
};
