import { DeviceManager } from "./device-manager";
import { assert } from "chai";
import { spawnSync } from "child_process";
import { TestUnitOfWork } from "../db/local/test-unit-of-work";
import {
    Platform,
    DeviceType,
    DeviceController,
    Status,
    IDevice,
    IOSController,
    AndroidController,
    DeviceSignal
} from "mobile-devices-controller";
import { isProcessAlive } from "../utils/utils";

describe("process handling", () => {

    let unitOfWork: TestUnitOfWork;
    let deviceManager: DeviceManager;

    before("before", async () => {
        unitOfWork = await TestUnitOfWork.createConnection();
        await unitOfWork.devices.dropDb();
        deviceManager = new DeviceManager(unitOfWork, { maxSimulatorsCount: 3, maxEmulatorsCount: 1 });
        await deviceManager.refreshData({});
    });

    after("kill connection", async () => {
        await unitOfWork.quit();
    });

    it("current process should return is alive", () => {
        const processPid = process.pid;
        const isAlive = isProcessAlive(processPid);
        assert.isTrue(isAlive, "Process should be marked as alive!");
    });

    it("destroyed process should return is alive false", () => {
        const newProcess = spawnSync("ls");
        const isDead = isProcessAlive(newProcess.pid);
        assert.isFalse(isDead, "Process should be marked as dead!");
    });
});

describe("devices queries/ filtering", () => {

    let unitOfWork: TestUnitOfWork;
    let deviceManager: DeviceManager;

    before("before", async () => {
        unitOfWork = await TestUnitOfWork.createConnection();
        await unitOfWork.devices.dropDb();
        deviceManager = new DeviceManager(unitOfWork, { maxSimulatorsCount: 3, maxEmulatorsCount: 1 });
        await deviceManager.refreshData({});
    });

    after("kill connection", async () => {
        await unitOfWork.quit();
        await deviceManager.cleanListeners();
    });

    it("should return all devices", async () => {
        const devices = await unitOfWork.devices.find({});
        assert.isTrue(devices.length > 50);
    });

    it("should return android devices", async () => {
        const devices = await unitOfWork.devices.find({ platform: Platform.ANDROID });
        const test = devices.every(d => d.platform === Platform.ANDROID && (d.type === DeviceType.EMULATOR || d.type === DeviceType.DEVICE));
        if (!test) {
            devices.forEach(d => {
                if (d.type !== DeviceType.EMULATOR || d.platform !== Platform.ANDROID) {
                    console.log("Check this: ", d);
                }
            })
        }
        assert.isTrue(test, "Not all devices type is of type d.type === DeviceType.EMULATOR || d.type === DeviceType.DEVICE && d.platform === Platform.ANDROID!");
    });

    it("should return ios devices", async () => {
        const devices = await unitOfWork.devices.find({ platform: Platform.IOS });
        const test = devices.every(d => d.platform === Platform.IOS
            && (d.type === DeviceType.SIMULATOR || d.type === DeviceType.DEVICE));
        if (!test) {
            devices.forEach(d => {
                if (d.type !== DeviceType.SIMULATOR || d.platform !== Platform.IOS) {
                    console.log("Check this: ", d);
                }
            })
        }
        assert.isTrue(test, "Not all devices type is of type d.platform === Platform.IOS && (d.type === DeviceType.SIMULATOR || d.type === DeviceType.DEVICE)!");
    });

    it("should return all ios devices iPhone XR and api level /^12.*$/", async () => {
        const devices = await unitOfWork.devices.find(<any>{ name: new RegExp("^iPhone XR$"), apiLevel: new RegExp("^12.*$") });
        const test = devices.every(d => d.name === "iPhone XR" && d.apiLevel.startsWith("12."));
        if (!test) {
            devices.forEach(d => {
                if (d => d.name !== "iPhone XR" || !d.apiLevel.startsWith("12.")) {
                    console.log("Check this: ", d);
                }
            });
        }
        assert.isTrue(test, `Not all devices type are of name: "^iPhone XR$", apiLevel: "^12.*$"!`);
    });

    it("should return all android devices Emulator-Api28-Google", async () => {
        const devices = await unitOfWork.devices.find({ name: "Emulator-Api28-Google", apiLevel: "28" });
        const test = devices.every(d => d.name === "Emulator-Api28-Google" && d.apiLevel.startsWith("28"));
        if (!test) {
            devices.forEach(d => {
                if (d => d.name !== "Emulator-Api28-Google" || !d.apiLevel.startsWith("28")) {
                    console.log("Check this: ", d);
                }
            });
        }
        assert.isTrue(test, `Not all devices type are of type name: "Emulator-Api28-Google", apiLevel: "28.0"!`);
    });
});

describe("start-kill-android-devices", async function () {
    let unitOfWork: TestUnitOfWork;
    let deviceManager: DeviceManager;

    before("before", async () => {
        unitOfWork = await TestUnitOfWork.createConnection();
        await unitOfWork.devices.dropDb();
        deviceManager = new DeviceManager(unitOfWork, { maxSimulatorsCount: 3, maxEmulatorsCount: 1 });
        await deviceManager.refreshData({});
    });

    after("clean listeners", async () => {
        await AndroidController.killAll();
        deviceManager.cleanListeners();
        await unitOfWork.quit();
    });

    const deviceName = "Emulator-Api28-Google";
    const apiLevel = "28";
    const platform = Platform.ANDROID;
    const query = { name: deviceName, apiLevel: apiLevel };

    it("start Emulator-Api28-Google", async () => {
        const startedDevice = (await deviceManager.boot({ name: deviceName, apiLevel: apiLevel, platform: Platform.ANDROID }, 1))[0];
        const devices = (await DeviceController.getDevices({ platform: platform, status: Status.BOOTED }));
        assert.isTrue(devices.some(d => d.name === deviceName), `Failed to start device ${startedDevice.name}`);

        const test = (await unitOfWork.devices.findSingle({ name: deviceName, apiLevel: apiLevel }));
        assert.isTrue(test.status === Status.BOOTED, "Device is not marked as booted!");
    });

    it("kill Emulator-Api28-Google and assert that device is marked as killed", async () => {
        const device = (await unitOfWork.devices.find(query))[0];
        assert.isTrue(device !== null && device !== undefined);
        DeviceController.kill(device);
        let killedDevice = await unitOfWork.devices.findSingle(query);
        let isKilled = false;
        const startTime = Date.now()
        while (!isKilled && Date.now() - startTime < 5000) {
            isKilled = killedDevice.status === Status.SHUTDOWN;
            killedDevice = await unitOfWork.devices.findSingle(query);
        }

        assert.isTrue(isKilled, `Failed to start device ${device.name}`);
    });

    it("start again Emulator-Api28-Google and kill", async () => {
        const device = (await deviceManager.boot(query, 1))[0];
        assert.isTrue(device !== null && device !== undefined && device.status === Status.BOOTED);
        await deviceManager.killDevice(device);
        const killedDevice = await unitOfWork.devices.findSingle(query);
        assert.isTrue(killedDevice.status === Status.SHUTDOWN, `Failed to start device ${killedDevice.name}`);
    });
});

describe("start-kill-ios-device ", async function () {
    let unitOfWork: TestUnitOfWork;
    let deviceManager: DeviceManager;

    before("before", async () => {
        unitOfWork = await TestUnitOfWork.createConnection();
        await unitOfWork.devices.dropDb();
        deviceManager = new DeviceManager(unitOfWork, { maxSimulatorsCount: 3, maxEmulatorsCount: 1 });
        await deviceManager.refreshData({});
    });

    after("clean listeners", async () => {
        await IOSController.killAll();
        deviceManager.cleanListeners();
        await unitOfWork.quit();
    });

    const deviceName = new RegExp("iPhone XR$");
    const apiLevel = new RegExp("12.*");
    const platform = Platform.IOS;
    const query = <any>{ name: deviceName, apiLevel: apiLevel };

    after("clean listeners", () => {
        DeviceController.killAll(DeviceType.SIMULATOR);
        deviceManager.cleanListeners();
    });

    it("should run iPhone XR", async () => {
        const startedDevice = (await deviceManager.boot(query, 1))[0];
        const devices = (await DeviceController.getDevices({ platform: platform, status: Status.BOOTED }))
        assert.isTrue(devices.some(d => new RegExp(deviceName).test(d.name)), `Failed to start device ${startedDevice.name}`);

        const t = await unitOfWork.devices.findSingle(query);
        assert.isTrue(t.status === Status.BOOTED, "Device is not marked as booted!");
    });

    it("should be able to kill iPhone XR and assert that device is marked as killed", async () => {
        const device = (await unitOfWork.devices.find(query))[0];
        assert.isTrue(device !== null && device !== undefined);
        DeviceController.kill(device);
        let killedDevice = await unitOfWork.devices.findSingle(query);
        let isKilled = false;
        const startTime = Date.now()
        while (!isKilled && Date.now() - startTime < 10000) {
            isKilled = killedDevice.status === Status.SHUTDOWN;
            killedDevice = await unitOfWork.devices.findSingle(query);
        }

        assert.isTrue(isKilled, `Failed to start device ${device.name}`);
    });

    it("should be able to start again iPhone XR and kill", async () => {
        const device = (await deviceManager.boot(query, 1))[0];
        assert.isTrue(device !== null && device !== undefined && device.status === Status.BOOTED);
        await deviceManager.killDevice(device);
        const killedDevice = await unitOfWork.devices.findSingle(query);
        assert.isTrue(killedDevice.status === Status.SHUTDOWN, `Failed to start device ${killedDevice.name}`);
    });
});

describe("subscribe-emulators", async () => {

    let unitOfWork: TestUnitOfWork;
    let deviceManager: DeviceManager;

    before("before", async () => {
        unitOfWork = await TestUnitOfWork.createConnection();
        await unitOfWork.devices.dropDb();
        deviceManager = new DeviceManager(unitOfWork, { maxSimulatorsCount: 5, maxEmulatorsCount: 5, emulatorMaxUsageLimit: 3 });
        await deviceManager.refreshData({});
    });

    after("clean listeners", async () => {
        await AndroidController.killAll();
        deviceManager.cleanListeners();
        deviceManager = null;
        await unitOfWork.quit();
    });

    const deviceName: any = new RegExp("^Emulator-Api28-Google$");
    const apiLevel = "28";
    const platform = Platform.ANDROID;
    const query = <any>{ name: deviceName, apiLevel: apiLevel, platform: platform };

    it("subscribe/ unsubscribe for emulator Emulator-Api19-Default with status SHUTDOWN", async () => {
        const api19 = <any>{ name: "Emulator-Api19-Default", apiLevel: "4.4", platform: Platform.ANDROID };
        await deviceManager.boot(api19, 1);
        let subscribedDevice = await deviceManager.subscribeForDevice(api19);
        const usedVirtualDevices = deviceManager.usedVirtualDevices.get(subscribedDevice.token);
        assert.isTrue(subscribedDevice !== undefined && subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
        const result = await deviceManager.unsubscribeFromDevice(subscribedDevice);
        const unsubscribedDevice = await unitOfWork.devices.findByToken(subscribedDevice.token);

        console.log(<IDevice>unsubscribedDevice)
        assert.isTrue(unsubscribedDevice.status === Status.BOOTED, `Device name: ${deviceName} should be booted!`);

        subscribedDevice = await deviceManager.subscribeForDevice(api19);
        assert.isTrue(subscribedDevice && subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
        await deviceManager.unsubscribeFromDevice(subscribedDevice);

        api19.apiLevel = subscribedDevice.releaseVersion;
        api19.releaseVersion = subscribedDevice.releaseVersion;
        subscribedDevice = await deviceManager.subscribeForDevice(api19);
        assert.isTrue(subscribedDevice && subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
        await deviceManager.unsubscribeFromDevice(subscribedDevice);

        assert.isTrue(unsubscribedDevice.status === Status.BOOTED, `Device name: ${deviceName} should be booted!`);

        AndroidController.killAll();
    });

    it("subscribe/ unsubscribe for emulator Emulator-Api28-Google with status SHUTDOWN", async () => {
        const subscribedDevice = await deviceManager.subscribeForDevice(query);
        assert.isTrue(subscribedDevice !== undefined && subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
        const result = await deviceManager.unsubscribeFromDevice(subscribedDevice);
        const unsubscribedDevice = await unitOfWork.devices.findByToken(subscribedDevice.token);

        console.log(unsubscribedDevice)
        assert.isTrue(unsubscribedDevice.status === Status.BOOTED, `Device name: ${deviceName} should be killed since max live time is 1!`);
    });

    it("subscribe/ subscribe for emulator Emulator-Api28-Google with status SHUTDOWN", async () => {
        const subscribedDevice = (await deviceManager.subscribeForDevice(query));
        assert.isTrue(subscribedDevice && subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
        const subscribedDeviceSecondTime: IDevice = await deviceManager.subscribeForDevice(query);
        assert.isTrue(!subscribedDeviceSecondTime, `Should not be able to subscribe when there is no free device!`);
        await deviceManager.killDevice(subscribedDevice);
    });

    it("boot/ kill/ device killed event after manager kill", async function () {
        this.timeout(25000);
        return new Promise(async (resolve, reject) => {
            const subscribedDevice = (await deviceManager.subscribeForDevice(query));
            const usedDevice = deviceManager.usedVirtualDevices.get(subscribedDevice.token);
            usedDevice.virtualDevice.on(DeviceSignal.onDeviceKilledSignal, async (d) => {
                const deviceControllerDevice = (await DeviceController.getDevices(query))[0];
                let unitOfWorkDevice = (await unitOfWork.devices.find(query))[0];
                if (unitOfWorkDevice.name === deviceControllerDevice.name) {
                    resolve();
                } else {
                    reject();
                }
            })
            assert.isTrue(subscribedDevice && subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
            await deviceManager.killDevice(subscribedDevice);
        });
    });

    it("boot/ kill/ killed event after killall", async function () {
        this.timeout(25000);
        return new Promise(async (resolve, reject) => {
            const subscribedDevice = (await deviceManager.subscribeForDevice(query));
            const usedDevice = deviceManager.usedVirtualDevices.get(subscribedDevice.token);
            usedDevice.virtualDevice.on(DeviceSignal.onDeviceKilledSignal, async (d) => {
                const unitOfWorkDevice = (await unitOfWork.devices.find(query))[0];
                const deviceControllerDevice = (await DeviceController.getDevices(query))[0];
                if (unitOfWorkDevice.token === deviceControllerDevice.token && unitOfWorkDevice.name === deviceControllerDevice.name) {
                    resolve();
                } else {
                    reject();
                }
            })
            assert.isTrue(subscribedDevice && subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
            await AndroidController.killAll();
        });
    });

    it("boot/ attach event/ kill", async function () {
        //this.timeout(25000);
        return new Promise(async (resolve, reject) => {
            const bootedDevice = (await DeviceController.startDevice({ name: "Emulator-Api28-Google" , platform: platform}));
            const attachedDevices = await deviceManager.attachToDevice({ name: "Emulator-Api28-Google" , platform: platform});
            assert.isTrue(attachedDevices.length === 1);
            const usedDevice = deviceManager.usedVirtualDevices.get(attachedDevices[0].token);
            usedDevice.virtualDevice.on(DeviceSignal.onDeviceKilledSignal, async (d) => {
                const unitOfWorkDevice = (await unitOfWork.devices.find(query))[0];
                const deviceControllerDevice = (await DeviceController.getDevices(query))[0];
                if (unitOfWorkDevice.token === deviceControllerDevice.token && unitOfWorkDevice.name === deviceControllerDevice.name) {
                    resolve();
                } else {
                    reject();
                }
            });
            await AndroidController.killAll();
        });
    });
});

describe("subscribe-simulators", async () => {

    let unitOfWork: TestUnitOfWork;
    let deviceManager: DeviceManager;

    before("before", async () => {
        unitOfWork = await TestUnitOfWork.createConnection();
        await unitOfWork.devices.dropDb();
        deviceManager = new DeviceManager(unitOfWork, { maxSimulatorsCount: 3, maxEmulatorsCount: 1 });
        // deviceManager.intervalSubscriber.unsubscribe();
        await deviceManager.refreshData({});
    });

    after("clean listeners", async () => {
        await DeviceController.killAll(DeviceType.SIMULATOR);
        deviceManager.cleanListeners();
        await unitOfWork.quit();
    });

    const deviceName = new RegExp("^iPhone XR$");
    const apiLevel = new RegExp("12.*");
    const platform = Platform.IOS;
    let query = <any>{ name: deviceName, apiLevel: apiLevel };

    it("create simulator", async () => {
        const simulator = (await unitOfWork.devices.find({ name: "iPhone XR", apiLevel: "12.1" }))[0];
        const testDevice = IOSController.fullResetOfSimulator({ name: simulator.name, apiLevel: simulator.apiLevel, token: simulator.token });
        const isCreated = (await DeviceController.getDevices({ token: testDevice.token }))[0];
        assert.isTrue(isCreated && isCreated.status === Status.SHUTDOWN);
        IOSController.deleteDevice(testDevice.token);
        const isDeleted = await DeviceController.getDevices({ token: testDevice.token });
        assert.isTrue(!isDeleted || isDeleted.length === 0, "Device is not deleted!");
        await deviceManager.refreshData({});
    });

    it("subscribe for ^iPhone XR$ ios 12.*", async () => {
        const subscribedDevice = (await deviceManager.subscribeForDevice(query));
        assert.isTrue(subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
        await deviceManager.unsubscribeFromDevice(subscribedDevice);
        const isDeviceKilled = await unitOfWork.devices.findByToken(subscribedDevice.token);

        assert.isTrue(isDeviceKilled.status === Status.BOOTED, `Device name: ${deviceName} should be alive!`);
    });

    it("subscribe for already booted iPhone XR", async () => {
        const subscribedDevice = (await deviceManager.subscribeForDevice(query));
        assert.isTrue(subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
        await deviceManager.unsubscribeFromDevice(subscribedDevice);
        const isDeviceKilled = await unitOfWork.devices.findByToken(subscribedDevice.token);

        assert.isTrue(isDeviceKilled.status === Status.BOOTED, `Device name: ${deviceName} should be alive!`);
    });

    it("subscribe for 2 simulator iPhone XR", async () => {
        let tempQuery1 = <any>{};
        Object.assign(tempQuery1, query);
        tempQuery1.parentProcessPid = process.pid;
        const subscribedDevice1 = (await deviceManager.subscribeForDevice(tempQuery1));
        const subscribedDevice2 = (await deviceManager.subscribeForDevice(query));
        const devices = await unitOfWork.devices.find({ status: Status.BUSY, platform: platform });
        console.log("Device length: ", devices.length);
        assert.isTrue(devices.length === 2, "Should be 2 devices, since the first one has a parentProcessPid");
        await deviceManager.killDevices({ platform: platform, status: Status.BUSY });
    });

    it("subscribe for 2 simulator iPhone XR with no existing process", async () => {
        let tempQuery1 = <any>{};
        Object.assign(tempQuery1, query);
        const dummyProcess = spawnSync("ls", { shell: true });
        tempQuery1.parentProcessPid = dummyProcess.pid;
        const subscribedDevice1 = (await deviceManager.subscribeForDevice(tempQuery1));
        const subscribedDevice2 = (await deviceManager.subscribeForDevice(query));
        const devices = await unitOfWork.devices.find({ status: Status.BUSY, platform: platform });
        console.log("Device length: ", devices.length);
        assert.isTrue(devices.length === 1, "Device length should be 1, since the first one has a parentProcessPid which is not alive!");
    });
});