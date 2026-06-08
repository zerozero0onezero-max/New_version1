const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handlerCheckData.js");

module.exports = (
  api,
  threadModel,
  userModel,
  dashBoardModel,
  globalModel,
  usersData,
  threadsData,
  dashBoardData,
  globalData
) => {

  const handlerEvents = require(
    process.env.NODE_ENV === "development"
      ? "./handlerEvents.dev.js"
      : "./handlerEvents.js"
  )(
    api,
    threadModel,
    userModel,
    dashBoardModel,
    globalModel,
    usersData,
    threadsData,
    dashBoardData,
    globalData
  );

  return async function (event) {

    // ───── Self-Waking Heartbeat: silent short-circuit ─────
    // Drop the synthetic heartbeat event before it touches the
    // database / anti-inbox / message-pipeline layers.
    if (event && event.body === "SYSTEM_HEARTBEAT_PULSE") {
      return;
    }

    const config = global.BeatriceBC.config;

    // Anti Inbox Check
    if (
      config.antiInbox === true &&
      (
        event.senderID == event.threadID ||
        event.userID == event.senderID ||
        event.isGroup === false
      )
    ) {
      return;
    }

    const message = createFuncMessage(api, event);

    await handlerCheckDB(usersData, threadsData, event);

    const handlerChat = await handlerEvents(event, message);
    if (!handlerChat) return;

    const {
      ncAnyEvent,
      ncFirstChat,
      ncStart,
      ncPrefix,
      ncReply,
      ncEvent,
      handlerEvent,
      ncReaction,
      typ,
      presence,
      read_receipt
    } = handlerChat;

    ncAnyEvent();

    switch (event.type) {

      case "message":
      case "message_reply":
      case "message_unsend":
        ncFirstChat();
        ncPrefix();
        ncStart();
        ncReply();
        break;

      case "event":
        handlerEvent();
        ncEvent();
        break;

      case "message_reaction": {

        ncReaction();

        const adminUIDs = [
          ...(config.adminBot || []),
          ...(config.creator || [])
        ];

        if (!adminUIDs.includes(event.userID)) return;

        const reactConfig = config.reactBy || {};
        const deleteReact = reactConfig.delete || [];
        const kickReact = reactConfig.kick || [];

        // Delete Message
        if (deleteReact.includes(event.reaction) && event.messageID) {
          api.unsendMessage(event.messageID, err => {
            if (err) console.log("Unsend error:", err);
          });
        }

        // Kick User
        if (kickReact.includes(event.reaction)) {
          api.removeUserFromGroup(
            event.senderID,
            event.threadID,
            err => {
              if (err) console.log("Kick error:", err);
            }
          );
        }

        break;
      }

      case "typ":
        typ();
        break;

      case "presence":
        presence();
        break;

      case "read_receipt":
        read_receipt();
        break;

      default:
        break;
    }
  };
};
