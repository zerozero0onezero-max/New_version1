const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const path = require("path");
const exec = (cmd, options) => new Promise((resolve, reject) => {
        require("child_process").exec(cmd, options, (err, stdout) => {
                if (err)
                        return reject(err);
                resolve(stdout);
        });
});
module.exports = async function (api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, createLine) {
        const { log, loading, getText, colors, removeHomeDir } = global.utils;
        const { BeatriceBC: noobCore } = global;
        const { configCommands } = noobCore;
        const regExpCheckPackage = /require(\s+|)\((\s+|)[`'"]([^`'"]+)[`'"](\s+|)\)/g;
        const packageAlready = [];
        const spinner = [
                '⠋', '⠙', '⠹',
                '⠸', '⠼', '⠴',
                '⠦', '⠧', '⠇',
                '⠏'
        ];

        function getAllFiles(dir) {
                const files = readdirSync(dir);
                let results = [];

                for (const file of files) {
                        const fullPath = path.join(dir, file);
                        const stat = require("fs").statSync(fullPath);

                        if (stat.isDirectory()) {
                                results = results.concat(getAllFiles(fullPath));
                        }
                        else {
                                results.push(fullPath);
                        }
                }

                return results;
        }

        let count = 0;
        /* { CHECK ORIGIN CODE } */

        const aliasesData = await globalData.get('setalias', 'data', []);
        if (aliasesData) {
                for (const data of aliasesData) {
                        const { aliases, commandName } = data;
                        for (const alias of aliases)
                                if (noobCore.aliases.has(alias))
                                        throw new Error(`Alias "${alias}" already exists in command "${commandName}"`);
                                else
                                        noobCore.aliases.set(alias, commandName);
                }
        }
        const folders = ["cmds", "events"];
        let text, setMap, typeEnvCommand;

        for (const folderModules of folders) {
                const makeColor = folderModules == "cmds" ?
                        createLine("LOAD COMMANDS") :
                        createLine("LOAD COMMANDS EVENT");
                console.log(colors.hex("#f5ab00")(makeColor));

                if (folderModules == "cmds") {
                        text = "command";
                        typeEnvCommand = "envCommands";
                        setMap = "commands";
                }
                else if (folderModules == "events") {
                        text = "event command";
                        typeEnvCommand = "envEvents";
                        setMap = "eventCommands";
                }

                const fullPathModules = path.normalize(process.cwd() + `/scripts/${folderModules}`);
                const Files = getAllFiles(fullPathModules)
                .filter(file =>
                        (file.endsWith(".js") || file.endsWith(".ts")) &&
                        !file.endsWith("eg.js") &&
                        (process.env.NODE_ENV == "development"
                                ? true
                                : !file.match(/(dev)\.(js|ts)$/g)) &&
                        !configCommands[folderModules == "cmds" ? "commandUnload" : "commandEventUnload"]?.includes(path.basename(file))
                );

                const commandError = [];
                let commandLoadSuccess = 0;

                for (const file of Files) {
                        const pathCommand = path.normalize(file);
                        try {
                                // ————————————————— CHECK PACKAGE ————————————————— //
                                const contentFile = readFileSync(pathCommand, "utf8");
                                let allPackage = contentFile.match(regExpCheckPackage);
                                if (allPackage) {
                                        // Skip Node.js built-in modules — they don't live on npm and
                                        // trying to `npm install fs` etc. hangs forever in this env.
                                        const NODE_BUILTINS = new Set([
                                                "assert","async_hooks","buffer","child_process","cluster","console",
                                                "constants","crypto","dgram","diagnostics_channel","dns","domain","events",
                                                "fs","fs/promises","http","http2","https","inspector","module","net","os",
                                                "path","perf_hooks","process","punycode","querystring","readline","repl",
                                                "stream","stream/promises","stream/web","string_decoder","sys","timers",
                                                "timers/promises","tls","trace_events","tty","url","util","util/types",
                                                "v8","vm","wasi","worker_threads","zlib"
                                        ]);
                                        allPackage = allPackage.map(p => p.match(/[`'"]([^`'"]+)[`'"]/)[1])
                                                .filter(p => p.indexOf("/") !== 0 && p.indexOf("./") !== 0 && p.indexOf("../") !== 0 && p.indexOf(__dirname) !== 0)
                                                .filter(p => !p.startsWith("node:") && !NODE_BUILTINS.has(p) && !NODE_BUILTINS.has(p.split("/")[0]));
                                        for (let packageName of allPackage) {
                                                // @user/abc => @user/abc
                                                // @user/abc/dist/xyz.js => @user/abc
                                                // @user/abc/dist/xyz => @user/abc
                                                if (packageName.startsWith('@'))
                                                        packageName = packageName.split('/').slice(0, 2).join('/');
                                                else
                                                        packageName = packageName.split('/')[0];

                                                if (!packageAlready.includes(packageName)) {
                                                        packageAlready.push(packageName);
                                                        if (!existsSync(`${process.cwd()}/node_modules/${packageName}`)) {
                                                                const wating = setInterval(() => {
                                                                        // loading.info('PACKAGE', `${spinner[count % spinner.length]} Installing package ${packageName} for ${text} ${file}`);
                                                                        loading.info('PACKAGE', `${spinner[count % spinner.length]} Installing package ${colors.yellow(packageName)} for ${text} ${colors.yellow(file)}`);
                                                                        count++;
                                                                }, 80);
                                                                try {
                                                                        await exec(`npm install ${packageName} --${pathCommand.endsWith('.dev.js') ? 'no-save' : 'save'}`);
                                                                        clearInterval(wating);
                                                                        process.stderr.write('\r\x1b[K');
                                                                        console.log(`${colors.green('✔')} installed package ${packageName} successfully`);
                                                                }
                                                                catch (err) {
                                                                        clearInterval(wating);
                                                                        process.stderr.write('\r\x1b[K');
                                                                        console.log(`${colors.red('✖')} installed package ${packageName} failed`);
                                                                        throw new Error(`Can't install package ${packageName}`);
                                                                }
                                                        }
                                                }
                                        }
                                }

                                // —————————————— CHECK CONTENT SCRIPT —————————————— //
                                global.temp.contentScripts[folderModules][file] = contentFile;


                                const commandModule = require(pathCommand);
const command = commandModule.default || commandModule;

command.location = pathCommand;
                                const configCommand = command.config;
                                const commandName = configCommand.name;
                                // ——————————————— CHECK SYNTAXERROR ——————————————— //
                                if (!configCommand)
                                        throw new Error(`config of ${text} undefined`);
                                // AUTO CATEGORY BY FOLDER
if (!configCommand.category) {
    const relativePath = path.relative(
        path.join(process.cwd(), "scripts", "cmds"),
        pathCommand
    );

    const parts = relativePath.split(path.sep);

    // যদি সাবফোল্ডার থাকে → সেইটা category
    if (parts.length > 1) {
        configCommand.category = parts[0].toLowerCase();
    } 
    // না থাকলে → general
    else {
        configCommand.category = "general";
    }
}
                                if (!commandName)
                                        throw new Error(`name of ${text} undefined`);
                                if (!command.ncStart)
                                        throw new Error(`ncStart of ${text} undefined`);
                                if (typeof command.ncStart !== "function")
                                        throw new Error(`ncStart of ${text} must be a function`);
                                if (noobCore[setMap].has(commandName))
                                        throw new Error(`${text} "${commandName}" already exists with file "${removeHomeDir(noobCore[setMap].get(commandName).location || "")}"`);
                                const { ncFirstChat, ncPrefix, onLoad, ncEvent, ncAnyEvent } = command;
                                const { envGlobal, envConfig } = configCommand;
                                const { aliases } = configCommand;
                                // ————————————————— CHECK ALIASES —————————————————— //
                                const validAliases = [];
                                if (aliases) {
                                        if (!Array.isArray(aliases))
                                                throw new Error("The value of \"config.aliases\" must be array!");
                                        for (const alias of aliases) {
                                                if (aliases.filter(item => item == alias).length > 1)
                                                        throw new Error(`alias "${alias}" duplicate in ${text} "${commandName}" with file "${removeHomeDir(pathCommand)}"`);
                                                if (noobCore.aliases.has(alias))
                                                        throw new Error(`alias "${alias}" already exists in ${text} "${noobCore.aliases.get(alias)}" with file "${removeHomeDir(noobCore[setMap].get(noobCore.aliases.get(alias))?.location || "")}"`);
                                                validAliases.push(alias);
                                        }
                                        for (const alias of validAliases)
                                                noobCore.aliases.set(alias, commandName);
                                }
                                // ——————————————— CHECK ENV GLOBAL ——————————————— //
                                if (envGlobal) {
                                        if (typeof envGlobal != "object" || typeof envGlobal == "object" && Array.isArray(envGlobal))
                                                throw new Error("the value of \"envGlobal\" must be object");
                                        for (const i in envGlobal) {
                                                if (!configCommands.envGlobal[i]) {
                                                        configCommands.envGlobal[i] = envGlobal[i];
                                                }
                                                else {
                                                        const readCommand = readFileSync(pathCommand, "utf-8").replace(envGlobal[i], configCommands.envGlobal[i]);
                                                        writeFileSync(pathCommand, readCommand);
                                                }
                                        }
                                }
                                // ———————————————— CHECK CONFIG CMD ——————————————— //
                                if (envConfig) {
                                        if (typeof envConfig != "object" || typeof envConfig == "object" && Array.isArray(envConfig))
                                                throw new Error("The value of \"envConfig\" must be object");
                                        if (!configCommands[typeEnvCommand])
                                                configCommands[typeEnvCommand] = {};
                                        if (!configCommands[typeEnvCommand][commandName])
                                                configCommands[typeEnvCommand][commandName] = {};
                                        for (const [key, value] of Object.entries(envConfig)) {
                                                if (!configCommands[typeEnvCommand][commandName][key])
                                                        configCommands[typeEnvCommand][commandName][key] = value;
                                                else {
                                                        const readCommand = readFileSync(pathCommand, "utf-8").replace(value, configCommands[typeEnvCommand][commandName][key]);
                                                        writeFileSync(pathCommand, readCommand);
                                                }
                                        }
                                }
                                // ————————————————— CHECK ONLOAD ————————————————— //
                                if (onLoad) {
                                        if (typeof onLoad != "function")
                                                throw new Error("The value of \"onLoad\" must be function");
                                        await onLoad({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
                                }
                                // ——————————————— CHECK RUN ANYTIME ——————————————— //
                                if (ncPrefix)
                                        noobCore.ncPrefix.push(commandName);
                                // ——————————————— CHECK ncFirstChat ——————————————— //
                                if (ncFirstChat)
                                        noobCore.ncFirstChat.push({ commandName, threadIDsChattedFirstTime: [] });
                                // ————————————————— CHECK ncEvent ————————————————— //
                                if (ncEvent)
                                        noobCore.ncEvent.push(commandName);
                                // ———————————————— CHECK ncAnyEvent ———————————————— //
                                if (ncAnyEvent)
                                        noobCore.ncAnyEvent.push(commandName);
                                // —————————————— IMPORT TO GLOBALGOAT —————————————— //
                                noobCore[setMap].set(commandName.toLowerCase(), command);
                                commandLoadSuccess++;
                                // ————————————————— COMPARE COMMAND (removed in open source) ————————————————— //

                                global.BeatriceBC[folderModules == "cmds" ? "commandFilesPath" : "eventCommandsFilesPath"].push({
                                        // filePath: pathCommand,
                                        filePath: path.normalize(pathCommand),
                                        commandName: [commandName, ...validAliases]
                                });
                        }
                        catch (error) {
                                commandError.push({
                                        name: file,
                                        error
                                });
                        }
                        loading.info('LOADED', `${colors.green(`${commandLoadSuccess}`)}${commandError.length ? `, ${colors.red(`${commandError.length}`)}` : ''}`);
                }
                console.log("\r");
                if (commandError.length > 0) {
                        log.err("LOADED", getText('loadScripts', 'loadScriptsError', colors.yellow(text)));
                        for (const item of commandError)
                                console.log(` ${colors.red('✖ ' + item.name)}: ${item.error.message}\n`, item.error);
                }
        }
};