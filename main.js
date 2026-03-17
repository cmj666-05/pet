import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import mqttService from './utils/mqtt-service'

export function createApp() {
  const app = createSSRApp(App)

  // 将 mqttService 挂载为全局属性，各页面可通过 this.$mqtt 访问
  app.config.globalProperties.$mqtt = mqttService

  return {
    app
  }
}
// #endif