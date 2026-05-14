

# 小屏智能控制

一款基于 uni-app 框架开发的蓝牙智能控制应用，通过 BLE (蓝牙低功耗) 连接并控制智能设备。

## 功能特性

- **蓝牙连接**：自动扫描并连接指定的智能设备
- **设备控制**：通过 BLE 通信协议向设备发送控制指令
- **实时状态**：实时获取和显示设备状态信息
- **多页面交互**：包含启动页、首页和控制页

## 技术栈

- **前端框架**：uni-app (Vue.js)
- **通信协议**：BLE (Bluetooth Low Energy)
- **目标平台**：微信小程序 / App

## 项目结构

```
├── pages/
│   ├── control/      # 控制页面
│   ├── index/       # 首页
│   └── splash/       # 启动页
├── utils/
│   └── ble.js        # 蓝牙通信工具
├── App.vue           # 应用根组件
├── main.js          # 入口文件
└── pages.json       # 页面配置
```

## 快速开始

### 环境要求

- Node.js >= 14.x
- HBuilderX (推荐) 或其他 uni-app 开发工具

### 安装依赖

```bash
# 使用 HBuilderX 直接运行
# 或使用 npm 安装依赖
npm install
```

### 运行项目

```bash
# 微信小程序运行
npm run dev:mp-weixin

# App 运行
npm run dev:app
```

## 蓝牙使用说明

1. 打开手机蓝牙
2. 应用会自动扫描设备名称前缀为 `xiaoping` 的设备
3. 点击选择目标设备进行连接
4. 连接成功后即可进行设备控制

## 协议说明

### BLE 服务

- **服务 UUID**：`SERVICE_UUID`
- **特征值 UUID**：`CHAR_UUID`

### 通信格式

数据通过 BLE 特征值进行传输，包含校验和机制确保数据传输可靠性。

## 许可证

MIT License