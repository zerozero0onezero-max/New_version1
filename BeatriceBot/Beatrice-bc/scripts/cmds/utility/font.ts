import axios from "axios";

const command = {
  config: {
    name: "font",
    aliases: ["style"],
    version: "1.0",
    author: "Saimx69x",
    countDown: 5,
    role: 0,
    shortDescription: "Convert text to fancy fonts.",
    longDescription: "Use /font <id> <text> or /font list",
    guide: "{pn} list | {pn} 16 NoobCore 404"
  },

  ncStart: async ({ message, event, api }: any) => {
    try {
      const body = event.body || "";
      const args = body.split(" ").slice(1);

      if (!args.length) {
        return api.sendMessage(
          "❌ Invalid usage!\nUse /font list to see available fonts\nor /font [number] [text] to convert",
          event.threadID,
          event.messageID
        );
      }

      const baseData = await axios.get(
        "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json"
      );
      const baseUrl = baseData.data.saimx69x;

      if (args[0].toLowerCase() === "list") {
        const text = args.slice(1).join(" ").trim() || "NoobCore 404";

        const res = await axios.get(`${baseUrl}/api/font2`, {
          params: { id: "list", text }
        });

        if (!res.data.results) {
          return api.sendMessage(
            "❌ Oops! Something went wrong, please try again later.",
            event.threadID,
            event.messageID
          );
        }

        let output = `FONT LIST\n────────────\nText: ${text}\n\n`;

        Object.entries(res.data.results).forEach(
          ([id, font]: [string, any]) => {
            output += `[${id.padStart(2, "0")}] ${font}\n`;
          }
        );

        output += "────────────";

        return api.sendMessage(output, event.threadID, event.messageID);
      }

      const id = args[0];
      const text = args.slice(1).join(" ");

      if (!text) {
        return api.sendMessage(
          "❌ Invalid usage! Provide text to convert.",
          event.threadID,
          event.messageID
        );
      }

      const res = await axios.get(`${baseUrl}/api/font2`, {
        params: { id, text }
      });

      if (res.data.result) {
        return api.sendMessage(
          res.data.result,
          event.threadID,
          event.messageID
        );
      } else {
        return api.sendMessage(
          `❌ Font ${id} not found!`,
          event.threadID,
          event.messageID
        );
      }

    } catch (err) {
      console.error(err);
      return api.sendMessage(
        "❌ Oops! Something went wrong, please try again later.",
        event.threadID,
        event.messageID
      );
    }
  }
};

export default command;