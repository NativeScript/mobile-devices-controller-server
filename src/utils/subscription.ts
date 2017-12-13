// const this.subscribtionQueue: { (): Promise<void> }[] = [];

// function pushSubscription(action: () => Promise<void>): void {
//     this.subscribtionQueue.push(action);
//     console.log("Push subscription in info service: " + this.subscribtionQueue.length);
//     if (this.subscribtionQueue.length === 1) {
//         processNextSubscription();
//     }
// }

// function processNextSubscription(): void {
//     const next = this.subscribtionQueue[0];
//     function onNextCompleted() {
//         this.subscribtionQueue.shift()
//         console.log("Complete in info service! " + this.subscribtionQueue.length);
//         if (this.subscribtionQueue.length > 0) {
//             processNextSubscription();
//         }
//     }
//     console.log("Process next ininfo service: " + this.subscribtionQueue.length);
//     next().then(onNextCompleted, onNextCompleted);
// }

export class Subscribe {
    private subscribtionQueue: { (): Promise<void> }[] = [];

    public pushSubscription(action: () => Promise<void>): void {
        this.subscribtionQueue.push(action);
        console.log("Push subscription in info service: " + this.subscribtionQueue.length);
        if (this.subscribtionQueue.length === 1) {
            this.processNextSubscription();
        }
    }

    private processNextSubscription(): void {
        const next = this.subscribtionQueue[0];
        const that = this;
        function onNextCompleted() {
            that.subscribtionQueue.shift()
            console.log("Complete in info service! " + that.subscribtionQueue.length);
            if (that.subscribtionQueue.length > 0) {
                that.processNextSubscription();
            }
        };
        console.log("Process next ininfo service: " + this.subscribtionQueue.length);
        next().then(onNextCompleted, onNextCompleted);
    }
}