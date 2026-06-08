const axios = require("axios");

module.exports = {
config: {
name: "imgbb",
aliases: [],
version: "1.0",
author: "NC-Saimx69x",
countDown: 5,
role: 0,
shortDescription: "Upload multiple images and get URLs",
longDescription: "Reply to images/gif/png will upload them to Imgbb and return URLs."
},

ncStart: async function ({ api, event }) {
try {

if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
return api.sendMessage(
"❌ Please reply to image/gif/png files to upload.",
event.threadID,
event.messageID
);
}

api.setMessageReaction("🕒", event.messageID, () => {}, true);

const attachments = event.messageReply.attachments;

const apiUrl = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";
const rawRes = await axios.get(apiUrl);
const apiBase = rawRes.data.saimx69x;

let results = [];

for (const file of attachments) {
try {
const mediaUrl = file.url;
const res = await axios.get(`${apiBase}/api/imgbb?url=${encodeURIComponent(mediaUrl)}`);
const data = res.data;

if (data.status && data.image?.display_url) {    
        results.push(data.image.display_url);    
    }

} catch {}

}

if (results.length === 0) {
api.setMessageReaction("❌", event.messageID, () => {}, true);
return;
}

api.setMessageReaction("✅", event.messageID, () => {}, true);

if (results.length === 1) {
return api.sendMessage(
results[0],
event.threadID,
event.messageID
);
}

let msg = results.join("\n\n");

return api.sendMessage(
msg,
event.threadID,
event.messageID
);

} catch (err) {
api.setMessageReaction("❌", event.messageID, () => {}, true);
}

}

};