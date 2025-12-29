<template>
	<view class="splash-container">
		<!-- 背景网格 -->
		<view class="bg-grid"></view>

		<view class="content">
			<!-- 1. 核心 Logo 区域 -->
			<view class="logo-wrapper">
				<view class="ring-1"></view>
				<!-- 装饰环 -->
				<view class="ring-2"></view>
				<view class="flash-icon"></view>
				<!-- 纯CSS闪电 -->
			</view>

			<!-- 2. 文字提示 -->
			<view class="text-area">
				<text class="app-name">小平遥控终端</text>
				<text class="loading-text">{{ loadingText }}</text>
			</view>

			<!-- 3. 进度条 -->
			<view class="progress-box">
				<view class="progress-bar" :style="{ width: progress + '%' }"></view>
			</view>
		</view>

		<!-- 底部状态 -->
		<view class="copyright">
			<text>系统正在初始化...</text>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const progress = ref(0);
const loadingText = ref('正在加载核心模块...');

onMounted(() => {
	// 1. 进度条动画
	const timer = setInterval(() => {
		if (progress.value < 100) {
			// 随机增加进度，模拟真实加载感
			progress.value += Math.random() * 5;
			if (progress.value > 100) progress.value = 100;

			// 动态改变文字 (中文科技风)
			if (progress.value > 30 && progress.value < 60) loadingText.value = '正在校验通信协议...';
			if (progress.value > 60 && progress.value < 90) loadingText.value = '执行系统自检...';
			if (progress.value >= 100) loadingText.value = '系统就绪，即将进入';
		} else {
			clearInterval(timer);
			// 2. 加载完成后跳转
			setTimeout(() => {
				// 使用 reLaunch 关闭启动页，防止用户按返回键回到这里
				uni.reLaunch({
					url: '/pages/index/index'
				});
			}, 300);
		}
	}, 30); // 建议30
});
</script>

<style lang="scss">
$primary-color: #2effc9;
$bg-color: #111618;
$bg-grid-line: rgba(46, 255, 201, 0.08);

.splash-container {
	width: 100vw;
	height: 100vh;
	background-color: $bg-color;
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
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

.content {
	z-index: 10;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 60px;
}

/* === Logo 动画 === */
.logo-wrapper {
	position: relative;
	width: 120px;
	height: 120px;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 40px;
}

.flash-icon {
	width: 40px;
	height: 60px;
	background-color: $primary-color;
	clip-path: polygon(55% 0, 100% 0, 60% 40%, 95% 40%, 30% 100%, 45% 55%, 0% 55%);
	filter: drop-shadow(0 0 10px $primary-color);
	z-index: 2;
	animation: pulse 2s infinite ease-in-out;
}

.ring-1 {
	position: absolute;
	width: 100%;
	height: 100%;
	border: 2px solid rgba(46, 255, 201, 0.2);
	border-radius: 50%;
	border-top-color: $primary-color;
	animation: spin 3s linear infinite;
}
.ring-2 {
	position: absolute;
	width: 70%;
	height: 70%;
	border: 2px solid rgba(46, 255, 201, 0.4);
	border-radius: 50%;
	border-top-color: $primary-color;
	animation: spin 5s linear infinite reverse;
}

/* === 文字区域 === */
.text-area {
	text-align: center;
	margin-bottom: 30px;
}
.app-name {
	display: block;
	font-size: 24px;
	font-weight: bold;
	color: #fff;
	letter-spacing: 2px;
	margin-bottom: 12px;
	text-shadow: 0 0 10px rgba(46, 255, 201, 0.5);
}
.loading-text {
	font-size: 12px;
	color: rgba(46, 255, 201, 0.8);
	letter-spacing: 1px;
}

/* === 进度条 === */
.progress-box {
	width: 200px;
	height: 4px;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 2px;
	overflow: hidden;
	position: relative;
}
.progress-bar {
	height: 100%;
	background: $primary-color;
	box-shadow: 0 0 10px $primary-color;
	transition: width 0.1s linear;
}

/* 底部状态文字 */
.copyright {
	position: absolute;
	bottom: 40px;
	color: rgba(255, 255, 255, 0.3);
	font-size: 10px;
	letter-spacing: 2px;
}

/* 动画关键帧 */
@keyframes spin {
	100% {
		transform: rotate(360deg);
	}
}
@keyframes pulse {
	0%,
	100% {
		transform: scale(1);
		opacity: 1;
	}
	50% {
		transform: scale(1.1);
		opacity: 0.8;
	}
}
</style>
