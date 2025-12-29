"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "splash",
  setup(__props) {
    const progress = common_vendor.ref(0);
    const loadingText = common_vendor.ref("正在加载核心模块...");
    common_vendor.onMounted(() => {
      const timer = setInterval(() => {
        if (progress.value < 100) {
          progress.value += Math.random() * 5;
          if (progress.value > 100)
            progress.value = 100;
          if (progress.value > 30 && progress.value < 60)
            loadingText.value = "正在校验通信协议...";
          if (progress.value > 60 && progress.value < 90)
            loadingText.value = "执行系统自检...";
          if (progress.value >= 100)
            loadingText.value = "系统就绪，即将进入";
        } else {
          clearInterval(timer);
          setTimeout(() => {
            common_vendor.index.reLaunch({
              url: "/pages/index/index"
            });
          }, 300);
        }
      }, 30);
    });
    return (_ctx, _cache) => {
      return {
        a: common_vendor.t(loadingText.value),
        b: progress.value + "%"
      };
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/splash/splash.js.map
