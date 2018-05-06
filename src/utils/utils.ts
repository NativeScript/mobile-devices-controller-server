export const log = (msg: string, obj?: any) => {
    const time = new Date(Date.now());
    msg = `Log at: ${time}. ${msg}! `;
    if (obj) {
        console.log(msg, obj);
    } else {
        console.log(msg);
    }
}