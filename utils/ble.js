// utils/ble.js

// === 1. 配置参数 ===
const SERVICE_UUID = "A07498CA-AD5B-474E-940D-16F1FBE7E8CD".toUpperCase();
const CHAR_UUID = "51FF12BB-3ED8-46E5-B4F9-D64E2FEC021B".toUpperCase();
const DEVICE_NAME_PREFIX = "OrangePi_Robot";

// 蓝牙连接状态
let deviceId = "";
let serviceId = "";
let characteristicId = "";
let writeType = "write";
let isConnected = false;
let isConnecting = false; // 防抖锁
let onDeviceFoundHandler = null;
let characteristicProperties = null;

function normalizeUUID(uuid) {
	return (uuid || "").toUpperCase();
}

function formatBleError(prefix, err) {
	if (!err) return prefix;
	const code = typeof err.errCode === "number" ? ` [${err.errCode}]` : "";
	const msg = err.errMsg || JSON.stringify(err);
	return `${prefix}${code}: ${msg}`;
}

function stopDiscoveryAndUnregister() {
	uni.stopBluetoothDevicesDiscovery({
		fail: () => { }
	});
	if (onDeviceFoundHandler) {
		uni.offBluetoothDeviceFound(onDeviceFoundHandler);
		onDeviceFoundHandler = null;
	}
}

function hasTargetService(device) {
	const serviceList = device.advertisServiceUUIDs || device.advertiseServiceUUIDs || [];
	return serviceList.some((id) => normalizeUUID(id) === SERVICE_UUID);
}

function getDisplayName(device) {
	return device.name || device.localName || "";
}

// === 2. 辅助函数：计算校验和 ===
function calculateChecksum(dataView, length) {
	let sum = 0;
	for (let i = 0; i < length; i++) {
		sum += dataView.getUint8(i);
	}
	return sum & 0xFF;
}

// === 3. 核心功能 ===
export default {
	// --- 初始化与连接 ---
	connect() {
		return new Promise((resolve, reject) => {
			if (isConnecting) {
				reject("蓝牙连接中，请稍后再试");
				return;
			}

			if (isConnected && deviceId) {
				resolve("已连接");
				return;
			}

			isConnecting = true;
			uni.openBluetoothAdapter({
				success: () => {
					let timeout = null;
					timeout = setTimeout(() => {
						stopDiscoveryAndUnregister();
						isConnecting = false;
						reject("搜索超时，请确认机器人已上电且在附近");
					}, 12000);

					onDeviceFoundHandler = (res) => {
						const devices = Array.isArray(res.devices) ? res.devices : [];
						for (const device of devices) {
							const deviceName = getDisplayName(device);
							const byName = deviceName.includes(DEVICE_NAME_PREFIX);
							const byService = hasTargetService(device);

							if ((byName || byService) && !isConnected) {
								console.log("找到设备:", deviceName || device.deviceId);
								stopDiscoveryAndUnregister();
								clearTimeout(timeout);

								deviceId = device.deviceId;

								uni.createBLEConnection({
									deviceId,
									success: () => {
										isConnected = true;
										// iOS 上服务发现通常需要更长稳定时间
										setTimeout(() => {
											this.getServices(resolve, reject);
										}, 1000);
									},
									fail: (err) => {
										isConnected = false;
										isConnecting = false;
										reject(formatBleError("连接失败", err));
									}
								});
								break;
							}
						}
					};

					uni.onBluetoothDeviceFound(onDeviceFoundHandler);

					uni.startBluetoothDevicesDiscovery({
						allowDuplicatesKey: false,
						services: [SERVICE_UUID],
						success: () => {
							console.log("开始扫描设备...");
						},
						fail: (err) => {
							clearTimeout(timeout);
							stopDiscoveryAndUnregister();
							isConnecting = false;
							reject(formatBleError("搜索失败", err));
						}
					});
				},
				fail: (err) => {
					isConnecting = false;
					reject(formatBleError("请打开蓝牙", err));
				}
			});
		});
	},

	// 获取服务和特征值
	getServices(resolve, reject) {
		uni.getBLEDeviceServices({
			deviceId,
			success: (res) => {
				const targetService = res.services.find(s => normalizeUUID(s.uuid) === SERVICE_UUID);
				if (targetService) {
					serviceId = targetService.uuid;
					setTimeout(() => {
						uni.getBLEDeviceCharacteristics({
							deviceId,
							serviceId,
							success: (res) => {
								const targetChar = res.characteristics.find(c => normalizeUUID(c.uuid) === CHAR_UUID);
								const fallbackWritable = res.characteristics.find((c) => {
									const p = c.properties || {};
									return !!(p.write || p.writeNoResponse);
								});
								const selectedChar = targetChar || fallbackWritable;

								if (!selectedChar) {
									reject("未找到可写特征值");
									isConnecting = false;
									return;
								}

								characteristicId = selectedChar.uuid;
								characteristicProperties = selectedChar.properties || {};
								writeType = characteristicProperties.writeNoResponse ? "writeNoResponse" : "write";
								console.log("特征值就绪:", characteristicId, "writeType:", writeType);

								if (characteristicProperties.notify || characteristicProperties.indicate) {
									this.listenBattery();
								}

								isConnecting = false;
								resolve("连接成功");
							},
							fail: (err) => {
								isConnecting = false;
								reject(formatBleError("获取特征值失败", err));
							}
						});
					}, 500);
				} else {
					isConnecting = false;
					reject("未找到目标服务");
				}
			},
			fail: (err) => {
				isConnecting = false;
				reject(formatBleError("获取服务失败", err));
			}
		});
	},

	// --- 发送控制指令 ---
	sendControl(linearX, angularZ, motorEnable, frictionEnable) {
		if (!isConnected || !deviceId || !serviceId || !characteristicId) return;

		const buffer = new ArrayBuffer(15);
		const view = new DataView(buffer);

		view.setUint8(0, 0xAA);
		view.setUint8(1, 0x55);
		view.setUint8(2, 0x0A);
		view.setFloat32(3, linearX, true);
		view.setFloat32(7, angularZ, true);
		view.setUint8(11, motorEnable ? 0x01 : 0x00);
		view.setUint8(12, frictionEnable ? 0x01 : 0x00);
		const checksum = calculateChecksum(view, 13);
		view.setUint8(13, checksum);
		view.setUint8(14, 0xFF);

		uni.writeBLECharacteristicValue({
			deviceId,
			serviceId,
			characteristicId,
			value: buffer,
			writeType,
			fail: (err) => {
				if (err.errCode !== 10008) {
					console.error("发送失败", err);
				}
			}
		});
	},

	// --- 监听电量 ---
	onBatteryUpdate(callback) {
		this.batteryCallback = callback;
	},

	listenBattery() {
		uni.notifyBLECharacteristicValueChange({
			state: true,
			deviceId,
			serviceId,
			characteristicId,
			success: () => {
				uni.onBLECharacteristicValueChange((res) => {
					const view = new DataView(res.value);
					if (view.byteLength >= 6 && view.getUint8(0) === 0xAA) {
						if (this.batteryCallback) this.batteryCallback(view.getUint8(3));
					}
				});
			},
			fail: (err) => {
				console.warn("开启通知失败", err);
			}
		});
	},

	close() {
		stopDiscoveryAndUnregister();
		if (deviceId) uni.closeBLEConnection({
			deviceId,
			fail: () => { }
		});
		uni.closeBluetoothAdapter({
			fail: () => { }
		});
		isConnected = false;
		isConnecting = false;
		deviceId = "";
		serviceId = "";
		characteristicId = "";
		characteristicProperties = null;
		writeType = "write";
	}
};