module.exports = {
  config: {
    name: "logsbot",
    version: "1.0",
    author: "Beatrice bc",
    description: "Log bot events to console",
    category: "events"
  },

  ncStart: async ({ event }) => {
    // lightweight event logger — extend as needed
    if (event && event.type) {
      const ts = new Date().toLocaleTimeString();
      if (["message", "message_reply"].includes(event.type)) return; // skip noisy events
      console.log(`[logsbot] ${ts} | event: ${event.type}`);
    }
  }
};
