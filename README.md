# Server which comunivates with mobile-devices-manager. Serves to control simulatos, emulators and real devices.
    Purpose of this server is to manage all devices on а machine.
    This is very convinience when a multiple builds are triggered.

    Provides api as:
        /api/v1/devices/
            - `subscribe?type=simulator&name=iPhone%207%20100&info=Test&apiLevel=11.0&platform=ios`
            - `unsubscribe?token=93B75F3B-0D2A-4873-8BCB-9F78B104BDB5`
            - `?query`- returns devices.
            - `boot?query`- starts devices.
            - `update?query`
            - `refresh?query`
    
    Basically works with query of type IDevice exposed in mobile-devices-controller 

        export interface IDevice {
            name: string,
            token: string,
            type: DeviceType,
            platform: Platform,
            status?: Status,
            startedAt?: number,
            busySince?: number,
            pid?: number,
            apiLevel?: string,
            info?: string,
            config?: any,
        }

## Install

Install the node packages via:

`$ npm install`

### Run
    `$ ns-server`

|command                |Purpose|
|:-------------------------------:|:-------------------:|
|`--port`|Specify port to run server.|
|`DEVICE_CONTROLLER_SERVER_PORT`|Specify port to run server as env variable|
|`--mongodb`|Should use mongodb storage.|
|`--mongodb --startmongodb`|Will start and use mongodb server.|


### Install mogodb

`$ brew update`
`$ brew install mongodb`

#### Create database default folder

`mkdir -p data/db`

#### Run mongodb

`mogod`

### Installing dependencies for mobile-devices-controller
`brew uninstall telnet && true`
`brew install telnet && true`
`brew uninstall ios-webkit-debug-proxy && true`
`brew uninstall ideviceinstaller && true`
`brew uninstall libimobiledevice && true`
`brew install --HEAD libimobiledevice`
`brew link --overwrite libimobiledevice && true`
`brew install --HEAD ideviceinstaller`
`brew link --overwrite ideviceinstaller && true`
`brew install ios-webkit-debug-proxy`
`brew uninstall carthage && true; brew install carthage `

### Start server as a service

# To setup nativescript.mobile.devices.controller.server.plist on mac
```
$ sudo chown 777 ./resources/start-mobile-devices-controller-server.sh
$ cp resources/nativescript.mobile.devices.controller.server.plist ~/Library/LaunchAgents
$ cd ~/Library/LaunchAgents

# This plist profile is setup for node8. In order to change node, open file and edit it
$ sudo chown nsbuilduser: nativescript.mobile.devices.controller.server.plist
$ launchctl load nativescript.mobile.devices.controller.server.plist
$ launchctl start nativescript.mobile.devices.controller.server.plist
```

###  Restart service
$ sudo chown nsbuilduser: nativescript.mobile.devices.controller.server.plist
$ launchctl unload nativescript.mobile.devices.controller.server.plist
$ launchctl load nativescript.mobile.devices.controller.server.plist
$ launchctl start nativescript.mobile.devices.controller.server.plist
```

### To disable/enable. sudo vim nativescript.mobile.devices.controller.server.plist and edit
'<key>Disabled</key> <true/>'
'<key>Enable</key> <false/>'

# To setup nativescript.mobile.devices.controller.server.service on linux
```

https://gododblog.wordpress.com/2017/01/26/boot-start-script-by-systemd/

$ sudo cp resources/nativescript.mobile.devices.controller.server.service /usr/lib/systemd/user/
$ sudo chmod 664 /usr/lib/systemd/user/nativescript.mobile.devices.controller.server.service
$ sudo chmod 755 $HOME/git/mobile-devices-controller-server
$ systemctl --user daemon-reload
$ systemctl --user enable nativescript.mobile.devices.controller.server.service
$ systemctl --user start nativescript.mobile.devices.controller.server.service
$ systemctl --user status nativescript.mobile.devices.controller.server.service

RESULT:

● nativescript.mobile.devices.controller.server.service
   Loaded: loaded (/usr/lib/systemd/user/nativescript.mobile.devices.controller.server.service; enabled; vendor preset: enabled)
   Active: active (running) since Thu 2018-09-20 15:57:33 EEST; 1s ago
 Main PID: 3288 (sh)
   CGroup: /user.slice/user-1001.slice/user@1001.service/nativescript.mobile.devices.controller.server.service
           ├─3288 /bin/sh /home/nsbuilduser/git/ns-setup/infrastructure/start-shares-server-ubuntu.sh &
           └─3289 node /home/nsbuilduser/.nvm/versions/node/v8.11.1/bin/shares-server --port 8700

```

# test:
```
$ curl localhost:8700/api/v1/devices
```

