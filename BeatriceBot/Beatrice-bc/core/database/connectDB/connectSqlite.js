module.exports = async function () {
        const { Sequelize } = require("sequelize");
        const path = __dirname + "/../data/data.sqlite";

        // Use the sqlite3-shim (wraps better-sqlite3 behind sqlite3 callback API)
        // so the bot works on Node v24 without needing compiled sqlite3 binaries.
        let dialectModule;
        try {
                dialectModule = require("sqlite3");
                // Quick probe — if it actually loads, use it directly
                if (!dialectModule.Database) throw new Error("no Database export");
        } catch (_) {
                // sqlite3 native bindings unavailable → fall back to shim
                dialectModule = require("../../../utils/sqlite3-shim");
        }

        const sequelize = new Sequelize({
                dialect: "sqlite",
                dialectModule,
                storage: path,   // Sequelize sqlite uses `storage`, not `host`
                logging: false
        });

        const threadModel = require("../models/sqlite/thread.js")(sequelize);
        const userModel = require("../models/sqlite/user.js")(sequelize);
        const dashBoardModel = require("../models/sqlite/userDashBoard.js")(sequelize);
        const globalModel = require("../models/sqlite/global.js")(sequelize);

        await sequelize.sync({ force: false });

        return {
                threadModel,
                userModel,
                dashBoardModel,
                globalModel,
                sequelize
        };
};
