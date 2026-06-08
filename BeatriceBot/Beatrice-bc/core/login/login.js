// set bash title
process.stdout.write("\x1b]2;Beatrice bc - Made by sekro\x1b\x5c");
const defaultRequire = require;

function decode(text) {
        text = Buffer.from(text, 'hex').toString('utf-8');
        text = Buffer.from(text, 'hex').toString('utf-8');
        text = Buffer.from(text, 'base64').toString('utf-8');
        return text;
}

const gradient = defaultRequire("gradient-string");
const axios = defaultRequire("axios");
const path = defaultRequire("path");
const readline = defaultRequire("readline");
const fs = defaultRequire("fs-extra");
const toptp = defaultRequire("totp-generator");

const { login } = require(`${process.cwd()}/fca-unofficial`);
//const { login } = require("neokex-fca");
//const login = require("noobcore-fca");

let qr;
try { qr = new (defaultRequire("qrcode-reader")); } catch (e) { qr = { decode: () => { throw new Error("qrcode-reader unavailable"); } }; }
let Canvas;
try { Canvas = defaultRequire("canvas"); } catch (e) {
        Canvas = {
                loadImage: () => { throw new Error("canvas native module unavailable — image-based 2FA QR is disabled in this environment"); },
                createCanvas: () => { throw new Error("canvas native module unavailable"); }
        };
}
const https = defaultRequire("https");

async function getName(userID, api) {
        try {
                if (api && api.getUserInfo) {
                        const userInfo = await api.getUserInfo(userID);
                        return userInfo[userID]?.name || null;
                }
                return null;
        }
        catch (error) {
                return null;
        }
}


function compareVersion(version1, version2) {
        const v1 = version1.split(".");
        const v2 = version2.split(".");
        for (let i = 0; i < 3; i++) {
                if (parseInt(v1[i]) > parseInt(v2[i]))
                        return 1; // version1 > version2
                if (parseInt(v1[i]) < parseInt(v2[i]))
                        return -1; // version1 < version2
        }
        return 0; // version1 = version2
}

const { writeFileSync, readFileSync, existsSync, watch } = require("fs-extra");
const handlerWhenListenHasError = require("./handlerWhenListenHasError.js");
const checkLiveCookie = require("./checkLiveCookie.js");
const { callbackListenTime, storage5Message } = global.BeatriceBC;
const { log, logColor, getPrefix, createOraDots, jsonStringifyColor, getText, convertTime, colors, randomString } = global.utils;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const currentVersion = require(`${process.cwd()}/package.json`).version;

function centerText(text, length) {
        const width = process.stdout.columns;
        const leftPadding = Math.floor((width - (length || text.length)) / 2);
        const rightPadding = width - leftPadding - (length || text.length);
        // Build the padded string using the calculated padding values
        const paddedString = ' '.repeat(leftPadding > 0 ? leftPadding : 0) + text + ' '.repeat(rightPadding > 0 ? rightPadding : 0);
        // Print the padded string to the terminal
        console.log(paddedString);
}
// logo
const titles = [
[
"███╗   ██╗ ██████╗  ██████╗ ██████╗  ██████╗ ██████╗ ██████╗ ███████╗    ██████╗  ██████╗ ████████╗    ██╗   ██╗██████╗",
"████╗  ██║██╔═══██╗██╔═══██╗██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝    ██║   ██║╚════██╗",
"██╔██╗ ██║██║   ██║██║   ██║██████╔╝██║     ██║   ██║██████╔╝█████╗      ██████╔╝██║   ██║   ██║       ██║   ██║ █████╔╝",
"██║╚██╗██║██║   ██║██║   ██║██╔══██╗██║     ██║   ██║██╔══██╗██╔══╝      ██╔══██╗██║   ██║   ██║       ╚██╗ ██╔╝ ╚═══██╗",
"██║ ╚████║╚██████╔╝╚██████╔╝██████╔╝╚██████╗╚██████╔╝██║  ██║███████╗    ██████╔╝╚██████╔╝   ██║        ╚████╔╝ ██████╔╝",
"╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═════╝  ╚═════╝    ╚═╝         ╚═══╝  ╚═════╝ "
],
[
"+-------------+",
"| Beatrice bc |",
"|   Bot V3    |",
"+-------------+"
],
[
"B E A T R I C E  B C  @" + currentVersion
],
[
"BEATRICE BC"
]
];
const maxWidth = process.stdout.columns;
const title = maxWidth > 58 ?
        titles[0] :
        maxWidth > 36 ?
                titles[1] :
                maxWidth > 26 ?
                        titles[2] :
                        titles[3];

console.log(gradient("#f5af19", "#f12711")(createLine(null, true)));
console.log();
for (const text of title) {
        const textColor = gradient("#FA8BFF", "#2BD2FF", "#2BFF88")(text);
        centerText(textColor, text.length);
}
let subTitle = `Beatrice bc V3@${currentVersion} - A Facebook chat messenger bot personal account`;
const subTitleArray = [];
if (subTitle.length > maxWidth) {
        while (subTitle.length > maxWidth) {
                let lastSpace = subTitle.slice(0, maxWidth).lastIndexOf(' ');
                lastSpace = lastSpace == -1 ? maxWidth : lastSpace;
                subTitleArray.push(subTitle.slice(0, lastSpace).trim());
                subTitle = subTitle.slice(lastSpace).trim();
        }
        subTitle ? subTitleArray.push(subTitle) : '';
}
else {
        subTitleArray.push(subTitle);
}
const author = ("Created by sekro");
const srcUrl = ("Beatrice bc - personal build");
const fakeRelease = ("ALL VERSIONS NOT RELEASED HERE ARE FAKE");
for (const t of subTitleArray) {
        const textColor2 = gradient("#9F98E8", "#AFF6CF")(t);
        centerText(textColor2, t.length);
}
centerText(gradient("#9F98E8", "#AFF6CF")(author), author.length);
centerText(gradient("#9F98E8", "#AFF6CF")(srcUrl), srcUrl.length);
centerText(gradient("#f5af19", "#f12711")(fakeRelease), fakeRelease.length);

let widthConsole = process.stdout.columns;
if (widthConsole > 50)
        widthConsole = 50;

function createLine(content, isMaxWidth = false) {
        if (!content)
                return Array(isMaxWidth ? process.stdout.columns : widthConsole).fill("─").join("");
        else {
                content = ` ${content.trim()} `;
                const lengthContent = content.length;
                const lengthLine = isMaxWidth ? process.stdout.columns - lengthContent : widthConsole - lengthContent;
                let left = Math.floor(lengthLine / 2);
                if (left < 0 || isNaN(left))
                        left = 0;
                const lineOne = Array(left).fill("─").join("");
                return lineOne + content + lineOne;
        }
}

const character = createLine();

const clearLines = (n) => {
        for (let i = 0; i < n; i++) {
                const y = i === 0 ? null : -1;
                process.stdout.moveCursor(0, y);
                process.stdout.clearLine(1);
        }
        process.stdout.cursorTo(0);
        process.stdout.write('');
};

async function input(prompt, isPassword = false) {
        const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
        });

        if (isPassword)
                rl.input.on("keypress", function () {
                        const len = rl.line.length;
                        readline.moveCursor(rl.output, -len, 0);
                        readline.clearLine(rl.output, 1);
                        for (let i = 0; i < len; i++) {
                                rl.output.write("*");
                        }
                });

        return new Promise(resolve => rl.question(prompt, ans => {
                rl.close();
                resolve(ans);
        }));
}

qr.readQrCode = async function (filePath) {
        const image = await Canvas.loadImage(filePath);
        const canvas = Canvas.createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(0, 0, image.width, image.height);
        let value;
        qr.callback = function (error, result) {
                if (error)
                        throw error;
                value = result;
        };
        qr.decode(data);
        return value.result;
};

const { dirAccount } = global.client;
const { facebookAccount } = global.BeatriceBC.ncsetting;

function responseUptimeSuccess(req, res) {
        res.type('json').send({
                status: "success",
                uptime: process.uptime(),
                unit: "seconds"
        });
}

function responseUptimeError(req, res) {
        res.status(500).type('json').send({
                status: "error",
                uptime: process.uptime(),
                statusAccountBot: global.statusAccountBot
        });
}

function checkAndTrimString(string) {
        if (typeof string == "string")
                return string.trim();
        return string;
}

function filterKeysAppState(appState) {
        return appState.filter(item => ["c_user", "xs", "datr", "fr", "sb", "i_user"].includes(item.key));
}

global.responseUptimeCurrent = responseUptimeSuccess;
global.responseUptimeSuccess = responseUptimeSuccess;
global.responseUptimeError = responseUptimeError;

global.statusAccountBot = 'good';
let changeFbStateByCode = false;
let latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;
let dashBoardIsRunning = false;


async function getAppStateFromEmail(spin = { _start: () => { }, _stop: () => { } }, facebookAccount) {
        const { email, password, userAgent, proxy } = facebookAccount;
        const getFbstate = require(process.env.NODE_ENV === 'development' ? "./getFbstate1.dev.js" : "./getFbstate1.js");
        let code2FATemp;
        let appState;
        try {
                try {
                        appState = await getFbstate(checkAndTrimString(email), checkAndTrimString(password), userAgent, proxy);
                        spin._stop();
                }
                catch (err) {
                        if (err.continue) {
                                let tryNumber = 0;
                                let isExit = false;

                                await (async function submitCode(message) {
                                        if (message && isExit) {
                                                spin._stop();
                                                log.error("LOGIN FACEBOOK", message);
                                                process.exit();
                                        }

                                        if (message) {
                                                spin._stop();
                                                log.warn("LOGIN FACEBOOK", message);
                                        }

                                        if (facebookAccount["2FASecret"] && tryNumber == 0) {
                                                switch (['.png', '.jpg', '.jpeg'].some(i => facebookAccount["2FASecret"].endsWith(i))) {
                                                        case true:
                                                                code2FATemp = (await qr.readQrCode(`${process.cwd()}/${facebookAccount["2FASecret"]}`)).replace(/.*secret=(.*)&digits.*/g, '$1');
                                                                break;
                                                        case false:
                                                                code2FATemp = facebookAccount["2FASecret"];
                                                                break;
                                                }
                                        }
                                        else {
                                                spin._stop();
                                                code2FATemp = await input("> Enter 2FA code or secret: ");
                                                readline.moveCursor(process.stderr, 0, -1);
                                                readline.clearScreenDown(process.stderr);
                                        }

                                        const code2FA = isNaN(code2FATemp) ?
                                                toptp(
                                                        code2FATemp.normalize("NFD")
                                                                .toLowerCase()
                                                                .replace(/[\u0300-\u036f]/g, "")
                                                                .replace(/[đ|Đ]/g, (x) => x == "đ" ? "d" : "D")
                                                                .replace(/\(|\)|\,/g, "")
                                                                .replace(/ /g, "")
                                                ) :
                                                code2FATemp;
                                        spin._start();
                                        try {
                                                appState = JSON.parse(JSON.stringify(await err.continue(code2FA)));
                                                appState = appState.map(item => ({
                                                        key: item.key,
                                                        value: item.value,
                                                        domain: item.domain,
                                                        path: item.path,
                                                        hostOnly: item.hostOnly,
                                                        creation: item.creation,
                                                        lastAccessed: item.lastAccessed
                                                })).filter(item => item.key);
                                                spin._stop();
                                        }
                                        catch (err) {
                                                tryNumber++;
                                                if (!err.continue)
                                                        isExit = true;
                                                await submitCode(err.message);
                                        }
                                })(err.message);
                        }
                        else
                                throw err;
                }
        }
        catch (err) {
                if (facebookAccount["2FASecret"]) {
                        switch (['.png', '.jpg', '.jpeg'].some(i => facebookAccount["2FASecret"].endsWith(i))) {
                                case true:
                                        code2FATemp = (await qr.readQrCode(`${process.cwd()}/${facebookAccount["2FASecret"]}`)).replace(/.*secret=(.*)&digits.*/g, '$1');
                                        break;
                                case false:
                                        code2FATemp = facebookAccount["2FASecret"];
                                        break;
                        }
                }

                log.error("LOGIN FACEBOOK", "loginMbasic fallback failed as it was removed. Please check your credentials or appstate.");
                throw err;
        }

        global.BeatriceBC.ncsetting.facebookAccount['2FASecret'] = code2FATemp || "";
        writeFileSync(global.client.dirConfig, JSON.stringify(global.BeatriceBC.ncsetting, null, 2));
        return appState;
}

function isNetScapeCookie(cookie) {
        if (typeof cookie !== 'string')
                return false;
        return /(.+)\t(1|TRUE|true)\t([\w\/.-]*)\t(1|TRUE|true)\t\d+\t([\w-]+)\t(.+)/i.test(cookie);
        // match
}

function netScapeToCookies(cookieData) {
        const cookies = [];
        const lines = cookieData.split('\n');
        lines.forEach((line) => {
                if (line.trim().startsWith('#')) {
                        return;
                }
                const fields = line.split('\t').map((field) => field.trim()).filter((field) => field.length > 0);
                if (fields.length < 7) {
                        return;
                }
                const cookie = {
                        key: fields[5],
                        value: fields[6],
                        domain: fields[0],
                        path: fields[2],
                        hostOnly: fields[1] === 'TRUE',
                        creation: new Date(fields[4] * 1000).toISOString(),
                        lastAccessed: new Date().toISOString()
                };
                cookies.push(cookie);
        });
        return cookies;
}

function pushI_user(appState, value) {
        appState.push({
                key: "i_user",
                value: value || facebookAccount.i_user,
                domain: "facebook.com",
                path: "/",
                hostOnly: false,
                creation: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
        });
        return appState;
}

let spin;
async function getAppStateToLogin(loginWithEmail) {
        let appState = [];
        if (loginWithEmail)
                return await getAppStateFromEmail(undefined, facebookAccount);
        if (!existsSync(dirAccount))
                return log.error("LOGIN FACEBOOK", getText('login', 'notFoundDirAccount', colors.green(dirAccount)));
        const accountText = readFileSync(dirAccount, "utf8");

        try {
                const splitAccountText = accountText.replace(/\|/g, '\n').split('\n').map(i => i.trim()).filter(i => i);
                // is token full permission
                if (accountText.startsWith('EAAAA')) {
                        try {
                                spin = createOraDots(getText('login', 'loginToken'));
                                spin._start();
                                appState = await require('./getFbstate.js')(accountText);
                        }
                        catch (err) {
                                err.name = "TOKEN_ERROR";
                                throw err;
                        }
                }
                // is cookie string
                else {
                        if (accountText.match(/^(?:\s*\w+\s*=\s*[^;]*;?)+/)) {
                                spin = createOraDots(getText('login', 'loginCookieString'));
                                spin._start();
                                appState = accountText.split(';')
                                        .map(i => {
                                                const [key, value] = i.split('=');
                                                return {
                                                        key: (key || "").trim(),
                                                        value: (value || "").trim(),
                                                        domain: "facebook.com",
                                                        path: "/",
                                                        hostOnly: true,
                                                        creation: new Date().toISOString(),
                                                        lastAccessed: new Date().toISOString()
                                                };
                                        })
                                        .filter(i => i.key && i.value && i.key != "x-referer");
                        }
                        // is netscape cookie
                        else if (isNetScapeCookie(accountText)) {
                                spin = createOraDots(getText('login', 'loginCookieNetscape'));
                                spin._start();
                                appState = netScapeToCookies(accountText);
                        }
                        else if (
                                (splitAccountText.length == 2 || splitAccountText.length == 3) &&
                                !splitAccountText.slice(0, 2).map(i => i.trim()).some(i => i.includes(' '))
                        ) {
                                // bug if account.txt is "[]"
                                global.BeatriceBC.ncsetting.facebookAccount.email = splitAccountText[0]; // bug here=> email is "["
                                global.BeatriceBC.ncsetting.facebookAccount.password = splitAccountText[1]; // bug here=> password is "]"
                                if (splitAccountText[2]) {
                                        const code2FATemp = splitAccountText[2].replace(/ /g, "");
                                        global.BeatriceBC.ncsetting.facebookAccount['2FASecret'] = code2FATemp;
                                }
                                writeFileSync(global.client.dirConfig, JSON.stringify(global.BeatriceBC.ncsetting, null, 2));
                        }
                        // is json (cookies or appstate)
                        else {
                                try {
                                        spin = createOraDots(getText('login', 'loginCookieArray'));
                                        spin._start();
                                        appState = JSON.parse(accountText);
                                }
                                catch (err) {
                                        const error = new Error(`${path.basename(dirAccount)} is invalid`);
                                        error.name = "ACCOUNT_ERROR";
                                        throw error;
                                }
                                if (appState.some(i => i.name))
                                        appState = appState.map(i => {
                                                i.key = i.name;
                                                delete i.name;
                                                return i;
                                        });
                                else if (!appState.some(i => i.key)) {
                                        const error = new Error(`${path.basename(dirAccount)} is invalid`);
                                        error.name = "ACCOUNT_ERROR";
                                        throw error;
                                }
                                appState = appState
                                        .map(item => ({
                                                ...item,
                                                domain: "facebook.com",
                                                path: "/",
                                                hostOnly: false,
                                                creation: new Date().toISOString(),
                                                lastAccessed: new Date().toISOString()
                                        }))
                                        .filter(i => i.key && i.value && i.key != "x-referer");
                        }
                        /*if (!await checkLiveCookie(appState.map(i => i.key + "=" + i.value).join("; "), facebookAccount.userAgent)) {
                                const error = new Error("Cookie is invalid");
                                error.name = "COOKIE_INVALID";
                                throw error;
                        }*/
                }
        }
        catch (err) {
                spin && spin._stop();
                let {
                        email,
                        password
                } = facebookAccount;
                if (err.name === "TOKEN_ERROR")
                        log.err("LOGIN FACEBOOK", getText('login', 'tokenError', colors.green("EAAAA..."), colors.green(dirAccount)));
                else if (err.name === "COOKIE_INVALID")
                        log.err("LOGIN FACEBOOK", getText('login', 'cookieError'));

                if (!email || !password) {
                        log.warn("LOGIN FACEBOOK", getText('login', 'cannotFindAccount'));
                        const rl = readline.createInterface({
                                input: process.stdin,
                                output: process.stdout
                        });
                        const options = [
                                getText('login', 'chooseAccount'),
                                getText('login', 'chooseToken'),
                                getText('login', 'chooseCookieString'),
                                getText('login', 'chooseCookieArray')
                        ];
                        let currentOption = 0;
                        await new Promise((resolve) => {
                                const character = '>';
                                function showOptions() {
                                        rl.output.write(`\r${options.map((option, index) => index === currentOption ? colors.blueBright(`${character} (${index + 1}) ${option}`) : `  (${index + 1}) ${option}`).join('\n')}\u001B`);
                                        rl.write('\u001B[?25l'); 
                                }
                                rl.input.on('keypress', (_, key) => {
                                        if (key.name === 'up') {
                                                currentOption = (currentOption - 1 + options.length) % options.length;
                                        }
                                        else if (key.name === 'down') {
                                                currentOption = (currentOption + 1) % options.length;
                                        }
                                        else if (!isNaN(key.name)) {
                                                const number = parseInt(key.name);
                                                if (number >= 0 && number <= options.length)
                                                        currentOption = number - 1;
                                                process.stdout.write('\x1b[1D'); 
                                        }
                                        else if (key.name === 'enter' || key.name === 'return') {
                                                rl.input.removeAllListeners('keypress');
                                                rl.close();
                                                clearLines(options.length + 1);
                                                showOptions();
                                                resolve();
                                        }
                                        else {
                                                process.stdout.write('\x1b[1D'); 
                                        }

                                        clearLines(options.length);
                                        showOptions();
                                });
                                showOptions();
                        });

                        rl.write('\u001B[?25h\n'); // show cursor 
                        clearLines(options.length + 1);
                        log.info("LOGIN FACEBOOK", getText('login', 'loginWith', options[currentOption]));

                        if (currentOption == 0) {
                                email = await input(`${getText('login', 'inputEmail')} `);
                                password = await input(`${getText('login', 'inputPassword')} `, true);
                                const twoFactorAuth = await input(`${getText('login', 'input2FA')} `);
                                facebookAccount.email = email || '';
                                facebookAccount.password = password || '';
                                facebookAccount['2FASecret'] = twoFactorAuth || '';
                                writeFileSync(global.client.dirConfig, JSON.stringify(global.BeatriceBC.config, null, 2));
                        }
                        else if (currentOption == 1) {
                                const token = await input(getText('login', 'inputToken') + " ");
                                writeFileSync(global.client.dirAccount, token);
                        }
                        else if (currentOption == 2) {
                                const cookie = await input(getText('login', 'inputCookieString') + " ");
                                writeFileSync(global.client.dirAccount, cookie);
                        }
                        else {
                                const cookie = await input(getText('login', 'inputCookieArray') + " ");
                                writeFileSync(global.client.dirAccount, JSON.stringify(JSON.parse(cookie), null, 2));
                        }
                        return await getAppStateToLogin();
                }

                log.info("LOGIN FACEBOOK", getText('login', 'loginPassword'));
                log.info("ACCOUNT INFO", `Email: ${facebookAccount.email}, I_User: ${facebookAccount.i_user || "(empty)"}`);
                spin = createOraDots(getText('login', 'loginPassword'));
                spin._start();

                try {
                        appState = await getAppStateFromEmail(spin, facebookAccount);
                        spin._stop();
                }
                catch (err) {
                        spin._stop();
                        log.err("LOGIN FACEBOOK", getText('login', 'loginError'), err.message, err);
                        process.exit(2);
                }
        }
        return appState;
}

function stopListening(keyListen) {
        keyListen = keyListen || Object.keys(callbackListenTime).pop();
        return new Promise((resolve) => {
                global.BeatriceBC.fcaApi.stopListening?.(() => {
                        if (callbackListenTime[keyListen]) {
                                // callbackListenTime[keyListen || Object.keys(callbackListenTime).pop()]("Connection closed by user.");
                                callbackListenTime[keyListen] = () => { };
                        }
                        resolve();
                }) || resolve();
        });
}

// function removeListener(keyListen) {
//      keyListen = keyListen || Object.keys(callbackListenTime).pop();
//      if (callbackListenTime[keyListen])
//              callbackListenTime[keyListen] = () => { };
// }

const APP_STATES = ["ncstate.json", "ncstate2.json", "ncstate3.json"];
let currentStateIndex = 0;

async function startBot(loginWithEmail) {
        if (currentStateIndex >= APP_STATES.length) {
                log.err("LOGIN", "❌ All APP_STATES are invalid or blocked.");
                process.exit(0);
        }

        const currentStateFile = APP_STATES[currentStateIndex];
        const statePath = path.join(process.cwd(), currentStateFile);

        // Beatrice bc: cookies are now read DIRECTLY from the on-disk
        // ncstate.json / ncstate2.json / ncstate3.json files.
        // The previous behaviour of pulling the appstate from environment
        // variables (FB_COOKIES / fb-cookies / FB_APPSTATE / FBCOOKIE)
        // has been disabled — env vars are intentionally ignored even if set,
        // so the file is the single source of truth.
        const envCookies = "";

        // Beatrice bc: the env var is ALWAYS the source of truth when present.
        // Reasons we can't trust the on-disk ncstate.json:
        //   1. FCA rewrites it after every startup with whatever it currently
        //      holds, so an expired session can be persisted on top of a
        //      perfectly good env-supplied appstate.
        //   2. The file may have been written by a previous run with a
        //      partial / stale cookie set (only fr/sb/datr, missing c_user/xs)
        //      and would otherwise be re-loaded forever even after the user
        //      updates FB_COOKIES.
        // So: if FB_COOKIES is set and looks valid, overwrite the file with it
        // every boot. Only fall back to whatever's on disk when no env var is
        // configured at all.
        let stateNeedsEnvFill = !fs.existsSync(statePath);
        if (!stateNeedsEnvFill) {
                try {
                        const raw = fs.readFileSync(statePath, "utf8").trim();
                        if (!raw || raw === "[]" || raw === "{}") stateNeedsEnvFill = true;
                        else {
                                // file has *some* content — check it actually has the
                                // required login cookies. If not, refill from env.
                                try {
                                        const cur = JSON.parse(raw);
                                        const arr = Array.isArray(cur) ? cur : (cur.cookies || cur.appState || []);
                                        const keys = arr.map(c => (c && (c.key || c.name)) || "");
                                        if (!keys.includes("c_user") || !keys.includes("xs")) {
                                                stateNeedsEnvFill = true;
                                                log.warn("LOGIN", `⚠️ ${currentStateFile} is missing c_user/xs — will refill from FB_COOKIES env var.`);
                                        }
                                } catch (e) { stateNeedsEnvFill = true; }
                        }
                } catch (e) { stateNeedsEnvFill = true; }
        }

        // Even if the on-disk state looks complete, prefer the env var when its
        // c_user differs (user rotated cookies) — the env always wins.
        if (currentStateIndex === 0 && envCookies && envCookies.trim() && !stateNeedsEnvFill) {
                try {
                        let envParsed = envCookies.trim();
                        if (!envParsed.startsWith("[") && !envParsed.startsWith("{")) {
                                try { envParsed = Buffer.from(envParsed, "base64").toString("utf-8"); } catch (e) { /* noop */ }
                        }
                        const envObj = JSON.parse(envParsed);
                        const envArr = Array.isArray(envObj) ? envObj : (envObj.cookies || envObj.appState || []);
                        const envKeys = envArr.map(c => (c && (c.key || c.name)) || "");
                        if (envKeys.includes("c_user") && envKeys.includes("xs")) {
                                const fileObj = JSON.parse(fs.readFileSync(statePath, "utf8"));
                                const fileArr = Array.isArray(fileObj) ? fileObj : (fileObj.cookies || fileObj.appState || []);
                                const fileC = (fileArr.find(c => (c.key || c.name) === "c_user") || {}).value;
                                const envC  = (envArr.find(c => (c.key || c.name) === "c_user") || {}).value;
                                const fileX = (fileArr.find(c => (c.key || c.name) === "xs") || {}).value;
                                const envX  = (envArr.find(c => (c.key || c.name) === "xs") || {}).value;
                                if (fileC !== envC || fileX !== envX || envArr.length > fileArr.length) {
                                        stateNeedsEnvFill = true;
                                        log.info("LOGIN", `🔄 FB_COOKIES env var differs from ${currentStateFile} — refreshing from env.`);
                                }
                        }
                } catch (e) { /* fall through to existing path */ }
        }

        if (stateNeedsEnvFill) {
                if (currentStateIndex === 0 && envCookies && envCookies.trim()) {
                        try {
                                let parsed = envCookies.trim();
                                // tolerate base64-encoded payloads
                                if (!parsed.startsWith("[") && !parsed.startsWith("{")) {
                                        try { parsed = Buffer.from(parsed, "base64").toString("utf-8"); } catch (e) { /* noop */ }
                                }
                                const obj = JSON.parse(parsed);

                                // Sanity-check that the appstate actually contains the
                                // cookies Facebook needs to authenticate. Without c_user
                                // and xs the login will always fail with "Not logged in",
                                // so refuse early with a clear message.
                                if (Array.isArray(obj)) {
                                        const keys = obj.map(c => (c && (c.key || c.name)) || "").filter(Boolean);
                                        const required = ["c_user", "xs"];
                                        const missing = required.filter(r => !keys.includes(r));
                                        if (missing.length) {
                                                log.err("LOGIN", `❌ The cookies in your "fb-cookies" / FB_COOKIES env var are incomplete.`);
                                                log.err("LOGIN", `   Missing required cookie(s): ${missing.join(", ")}`);
                                                log.err("LOGIN", `   Found only: ${keys.join(", ") || "(none)"}`);
                                                log.err("LOGIN", `   👉 Export the FULL Facebook appstate (use a tool like the "C3C-FBState" Chrome extension or copy ALL cookies from facebook.com via DevTools → Application → Cookies). The bot needs at minimum: c_user, xs, datr, fr, sb.`);
                                                currentStateIndex++;
                                                return startBot();
                                        }
                                }

                                fs.writeFileSync(statePath, JSON.stringify(obj, null, 2));
                                log.info("LOGIN", `✅ Loaded FB cookies from env into ${currentStateFile}`);
                        } catch (e) {
                                log.err("LOGIN", `❌ FB_COOKIES env var is not valid JSON: ${e.message}`);
                                currentStateIndex++;
                                return startBot();
                        }
                } else {
                        if (currentStateIndex === 0) {
                                log.warn("LOGIN", `⚠️ No FB_COOKIES / fb-cookies env var set and ${currentStateFile} is empty.`);
                                log.warn("LOGIN", `   Add your Facebook appstate JSON to a "fb-cookies" environment variable to start the bot.`);
                        } else {
                                log.warn("LOGIN", `⚠️ ${currentStateFile} not found, switching...`);
                        }
                        currentStateIndex++;
                        return startBot();
                }
        }

        console.log(colors.hex("#f5ab00")(createLine("START LOGGING IN", true)));
        const currentVersion = require("../../package.json").version;
        const tooOldVersion = (await axios.get("https://raw.githubusercontent.com/noobcore404/Ncbot-storage/refs/heads/main/tooOldVersions.txt")).data || "0.0.0";
        // nếu version cũ hơn
        if ([-1, 0].includes(compareVersion(currentVersion, tooOldVersion))) {
                log.err("VERSION", getText('version', 'tooOldVersion', colors.yellowBright('node update')));
                
        }
        /* { CHECK ORIGIN CODE } */

        if (global.BeatriceBC.Listening)
                await stopListening();

        log.info("LOGIN FACEBOOK", `🔄 Trying to login with ${currentStateFile}...`);

        let appState;
        try {
                appState = JSON.parse(fs.readFileSync(statePath, "utf8"));
                if (appState.some(i => i.name)) {
                        appState = appState.map(i => {
                                i.key = i.name;
                                delete i.name;
                                return i;
                        });
                }
                appState = filterKeysAppState(appState);
        } catch (err) {
                log.err("LOGIN", `❌ Invalid JSON in ${currentStateFile}`);
                currentStateIndex++;
                return startBot();
        }
        // ——————————————————— LOGIN ———————————————————— //
        (function loginBot(appState) {
                global.BeatriceBC.commands = new Map();
                global.BeatriceBC.eventCommands = new Map();
                global.BeatriceBC.aliases = new Map();
                global.BeatriceBC.ncPrefix = [];
                global.BeatriceBC.ncEvent = [];
                global.BeatriceBC.ncReply = new Map();
                global.BeatriceBC.ncReaction = new Map();
                clearInterval(global.intervalRestartListenMqtt);
                delete global.intervalRestartListenMqtt;

                if (facebookAccount.i_user)
                        pushI_user(appState, facebookAccount.i_user);

                let isSendNotiErrorMessage = false;

                login({ appState }, global.BeatriceBC.ncsetting.optionsFca, async function (error, api) {
                        // Handle error
                        if (error) {
                                log.err("LOGIN FACEBOOK", `❌ Login failed with ${currentStateFile}: ${error.error || error.message || error}`);
                                global.statusAccountBot = "can't login";
                                log.warn("LOGIN", "🔄 Switching to next APPSTATE...");
                                currentStateIndex++;
                                return startBot();
                        }

                        api.setOptions(global.BeatriceBC.ncsetting.optionsFca);

                        // In case the FCA doesn't support .on, we rely on the listener callback
                        // But we'll keep the current structure for now and just check if .on exists
                        if (typeof api.on === 'function') {
                                api.on("error", async (err) => {
                                        log.err("LOGIN", "FCA Runtime Error:", err);
                                        if (
                                                err === "Account security issue" ||
                                                err.error === "Not logged in" ||
                                                (typeof err === "string" && err.includes("blocked")) ||
                                                (err.error && typeof err.error === "string" && err.error.includes("blocked"))
                                        ) {
                                                log.warn("LOGIN", "Account issue detected during runtime, switching to next state...");
                                                if (global.BeatriceBC.Listening) {
                                                        await stopListening();
                                                }
                                                currentStateIndex++;
                                                return startBot();
                                        }
                                });
                        }

                        global.BeatriceBC.fcaApi = api;
                        global.BeatriceBC.botID = api.getCurrentUserID();

                        // ───── FCA Bridge / Polyfill ─────
                        // Different FCA forks expose `listen()` vs `listenMqtt()` vs both.
                        // Build a transparent alias so any code that calls one will work
                        // even if only the other exists. As a last-resort safety net, if
                        // NEITHER exists (e.g. listenMqtt.js failed to load due to a
                        // broken transitive dep), install a harmless no-op stub so the
                        // bot stays alive instead of crashing with
                        // "api.listenMqtt is not a function".
                        try {
                                if (typeof api.listenMqtt !== "function" && typeof api.listen === "function") {
                                        api.listenMqtt = api.listen.bind(api);
                                        log.info("FCA-BRIDGE", "Polyfilled api.listenMqtt → api.listen");
                                }
                                if (typeof api.listen !== "function" && typeof api.listenMqtt === "function") {
                                        api.listen = api.listenMqtt.bind(api);
                                        log.info("FCA-BRIDGE", "Polyfilled api.listen → api.listenMqtt");
                                }
                                if (typeof api.listenMqtt !== "function" && typeof api.listen !== "function") {
                                        const { EventEmitter } = require("events");
                                        const noopListener = function noopListener(_cb) {
                                                log.warn("FCA-BRIDGE", "no-op listener invoked — FCA exposes neither listen() nor listenMqtt(); incoming events disabled");
                                                const emitter = new EventEmitter();
                                                emitter.stopListening = function (cb) { if (typeof cb === "function") cb(); };
                                                emitter.close = emitter.stopListening;
                                                return emitter;
                                        };
                                        api.listenMqtt = noopListener;
                                        api.listen = noopListener;
                                        log.warn("FCA-BRIDGE", "⚠️ Installed no-op listen stub (FCA listener missing)");
                                }
                        } catch (e) {
                                log.warn("FCA-BRIDGE", `⚠️ Could not install FCA listen polyfill: ${e.message}`);
                        }

                        // ───── Outgoing-text font transform + Auto-delete own messages ─────
                        // We wrap api.sendMessage so that:
                        //   1. Every outgoing string body is converted to the Beatrice
                        //      monospace font (𝙰𝙱𝙲) right before send. If conversion
                        //      throws, the original text is sent untouched.
                        //   2. After successful send, if config.deleteOwnMessages is
                        //      enabled, the message is unsent after a random delay.
                        try {
                                const { transformOutgoing } = require(path.join(process.cwd(), "utils", "beatriceFont.js"));
                                const __origSend = api.sendMessage.bind(api);

                                // Wrap api.sendMessage. Two non-trivial guarantees:
                                //   1. The font transform is the LAST step before the bytes
                                //      hit FCA — every outgoing message body is converted
                                //      uniformly, so callers never have to apply fonts
                                //      themselves.
                                //   2. The wrapper preserves the original FCA call shape:
                                //      • If the caller passed a callback, we substitute a
                                //        wrapped callback (so auto-delete still works) and
                                //        return whatever __origSend returns.
                                //      • If the caller did NOT pass a callback AND auto-
                                //        delete is OFF, we DO NOT inject one — we forward
                                //        the call untouched so FCA's native Promise return
                                //        is preserved (this is what `await message.reply()`
                                //        depends on; injecting a callback there silently
                                //        broke every command that awaited a sendMessage
                                //        result).
                                //      • If the caller did NOT pass a callback BUT auto-
                                //        delete is ON, we wrap the call in our own Promise
                                //        so callers still get a Promise back AND we still
                                //        get the messageID needed for unsendMessage.
                                api.sendMessage = function patchedSend(...sendArgs) {
                                        // 1. Font transform (safe, never throws upward)
                                        try {
                                                if (sendArgs.length > 0) {
                                                        sendArgs[0] = transformOutgoing(sendArgs[0]);
                                                }
                                        } catch (e) {
                                                // Conversion failed — original message stays in sendArgs[0]
                                        }

                                        // 2. Locate any caller-provided callback (a function arg)
                                        let cbIdx = -1;
                                        for (let i = sendArgs.length - 1; i >= 0; i--) {
                                                if (typeof sendArgs[i] === "function") { cbIdx = i; break; }
                                        }

                                        const cfg = (global.BeatriceBC && global.BeatriceBC.config) || {};
                                        const dm = cfg.deleteOwnMessages || {};
                                        const deleteEnabled = dm.enable === true;

                                        // 3. Fast path: no callback wanted by caller AND no auto-delete
                                        //    → forward untouched so FCA's native Promise is returned.
                                        if (cbIdx === -1 && !deleteEnabled) {
                                                return __origSend(...sendArgs);
                                        }

                                        // 4. Build the auto-delete-aware wrapper around the user cb
                                        const userCb = cbIdx >= 0 ? sendArgs[cbIdx] : null;
                                        const scheduleAutoDelete = function (info) {
                                                try {
                                                        if (!deleteEnabled || !info || !info.messageID) return;
                                                        const lo = Math.max(1, Number(dm.min) || 30);
                                                        const hi = Math.max(lo, Number(dm.max) || 60);
                                                        const delayMs = Math.round((lo + Math.random() * (hi - lo)) * 1000);
                                                        setTimeout(() => {
                                                                try {
                                                                        if (typeof api.unsendMessage === "function") {
                                                                                api.unsendMessage(info.messageID, () => { });
                                                                        }
                                                                } catch (e) { /* ignore unsend error */ }
                                                        }, delayMs);
                                                } catch (e) { /* ignore */ }
                                        };

                                        // 5a. Caller supplied a callback → just substitute it.
                                        if (cbIdx >= 0) {
                                                sendArgs[cbIdx] = function wrappedCb(err, info) {
                                                        try { if (userCb) userCb(err, info); } catch (e) { /* ignore user cb error */ }
                                                        if (!err) scheduleAutoDelete(info);
                                                };
                                                return __origSend(...sendArgs);
                                        }

                                        // 5b. No callback, but auto-delete needs messageID → wrap in a Promise.
                                        return new Promise((resolve, reject) => {
                                                const cb = function (err, info) {
                                                        if (err) {
                                                                reject(err);
                                                        } else {
                                                                scheduleAutoDelete(info);
                                                                resolve(info);
                                                        }
                                                };
                                                // FCA signature: sendMessage(msg, threadID, callback, messageID?)
                                                // If the caller's args are [msg, threadID, messageID(string)],
                                                // splice the callback in at index 2 so messageID stays at 3.
                                                // Otherwise append the callback at the end.
                                                if (sendArgs.length >= 3 && (typeof sendArgs[2] === "string" || typeof sendArgs[2] === "number")) {
                                                        sendArgs.splice(2, 0, cb);
                                                } else {
                                                        sendArgs.push(cb);
                                                }
                                                try { __origSend(...sendArgs); } catch (e) { reject(e); }
                                        });
                                };
                        } catch (e) {
                                log.warn("LOGIN", `⚠️ Could not install sendMessage wrapper: ${e.message}`);
                        }

                        // ───── Write live bot status to status.json for the dashboard preview ─────
                        try {
                                const statusPath = path.join(process.cwd(), "status.json");
                                const __startedAt = Date.now();
                                global.BeatriceBC.startedAt = __startedAt;
                                const writeStatus = async () => {
                                        try {
                                                const cfg = (global.BeatriceBC && global.BeatriceBC.config) || {};
                                                const me = await getName(global.botID, api).catch(() => "");
                                                const threads = global.db && global.db.allThreadData ? global.db.allThreadData.length : 0;
                                                const users   = global.db && global.db.allUserData   ? global.db.allUserData.length   : 0;
                                                const cmds    = global.BeatriceBC && global.BeatriceBC.commands ? global.BeatriceBC.commands.size : 0;
                                                const events  = global.BeatriceBC && global.BeatriceBC.eventCommands ? global.BeatriceBC.eventCommands.size : 0;
                                                const data = {
                                                        online: true,
                                                        botID: global.botID,
                                                        botFbName: me,
                                                        botName: cfg.botName || "Beatrice bc",
                                                        nickName: cfg.nickNameBot || "",
                                                        prefix: cfg.prefix || ".",
                                                        language: cfg.language || "en",
                                                        startedAt: __startedAt,
                                                        uptimeMs: Date.now() - __startedAt,
                                                        commandsLoaded: cmds,
                                                        eventsLoaded: events,
                                                        threads, users,
                                                        babyStfu: !!(global.BeatriceBC && global.BeatriceBC.babyStfu),
                                                        replyDelay: cfg.replyDelay || null,
                                                        deleteOwnMessages: cfg.deleteOwnMessages || null,
                                                        babyDeveloperId: cfg.babyDeveloperId || null,
                                                        nodeVersion: process.version,
                                                        lastUpdate: Date.now(),
                                                };
                                                fs.writeFileSync(statusPath, JSON.stringify(data, null, 2));
                                        } catch (e) { /* ignore */ }
                                };
                                writeStatus();
                                global.BeatriceBC.statusInterval = setInterval(writeStatus, 5000);
                                process.on("exit", () => {
                                        try {
                                                const cfg = (global.BeatriceBC && global.BeatriceBC.config) || {};
                                                fs.writeFileSync(statusPath, JSON.stringify({ online: false, botName: cfg.botName || "Beatrice bc", lastUpdate: Date.now() }, null, 2));
                                        } catch (e) { /* ignore */ }
                                });
                        } catch (e) {
                                log.warn("LOGIN", `⚠️ Could not start status writer: ${e.message}`);
                        }

                        log.info("LOGIN FACEBOOK", getText('login', 'loginSuccess'));
                        let hasBanned = false;
                        global.botID = api.getCurrentUserID();
                        logColor("#f5ab00", createLine("BOT INFO"));
                        log.info("NODE VERSION", process.version);
                        log.info("PROJECT VERSION", currentVersion);
                        log.info("BOT ID", `${global.botID} - ${await getName(global.botID, api)}`);
                        log.info("PREFIX", global.BeatriceBC.ncsetting.prefix);
                        log.info("LANGUAGE", global.BeatriceBC.ncsetting.language);
                        log.info("BOT NICK NAME", global.BeatriceBC.ncsetting.nickNameBot || global.BeatriceBC.config?.botName || "Beatrice bc");
                        // ———————————————————— GBAN ————————————————————— //
                        let dataGban;

                        try {
                                // convert to promise
                                const item = await axios.get("https://raw.githubusercontent.com/noobcore404/NC-GBAN/refs/heads/main/gban.json");
                                dataGban = item.data;

                                // ————————————————— CHECK BOT ————————————————— //
                                const botID = api.getCurrentUserID();
                                if (dataGban.hasOwnProperty(botID)) {
                                        if (!dataGban[botID].toDate) {
                                                log.err('GBAN', getText('login', 'gbanMessage', dataGban[botID].date, dataGban[botID].reason, dataGban[botID].date));
                                                hasBanned = true;
                                        }
                                        else {
                                                const currentDate = Date.now();
                                                if (currentDate < new Date(dataGban[botID].toDate).getTime()) {
                                                        log.err('GBAN', getText('login', 'gbanMessageToDate', dataGban[botID].date, dataGban[botID].reason, dataGban[botID].date, dataGban[botID].toDate));
                                                        hasBanned = true;
                                                }
                                        }
                                }
                                // ———————————————— CHECK ADMIN ———————————————— //
                                const adminBot = global.BeatriceBC.ncsetting.adminBot || [];
                                for (const idad of adminBot) {
                                        const idStr = String(idad);
                                        if (dataGban.hasOwnProperty(idStr)) {
                                                if (!dataGban[idStr].toDate) {
                                                        log.err('GBAN', getText('login', 'gbanMessage', dataGban[idStr].date, dataGban[idStr].reason, dataGban[idStr].date));
                                                        hasBanned = true;
                                                }
                                                else {
                                                        const currentDate = Date.now();
                                                        if (currentDate < new Date(dataGban[idStr].toDate).getTime()) {
                                                                log.err('GBAN', getText('login', 'gbanMessageToDate', dataGban[idStr].date, dataGban[idStr].reason, dataGban[idStr].date, dataGban[idStr].toDate));
                                                                hasBanned = true;
                                                        }
                                                }
                                        }
                                }
                                if (hasBanned == true)
                                        process.exit();
                        }
                        catch (e) {
                                console.log(e);
                                log.err('GBAN', getText('login', 'checkGbanError'));
                                process.exit(2);
                        }
                        // ———————————————— NOTIFICATIONS ———————————————— //
                        let notification;
                        try {
                                const getNoti = await axios.get("https://raw.githubusercontent.com/noobcore404/NC-GBAN/refs/heads/main/notification.txt", { timeout: 8000 });
                                notification = getNoti.data;
                        }
                        catch (err) {
                                log.warn("ERROR", "Can't get notifications data — continuing without it (network issue or server unavailable)");
                                notification = "";
                        }
                        if (global.BeatriceBC.ncsetting.autoRefreshFbstate == true) {
                                changeFbStateByCode = true;
                                try {
                                        writeFileSync(dirAccount, JSON.stringify(filterKeysAppState(api.getAppState()), null, 2));
                                        log.info("REFRESH FBSTATE", getText('login', 'refreshFbstateSuccess', path.basename(dirAccount)));
                                }
                                catch (err) {
                                        log.warn("REFRESH FBSTATE", getText('login', 'refreshFbstateError', path.basename(dirAccount)), err);
                                }
                                setTimeout(() => changeFbStateByCode = false, 1000);
                        }
                        if (hasBanned == true) {
                                log.err('GBAN', getText('login', 'youAreBanned'));
                                process.exit();
                        }
                        // ——————————————————— LOAD DATA ——————————————————— //
                        const { threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, sequelize } = await require(process.env.NODE_ENV === 'development' ? "./loadData.dev.js" : "./loadData.js")(api, createLine);
                        // ————————————————— CUSTOM SCRIPTS ————————————————— //
                        await require("../custom.js")({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getText });
                        // —————————————————— LOAD SCRIPTS —————————————————— //
                        await require(process.env.NODE_ENV === 'development' ? "./loadScripts.dev.js" : "./loadScripts.js")(api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, createLine);

                        // ———————————— CHECK AUTO LOAD SCRIPTS ———————————— //
                        if (global.BeatriceBC.ncsetting.autoLoadScripts?.enable == true) {
                                const ignoreCmds = global.BeatriceBC.ncsetting.autoLoadScripts.ignoreCmds?.replace(/[ ,]+/g, ' ').trim().split(' ') || [];
                                const ignoreEvents = global.BeatriceBC.ncsetting.autoLoadScripts.ignoreEvents?.replace(/[ ,]+/g, ' ').trim().split(' ') || [];

                                watch(`${process.cwd()}/scripts/cmds`, async (event, filename) => {
                                        if (filename.endsWith('.js')) {
                                                if (ignoreCmds.includes(filename) || filename.endsWith('.eg.js'))
                                                        return;
                                                if ((event == 'change' || event == 'rename') && existsSync(`${process.cwd()}/scripts/cmds/${filename}`)) {
                                                        try {
                                                                const contentCommand = global.temp.contentScripts.cmds[filename] || "";
                                                                const currentContent = readFileSync(`${process.cwd()}/scripts/cmds/${filename}`, 'utf-8');
                                                                if (contentCommand == currentContent)
                                                                        return;
                                                                global.temp.contentScripts.cmds[filename] = currentContent;
                                                                filename = filename.replace('.js', '');

                                                                const infoLoad = global.utils.loadScripts("cmds", filename, log, global.BeatriceBC.configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData);
                                                                if (infoLoad.status == "success")
                                                                        log.master("AUTO LOAD SCRIPTS", `Command ${filename}.js (${infoLoad.command.config.name}) has been reloaded`);
                                                                else
                                                                        log.err("AUTO LOAD SCRIPTS", `Error when reload command ${filename}.js`, infoLoad.error);
                                                        }
                                                        catch (err) {
                                                                log.err("AUTO LOAD SCRIPTS", `Error when reload command ${filename}.js`, err);
                                                        }
                                                }
                                        }
                                });

                                watch(`${process.cwd()}/scripts/events`, async (event, filename) => {
                                        if (filename.endsWith('.js')) {
                                                if (ignoreEvents.includes(filename) || filename.endsWith('.eg.js'))
                                                        return;
                                                if ((event == 'change' || event == 'rename') && existsSync(`${process.cwd()}/scripts/events/${filename}`)) {
                                                        try {
                                                                const contentEvent = global.temp.contentScripts.events[filename] || "";
                                                                const currentContent = readFileSync(`${process.cwd()}/scripts/events/${filename}`, 'utf-8');
                                                                if (contentEvent == currentContent)
                                                                        return;
                                                                global.temp.contentScripts.events[filename] = currentContent;
                                                                filename = filename.replace('.js', '');

                                                                const infoLoad = global.utils.loadScripts("events", filename, log, global.BeatriceBC.configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData);
                                                                if (infoLoad.status == "success")
                                                                        log.master("AUTO LOAD SCRIPTS", `Event ${filename}.js (${infoLoad.command.config.name}) has been reloaded`);
                                                                else
                                                                        log.err("AUTO LOAD SCRIPTS", `Error when reload event ${filename}.js`, infoLoad.error);
                                                        }
                                                        catch (err) {
                                                                log.err("AUTO LOAD SCRIPTS", `Error when reload event ${filename}.js`, err);
                                                        }
                                                }
                                        }
                                });
                        }
                        // ——————————————————— DASHBOARD ——————————————————— //
                        if (global.BeatriceBC.ncsetting.dashBoard?.enable == true && dashBoardIsRunning == false) {
                                logColor('#f5ab00', createLine('DASHBOARD'));
                                try {
                                        await require("../../public/app.js")(api);
                                        log.info("DASHBOARD", getText('login', 'openDashboardSuccess'));
                                        dashBoardIsRunning = true;
                                }
                                catch (err) {
                                        log.err("DASHBOARD", getText('login', 'openDashboardError'), err);
                                }
                        }
                        // ———————————————————— ADMIN BOT ———————————————————— //
                        logColor('#f5ab00', character);
                        let i = 0;
                        const adminBot = global.BeatriceBC.ncsetting.adminBot
                                .filter(item => !isNaN(item))
                                .map(item => item = item.toString());
                        for (const uid of adminBot) {
                                try {
                                        const userName = await usersData.getName(uid);
                                        log.master("ADMINBOT", `[${++i}] ${uid} | ${userName}`);
                                }
                                catch (e) {
                                        log.master("ADMINBOT", `[${++i}] ${uid}`);
                                }
                        }
                        log.master("NOTIFICATION", (notification || "").trim());
                        log.master("SUCCESS", getText('login', 'runBot'));
                        log.master("LOAD TIME", `${convertTime(Date.now() - global.BeatriceBC.startTime)}`);
                        logColor("#f5ab00", createLine("COPYRIGHT"));
                        // —————————————————— COPYRIGHT INFO —————————————————— //
                        // console.log(`\x1b[1m\x1b[33mCOPYRIGHT:\x1b[0m\x1b[1m\x1b[37m \x1b[0m\x1b[1m\x1b[36mProject noobCore v2 created by ntkhang03 (https://github.com/ntkhang03), please do not sell this source code or claim it as your own. Thank you!\x1b[0m`);
                        console.log(`\x1b[1m\x1b[33m${("COPYRIGHT:")}\x1b[0m\x1b[1m\x1b[37m \x1b[0m\x1b[1m\x1b[36m${("Project noobCore v2 created by ntkhang03 (https://github.com/ntkhang03), please do not sell this source code or claim it as your own. Thank you!")}\x1b[0m`);
                        logColor("#f5ab00", character);
                        global.BeatriceBC.ncsetting.adminBot = adminBot;
                        writeFileSync(global.client.dirConfig, JSON.stringify(global.BeatriceBC.ncsetting, null, 2));
                        writeFileSync(global.client.dirConfigCommands, JSON.stringify(global.BeatriceBC.configCommands, null, 2));

                        // ——————————————————————————————————————————————————— //
                        const { restartListenMqtt } = global.BeatriceBC.ncsetting;
                        let intervalCheckLiveCookieAndRelogin = false;
                        // —————————————————— CALLBACK LISTEN —————————————————— //
                        async function callBackListen(error, event) {
                                if (error) {
                                        if (
                                                error.error === "auth_error" || 
                                                error.error === "account_inactive" || 
                                                error.error === "Not logged in" || 
                                                error.error === "Not logged in." ||
                                                (error.type === "stop_listen" && error.error === "Connection refused: Server unavailable")
                                        ) {
                                                log.err("LOGIN", `🚫 Error for ${APP_STATES[currentStateIndex]}: ${error.error || error.message}, switching ID...`);
                                                currentStateIndex++;
                                                try {
                                                        api.logout?.();
                                                } catch {}
                                                return startBot();
                                        }
                                        global.responseUptimeCurrent = responseUptimeError;
                                        if (
                                                error.error == "Not logged in" ||
                                                error.error == "Not logged in." ||
                                                error.error == "Connection refused: Server unavailable"
                                        ) {
                                                log.err("NOT LOGGEG IN", getText('login', 'notLoggedIn'), error);
                                                global.responseUptimeCurrent = responseUptimeError;
                                                global.statusAccountBot = 'can\'t login';
                                                if (!isSendNotiErrorMessage) {
                                                        await handlerWhenListenHasError({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, error });
                                                        isSendNotiErrorMessage = true;
                                                }

                                                if (global.BeatriceBC.ncsetting.autoRestartWhenListenMqttError)
                                                        process.exit(2);
                                                else {
                                                        // log.dev("ACCOUNT LOCKED, start relogin...");
                                                        // await stopListening();
                                                        // log.dev("STOP LISTENING SUCCESS");
                                                        const keyListen = Object.keys(callbackListenTime).pop();
                                                        if (callbackListenTime[keyListen])
                                                                callbackListenTime[keyListen] = () => { };
                                                        const cookieString = appState.map(i => i.key + "=" + i.value).join("; ");
                                                        // log.dev("GET COOKIE SUCCESS");
                                                        // log.dev(cookieString);

                                                        let times = 5;

                                                        const spin = createOraDots(getText('login', 'retryCheckLiveCookie', times));
                                                        const countTimes = setInterval(() => {
                                                                times--;
                                                                if (times == 0)
                                                                        times = 5;
                                                                spin.text = getText('login', 'retryCheckLiveCookie', times);
                                                        }, 1000);

                                                        if (intervalCheckLiveCookieAndRelogin == false) {
                                                                intervalCheckLiveCookieAndRelogin = true;
                                                                const interval = setInterval(async () => {
                                                                        const cookieIsLive = await checkLiveCookie(cookieString, facebookAccount.userAgent);
                                                                        if (cookieIsLive) {
                                                                                clearInterval(interval);
                                                                                clearInterval(countTimes);
                                                                                intervalCheckLiveCookieAndRelogin = false;
                                                                                const keyListen = Date.now();
                                                                                isSendNotiErrorMessage = false;
                                                                                global.BeatriceBC.Listening = api.listenMqtt(createCallBackListen(keyListen));
                                                                        }
                                                                }, 5000);
                                                        }
                                                }
                                                return;
                                        }
                                        else if (error == "Connection closed." || error == "Connection closed by user.") /* by stopListening; */ {
                                                return;
                                        }
                                        else {
                                                await handlerWhenListenHasError({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, error });
                                                log.err("LISTEN_MQTT", getText('login', 'callBackError'), error);
                                                log.warn("LOGIN", "🔄 Switching to next APPSTATE due to MQTT error...");
                                                currentStateIndex++;
                                                return startBot();
                                        }
                                }
                                global.responseUptimeCurrent = responseUptimeSuccess;
                                global.statusAccountBot = 'good';
                                const configLog = global.BeatriceBC.ncsetting.logEvents;
                                if (isSendNotiErrorMessage == true)
                                        isSendNotiErrorMessage = false;

                                // "whiteListMode": {
                                //      "enable": false,
                                //      "whiteListIds": [],
                                //      "notes": "if you enable this feature, only the ids in the whiteListIds list can use the bot"
                                // },
                                // "whiteListModeThread": {
                                //      "enable": false,
                                //      "whiteListThreadIds": [],
                                //      "notes": "if you enable this feature, only the thread in the whiteListThreadIds list can use the bot",
                                //      "how_it_work": "if you enable both whiteListMode and whiteListModeThread, the system will check if the user is in whiteListIds, then check if the thread is in whiteListThreadIds, if one of the conditions is true, the user can use the bot"
                                // },

                                // "if you enable both whiteListMode and whiteListModeThread, the system will check if the user is in whiteListIds, then check if the thread is in whiteListThreadIds, if one of the conditions is true, the user can use the bot"
                                // const whitelistMode = config.whiteListMode?.enable === true;
                                // const whitelistModeThread = config.whiteListModeThread?.enable === true;
                                // const isWhitelistedSender = config.whiteListMode?.whiteListIds.includes(event.senderID);
                                // const isWhitelistedThread = config.whiteListModeThread?.whiteListThreadIds.includes(event.threadID);

                                // if (
                                //      (whitelistMode && whitelistModeThread && !isWhitelistedSender && !isWhitelistedThread) ||
                                //      (whitelistMode && !isWhitelistedSender) ||
                                //      (whitelistModeThread && !isWhitelistedThread)
                                // ) {
                                //      return;
                                // }

                                if (
                                        global.BeatriceBC.ncsetting.whiteListMode?.enable == true
                                        && global.BeatriceBC.ncsetting.whiteListModeThread?.enable == true
                                        // admin
                                        && !global.BeatriceBC.ncsetting.adminBot.includes(event.senderID)
                                ) {
                                        if (
                                                !global.BeatriceBC.ncsetting.whiteListMode.whiteListIds.includes(event.senderID)
                                                && !global.BeatriceBC.ncsetting.whiteListModeThread.whiteListThreadIds.includes(event.threadID)
                                                // admin
                                                && !global.BeatriceBC.ncsetting.adminBot.includes(event.senderID)
                                        )
                                                return;
                                }
                                else if (
                                        global.BeatriceBC.ncsetting.whiteListMode?.enable == true
                                        && !global.BeatriceBC.ncsetting.whiteListMode.whiteListIds.includes(event.senderID)
                                        // admin
                                        && !global.BeatriceBC.ncsetting.adminBot.includes(event.senderID)
                                )
                                        return;
                                else if (
                                        global.BeatriceBC.ncsetting.whiteListModeThread?.enable == true
                                        && !global.BeatriceBC.ncsetting.whiteListModeThread.whiteListThreadIds.includes(event.threadID)
                                        // admin
                                        && !global.BeatriceBC.ncsetting.adminBot.includes(event.senderID)
                                )
                                        return;

                                // check if listenMqtt loop
                                if (event.messageID && event.type == "message") {
                                        if (storage5Message.includes(event.messageID))
                                                Object.keys(callbackListenTime).slice(0, -1).forEach(key => {
                                                        callbackListenTime[key] = () => { };
                                                });
                                        else
                                                storage5Message.push(event.messageID);
                                        if (storage5Message.length > 5)
                                                storage5Message.shift();
                                }

                                if (configLog.disableAll === false && configLog[event.type] !== false) {
                                        // hide participantIDs (it is array too long)
                                        const participantIDs_ = [...event.participantIDs || []];
                                        if (event.participantIDs)
                                                event.participantIDs = 'Array(' + event.participantIDs.length + ')';

                                        console.log(colors.green((event.type || "").toUpperCase() + ":"), jsonStringifyColor(event, null, 2));

                                        if (event.participantIDs)
                                                event.participantIDs = participantIDs_;
                                }

                                if ((event.senderID && dataGban[event.senderID] || event.userID && dataGban[event.userID])) {
                                        if (event.body && event.threadID) {
                                                const prefix = getPrefix(event.threadID);
                                                if (event.body.startsWith(prefix))
                                                        return api.sendMessage(getText('login', 'userBanned'), event.threadID);
                                                return;
                                        }
                                        else
                                                return;
                                }

                                const handlerAction = require("../handler/handlerAction.js")(api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData);

                                if (hasBanned === false)
                                        handlerAction(event);
                                else
                                        return log.err('GBAN', getText('login', 'youAreBanned'));
                        }
                        // ————————————————— CREATE CALLBACK ————————————————— //
                        function createCallBackListen(key) {
                                key = randomString(10) + (key || Date.now());
                                callbackListenTime[key] = callBackListen;
                                return function (error, event) {
                                        callbackListenTime[key](error, event);
                                };
                        }
                        // ———————————————————— START BOT ———————————————————— //
                        await stopListening();
                        global.BeatriceBC.Listening = api.listenMqtt(createCallBackListen());
                        global.BeatriceBC.callBackListen = callBackListen;
                        // ——————————————————— UPTIME ——————————————————— //
                        if (global.BeatriceBC.ncsetting.serverUptime.enable == true && !global.BeatriceBC.ncsetting.dashBoard?.enable && !global.serverUptimeRunning) {
                                const http = require('http');
                                const express = require('express');
                                const app = express();
                                const server = http.createServer(app);
                                const { data: html } = await axios.get("https://raw.githubusercontent.com/ntkhang03/resources-goat-bot/master/homepage/home.html");
                                const PORT = global.BeatriceBC.ncsetting.dashBoard?.port || (!isNaN(global.ncsetting.config.serverUptime.port) && global.BeatriceBC.ncsetting.serverUptime.port) || 3001;
                                app.get('/', (req, res) => res.send(html));
                                app.get('/uptime', global.responseUptimeCurrent);
                                let nameUpTime;
                                try {
                                        nameUpTime = `https://${process.env.REPL_OWNER ?
                                                `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` :
                                                process.env.API_SERVER_EXTERNAL == "https://api.glitch.com" ?
                                                        `${process.env.PROJECT_DOMAIN}.glitch.me` :
                                                        `localhost:${PORT}`}`;
                                        nameUpTime.includes('localhost') && (nameUpTime = nameUpTime.replace('https', 'http'));
                                        await server.listen(PORT);
                                        log.info("UPTIME", getText('login', 'openServerUptimeSuccess', nameUpTime));
                                        if (global.BeatriceBC.ncsetting.serverUptime.socket?.enable == true)
                                                require('./socketIO.js')(server);
                                        global.serverUptimeRunning = true;
                                }
                                catch (err) {
                                        log.err("UPTIME", getText('login', 'openServerUptimeError'), err);
                                }
                        }


                        // ———————————————————— RESTART LISTEN ———————————————————— //
                        if (restartListenMqtt.enable == true) {
                                if (restartListenMqtt.logNoti == true) {
                                        log.info("LISTEN_MQTT", getText('login', 'restartListenMessage', convertTime(restartListenMqtt.timeRestart, true)));
                                        log.info("BOT_STARTED", getText('login', 'startBotSuccess'));

                                        logColor("#f5ab00", character);
                                }
                                const restart = setInterval(async function () {
                                        if (restartListenMqtt.enable == false) {
                                                clearInterval(restart);
                                                return log.warn("LISTEN_MQTT", getText('login', 'stopRestartListenMessage'));
                                        }
                                        try {
                                                await stopListening();
                                                await sleep(1000);
                                                global.BeatriceBC.Listening = api.listenMqtt(createCallBackListen());
                                                log.info("LISTEN_MQTT", getText('login', 'restartListenMessage2'));
                                        }
                                        catch (e) {
                                                log.err("LISTEN_MQTT", getText('login', 'restartListenMessageError'), e);
                                        }
                                }, restartListenMqtt.timeRestart);
                                global.intervalRestartListenMqtt = restart;
                        }
                        require('../autoUptime.js');
                });
        })(appState);

        if (global.BeatriceBC.ncsetting.autoReloginWhenChangeAccount) {
                setTimeout(function () {
                        watch(dirAccount, async (type) => {
                                if (type == 'change' && changeFbStateByCode == false && latestChangeContentAccount != fs.statSync(dirAccount).mtimeMs) {
                                        clearInterval(global.intervalRestartListenMqtt);
                                        global.compulsoryStopLisening = true;
                                        // await stopListening();
                                        latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;
                                        // process.exit(2);
                                        startBot();
                                }
                        });
                }, 10000);
        }
}

global.BeatriceBC.reLoginBot = startBot;
startBot();