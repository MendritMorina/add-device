const express = require('express');
const grpc = require('@grpc/grpc-js');
const { DeviceServiceClient } = require('@chirpstack/chirpstack-api/api/device_grpc_pb');
const { CreateDeviceRequest, CreateDeviceKeysRequest } = require('@chirpstack/chirpstack-api/api/device_pb');
const { Device, DeviceKeys } = require('@chirpstack/chirpstack-api/api/device_pb');

const app = express();
const port = 1000;

app.use(express.json());

async function addingDevice(server, apiToken, deviceList, applicationId, deviceProfileId) {
    if (!Array.isArray(deviceList)) {
        deviceList = [deviceList];
    }

    for (const deviceData of deviceList) {
        try {
            const req = new CreateDeviceRequest();
            const device = new Device();

            device.setDevEui(deviceData.devEUI);
            device.setName(deviceData.name);
            device.setApplicationId(applicationId);
            device.setDeviceProfileId(deviceProfileId);
            device.setDescription("Registering device via API");
            device.setIsDisabled(false);
            device.setSkipFcntCheck(false);
            req.setDevice(device);

            const keysReq = new CreateDeviceKeysRequest();
            const keys = new DeviceKeys();

            keys.setDevEui(deviceData.devEUI);
            keys.setNwkKey(deviceData.appKey);
            keys.setAppKey(deviceData.appKey);
            keysReq.setDeviceKeys(keys);

            const channel = await new DeviceServiceClient(server, grpc.credentials.createInsecure());
            const metadata = await new grpc.Metadata();
            await metadata.set("authorization", "Bearer " + apiToken);

            await channel.create(req, metadata, (err, resp) => {
                if (err !== null) {
                    console.log("Create err:", err);
                    return;
                } else {
                    console.log("Create Device success: " + deviceData.name);
                }
                channel.createKeys(keysReq, metadata, (err, resp) => {
                    if (err !== null) {
                        console.log("CreateKeys err:", err);
                        return;
                    } else {
                        console.log("Create DeviceKey success: " + deviceData.name);
                    }
                });
            });
        } catch (e) {
            console.log("Error at adding device key", e);
            return response.status(500).send(`An error occurred: ${e}`);
        }
    }
    return true;
}

app.post('/add-device', async (req, res) => {
    const { server, apiToken, deviceList, applicationId, deviceProfileId } = req.body;
    try {
        const result = await addingDevice(server, apiToken, deviceList, applicationId, deviceProfileId);
        res.send(result ? 'Devices added successfully' : 'Failed to add devices');
    } catch (e) {
        res.status(500).send(`An error occurred: ${e}`);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


//npm install express @grpc/grpc-js @chirpstack/chirpstack-api
//npm start
//http://localhost:1000/add-device

// {
//     "server": "10.10.10.10:8080",
//     "apiToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjaGlycHN0YWNrIiwiaXNzIjoiY2hpcnBzdGFjayIsInN1YiI6ImRkZDkzMzI3LTFjMmUtNDQzZi04NzNlLWQ4YzhlNjhjYTIwNiIsInR5cCI6ImtleSJ9.dzUG9p6g3EKIccMp8hkfwgUOih2Yeim5dayamKUPPQs",
//     "deviceList": [
//       {
//         "devEUI": "009569060000f245",
//         "name": "Vali 1",
//         "appKey": "0011223344556677009569060000f245"
//       },
//       {
//         "devEUI": "009569060000f246",
//         "name": "Vali 2",
//         "appKey": "0011223344556677009569060000f246"
//       }
//     ],
//     "applicationId": "b1e6d745-0112-483d-a322-b33906bc8323",
//     "deviceProfileId": "86824b22-a965-49c8-bfaa-675232b6c557"
//   }
  
