const fs = require("fs-extra");
const path = require("path");
const nullAndUndefined = [undefined, null];
// const { config } = global.BeatriceBC;
// const { utils } = global;

// Per-thread message queue: ensures messages in the same thread are
// processed sequentially (one at a time) even when they arrive together.
let _mqEnqueue;
try {
        _mqEnqueue = require(path.join(process.cwd(), "utils", "messageQueue.js")).enqueue;
} catch (e) {
        _mqEnqueue = (_tid, fn) => fn(); // graceful noop if module missing
}

function getType(obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
}

function getRole(threadData, senderID) {
        const adminBot = (global.BeatriceBC.ncsetting.adminBot || []).map(String);
        const creator = (global.BeatriceBC.ncsetting.creator || []).map(String);
        const sID = String(senderID);

        if (!senderID) return 0;

        const adminBox = (threadData?.adminIDs || []).map(String);

        return creator.includes(sID)
                ? 3          // Creator
                : adminBot.includes(sID)
                ? 2
                : adminBox.includes(sID)
                ? 1      
                : 0;
}

function getText(type, reason, time, targetID, lang) {
        const utils = global.utils;
        if (type == "userBanned")
                return utils.getText({ lang, head: "handlerEvents" }, "userBanned", reason, time, targetID);
        else if (type == "threadBanned")
                return utils.getText({ lang, head: "handlerEvents" }, "threadBanned", reason, time, targetID);
        else if (type == "onlyAdminBox")
                return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBox");
        else if (type == "onlyAdminBot")
                return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBot");
}

function replaceShortcutInLang(text, prefix, commandName) {
        return text
                .replace(/\{(?:p|prefix)\}/g, prefix)
                .replace(/\{(?:n|name)\}/g, commandName)
                .replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
        let roleConfig;
        if (utils.isNumber(command.config.role)) {
                roleConfig = {
                        ncStart: command.config.role
                };
        }
        else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
                if (!command.config.role.ncStart)
                        command.config.role.ncStart = 0;
                roleConfig = command.config.role;
        }
        else {
                roleConfig = {
                        ncStart: 0
                };
        }

        if (isGroup)
                roleConfig.ncStart = threadData.data.setRole?.[commandName] ?? roleConfig.ncStart;

        for (const key of ["ncPrefix", "ncStart", "ncReaction", "ncReply"]) {
                if (roleConfig[key] == undefined)
                        roleConfig[key] = roleConfig.ncStart;
        }

        return roleConfig;
        // {
        //      ncPrefix,
        //      ncStart,
        //      ncReaction,
        //      ncReply
        // }
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
        const ncsetting = global.BeatriceBC.ncsetting;
        const adminBot = (ncsetting.adminBot || []).map(String);
        const creator = (ncsetting.creator || []).map(String);
        const sID = String(senderID);
        const { hideNotiMessage } = ncsetting;

        // check if user banned
        const infoBannedUser = userData.banned;
        if (infoBannedUser.status == true) {
                const { reason, date } = infoBannedUser;
                if (hideNotiMessage.userBanned == false)
                        message.reply(getText("userBanned", reason, date, senderID, lang));
                return true;
        }

        // check if only admin bot
        if (
                ncsetting.adminOnly.enable == true
                && !adminBot.includes(sID)
                && !ncsetting.adminOnly.ignoreCommand.includes(commandName)
        ) {
                if (hideNotiMessage.adminOnly == false)
                        message.reply("❌ | Currently only admin users can use bot");
                return true;
        }

        // check if only creator
        if (
                ncsetting.creatorOnly.enable == true
                && !creator.includes(sID)
                && !ncsetting.creatorOnly.ignoreCommand.includes(commandName)
        ) {
                        message.reply("❌ | Currently only Creator users can use bots");
                return true;
        }

        // check if only premium
        if (
                ncsetting.premiumOnly.enable == true
                && !creator.includes(sID)
                && !adminBot.includes(sID)
                && !ncsetting.premiumOnly.ignoreCommand.includes(commandName)
        ) {
                const roleForPremium = getRole(threadData, senderID);
                const premiumStatus = checkPremium(userData, roleForPremium);
                if (!premiumStatus.status) {
                        message.reply("❌ | Currently only premium users can use bot");
                        return true;
                }
        }

        // ==========    Check Thread    ========== //
        if (isGroup == true) {
                const isAdboxonlyCommand = ["onlyadminbox", "onlyadbox", "adboxonly", "adminboxonly"].includes(commandName.toLowerCase());
                const adminBox = (threadData.adminIDs || []).map(String);
                const isAdmin = adminBox.includes(sID) || adminBot.includes(sID) || creator.includes(sID);

                if (
                        threadData.data.onlyAdminBox === true
                        && !isAdmin
                        && !isAdboxonlyCommand
                        && !(threadData.data.ignoreCommanToOnlyAdminBox || []).includes(commandName)
                ) {

                        if (!threadData.data.hideNotiMessageOnlyAdminBox)
                                message.reply(getText("onlyAdminBox", null, null, null, lang));
                        return true;
                }

                const infoBannedThread = threadData.banned;
                if (infoBannedThread.status == true) {
                        const { reason, date } = infoBannedThread;
                        if (hideNotiMessage.threadBanned == false)
                                message.reply(getText("threadBanned", reason, date, threadID, lang));
                        return true;
                }
        }
        return false;
}

function checkPremium(userData, role) {
        if (role == 2 || role == 3)
                return { status: true, expireTime: null };

        const premium = userData.data?.premium || {};
        if (premium.status !== true)
                return { status: false, expireTime: null };

        if (premium.expireTime && Date.now() > premium.expireTime)
                return { status: false, expireTime: premium.expireTime, expired: true };

        return { status: true, expireTime: premium.expireTime };
}

function levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        for (let j = 1; j <= len2; j++) {
                for (let i = 1; i <= len1; i++) {
                        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                        matrix[j][i] = Math.min(
                                matrix[j][i - 1] + 1,
                                matrix[j - 1][i] + 1,
                                matrix[j - 1][i - 1] + indicator
                        );
                }
        }

        return matrix[len2][len1];
}

function findSimilarCommand(inputCommand, commands, aliases) {
        let bestMatch = null;
        let bestDistance = Infinity;
        const threshold = 2;

        for (const [cmdName] of commands) {
                const distance = levenshteinDistance(inputCommand, cmdName);
                if (distance < bestDistance && distance <= threshold) {
                        bestDistance = distance;
                        bestMatch = cmdName;
                }
        }

        if (!bestMatch) {
                for (const [aliasName, cmdName] of aliases) {
                        const distance = levenshteinDistance(inputCommand, aliasName);
                        if (distance < bestDistance && distance <= threshold) {
                                bestDistance = distance;
                                bestMatch = cmdName;
                        }
                }
        }

        return bestMatch;
}



function createGetText2(langCode, pathCustomLang, prefix, command) {
        const commandType = command.config.countDown ? "command" : "command event";
        const commandName = command.config.name;
        let customLang = {};
        let getText2 = () => { };
        if (fs.existsSync(pathCustomLang))
                customLang = require(pathCustomLang)[commandName]?.text || {};
        if (command.langs || customLang || {}) {
                getText2 = function (key, ...args) {
                        let lang = command.langs?.[langCode]?.[key] || customLang[key] || "";
                        lang = replaceShortcutInLang(lang, prefix, commandName);
                        for (let i = args.length - 1; i >= 0; i--)
                                lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
                        return lang || `❌ Can't find text on language "${langCode}" for ${commandType} "${commandName}" with key "${key}"`;
                };
        }
        return getText2;
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {


        return async function (event, message) {

                // ───── Self-Waking Heartbeat: silent short-circuit ─────
                // The internal heartbeat in NoobCore.js feeds a synthetic
                // event whose body is exactly "SYSTEM_HEARTBEAT_PULSE".
                // We process the event just enough to keep this handler
                // warm, but never reply, log, or persist anything.
                if (event && event.body === "SYSTEM_HEARTBEAT_PULSE") {
                        return;
                }

                const { utils, client, BeatriceBC: noobCore } = global;
                const { getPrefix, removeHomeDir, log, getTime } = utils;
                const { ncsetting, configCommands: { envGlobal, envCommands, envEvents } } = noobCore;
                const { autoRefreshThreadInfoFirstTime } = ncsetting.database;
                let { hideNotiMessage = {} } = ncsetting;

                const { body, messageID, threadID, isGroup } = event;

                // Check if has threadID
                if (!threadID)
                        return;

                // ── Queue: process messages per-thread in arrival order ──────────
                // This guarantees the bot replies to message 1 before starting
                // the delay for message 2, even when multiple arrive at once.
                return _mqEnqueue(threadID, async () => {
                // ────────────────────────────────────────────────────────────────

                const senderID = event.userID || event.senderID || event.author;
                const sID = String(senderID);

                let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
                let userData = global.db.allUserData.find(u => u.userID == senderID);

                if (!userData && !isNaN(senderID))
                        userData = await usersData.create(senderID);

                if (!threadData && !isNaN(threadID)) {
                        if (global.temp.createThreadDataError.includes(threadID))
                                return;
                        threadData = await threadsData.create(threadID);
                        global.db.receivedTheFirstMessage[threadID] = true;
                }
                else {
                        if (
                                autoRefreshThreadInfoFirstTime === true
                                && !global.db.receivedTheFirstMessage[threadID]
                        ) {
                                global.db.receivedTheFirstMessage[threadID] = true;
                                await threadsData.refreshInfo(threadID);
                        }
                }

                if (typeof threadData.settings.hideNotiMessage == "object")
                        hideNotiMessage = threadData.settings.hideNotiMessage;

                // Beatrice bc presence helpers:
                // - watching: mark the incoming message as read (seen) so the user
                //   sees that the bot has read their message
                // - active presence: keep the bot shown as active/online
                // - typing: signal "typing..." for ~3 seconds before the actual reply
                try {
                        if (event.type === "message" || event.type === "message_reply") {
                                if (typeof api.markAsRead === "function") {
                                        api.markAsRead(threadID, () => { });
                                } else if (typeof api.markAsReadAll === "function") {
                                        api.markAsReadAll(() => { });
                                }
                                if (typeof api.markAsDelivered === "function" && messageID) {
                                        api.markAsDelivered(threadID, messageID, () => { });
                                }
                        }
                } catch (e) { /* ignore presence errors */ }

                // Random "human-like" reply delay (config.replyDelay).
                // While we wait we also keep the typing indicator on so the
                // user actually sees "Beatrice bc is typing...".
                let __beatriceTypingStop = null;
                let __beatriceReplyDelayMs = 0;
                try {
                        const cfg = (global.BeatriceBC && global.BeatriceBC.config) || {};
                        const rd = cfg.replyDelay || {};
                        if (rd.enable !== false && (event.type === "message" || event.type === "message_reply")) {
                                const minS = Number(rd.min);
                                const maxS = Number(rd.max);
                                let lo = Number.isFinite(minS) ? Math.max(0, minS) : 2;
                                let hi = Number.isFinite(maxS) ? Math.max(lo, maxS) : Math.max(lo, 5);
                                __beatriceReplyDelayMs = Math.round((lo + Math.random() * (hi - lo)) * 1000);
                        }
                        if (typeof api.sendTypingIndicator === "function" && (event.type === "message" || event.type === "message_reply")) {
                                const stop = api.sendTypingIndicator(threadID, () => { });
                                if (typeof stop === "function" && __beatriceReplyDelayMs > 0) {
                                        __beatriceTypingStop = setTimeout(() => {
                                                try { stop(); } catch (e) { /* noop */ }
                                        }, __beatriceReplyDelayMs);
                                } else if (typeof stop === "function") {
                                        // delay disabled — still show a brief 1s typing flicker
                                        __beatriceTypingStop = setTimeout(() => {
                                                try { stop(); } catch (e) { /* noop */ }
                                        }, 1000);
                                }
                        }
                } catch (e) { /* ignore typing errors */ }
                if (__beatriceReplyDelayMs > 0) {
                        await new Promise(r => setTimeout(r, __beatriceReplyDelayMs));
                }

                const prefix = getPrefix(threadID);
                const role = getRole(threadData, senderID);
                const parameters = {
                        api, usersData, threadsData, message, event,
                        userModel, threadModel, prefix, dashBoardModel,
                        globalModel, dashBoardData, globalData, envCommands,
                        envEvents, envGlobal, role,
                        removeCommandNameFromBody: function removeCommandNameFromBody(body_, prefix_, commandName_) {
                                if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x)))
                                        throw new Error("Please provide body, prefix and commandName to use this function, this function without parameters only support for ncStart");
                                for (let i = 0; i < arguments.length; i++)
                                        if (typeof arguments[i] != "string")
                                                throw new Error(`The parameter "${i + 1}" must be a string, but got "${getType(arguments[i])}"`);

                                return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
                        }
                };
                const langCode = threadData.data.lang || ncsetting.language || "en";

                function createMessageSyntaxError(commandName) {
                        message.SyntaxError = async function () {
                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "commandSyntaxError", prefix, commandName));
                        };
                }

                /*
                        +-----------------------------------------------+
                        |                                                        WHEN CALL COMMAND                                                              |
                        +-----------------------------------------------+
                */
                let isUserCallCommand = false;
                async function ncStart() {
                        if (!body)
                                return;

                        let args = [];
                        let commandName = "";
                        let command = null;
                        const dateNow = Date.now();

                        const adminBot = (ncsetting.adminBot || []).map(String);
                        const creator = (ncsetting.creator || []).map(String);
                        const isAdminOrCreator = adminBot.includes(sID) || creator.includes(sID);

                        if (body.startsWith(prefix)) {
                                args = body.slice(prefix.length).trim().split(/ +/);
                                commandName = args.shift().toLowerCase();
                                command = noobCore.commands.get(commandName) || noobCore.commands.get(noobCore.aliases.get(commandName));

                                if (command && command.config.usePrefix === false) {
                                        return await message.reply(`✨ The command "『 ${commandName} 』" does not require a prefix ✨`);
                                }
                        }
                        else if (ncsetting.allowAdminNoPrefix === true && isAdminOrCreator) {
                                args = body.trim().split(/ +/);
                                const checkName = args.shift().toLowerCase();
                                const foundCommand = noobCore.commands.get(checkName) || noobCore.commands.get(noobCore.aliases.get(checkName));
                                
                                if (foundCommand) {
                                        command = foundCommand;
                                        commandName = checkName;
                                } else {
                                        return;
                                }
                        }
                        else {
                                args = body.trim().split(/ +/);
                                commandName = args.shift().toLowerCase();
                                command = Array.from(noobCore.commands.values()).find(cmd => 
                                        (cmd.config.name === commandName || 
                                         (cmd.config.aliases || []).includes(commandName)) &&
                                        cmd.config.usePrefix === false
                                );
                        }

                        const isNoPrefixAdmin = ncsetting.allowAdminNoPrefix === true && isAdminOrCreator && !body.startsWith(prefix);

                        if (!command && !body.startsWith(prefix) && !isNoPrefixAdmin) {
                                return;
                        }

                        const aliasesData = threadData.data.aliases || {};
                        for (const cmdName in aliasesData) {
                                if (aliasesData[cmdName].includes(commandName)) {
                                        command = noobCore.commands.get(cmdName);
                                        break;
                                }
                        }

                        if (command)
                                commandName = command.config.name;

                        function removeCommandNameFromBody(body_, prefix_, commandName_) {
                                if (arguments.length) {
                                        if (typeof body_ != "string")
                                                throw new Error(`The first argument (body) must be a string, but got "${getType(body_)}"`);
                                        if (typeof prefix_ != "string")
                                                throw new Error(`The second argument (prefix) must be a string, but got "${getType(prefix_)}"`);
                                        if (typeof commandName_ != "string")
                                                throw new Error(`The third argument (commandName) must be a string, but got "${getType(commandName_)}"`);

                                        return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
                                }
                                else {
                                        const currentPrefix = isNoPrefixAdmin ? "" : prefix;
                                        return body.replace(new RegExp(`^${currentPrefix}(\\s+|)${commandName}`, "i"), "").trim();
                                }
                        }

                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                return;
                        if (!command)
                                if (!hideNotiMessage.commandNotFound) {
                                        const similarCommand = findSimilarCommand(commandName, noobCore.commands, noobCore.aliases);
                                        return await message.reply(
                                                commandName ?
                                                        (similarCommand ?
                                                                utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFoundWithSuggestion", commandName, prefix, similarCommand) :
                                                                utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFound", commandName, prefix)
                                        ) :
                                                        utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFound2", (userData?.name || "Fb User"), prefix)
                                        );
                                } else
                                        return true;

                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.ncStart;

                        if (needRole > role) {
                                if (!hideNotiMessage.needRoleToUseCmd) {

                                        if (needRole == 1)
                                                return await message.reply(
                                                        utils.getText(
                                                                { lang: langCode, head: "handlerEvents" },
                                                                "onlyAdmin",
                                                                userData.name,
                                                                commandName
                                                        )
                                                );

                                        else if (needRole == 2)
                                                return await message.reply(
                                                        utils.getText(
                                                                { lang: langCode, head: "handlerEvents" },
                                                                "onlyAdminBot2",
                                                                userData.name,
                                                                commandName
                                                        )
                                                );

                                        else if (needRole == 3)
                                                return await message.reply(
                                                        utils.getText(
                                                                { lang: langCode, head: "handlerEvents" },
                                                                "onlyCreator",
                                                                userData.name,
                                                                commandName
                                                        )
                                                );

                                } else {
                                        return true; // silent block
                                }
                        }

                        if (command.config.premium === true) {
                                const premiumStatus = checkPremium(userData, role);
                                if (!premiumStatus.status) {
                                        if (premiumStatus.expired) {
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "premiumExpired", commandName));
                                        }
                                        return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "premiumRequired", commandName));
                                }
                        }

                        if (!client.countDown[commandName])
                                client.countDown[commandName] = {};
                        const timestamps = client.countDown[commandName];
                        let getCoolDown = command.config.countDown;
                        if (!getCoolDown && getCoolDown != 0 || isNaN(getCoolDown))
                                getCoolDown = 1;
                        const cooldownCommand = getCoolDown * 1000;
                        if (timestamps[senderID]) {
                                const expirationTime = timestamps[senderID] + cooldownCommand;
                                if (dateNow < expirationTime)
                                        return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "waitingForCommand", ((expirationTime - dateNow) / 1000).toString().slice(0, 3)));
                        }
                        
                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        isUserCallCommand = true;

                        const sentMessageIDs = [];
                        let wrappedMessage = message;

                        if (command.config.autoUnseen && command.config.autoUnseen > 0) {

                                wrappedMessage = {
                                        ...message,
                                        send: async (form, callback) => {
                                                const result = await message.send(form, callback);
                                                if (result && result.messageID) {
                                                        sentMessageIDs.push(result.messageID);
                                                }
                                                return result;
                                        },
                                        reply: async (form, callback) => {
                                                const result = await message.reply(form, callback);
                                                if (result && result.messageID) {
                                                        sentMessageIDs.push(result.messageID);
                                                }
                                                return result;
                                        }
                                };
                        }
                        try {
                                (async () => {
                                        const analytics = await globalData.get("analytics", "data", {});
                                        if (!analytics[commandName])
                                                analytics[commandName] = 0;
                                        analytics[commandName]++;
                                        await globalData.set("analytics", analytics, "data");
                                })();

                                createMessageSyntaxError(commandName);
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                await command.ncStart({
                                        ...parameters,
                                        message: wrappedMessage,
                                        args,
                                        commandName,
                                        getLang: getText2,
                                        removeCommandNameFromBody
                                });
                                timestamps[senderID] = dateNow;
                                log.info("CALL COMMAND", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);

                                if (command.config.autoUnseen && command.config.autoUnseen > 0 && sentMessageIDs.length > 0) {
                                        const unseenDelay = command.config.autoUnseen * 1000;
                                        setTimeout(() => {
                                                sentMessageIDs.forEach(msgID => {
                                                        try {
                                                                api.unsendMessage(msgID, (err) => {
                                                                        if (err) {
                                                                                log.err("AUTO UNSEEN", `Error deleting message ${msgID} for ${commandName}`, err);
                                                                        } else {
                                                                                log.info("AUTO UNSEEN", `Deleted message ${msgID} for command ${commandName}`);
                                                                        }
                                                                });
                                                        } catch (err) {
                                                                log.err("AUTO UNSEEN", `Error deleting message ${msgID} for ${commandName}`, err);
                                                        }
                                                });
                                        }, unseenDelay);
                                }
                        }
                        catch (err) {
                                log.err("CALL COMMAND", `An error occurred when calling the command ${commandName}`, err);
                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                        }
                }


                /*
                 +------------------------------------------------+
                 |                    ON CHAT                     |
                 +------------------------------------------------+
                */
                async function ncPrefix() {
                        const allOnChat = noobCore.ncPrefix || [];
                        const args = body ? body.split(/ +/) : [];
                        for (const key of allOnChat) {
                                const command = noobCore.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;

                                // —————————————— CHECK PERMISSION —————————————— //
                                const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                                const needRole = roleConfig.ncPrefix;
                                if (needRole > role)
                                        continue;

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                if (getType(command.ncPrefix) == "Function") {
                                        const defaultOnChat = command.ncPrefix;
                                        // convert to AsyncFunction
                                        command.ncPrefix = async function () {
                                                return defaultOnChat(...arguments);
                                        };
                                }

                                command.ncPrefix({
                                        ...parameters,
                                        isUserCallCommand,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                                                return;
                                                        try {
                                                                await handler();
                                                                log.info("ncPrefix", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                                                        }
                                                        catch (err) {
                                                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("ncPrefix", `An error occurred when calling the command ncPrefix ${commandName}`, err);
                                        });
                        }
                }


                /*
                 +------------------------------------------------+
                 |                   ON ANY EVENT                 |
                 +------------------------------------------------+
                */
                async function ncAnyEvent() {
                        const allncAnyEvent = noobCore.ncAnyEvent || [];
                        let args = [];
                        if (typeof event.body == "string" && event.body.startsWith(prefix))
                                args = event.body.split(/ +/);

                        for (const key of allncAnyEvent) {
                                if (typeof key !== "string")
                                        continue;
                                const command = noobCore.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

                                if (getType(command.ncAnyEvent) == "Function") {
                                        const defaultncAnyEvent = command.ncAnyEvent;
                                        // convert to AsyncFunction
                                        command.ncAnyEvent = async function () {
                                                return defaultncAnyEvent(...arguments);
                                        };
                                }

                                command.ncAnyEvent({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        try {
                                                                await handler();
                                                                log.info("ncAnyEvent", `${commandName} | ${senderID} | ${userData.name} | ${threadID}`);
                                                        }
                                                        catch (err) {
                                                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred7", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                log.err("ncAnyEvent", `An error occurred when calling the command ncAnyEvent ${commandName}`, err);
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("ncAnyEvent", `An error occurred when calling the command ncAnyEvent ${commandName}`, err);
                                        });
                        }
                }

                /*
                 +------------------------------------------------+
                 |                  ON FIRST CHAT                 |
                 +------------------------------------------------+
                */
                async function ncFirstChat() {
                        const allncFirstChat = noobCore.ncFirstChat || [];
                        const args = body ? body.split(/ +/) : [];

                        for (const itemncFirstChat of allncFirstChat) {
                                const { commandName, threadIDsChattedFirstTime } = itemncFirstChat;
                                if (threadIDsChattedFirstTime.includes(threadID))
                                        continue;
                                const command = noobCore.commands.get(commandName);
                                if (!command)
                                        continue;

                                itemncFirstChat.threadIDsChattedFirstTime.push(threadID);
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                if (getType(command.ncFirstChat) == "Function") {
                                        const defaultncFirstChat = command.ncFirstChat;
                                        // convert to AsyncFunction
                                        command.ncFirstChat = async function () {
                                                return defaultncFirstChat(...arguments);
                                        };
                                }

                                command.ncFirstChat({
                                        ...parameters,
                                        isUserCallCommand,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                                                return;
                                                        try {
                                                                await handler();
                                                                log.info("ncFirstChat", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                                                        }
                                                        catch (err) {
                                                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("ncFirstChat", `An error occurred when calling the command ncFirstChat ${commandName}`, err);
                                        });
                        }
                }


                /* +------------------------------------------------+
                 |                    ON REPLY                    |
                 +------------------------------------------------+
                */
                async function ncReply() {
                        if (!event.messageReply)
                                return;
                        const { ncReply } = noobCore;
                        const Reply = ncReply.get(event.messageReply.messageID);
                        if (!Reply)
                                return;
                        Reply.delete = () => ncReply.delete(messageID);
                        const commandName = Reply.commandName;
                        if (!commandName) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                                return log.err("ncReply", `Can't find command name to execute this reply!`, Reply);
                        }
                        const command = noobCore.commands.get(commandName);
                        if (!command) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                                return log.err("ncReply", `Command "${commandName}" not found`, Reply);
                        }

                        // —————————————— CHECK PERMISSION —————————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.ncReply;
                        if (needRole > role) {
                                if (!hideNotiMessage.needRoleToUseCmdOnReply) {
                                        if (needRole == 1)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUseOnReply", commandName));
                                        else if (needRole == 2)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUseOnReply", commandName));
                                }
                                else {
                                        return true;
                                }
                        }

                        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        try {
                                if (!command)
                                        throw new Error(`Cannot find command with commandName: ${commandName}`);
                                const args = body ? body.split(/ +/) : [];
                                createMessageSyntaxError(commandName);
                                if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                        return;
                                await command.ncReply({
                                        ...parameters,
                                        Reply,
                                        args,
                                        commandName,
                                        getLang: getText2
                                });
                                log.info("ncReply", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                        }
                        catch (err) {
                                log.err("ncReply", `An error occurred when calling the command ncReply ${commandName}`, err);
                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred3", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                        }
                }


                /*
                 +------------------------------------------------+
                 |                   ON REACTION                  |
                 +------------------------------------------------+
                */
                async function ncReaction() {
                        const { ncReaction } = noobCore;
                        const Reaction = ncReaction.get(messageID);
                        if (!Reaction)
                                return;
                        Reaction.delete = () => ncReaction.delete(messageID);
                        const commandName = Reaction.commandName;
                        if (!commandName) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                                return log.err("ncReaction", `Can't find command name to execute this reaction!`, Reaction);
                        }
                        const command = noobCore.commands.get(commandName);
                        if (!command) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                                return log.err("ncReaction", `Command "${commandName}" not found`, Reaction);
                        }

                        // —————————————— CHECK PERMISSION —————————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.ncReaction;
                        if (needRole > role) {
                                if (!hideNotiMessage.needRoleToUseCmdncReaction) {
                                        if (needRole == 1)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUsencReaction", commandName));
                                        else if (needRole == 2)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUsencReaction", commandName));
                                }
                                else {
                                        return true;
                                }
                        }
                        // —————————————————————————————————————————————— //

                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        try {
                                if (!command)
                                        throw new Error(`Cannot find command with commandName: ${commandName}`);
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const args = [];
                                createMessageSyntaxError(commandName);
                                if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                        return;
                                await command.ncReaction({
                                        ...parameters,
                                        Reaction,
                                        args,
                                        commandName,
                                        getLang: getText2
                                });
                                log.info("ncReaction", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${event.reaction}`);
                        }
                        catch (err) {
                                log.err("ncReaction", `An error occurred when calling the command ncReaction ${commandName}`, err);
                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred4", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                        }
                }


                /*
                 +------------------------------------------------+
                 |                 EVENT COMMAND                  |
                 +------------------------------------------------+
                */
                async function handlerEvent() {
                        const { author } = event;
                        const allEventCommand = noobCore.eventCommands.entries();
                        for (const [key] of allEventCommand) {
                                const getEvent = noobCore.eventCommands.get(key);
                                if (!getEvent)
                                        continue;
                                const commandName = getEvent.config.name;
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, getEvent);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                try {
                                        const handler = await getEvent.ncStart({
                                                ...parameters,
                                                commandName,
                                                getLang: getText2
                                        });
                                        if (typeof handler == "function") {
                                                await handler();
                                                log.info("EVENT COMMAND", `Event: ${commandName} | ${author} | ${userData.name} | ${threadID}`);
                                        }
                                }
                                catch (err) {
                                        log.err("EVENT COMMAND", `An error occurred when calling the command event ${commandName}`, err);
                                        await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred5", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                }
                        }
                }


                /*
                 +------------------------------------------------+
                 |                    ON EVENT                    |
                 +------------------------------------------------+
                */
                async function ncEvent() {
                        const allncEvent = noobCore.ncEvent || [];
                        const args = [];
                        const { author } = event;
                        for (const key of allncEvent) {
                                if (typeof key !== "string")
                                        continue;
                                const command = noobCore.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

                                if (getType(command.ncEvent) == "Function") {
                                        const defaultncEvent = command.ncEvent;
                                        // convert to AsyncFunction
                                        command.ncEvent = async function () {
                                                return defaultncEvent(...arguments);
                                        };
                                }

                                command.ncEvent({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        try {
                                                                await handler();
                                                                log.info("ncEvent", `${commandName} | ${author} | ${userData.name} | ${threadID}`);
                                                        }
                                                        catch (err) {
                                                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred6", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                log.err("ncEvent", `An error occurred when calling the command ncEvent ${commandName}`, err);
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("ncEvent", `An error occurred when calling the command ncEvent ${commandName}`, err);
                                        });
                        }
                }

                /*
                 +------------------------------------------------+
                 |                    PRESENCE                    |
                 +------------------------------------------------+
                */
                async function presence() {
        
                }

                /*
                 +------------------------------------------------+
                 |                  READ RECEIPT                  |
                 +------------------------------------------------+
                */
                async function read_receipt() {
                        
                }

                /*
                 +------------------------------------------------+
                 |                               TYP                            |
                 +------------------------------------------------+
                */
                async function typ() {
                        
                }

                return {
                        ncAnyEvent,
                        ncFirstChat,
                        ncPrefix,
                        ncStart,
                        ncReaction,
                        ncReply,
                        ncEvent,
                        handlerEvent,
                        presence,
                        read_receipt,
                        typ
                };
                }); // ← end _mqEnqueue per-thread queue
        };
};
