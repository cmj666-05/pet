import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/mqtt-proxy': {
        // 将请求代理到阿里云的 WSS 节点
        target: 'wss://iot-06z00b1eo2alugk.mqtt.iothub.aliyuncs.com:443',
        changeOrigin: true,
        ws: true,
        secure: false, // 核心逻辑：关闭 SSL 证书校验，这样即使系统时间是 2026 年，Node 代理也不会抛出 ERR_CERT_AUTHORITY_INVALID
        rewrite: (path) => path.replace(/^\/mqtt-proxy/, '/mqtt')
      }
    }
  }
});
