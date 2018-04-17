export const log = (msg: string, obj?: any) => {
    const time = new Date(Date.now());
    console.log(`Log at: ${time}. ${msg}! `, obj);
}