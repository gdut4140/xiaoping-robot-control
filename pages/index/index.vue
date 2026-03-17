<template>
	<view class="container">
		<!-- 背景装饰网格 -->
		<view class="bg-grid"></view>

		<!-- 顶部标题 -->
		<view class="header">
			<text class="title">小平遥控终端</text>
			<view class="subtitle-bar"></view>
		</view>

		<!-- 中间连接区域 -->
		<view class="center-area">
			<view class="status-box">
				<text class="status-label">当前状态</text>
				<text class="status-value">{{ statusText }}</text>
			</view>

			<!-- 科技风蓝牙按钮 -->
			<view class="connect-btn-wrapper" @click="handleConnect">
				<!-- 外层旋转刻度环 (虚线) -->
				<view class="dashed-ring"></view>

				<!-- 核心按钮 -->
				<view class="core-btn">
					<!-- 纯CSS绘制的闪电图标，确保颜色准确 -->
					<view class="lightning-icon"></view>
					<text class="btn-text">点击连接</text>
				</view>

				<!-- 扩散波纹动画 -->
				<view class="radar-wave"></view>
			</view>
		</view>

		<!-- 底部版本号 -->
		<view class="footer">
			<text>版本 1.0.0 // 系统就绪</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
// 1. 引入刚才写的蓝牙工具
import BLE from '@/utils/ble.js';

const statusText = ref('设备未连接');

// 页面显示时重置状态
onShow(() => {
	statusText.value = '设备未连接';
	// 可以在这里先断开之前的连接，确保干净
	// BLE.close();
});

const handleConnect = () => {
	BLE.close();
	statusText.value = '正在搜索设备...';

	// 2. 调用真实的连接逻辑
	BLE.connect()
		.then((msg) => {
			statusText.value = '连接成功!';
			// 稍微停顿一下让用户看到成功提示
			setTimeout(() => {
				uni.navigateTo({
					url: '/pages/control/control'
				});
			}, 500);
		})
		.catch((err) => {
			console.error(err);
			const errMsg = typeof err === 'string' ? err : JSON.stringify(err);
			statusText.value = '连接失败';
			uni.showToast({
				title: errMsg.slice(0, 20),
				icon: 'none'
			});
		});
};
</script>

<style lang="scss">
/* --- 配色变量 --- */
$primary-color: #2effc9; /* 你的指定青碧色 */
$bg-color: #111618;
$bg-grid-line: rgba(46, 255, 201, 0.08);

/* 页面容器 */
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	height: 100vh;
	background-color: $bg-color;
	position: relative;
	overflow: hidden;
	font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; /* 改为中文常用字体 */
}

/* 背景网格 */
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

/* 顶部标题 */
.header {
	margin-top: 100px; /* 避开刘海屏 */
	z-index: 10;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.title {
	color: #2effc9;
	font-size: 22px;
	letter-spacing: 2px;
	font-weight: bold;
	text-shadow: 0 0 15px rgba(46, 255, 201, 0.3);
}

.subtitle-bar {
	width: 40px;
	height: 4px;
	background: $primary-color;
	margin-top: 12px;
	border-radius: 2px;
	box-shadow: 0 0 10px $primary-color;
}

/* 中间区域 */
.center-area {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	z-index: 10;
}

.status-box {
	margin-bottom: 60px;
	text-align: center;
}

.status-label {
	display: block;
	color: rgba(255, 255, 255, 0.5);
	font-size: 14px;
	margin-bottom: 8px;
}

.status-value {
	color: $primary-color;
	font-size: 20px;
	font-weight: bold;
	letter-spacing: 1px;
	text-shadow: 0 0 12px rgba(46, 255, 201, 0.4);
}

/* === 核心按钮组件 === */
.connect-btn-wrapper {
	position: relative;
	width: 220px;
	height: 220px;
	display: flex;
	justify-content: center;
	align-items: center;
}

/* 旋转虚线环 - 增加一点透明度让其更柔和 */
.dashed-ring {
	position: absolute;
	width: 100%;
	height: 100%;
	border: 1px dashed rgba(46, 255, 201, 0.25);
	border-radius: 50%;
	animation: rotate-ring 12s linear infinite;
}

/* 核心按钮 - 增强圆润感 */
.core-btn {
	width: 150px;
	height: 150px;
	border-radius: 50%;
	/* 双重边框制造层次感 */
	border: 2px solid rgba(46, 255, 201, 0.6);
	background: radial-gradient(circle, rgba(46, 255, 201, 0.1) 0%, rgba(17, 22, 24, 0.8) 100%);
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	z-index: 2;
	/* 柔和的内发光和外发光 */
	box-shadow: 0 0 20px rgba(46, 255, 201, 0.15), inset 0 0 15px rgba(46, 255, 201, 0.1);
	backdrop-filter: blur(5px);
	transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

	&:active {
		transform: scale(0.96);
		background: rgba(46, 255, 201, 0.15);
		border-color: $primary-color;
		box-shadow: 0 0 30px rgba(46, 255, 201, 0.4);
	}
}

/* CSS 绘制纯青色闪电 (替代 emoji) */
.lightning-icon {
	width: 24px;
	height: 36px;
	background-color: $primary-color;
	/* 使用 clip-path 裁剪出闪电形状 */
	clip-path: polygon(55% 0, 100% 0, 60% 40%, 95% 40%, 30% 100%, 45% 55%, 0% 55%);
	margin-bottom: 10px;
	/* 增加闪电的辉光 */
	filter: drop-shadow(0 0 5px $primary-color);
}

.btn-text {
	color: #fff;
	font-size: 16px;
	font-weight: bold;
	letter-spacing: 1px;
}

/* 雷达波纹 */
.radar-wave {
	position: absolute;
	width: 150px;
	height: 150px;
	border: 2px solid rgba(46, 255, 201, 0.4);
	border-radius: 50%;
	opacity: 0;
	animation: wave 2.5s infinite;
	z-index: 1;
}

/* 底部文字 */
.footer {
	margin-bottom: 50px;
	z-index: 10;
	color: rgba(255, 255, 255, 0.3);
	font-size: 12px;
}

/* 动画定义 */
@keyframes rotate-ring {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

@keyframes wave {
	0% {
		transform: scale(1);
		opacity: 0.6;
		border-width: 2px;
	}
	100% {
		transform: scale(1.6);
		opacity: 0;
		border-width: 0px;
	}
}
</style>
