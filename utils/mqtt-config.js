/**
 * 阿里云 IoT MQTT 连接配置
 *
 * MQTT 公网接入点：iot-06z00b1eo2alugk.mqtt.iothub.aliyuncs.com
 * 协议：WSS (WebSocket Secure) — uni-app 环境需使用 WebSocket
 * 端口：443 (WSS) / 1883 (TCP，仅限原生 MQTT 客户端)
 *
 * 设备：DHT11 (产品: k1wxakcs6OI)
 */

export default {
	// MQTT 接入点（公网）
	host: 'iot-06z00b1eo2alugk.mqtt.iothub.aliyuncs.com',
	port: 443,        // WSS 端口，uni-app 环境使用
	tcpPort: 1883,    // TCP 端口，原生 MQTT 客户端使用

	// 设备三元组（动态签名模式，每次连接时实时生成 HMAC-SHA256）
	productKey: 'k1wxakcs6OI',
	deviceName: 'DHT11',
	deviceSecret: 'bc073a07f86537380f76ddd44307b28d',

	// 预计算凭证已废弃（timestamp 有效期仅 15 分钟），改为动态签名
	precomputed: null,

	// 连接选项
	options: {
		keepalive: 60,           // 心跳间隔（秒）
		connectTimeout: 10000,   // 连接超时（毫秒）
		reconnectPeriod: 5000,   // 自动重连间隔（毫秒）
		clean: true,             // 清除会话
	},

	// Topic 定义（根据阿里云 IoT 物模型自动生成的 Topic）
	topics: {
		// 项圈设备 —— 属性上报（心率、血氧、体重、GPS等）
		collarProperty: '/sys/${productKey}/${deviceName}/thing/service/property/set',
		collarPropertyPost: '/sys/${productKey}/${deviceName}/thing/event/property/post',

		// 寄养屋设备 —— 环境数据（温度、湿度、空气质量）
		fosterProperty: '/sys/${productKey}/${deviceName}/thing/service/property/set',
		fosterPropertyPost: '/sys/${productKey}/${deviceName}/thing/event/property/post',

		// 情感分析 —— AI 分析结果上报
		emotionEvent: '/sys/${productKey}/${deviceName}/thing/event/emotion/post',

		// NFC 社交 —— 社交事件上报
		socialEvent: '/sys/${productKey}/${deviceName}/thing/event/social/post',
	},

	/**
	 * 根据实际的 productKey 和 deviceName 解析 Topic 模板
	 * @param {string} topicTemplate - Topic 模板字符串
	 * @returns {string} 替换后的实际 Topic
	 */
	resolveTopic(topicTemplate) {
		return topicTemplate
			.replace('${productKey}', this.productKey)
			.replace('${deviceName}', this.deviceName)
	}
}
