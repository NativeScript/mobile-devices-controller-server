export declare class Subscribe {
    private subscribtionQueue;
    pushSubscription(action: () => Promise<void>): void;
    private processNextSubscription;
}
