"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_ble = require("../../utils/ble.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const statusText = common_vendor.ref("设备未连接");
    common_vendor.onShow(() => {
      statusText.value = "设备未连接";
    });
    const handleConnect = () => {
      statusText.value = "正在搜索设备...";
      utils_ble.BLE.connect().then((msg) => {
        statusText.value = "连接成功!";
        setTimeout(() => {
          common_vendor.index.navigateTo({
            url: "/pages/control/control"
          });
        }, 500);
      }).catch((err) => {
        common_vendor.index.__f__("error", "at pages/index/index.vue:73", err);
        statusText.value = "连接失败，请重试";
        common_vendor.index.showToast({
          title: "找不到 OrangePi_Robot",
          icon: "none"
        });
      });
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.t(statusText.value),
        b: common_vendor.o(handleConnect)
      };
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
