const axios = require("axios");

const nix = "https://raw.githubusercontent.com/noobcore404/NC-STORE/refs/heads/main/NCApiUrl.json";

const x = async () => {
    try {
        const o = await axios.get(nix);
        const nc = o.data?.aryan;
        
        if (!nc) {
            throw new Error("Missing 'aryan' base URL in GitHub JSON.");
        }
        
        return `${nc}/aryan/imgur`; 
    } catch (error) {
        throw new Error(`Failed to load Imgur API configuration from JSON: ${error.message}`);
    }
};

module.exports = {
  config: {
    name: "imgur",
    version: "0.0.1",
    author: "ArYAN",
    countDown: 0,
    role: 0,
    shortDescription: "Upload an image/video to Imgur",
    longDescription: "Reply to an image/video or provide a URL to upload it to Imgur.",
    category: "utility",
    guide: "{pn} reply to an image/video or provide a URL"
  },

  ncStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply } = event;
    let mediaUrl = "";
    let imgurApi;
    
    try {
        imgurApi = await x();
    } catch (apiError) {
        return api.sendMessage(`❌ API Load Error: ${apiError.message}`, threadID, messageID);
    }


    if (messageReply && messageReply.attachments.length > 0) {
      mediaUrl = messageReply.attachments[0].url;
    } else if (args.length > 0) {
      mediaUrl = args.join(" ");
    }

    if (!mediaUrl) {
      return api.sendMessage("❌ Please reply to an image/video or provide a URL!", threadID, messageID);
    }

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const res = await axios.get(`${imgurApi}?url=${encodeURIComponent(mediaUrl)}`);
      const ok = res.data.imgur;

      if (!ok) {
        api.setMessageReaction("", messageID, () => {}, true);
        return api.sendMessage("❌ Failed to upload to Imgur.", threadID, messageID);
      }

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(`${ok}`, threadID, messageID);

    } catch (err) {
      api.setMessageReaction("", messageID, () => {}, true);
      return api.sendMessage("⚠️ An error occurred while uploading.", threadID, messageID);
    }
  }
};