"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_ble = require("../../utils/ble.js");
const maxRadius = 100;
const MAX_LINEAR_SPEED = 0.5;
const MAX_ANGULAR_SPEED = 2;
const _sfc_main = {
  __name: "control",
  setup(__props) {
    const isMotorOn = common_vendor.ref(false);
    const isPickupOn = common_vendor.ref(false);
    const batteryLevel = common_vendor.ref(0);
    const toastVisible = common_vendor.ref(false);
    const toastMsg = common_vendor.ref("");
    let toastTimer = null;
    const stickX = common_vendor.ref(0);
    const stickY = common_vendor.ref(0);
    const isDragging = common_vendor.ref(false);
    let startX = 0;
    let startY = 0;
    let currentLinearX = 0;
    let currentAngularZ = 0;
    let loopTimer = null;
    common_vendor.onMounted(() => {
      utils_ble.BLE.onBatteryUpdate((level) => {
        batteryLevel.value = level;
      });
      loopTimer = setInterval(() => {
        utils_ble.BLE.sendControl(
          currentLinearX,
          currentAngularZ,
          isMotorOn.value,
          isPickupOn.value
        );
      }, 17);
    });
    common_vendor.onUnmounted(() => {
      if (loopTimer)
        clearInterval(loopTimer);
    });
    const showCyberToast = (msg) => {
      toastMsg.value = msg;
      toastVisible.value = true;
      if (toastTimer)
        clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastVisible.value = false;
      }, 1500);
    };
    const confirmToggleMotor = () => {
      const nextState = !isMotorOn.value;
      common_vendor.index.showModal({
        title: "安全确认",
        content: `确定要${nextState ? "启动" : "关闭"}电机吗？`,
        confirmColor: "#2effc9",
        cancelColor: "#999999",
        success: function(res) {
          if (res.confirm) {
            isMotorOn.value = nextState;
            if (!isMotorOn.value && isPickupOn.value)
              isPickupOn.value = false;
            showCyberToast(isMotorOn.value ? "电机已启动" : "电机已停止");
          }
        }
      });
    };
    const togglePickup = () => {
      if (!isMotorOn.value) {
        showCyberToast("请先启动电机");
        return;
      }
      isPickupOn.value = !isPickupOn.value;
      showCyberToast(isPickupOn.value ? "自动拾取运行中" : "自动拾取已结束");
    };
    const disconnect = () => {
      common_vendor.index.showModal({
        title: "断开连接",
        content: "确定要断开蓝牙连接吗？",
        confirmColor: "#ff4d4f",
        cancelColor: "#999999",
        success: function(res) {
          if (res.confirm) {
            utils_ble.BLE.close();
            common_vendor.index.navigateBack();
          }
        }
      });
    };
    const onTouchStart = (e) => {
      isDragging.value = true;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    };
    const onTouchMove = (e) => {
      if (!isDragging.value)
        return;
      const touch = e.touches[0];
      let deltaX = touch.clientX - startX;
      let deltaY = touch.clientY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > maxRadius) {
        const ratio = maxRadius / distance;
        deltaX *= ratio;
        deltaY *= ratio;
      }
      stickX.value = deltaX;
      stickY.value = deltaY;
      const deadZone = 10;
      let effectiveDeltaY = Math.abs(deltaY) < deadZone ? 0 : deltaY;
      currentLinearX = -(effectiveDeltaY / maxRadius) * MAX_LINEAR_SPEED;
      currentAngularZ = -(deltaX / maxRadius) * MAX_ANGULAR_SPEED;
    };
    const onTouchEnd = () => {
      isDragging.value = false;
      stickX.value = 0;
      stickY.value = 0;
      currentLinearX = 0;
      currentAngularZ = 0;
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.t(toastMsg.value),
        b: toastVisible.value ? 1 : "",
        c: batteryLevel.value + "%",
        d: common_vendor.t(batteryLevel.value),
        e: common_vendor.o(disconnect),
        f: common_vendor.t(isMotorOn.value ? "电机运行中" : "电机已待机"),
        g: isMotorOn.value ? 1 : "",
        h: common_vendor.o(confirmToggleMotor),
        i: common_vendor.t(isPickupOn.value ? "正在拾取" : "自动拾取"),
        j: isPickupOn.value ? 1 : "",
        k: common_vendor.o(togglePickup),
        l: `translate(${stickX.value}px, ${stickY.value}px)`,
        m: isDragging.value ? 1 : "",
        n: common_vendor.o(onTouchStart),
        o: common_vendor.o(onTouchMove),
        p: common_vendor.o(onTouchEnd)
      };
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/control/control.js.map
