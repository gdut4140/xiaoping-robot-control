<template>
	<view class="control-page">
		<view class="bg-grid"></view>

		<!-- 弹窗 -->
		<view class="cyber-toast" :class="{ show: toastVisible }">
			<view class="toast-content">
				<view class="toast-icon">!</view>
				<text>{{ toastMsg }}</text>
			</view>
		</view>

		<!-- 顶部 -->
		<view class="corner top-left">
			<text class="label">电池电量</text>
			<view class="energy-bar">
				<!-- 动态绑定电量宽度 -->
				<view class="energy-fill" :style="{ width: batteryLevel + '%' }"></view>
			</view>
			<text class="value-cyan">{{ batteryLevel }}%</text>
		</view>

		<view class="corner top-right" @click="disconnect">
			<text class="label">连接状态</text>
			<view class="bt-status-box">
				<view class="status-dot connected"></view>
				<text class="bt-text">在线</text>
			</view>
		</view>

		<!-- 底部按钮 -->
		<view class="corner bottom-left">
			<view class="capsule-btn" :class="{ active: isMotorOn }" @click="confirmToggleMotor">
				<view class="mini-lightning"></view>
				<text>{{ isMotorOn ? '电机运行中' : '电机已待机' }}</text>
			</view>
		</view>

		<view class="corner bottom-right">
			<view class="capsule-btn action" :class="{ active: isPickupOn }" hover-class="btn-hover" @click="togglePickup">
				<view class="mini-target"></view>
				<text>{{ isPickupOn ? '正在拾取' : '自动拾取' }}</text>
			</view>
		</view>

		<!-- 摇杆区域 -->
		<view class="center-control">
			<view class="joystick-wrapper">
				<view class="outer-ring"></view>
				<view class="joystick-base" id="joystick-base">
					<view class="cross-line hori"></view>
					<view class="cross-line vert"></view>

					<view
						class="joystick-handle"
						:style="{ transform: `translate(${stickX}px, ${stickY}px)` }"
						:class="{ active: isDragging }"
						@touchstart="onTouchStart"
						@touchmove.stop.prevent="onTouchMove"
						@touchend="onTouchEnd"
					>
						<view class="handle-core"></view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import BLE from '@/utils/ble.js'; // 1. 引入蓝牙工具

// 状态变量
const isMotorOn = ref(false);
const isPickupOn = ref(false);
const batteryLevel = ref(0); // 电量
const toastVisible = ref(false);
const toastMsg = ref('');
let toastTimer = null;

// 摇杆变量
const stickX = ref(0);
const stickY = ref(0);
const isDragging = ref(false);
const maxRadius = 100;
let startX = 0;
let startY = 0;

// 控制参数
const MAX_LINEAR_SPEED = 0.5; // 最大前进速度 0.5 m/s
const MAX_ANGULAR_SPEED = 2.0; // 最大旋转速度 2.0 rad/s
let currentLinearX = 0.0;
let currentAngularZ = 0.0;
let loopTimer = null; // 发送数据的主循环定时器

// === 生命周期 ===
onMounted(() => {
	// 2. 监听电池数据
	BLE.onBatteryUpdate((level) => {
		batteryLevel.value = level;
	});

	// 3. 启动发送循环 (17ms一次，即 60Hz)
	loopTimer = setInterval(() => {
		// 实时发送控制指令
		BLE.sendControl(currentLinearX, currentAngularZ, isMotorOn.value, isPickupOn.value);
	}, 17);
});

onUnmounted(() => {
	if (loopTimer) clearInterval(loopTimer);
	// 页面销毁时不断开蓝牙，保留连接，只停止发送指令
});

// === Toast 逻辑 ===
const showCyberToast = (msg) => {
	toastMsg.value = msg;
	toastVisible.value = true;
	if (toastTimer) clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		toastVisible.value = false;
	}, 1500);
};

// === 业务逻辑 ===
const confirmToggleMotor = () => {
	const nextState = !isMotorOn.value;
	uni.showModal({
		title: '安全确认',
		content: `确定要${nextState ? '启动' : '关闭'}电机吗？`,
		confirmColor: '#2effc9',
		cancelColor: '#999999',
		success: function (res) {
			if (res.confirm) {
				isMotorOn.value = nextState;
				if (!isMotorOn.value && isPickupOn.value) isPickupOn.value = false;
				showCyberToast(isMotorOn.value ? '电机已启动' : '电机已停止');
			}
		}
	});
};

const togglePickup = () => {
	if (!isMotorOn.value) {
		showCyberToast('请先启动电机');
		return;
	}
	isPickupOn.value = !isPickupOn.value;
	showCyberToast(isPickupOn.value ? '自动拾取运行中' : '自动拾取已结束');
};

const disconnect = () => {
	uni.showModal({
		title: '断开连接',
		content: '确定要断开蓝牙连接吗？',
		confirmColor: '#ff4d4f',
		cancelColor: '#999999',
		success: function (res) {
			if (res.confirm) {
				BLE.close(); // 关闭连接
				uni.navigateBack();
			}
		}
	});
};

// === 摇杆逻辑 ===
const onTouchStart = (e) => {
	isDragging.value = true;
	const touch = e.touches[0];
	startX = touch.clientX;
	startY = touch.clientY;
};

const onTouchMove = (e) => {
	if (!isDragging.value) return;
	const touch = e.touches[0];

	let deltaX = touch.clientX - startX;
	let deltaY = touch.clientY - startY;

	const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

	// 限制半径
	if (distance > maxRadius) {
		const ratio = maxRadius / distance;
		deltaX *= ratio;
		deltaY *= ratio;
	}

	stickX.value = deltaX;
	stickY.value = deltaY;

	// //方案一
	// // === 4. 摇杆坐标映射到机器人速度 ===
	// // 摇杆 Y 轴：向上为负，向下为正。
	// // 机器人：向前为正(Linear +)，向后为负(Linear -)。
	// // 所以 LinearX = -(deltaY / maxRadius) * MaxSpeed
	// currentLinearX = -(deltaY / maxRadius) * MAX_LINEAR_SPEED;

	// // 摇杆 X 轴：向左为负，向右为正。
	// // 机器人：向左旋转通常为正 (逆时针, Angular +)，向右为负。
	// // 所以 AngularZ = -(deltaX / maxRadius) * MaxSpeed
	// currentAngularZ = -(deltaX / maxRadius) * MAX_ANGULAR_SPEED;

	// 方案二，支持上下10px原地转
	const deadZone = 10;
	let effectiveDeltaY = Math.abs(deltaY) < deadZone ? 0 : deltaY;

	// 用处理后的effectiveDeltaY计算线速度
	currentLinearX = -(effectiveDeltaY / maxRadius) * MAX_LINEAR_SPEED;
	currentAngularZ = -(deltaX / maxRadius) * MAX_ANGULAR_SPEED;
};

const onTouchEnd = () => {
	isDragging.value = false;
	stickX.value = 0;
	stickY.value = 0;

	// 摇杆回中，速度归零
	currentLinearX = 0.0;
	currentAngularZ = 0.0;
};
</script>

<style lang="scss">
/* 保持之前的样式完全不变，这里省略以节省篇幅，请直接使用上面的 CSS */
$primary-color: #2effc9;
$bg-color: #111618;
$bg-grid-line: rgba(46, 255, 201, 0.08);

.control-page {
	width: 100vw;
	height: 100vh;
	background-color: $bg-color;
	position: relative;
	overflow: hidden;
	font-family: 'PingFang SC', sans-serif;
	box-sizing: border-box;
}

/* ...把之前的 CSS 全部贴在这里... */
/* 摇杆区域样式 */
.center-control {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	z-index: 5;
}

.joystick-wrapper {
	position: relative;
	width: 340px;
	height: 340px;
	display: flex;
	justify-content: center;
	align-items: center;
}

.outer-ring {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	border: 1px dashed rgba(46, 255, 201, 0.2);
	border-radius: 50%;
	animation: rotate 30s linear infinite;
	pointer-events: none;
}

.joystick-base {
	width: 280px;
	height: 280px;
	background: radial-gradient(circle, rgba(17, 22, 24, 0.9), rgba(0, 0, 0, 0.8));
	border: 1px solid rgba(46, 255, 201, 0.3);
	border-radius: 50%;
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	box-shadow: 0 0 40px rgba(0, 0, 0, 0.6), inset 0 0 30px rgba(46, 255, 201, 0.08);
	backdrop-filter: blur(5px);
}

.cross-line {
	position: absolute;
	background: rgba(46, 255, 201, 0.1);
	pointer-events: none;
}

.hori {
	width: 100%;
	height: 1px;
}

.vert {
	height: 100%;
	width: 1px;
}

.joystick-handle {
	width: 100px;
	height: 100px;
	border-radius: 50%;
	background: radial-gradient(130% 130% at 30% 30%, rgba(46, 255, 201, 0.15), rgba(17, 22, 24, 0.9));
	border: 1px solid rgba(46, 255, 201, 0.6);
	box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(46, 255, 201, 0.2);
	position: absolute;
	z-index: 10;
	display: flex;
	justify-content: center;
	align-items: center;
	transition: transform 0.1s;

	&.active {
		transition: none;
		background: radial-gradient(130% 130% at 30% 30%, rgba(46, 255, 201, 0.3), rgba(17, 22, 24, 0.9));
		border-color: $primary-color;
		box-shadow: 0 0 25px rgba(46, 255, 201, 0.5);

		.handle-core {
			background: #fff;
			box-shadow: 0 0 10px #fff, 0 0 20px $primary-color;
		}
	}
}

.handle-core {
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: $primary-color;
	box-shadow: 0 0 8px $primary-color;
	transition: all 0.2s;
}

.bg-grid {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-image: linear-gradient($bg-grid-line 1px, transparent 1px), linear-gradient(90deg, $bg-grid-line 1px, transparent 1px);
	background-size: 40px 40px;
	z-index: 0;
	pointer-events: none;
}

.corner {
	position: absolute;
	display: flex;
	flex-direction: column;
	z-index: 10;
}

.top-left {
	top: 100px;
	left: 24px;
	align-items: flex-start;
}

.top-right {
	top: 100px;
	right: 24px;
	align-items: flex-end;
}

.bottom-left {
	bottom: 50px;
	left: 24px;
}

.bottom-right {
	bottom: 50px;
	right: 24px;
}

.label {
	color: rgba(255, 255, 255, 0.5);
	font-size: 12px;
	margin-bottom: 4px;
}

.value-cyan {
	color: $primary-color;
	font-size: 20px;
	font-weight: bold;
	text-shadow: 0 0 5px rgba(46, 255, 201, 0.5);
}

.energy-bar {
	width: 60px;
	height: 4px;
	background: rgba(255, 255, 255, 0.1);
	margin-bottom: 4px;
	border-radius: 2px;
}

.energy-fill {
	height: 100%;
	background: $primary-color;
	box-shadow: 0 0 5px $primary-color;
	border-radius: 2px;
	transition: width 0.5s;
}

.bt-status-box {
	display: flex;
	align-items: center;
	border: 1px solid rgba(46, 255, 201, 0.3);
	padding: 4px 12px;
	border-radius: 12px;
	background: rgba(46, 255, 201, 0.05);
}

.bt-text {
	color: $primary-color;
	font-size: 12px;
	font-weight: bold;
}

.status-dot {
	width: 6px;
	height: 6px;
	background: #333;
	border-radius: 50%;
	margin-right: 6px;
}

.status-dot.connected {
	background: $primary-color;
	box-shadow: 0 0 8px $primary-color;
	animation: blink 2s infinite;
}

@keyframes blink {
	0% {
		opacity: 1;
	}

	50% {
		opacity: 0.5;
	}

	100% {
		opacity: 1;
	}
}

@keyframes rotate {
	from {
		transform: rotate(0deg);
	}

	to {
		transform: rotate(360deg);
	}
}

.cyber-toast {
	position: fixed;
	top: 20%;
	left: 50%;
	transform: translate(-50%, -50%) scale(0.8);
	z-index: 999;
	opacity: 0;
	pointer-events: none;
	transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

	&.show {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1);
	}
}

.toast-content {
	background: rgba(17, 22, 24, 0.95);
	border: 1px solid $primary-color;
	box-shadow: 0 0 20px rgba(46, 255, 201, 0.3);
	padding: 12px 24px;
	border-radius: 50px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: $primary-color;
	font-weight: bold;
	font-size: 16px;
	backdrop-filter: blur(5px);
}

.toast-icon {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: $primary-color;
	color: #000;
	font-size: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 10px;
	font-weight: 900;
}

.capsule-btn {
	border: 1px solid rgba(46, 255, 201, 0.5);
	color: $primary-color;
	background: rgba(17, 22, 24, 0.6);
	backdrop-filter: blur(4px);
	font-size: 14px;
	font-weight: bold;
	padding: 0 20px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50px;
	transition: all 0.3s;
	min-width: 110px;
	box-shadow: 0 0 10px rgba(46, 255, 201, 0.1);
}

.capsule-btn.active,
.capsule-btn:active {
	background: rgba(46, 255, 201, 0.2);
	color: #fff;
	border-color: $primary-color;
	box-shadow: 0 0 20px rgba(46, 255, 201, 0.4);
	transform: scale(0.96);
}

.mini-lightning {
	width: 12px;
	height: 18px;
	background-color: $primary-color;
	clip-path: polygon(55% 0, 100% 0, 60% 40%, 95% 40%, 30% 100%, 45% 55%, 0% 55%);
	margin-right: 8px;
}

.capsule-btn.active .mini-lightning {
	background-color: #fff;
}

.mini-target {
	width: 16px;
	height: 16px;
	border: 2px solid $primary-color;
	border-radius: 50%;
	position: relative;
	margin-right: 8px;
	transition: all 0.3s;
}

.mini-target::after {
	content: '';
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 6px;
	height: 6px;
	background-color: $primary-color;
	border-radius: 50%;
	transition: all 0.3s;
}

.capsule-btn.active .mini-target {
	border-color: #fff;
}

.capsule-btn.active .mini-target::after {
	background-color: #fff;
}
</style>
