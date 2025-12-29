"use strict";
const common_vendor = require("../common/vendor.js");
const SERVICE_UUID = "A07498CA-AD5B-474E-940D-16F1FBE7E8CD";
const CHAR_UUID = "51FF12BB-3ED8-46E5-B4F9-D64E2FEC021B";
const DEVICE_NAME_PREFIX = "OrangePi_Robot";
let deviceId = "";
let serviceId = "";
let characteristicId = "";
let isConnected = false;
function calculateChecksum(dataView, length) {
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += dataView.getUint8(i);
  }
  return sum & 255;
}
const BLE = {
  // --- 初始化与连接 ---
  connect() {
    return new Promise((resolve, reject) => {
      common_vendor.index.openBluetoothAdapter({
        success: () => {
          common_vendor.index.startBluetoothDevicesDiscovery({
            success: () => {
              common_vendor.index.onBluetoothDeviceFound((res) => {
                const device = res.devices[0];
                if (device.name && device.name.includes(
                  DEVICE_NAME_PREFIX
                )) {
                  common_vendor.index.stopBluetoothDevicesDiscovery();
                  deviceId = device.deviceId;
                  common_vendor.index.__f__("log", "at utils/ble.js:46", "找到设备:", deviceId);
                  common_vendor.index.createBLEConnection({
                    deviceId,
                    success: () => {
                      isConnected = true;
                      setTimeout(() => {
                        this.getServices(
                          resolve,
                          reject
                        );
                      }, 1e3);
                    },
                    fail: (err) => reject("连接失败: " + JSON.stringify(err))
                  });
                }
              });
            },
            fail: (err) => reject("搜索失败: " + JSON.stringify(err))
          });
        },
        fail: (err) => reject("请打开蓝牙: " + JSON.stringify(err))
      });
    });
  },
  // 获取服务和特征值
  getServices(resolve, reject) {
    common_vendor.index.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        const targetService = res.services.find((s) => s.uuid.toUpperCase() === SERVICE_UUID);
        if (targetService) {
          serviceId = targetService.uuid;
          common_vendor.index.getBLEDeviceCharacteristics({
            deviceId,
            serviceId,
            success: (res2) => {
              const targetChar = res2.characteristics.find((c) => c.uuid.toUpperCase() === CHAR_UUID);
              if (targetChar) {
                characteristicId = targetChar.uuid;
                this.listenBattery();
                resolve("连接成功");
              } else {
                reject("未找到特征值");
              }
            },
            fail: (err) => reject("获取特征值失败")
          });
        } else {
          reject("未找到目标服务");
        }
      },
      fail: (err) => reject("获取服务失败")
    });
  },
  // --- 发送控制指令 (核心协议封装) ---
  // linearX: 前后速度 (m/s)
  // angularZ: 左右旋转速度 (rad/s)
  // motorEnable: true/false
  // frictionEnable: true/false (对应自动拾取/摩擦轮)
  sendControl(linearX, angularZ, motorEnable, frictionEnable) {
    if (!isConnected || !deviceId)
      return;
    const buffer = new ArrayBuffer(15);
    const view = new DataView(buffer);
    view.setUint8(0, 170);
    view.setUint8(1, 85);
    view.setUint8(2, 10);
    view.setFloat32(3, linearX, true);
    view.setFloat32(7, angularZ, true);
    view.setUint8(11, motorEnable ? 1 : 0);
    view.setUint8(12, frictionEnable ? 1 : 0);
    const checksum = calculateChecksum(view, 13);
    view.setUint8(13, checksum);
    view.setUint8(14, 255);
    common_vendor.index.writeBLECharacteristicValue({
      deviceId,
      serviceId,
      characteristicId,
      value: buffer,
      fail: (err) => common_vendor.index.__f__("error", "at utils/ble.js:153", "发送失败", err)
    });
  },
  // --- 监听电量反馈 ---
  // callback: (batteryLevel) => {}
  onBatteryUpdate(callback) {
    this.batteryCallback = callback;
  },
  listenBattery() {
    common_vendor.index.notifyBLECharacteristicValueChange({
      state: true,
      deviceId,
      serviceId,
      characteristicId,
      success: () => {
        common_vendor.index.onBLECharacteristicValueChange((res) => {
          const view = new DataView(res.value);
          if (view.byteLength >= 6) {
            const head1 = view.getUint8(0);
            const head2 = view.getUint8(1);
            const tail = view.getUint8(5);
            if (head1 === 170 && head2 === 85 && tail === 255) {
              const battery = view.getUint8(3);
              const calcSum = calculateChecksum(view, 4);
              const recvSum = view.getUint8(4);
              if (calcSum === recvSum) {
                if (this.batteryCallback)
                  this.batteryCallback(battery);
              }
            }
          }
        });
      }
    });
  },
  // 断开连接
  close() {
    if (deviceId) {
      common_vendor.index.closeBLEConnection({
        deviceId
      });
    }
    common_vendor.index.closeBluetoothAdapter();
    isConnected = false;
  }
};
exports.BLE = BLE;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/ble.js.map
