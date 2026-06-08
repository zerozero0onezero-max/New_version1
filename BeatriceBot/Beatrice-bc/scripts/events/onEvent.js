const allOnEvent = global.BeatriceBC.ncEvent;

module.exports = {
        config: {
                name: "ncEvent",
                version: "1.1",
                author: "NTKhang",
                description: "Loop to all event in global.BeatriceBC.ncEvent and run when have new event",
                category: "events"
        },

        ncStart: async ({ api, args, message, event, threadsData, usersData, dashBoardData, threadModel, userModel, dashBoardModel, role, commandName }) => {
                for (const item of allOnEvent) {
                        if (typeof item === "string") {
                                const command = global.BeatriceBC.eventCommands.get(item.toLowerCase());
                                if (command && typeof command.ncStart === "function") {
                                        command.ncStart({ api, args, message, event, threadsData, usersData, threadModel, dashBoardData, userModel, dashBoardModel, role, commandName });
                                }
                                continue;
                        }
                        item.ncStart({ api, args, message, event, threadsData, usersData, threadModel, dashBoardData, userModel, dashBoardModel, role, commandName });
                }
        }
};