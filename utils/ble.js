// utils/ble.js

// === 1. 配置参数 ===
// 建议：将 UUID 统一转为大写，避免部分老旧 iOS 机型大小写敏感问题
const SERVICE_UUID = "A07498CA-AD5B-474E-940D-16F1FBE7E8CD".toUpperCase();
const CHAR_UUID = "51FF12BB-3ED8-46E5-B4F9-D64E2FEC021B".toUpperCase();
const DEVICE_NAME_PREFIX = "OrangePi_Robot";

// 蓝牙连接状态
let deviceId = "";
let serviceId = "";
let characteristicId = "";
let isConnected = false;
let isConnecting = false; // [新增] 防止 iOS 频繁回调导致重复连接

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
			// 重置状态
			isConnecting = false;

			// 1. 初始化蓝牙模块
			uni.openBluetoothAdapter({
				success: () => {
					// 2. 开始搜索
					uni.startBluetoothDevicesDiscovery({
						allowDuplicatesKey: false, // [iOS优化] 禁止重复上报，但在某些安卓机无效，依然需要手动防抖
						success: () => {
							// 监听发现新设备
							uni.onBluetoothDeviceFound((res) => {
								const device = res.devices[0];

								// [iOS适配关键点 1]：iOS 广播名称通常在 localName 中，而 name 可能是空的
								const deviceName = device.name || device
									.localName || "";

								// [iOS适配关键点 2]：过滤名称 + 防止重复连接
								if (deviceName.includes(DEVICE_NAME_PREFIX) && !
									isConnecting && !isConnected) {
									isConnecting = true; // 锁定状态

									console.log("找到设备:", deviceName, "ID:",
										device.deviceId);
									uni
								.stopBluetoothDevicesDiscovery(); // 找到后立即停止搜索，节省资源

									deviceId = device.deviceId;

									// 3. 连接设备
									uni.createBLEConnection({
										deviceId,
										success: () => {
											isConnected = true;
											isConnecting = false;

											// [iOS适配关键点 3]：iOS 连接建立极快，但服务发现可能还没准备好
											// 保持延时是很好的做法，部分老款 iPhone 可能需要 1500ms
											setTimeout(() => {
												this.getServices(
													resolve,
													reject
													);
											}, 1000);
										},
										fail: (err) => {
											isConnecting = false;
											reject("连接失败: " + JSON
												.stringify(err));
										}
									});
								}
							});
						},
						fail: (err) => reject("搜索失败: " + JSON.stringify(err))
					});
				},
				fail: (err) => {
					// iOS 如果蓝牙没开，会报 10001
					if (err.errCode === 10001) {
						reject("请开启手机蓝牙");
					} else {
						reject("蓝牙初始化失败: " + JSON.stringify(err));
					}
				}
			});
		});
	},

	// 获取服务和特征值
	getServices(resolve, reject) {
		uni.getBLEDeviceServices({
			deviceId,
			success: (res) => {
				// [iOS适配] 这里的 uuid 有时候带横杠有时候不带，统一去横杠+大写比较稳妥，
				// 但通常标准 UUID 只要 toUpperCase() 即可。
				const targetService = res.services.find(s => s.uuid.toUpperCase() === SERVICE_UUID);

				if (targetService) {
					serviceId = targetService.uuid;

					// 延迟一下再获取特征值，防止 iOS 拥塞
					setTimeout(() => {
						uni.getBLEDeviceCharacteristics({
							deviceId,
							serviceId, // [iOS 必须] 安卓有时候可以不传 serviceId，但 iOS 必须传
							success: (res) => {
								const targetChar = res.characteristics.find(c => c.uuid
									.toUpperCase() === CHAR_UUID);
								if (targetChar) {
									characteristicId = targetChar.uuid;

									// 开启通知
									this.listenBattery();
									resolve("连接成功");
								} else {
									reject("未找到特征值: " + CHAR_UUID);
								}
							},
							fail: (err) => reject("获取特征值失败: " + JSON.stringify(err))
						});
					}, 200);
				} else {
					console.log("Available Services:", res.services.map(s => s.uuid));
					reject("未找到目标服务: " + SERVICE_UUID);
				}
			},
			fail: (err) => reject("获取服务失败: " + JSON.stringify(err))
		});
	},

	// --- 发送控制指令 (保持不变) ---
	sendControl(linearX, angularZ, motorEnable, frictionEnable) {
		if (!isConnected || !deviceId) return;

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

		// [iOS优化] 增加 writeType，部分 iOS 设备默认 writeType 可能不正确
		// 如果你的硬件支持无响应写入 (Write Without Response)，加上 writeType: 'writeNoResponse' 会更流畅
		// 这里暂且保持默认，如果觉得卡顿可以加上试试
		uni.writeBLECharacteristicValue({
			deviceId,
			serviceId,
			characteristicId,
			value: buffer,
			fail: (err) => {
				// 忽略频繁写入时的部分错误，避免控制台刷屏
				if (err.errCode !== 10008) console.error("发送失败", err);
			}
		});
	},

	// --- 监听电量反馈 (保持不变) ---
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
					// iOS 返回的 res.value 也是 ArrayBuffer，处理逻辑一致
					const view = new DataView(res.value);
					if (view.byteLength >= 6) {
						const head1 = view.getUint8(0);
						const head2 = view.getUint8(1);
						const tail = view.getUint8(5);

						if (head1 === 0xAA && head2 === 0x55 && tail === 0xFF) {
							const battery = view.getUint8(3);
							const calcSum = calculateChecksum(view, 4);
							const recvSum = view.getUint8(4);

							if (calcSum === recvSum) {
								if (this.batteryCallback) this.batteryCallback(battery);
							}
						}
					}
				});
			},
			fail: (err) => console.error("监听电量失败", err)
		});
	},

	// 断开连接
	close() {
		if (deviceId) {
			uni.closeBLEConnection({
				deviceId,
				success: () => console.log("断开连接成功"),
				fail: (err) => console.log("断开连接失败/已断开", err)
			});
		}
		uni.closeBluetoothAdapter();
		isConnected = false;
		isConnecting = false;
		deviceId = "";
	}
};