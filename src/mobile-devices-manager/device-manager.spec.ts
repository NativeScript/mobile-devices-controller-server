import { DeviceManager, isProcessAlive } from "./device-manager";
import { assert } from "chai";
import { spawnSync } from "child_process";
import { TestUnitOfWork } from "../db/local/test-unit-of-work";
import { Platform, DeviceType, DeviceController, Status, IDevice, IOSController } from "mobile-devices-controller";

const deviceToQuery = device => {
    let query: IDevice = {};
    Object.assign(query, device);
    Object.getOwnPropertyNames(query).forEach(prop => {
        if (query[prop]) {
            const p = prop.startsWith("_") ? prop.substring(1) : prop;
            query[p] = { $regex: new RegExp(query[p]) };
        }

        if (!query[prop] || prop.startsWith("_")) {
            delete query[prop];
        }
    });

    delete query["busySince"];
    delete query["startedAt"];
    delete query["config"];
    delete query["pid"];

    return query;
}

describe("process handling", () => {
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

describe("devices", async () => {

    let unitOfWork: TestUnitOfWork;
    let deviceManager: DeviceManager;

    before("before", async () => {
        unitOfWork = await TestUnitOfWork.createConnection();
        await unitOfWork.devices.dropDb();
        deviceManager = new DeviceManager(unitOfWork, { iosCount: 3, androidCount: 1 });
        //deviceManager.intervalSubscriber.unsubscribe();
        await deviceManager.refreshData({}, {});
    });

    describe("devices queries", () => {
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
            const test = devices.every(d => d.platform === Platform.IOS && (d.type === DeviceType.SIMULATOR || d.type === DeviceType.DEVICE));
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
            const devices = await unitOfWork.devices.find({ name: "^iPhone XR$", apiLevel: "^12.*$" });
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
            const query = deviceToQuery(<any>{ name: "^Emulator-Api28-Google$", apiLevel: "^28*" });
            const devices = await unitOfWork.devices.find(query);
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

    describe("run, kill android devices ", async function () {
        this.retries(2);
        this.timeout(999999);

        const deviceName = "Emulator-Api28-Google";
        const apiLevel = "28";
        const platform = Platform.ANDROID;

        const query = deviceToQuery(<any>{ name: deviceName, apiLevel: apiLevel });

        it("should run Emulator-Api28-Google", async () => {
            const startedDevice = (await deviceManager.boot(query, 1, true))[0];
            const devices = (await DeviceController.getDevices({ platform: platform, status: Status.BOOTED }))
            assert.isTrue(devices.some(d => d.name === deviceName), `Failed to start device ${startedDevice.name}`);

            assert.isTrue((await unitOfWork.devices.findSingle(query)).status === Status.BOOTED, "Device is not marked as booted!");
        });

        it("should be able to kill Emulator-Api28-Google and assert that device is marked as killed", async () => {
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

        it("should be able to start again Emulator-Api28-Google and kill", async () => {
            const device = (await deviceManager.boot(query, 1, true))[0];
            assert.isTrue(device !== null && device !== undefined && device.status === Status.BOOTED);
            await deviceManager.killDevice(device);
            const killedDevice = await unitOfWork.devices.findSingle(query);
            assert.isTrue(killedDevice.status === Status.SHUTDOWN, `Failed to start device ${killedDevice.name}`);
        });
    });

    describe("run, kill ios device ", async function () {
        this.retries(2);
        this.timeout(999999);

        const deviceName = "iPhone XR$";
        const apiLevel = "12.*";
        const platform = Platform.IOS;
        const query = deviceToQuery(<any>{ name: deviceName, apiLevel: apiLevel });

        after("after", () => {
            DeviceController.killAll(DeviceType.SIMULATOR);
        })

        it("should run iPhone XR", async () => {
            const startedDevice = (await deviceManager.boot(query, 1, true))[0];
            const devices = (await DeviceController.getDevices({ platform: platform, status: Status.BOOTED }))
            assert.isTrue(devices.some(d => new RegExp(deviceName).test(d.name)), `Failed to start device ${startedDevice.name}`);

            assert.isTrue((await unitOfWork.devices.findSingle(query)).status === Status.BOOTED, "Device is not marked as booted!");
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
            const device = (await deviceManager.boot(query, 1, true))[0];
            assert.isTrue(device !== null && device !== undefined && device.status === Status.BOOTED);
            await deviceManager.killDevice(device);
            const killedDevice = await unitOfWork.devices.findSingle(query);
            assert.isTrue(killedDevice.status === Status.SHUTDOWN, `Failed to start device ${killedDevice.name}`);
        });
    });

    describe("subscribe devices", async function () {

        before("prepare Device Manager", () => {

        });

        describe("subscribe for Emulator-Api28-Google", async () => {

            const deviceName = "^Emulator-Api28-Google$";
            const apiLevel = "28";
            const platform = Platform.ANDROID;
            const query = deviceToQuery(<any>{ name: deviceName, apiLevel: apiLevel });

            after("after subscribe android", async () => {
                await deviceManager.killDevices({ platform: platform, status: Status.BOOTED });
                await deviceManager.cleanListeners();
                deviceManager = null;
            });

            it("subscribe/ unsubscribe for emulator Emulator-Api28-Google with status SHUTDOWN", async () => {
                const subscribedDevice = await deviceManager.subscribeForDevice(query);
                assert.isTrue(subscribedDevice !== undefined && subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
                const result = await deviceManager.unsubscribeFromDevice(subscribedDevice);
                const unsubscribedDevice = await unitOfWork.devices.findByToken(subscribedDevice.token);

                console.log(unsubscribedDevice)
                assert.isTrue(unsubscribedDevice.status === Status.SHUTDOWN, `Device name: ${deviceName} should be killed since max live time is 1!`);
            });

            it("subscribe/ subscribe for emulator Emulator-Api28-Google with status SHUTDOWN", async () => {
                const subscribedDevice = (await deviceManager.subscribeForDevice(query));
                assert.isTrue(subscribedDevice !== undefined && subscribedDevice.status === Status.BUSY, `Could not subscribe to device`);
                const subscribedDeviceSecondTime = await deviceManager.subscribeForDevice(query);
                assert.isTrue(!subscribedDeviceSecondTime, `Should not be able to subscribe when there is no free device!`);
                await deviceManager.killDevice(subscribedDevice);
            });
        });

        describe("subscribe for iPhone", async () => {
            const deviceName = "^iPhone XR$";
            const apiLevel = "12.*"
            const platform = Platform.IOS;
            let query = deviceToQuery(<any>{ name: deviceName, apiLevel: apiLevel });

            before("before ios: ", () => {
                deviceManager = new DeviceManager(unitOfWork, { iosCount: 5, androidCount: 1 });
            });

            after("kill all simulators in tear down!", () => {
                deviceManager.cleanListeners();
                deviceManager = null;
                DeviceController.killAll(DeviceType.SIMULATOR);
            })

            // it("create simulator", async () => {
            //     const simulator = (await unitOfWork.devices.find(query))[0];
            //     const deviceName = `test-device-${Date.now()}`;
            //     simulator.token = undefined;
            //     const testDevice = IOSController.fullResetOfSimulator({ name: deviceName, apiLevel: simulator.apiLevel, token: simulator.token, initType: "iPhone XR" });
            //     const isCreated = await unitOfWork.devices.findByToken(testDevice.token);
            //     assert.isTrue(isCreated !== null);
            //     IOSController.deleteDevice(testDevice.token);
            //     const isDeleted = DeviceController.getDevices({ platform: platform, name: testDevice.name });
            //     //assert(!isDeleted, "Device is not deleted!");
            // });

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

            it("subscribe for 2 simulator iPhone XR", async () => {
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
    })
});