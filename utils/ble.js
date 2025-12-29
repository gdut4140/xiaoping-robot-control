// utils/ble.js

// === 1. 配置参数 (来自你的文档) ===
const SERVICE_UUID = "A07498CA-AD5B-474E-940D-16F1FBE7E8CD";
const CHAR_UUID = "51FF12BB-3ED8-46E5-B4F9-D64E2FEC021B";
const DEVICE_NAME_PREFIX = "OrangePi_Robot"; // 搜索时的过滤名称

// 蓝牙连接状态
let deviceId = "";
let serviceId = "";
let characteristicId = "";
let isConnected = false;

// === 2. 辅助函数：计算校验和 ===
// Sum(Byte[0] ~ Byte[end]) & 0xFF
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
			// 1. 初始化蓝牙模块
			uni.openBluetoothAdapter({
				success: () => {
					// 2. 开始搜索
					uni.startBluetoothDevicesDiscovery({
						success: () => {
							// 监听发现新设备
							uni.onBluetoothDeviceFound((res) => {
								const device = res.devices[0];
								// 根据名称过滤 (也可以根据 UUID 过滤)
								if (device.name && device.name.includes(
										DEVICE_NAME_PREFIX)) {
									uni
								.stopBluetoothDevicesDiscovery(); // 找到后停止搜索

									deviceId = device.deviceId;
									console.log("找到设备:", deviceId);

									// 3. 连接设备
									uni.createBLEConnection({
										deviceId,
										success: () => {
											isConnected = true;
											// 4. 获取服务
											setTimeout(() => {
												this.getServices(
													resolve,
													reject
												);
											}, 1000); // 延时确保连接稳定
										},
										fail: (err) => reject("连接失败: " +
											JSON.stringify(err))
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
		uni.getBLEDeviceServices({
			deviceId,
			success: (res) => {
				// 查找目标服务 (部分安卓机 UUID 可能是小写，做个兼容)
				const targetService = res.services.find(s => s.uuid.toUpperCase() === SERVICE_UUID);

				if (targetService) {
					serviceId = targetService.uuid;
					uni.getBLEDeviceCharacteristics({
						deviceId,
						serviceId,
						success: (res) => {
							const targetChar = res.characteristics.find(c => c.uuid
								.toUpperCase() === CHAR_UUID);
							if (targetChar) {
								characteristicId = targetChar.uuid;
								// 开启电量通知监听
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
		if (!isConnected || !deviceId) return;

		// 协议总长度 15 字节
		const buffer = new ArrayBuffer(15);
		const view = new DataView(buffer);

		// 0-1: 帧头 AA 55
		view.setUint8(0, 0xAA);
		view.setUint8(1, 0x55);
		// 2: 长度 0A (10)
		view.setUint8(2, 0x0A);

		// 3-6: 线速度 (float, 小端)
		view.setFloat32(3, linearX, true);

		// 7-10: 角速度 (float, 小端)
		view.setFloat32(7, angularZ, true);

		// 11: 电机使能 (0x01 / 0x00)
		view.setUint8(11, motorEnable ? 0x01 : 0x00);

		// 12: 摩擦轮/拾取使能 (0x01 / 0x00)
		view.setUint8(12, frictionEnable ? 0x01 : 0x00);

		// 13: 校验和 (Byte[0]~Byte[12] 之和 & 0xFF)
		const checksum = calculateChecksum(view, 13);
		view.setUint8(13, checksum);

		// 14: 帧尾 FF
		view.setUint8(14, 0xFF);

		// 发送数据
		uni.writeBLECharacteristicValue({
			deviceId,
			serviceId,
			characteristicId,
			value: buffer,
			fail: (err) => console.error("发送失败", err)
		});
	},

	// --- 监听电量反馈 ---
	// callback: (batteryLevel) => {}
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
					// 收到数据，解析协议
					// 格式: AA 55 03 [电量] [Sum] FF
					const view = new DataView(res.value);
					if (view.byteLength >= 6) {
						const head1 = view.getUint8(0);
						const head2 = view.getUint8(1);
						const tail = view.getUint8(5);

						if (head1 === 0xAA && head2 === 0x55 && tail === 0xFF) {
							const battery = view.getUint8(3);
							// 简单的校验验证
							const calcSum = calculateChecksum(view, 4); // Sum 0~3
							const recvSum = view.getUint8(4);

							if (calcSum === recvSum) {
								// 校验通过，回调 UI
								if (this.batteryCallback) this.batteryCallback(battery);
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
			uni.closeBLEConnection({
				deviceId
			});
		}
		uni.closeBluetoothAdapter();
		isConnected = false;
	}
};