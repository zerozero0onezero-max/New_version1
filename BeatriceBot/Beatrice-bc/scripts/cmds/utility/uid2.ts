export const config = {
    name: "uid2",
    version: "1.0.0",
    author: "Agent",
    countDown: 5,
    role: 0,
    description: { vi: "Lấy UID người dùng (v2)", en: "Get user UID (v2)" },
    category: "utility"
};

export async function ncStart({ message, event }: any) {
    let uid = event.senderID;
    if (event.mentions && Object.keys(event.mentions).length > 0) {
        uid = Object.keys(event.mentions)[0];
    } else if (event.messageReply?.senderID) {
        uid = event.messageReply.senderID;
    }
    return message.reply(`🔎 TS check UID2: ${uid}`);
}
