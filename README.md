# Server which comunivates with mobile-devices-manager. Serves to control simulatos, emulators and real devices.
    Purpose of this server is to manage all devices on а machine.
    This is very convinience when a multiple builds are triggered.

    Provides api as:
        http://localhost:8000/api/v1/devices/
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
|`USE_MONOGDB_STORAGE`|Use env variable to specify storage|

## Using local storage 
    By default uses local storage to store device info using files. 
    Default folder location is in home folder of the user.
    To override it, set env variable `DEVICE_INFO_STORAGE`=path to storage.

## Using mongodb storage

    Set evn variable `USE_MONOGDB_STORAGE`=true or --mongodb

### Install mogodb

`$ brew update`
`$ brew install mongodb`

#### Create database default folder

`mkdir -p data/db`

#### Run mongodb

`mogod`
