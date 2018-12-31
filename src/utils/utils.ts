import { spawnSync } from "child_process";

export const isProcessAlive = (arg: number) => {
    const result = spawnSync(`/bin/ps`, [`aux | grep -i ${arg}`, `| awk '{print $2}'`], {
        shell: true
    });
    let test = false;

    if (result.stdout.length > 0) {
        test = result.stdout.toString().split("\n").some(r => new RegExp("^" + arg + "$", "ig").test(r));
    }
    console.log("Process: ", result.stdout.toString());
    console.log("Result of check: ", test);
    return test;
}

export const filterOptions = options => {
    Object.keys(options).forEach(key => !options[key] && delete options[key]);
    return options;
};

// const deviceToQuery = device => {
//     let query: IDevice = {};
//     Object.assign(query, device);
//     Object.getOwnPropertyNames(query).forEach(prop => {
//         if (query[prop]) {
//             const p = prop.startsWith("_") ? prop.substring(1) : prop;
//             query[p] = { $regex: new RegExp(query[p]) };
//         }

//         if (!query[prop] || prop.startsWith("_")) {
//             delete query[prop];
//         }
//     });

//     delete query["busySince"];
//     delete query["startedAt"];
//     delete query["config"];
//     delete query["pid"];

//     return query;
// }

export const log = (msg: string, obj?: any) => {
    const time = new Date(Date.now());
    msg = `Log at: ${time}. ${msg}! `;
    logInfo(msg, obj);
}

export const logWarning = (msg: string, obj?: any) => {
    const time = new Date(Date.now());
    msg = `Log at: ${time}. ${msg}! `;
    logWarn(msg, obj);
}

export const logErr = (msg: string, obj?: any) => {
    const time = new Date(Date.now());
    msg = `Log at: ${time}. ${msg}! `;
    logWarn(msg, obj);
}

export function logInfo(info, obj = undefined) {
    console.log(`${ConsoleColor.FgCyan}%s${ConsoleColor.Reset}`, info);
    if (obj) {
        console.log(``, obj);
    }
}

export function logWarn(info, obj = undefined) {
    console.log(`${ConsoleColor.BgYellow}${ConsoleColor.FgBlack}%s${ConsoleColor.Reset}`, info);
    if (obj) {
        console.log(``, obj);
    }
}

export function logError(info, obj = undefined) {
    console.log(`${ConsoleColor.BgRed}%s${ConsoleColor.Reset}`, info);
    if (obj) {
        console.log(``, obj);
    }
}

enum ConsoleColor {
    Reset = "\x1b[0m",
    Bright = "\x1b[1m",
    Dim = "\x1b[2m",
    Underscore = "\x1b[4m",
    Blink = "\x1b[5m",
    Reverse = "\x1b[7m",
    Hidden = "\x1b[8m",

    FgBlack = "\x1b[30m",
    FgRed = "\x1b[31m",
    FgGreen = "\x1b[32m",
    FgYellow = "\x1b[33m",
    FgBlue = "\x1b[34m",
    FgMagenta = "\x1b[35m",
    FgCyan = "\x1b[36m",
    FgWhite = "\x1b[37m",

    BgBlack = "\x1b[40m",
    BgRed = "\x1b[41m",
    BgGreen = "\x1b[42m",
    BgYellow = "\x1b[43m",
    BgBlue = "\x1b[44m",
    BgMagenta = "\x1b[45m",
    BgCyan = "\x1b[46m",
    BgWhite = "\x1b[47m"
}