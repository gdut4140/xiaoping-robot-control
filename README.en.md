# Small Screen Smart Control

A Bluetooth smart control application developed based on the uni-app framework, connecting and controlling smart devices via BLE (Bluetooth Low Energy).

## Features

- **Bluetooth Connection**: Automatically scan and connect to specified smart devices
- **Device Control**: Send control commands to devices via BLE communication protocol
- **Real-time Status**: Obtain and display device status information in real time
- **Multi-page Interaction**: Includes splash screen, home page, and control page

## Technology Stack

- **Frontend Framework**: uni-app (Vue.js)
- **Communication Protocol**: BLE (Bluetooth Low Energy)
- **Target Platforms**: WeChat Mini Program / App

## Project Structure

```
├── pages/
│   ├── control/      # Control page
│   ├── index/        # Home page
│   └── splash/       # Splash screen
├── utils/
│   └── ble.js        # Bluetooth communication utility
├── App.vue           # App root component
├── main.js           # Entry file
└── pages.json        # Page configuration
```

## Quick Start

### Prerequisites

- Node.js >= 14.x
- HBuilderX (recommended) or other uni-app development tools

### Install Dependencies

```bash
# Run directly using HBuilderX
# Or install dependencies via npm
npm install
```

### Run the Project

```bash
# Run for WeChat Mini Program
npm run dev:mp-weixin

# Run for App
npm run dev:app
```

## Bluetooth Usage Instructions

1. Enable Bluetooth on your mobile device
2. The app automatically scans for devices with names prefixed by `xiaoping`
3. Tap to select the target device for connection
4. Once connected, you can control the device

## Protocol Specification

### BLE Service

- **Service UUID**: `SERVICE_UUID`
- **Characteristic UUID**: `CHAR_UUID`

### Communication Format

Data is transmitted via BLE characteristics, incorporating a checksum mechanism to ensure reliable data transmission.

## License

MIT License