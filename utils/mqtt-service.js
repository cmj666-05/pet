/**
 * MoodPaws MQTT 服务模块
 *
 * 封装阿里云 IoT 平台的 MQTT 连接、订阅、发布逻辑
 * 使用 mqtt.js 通过 WebSocket (WSS) 连接
 * 使用 crypto-js 生成 HMAC-SHA256 签名
 */

import mqtt from 'mqtt/dist/mqtt'
import CryptoJS from 'crypto-js'
import mqttConfig from './mqtt-config'

class MqttService {
	constructor() {
		this.client = null
		this.connected = false
		this.connecting = false
		this.listeners = {}         // topic -> [callback]
		this.statusListeners = []   // 连接状态监听
	}

	/**
	 * 生成阿里云 IoT MQTT 连接参数（HMAC-SHA256 签名）
	 */
	_generateConnectParams() {
		const { productKey, deviceName, deviceSecret, host, port } = mqttConfig
		const timestamp = Date.now().toString()

		// clientId 格式: ${clientId}|securemode=2,signmethod=hmacsha256,timestamp=${timestamp}|
		const clientId = `${productKey}.${deviceName}|securemode=2,signmethod=hmacsha256,timestamp=${timestamp}|`

		// 签名内容: clientId${productKey}.${deviceName}deviceName${deviceName}productKey${productKey}timestamp${timestamp}
		const signContent = `clientId${productKey}.${deviceName}deviceName${deviceName}productKey${productKey}timestamp${timestamp}`

		// HMAC-SHA256 签名
		const password = CryptoJS.HmacSHA256(signContent, deviceSecret).toString(CryptoJS.enc.Hex)

		// username 格式: ${deviceName}&${productKey}
		const username = `${deviceName}&${productKey}`

		// WSS 连接地址
		const url = `wss://${host}:${port}/mqtt`

		return { url, clientId, username, password }
	}

	/**
	 * 连接到阿里云 IoT MQTT Broker
	 * @returns {Promise<void>}
	 */
	connect() {
		return new Promise((resolve, reject) => {
			if (this.connected) {
				resolve()
				return
			}

			if (this.connecting) {
				reject(new Error('正在连接中...'))
				return
			}

			this.connecting = true
			this._notifyStatus('connecting')

			try {
				const { url, clientId, username, password } = this._generateConnectParams()

				this.client = mqtt.connect(url, {
					clientId,
					username,
					password,
					keepalive: mqttConfig.options.keepalive,
					connectTimeout: mqttConfig.options.connectTimeout,
					reconnectPeriod: mqttConfig.options.reconnectPeriod,
					clean: mqttConfig.options.clean,
					protocolVersion: 4,
				})

				this.client.on('connect', () => {
					console.log('[MQTT] 连接成功')
					this.connected = true
					this.connecting = false
					this._notifyStatus('connected')
					resolve()
				})

				this.client.on('message', (topic, message) => {
					const payload = message.toString()
					console.log(`[MQTT] 收到消息 Topic: ${topic}`, payload)

					try {
						const data = JSON.parse(payload)
						this._notifyListeners(topic, data)
					} catch (e) {
						// 非 JSON 格式消息，原样传递
						this._notifyListeners(topic, payload)
					}
				})

				this.client.on('error', (err) => {
					console.error('[MQTT] 连接错误:', err)
					this.connecting = false
					this._notifyStatus('disconnected')
					reject(err)
				})

				this.client.on('close', () => {
					console.log('[MQTT] 连接关闭')
					this.connected = false
					this._notifyStatus('disconnected')
				})

				this.client.on('reconnect', () => {
					console.log('[MQTT] 正在重连...')
					this._notifyStatus('connecting')
				})

				this.client.on('offline', () => {
					console.log('[MQTT] 离线')
					this.connected = false
					this._notifyStatus('disconnected')
				})
			} catch (err) {
				this.connecting = false
				this._notifyStatus('disconnected')
				reject(err)
			}
		})
	}

	/**
	 * 订阅 Topic
	 * @param {string} topic - 要订阅的 Topic
	 * @param {function} callback - 收到消息时的回调 (data) => {}
	 * @param {number} qos - QoS 等级 (0 或 1)
	 */
	subscribe(topic, callback, qos = 0) {
		const resolvedTopic = mqttConfig.resolveTopic(topic)

		if (!this.listeners[resolvedTopic]) {
			this.listeners[resolvedTopic] = []
		}
		this.listeners[resolvedTopic].push(callback)

		if (this.client && this.connected) {
			this.client.subscribe(resolvedTopic, { qos }, (err) => {
				if (err) {
					console.error(`[MQTT] 订阅失败: ${resolvedTopic}`, err)
				} else {
					console.log(`[MQTT] 已订阅: ${resolvedTopic}`)
				}
			})
		}
	}

	/**
	 * 发布消息
	 * @param {string} topic - 目标 Topic
	 * @param {object|string} payload - 消息内容
	 * @param {number} qos - QoS 等级
	 */
	publish(topic, payload, qos = 0) {
		const resolvedTopic = mqttConfig.resolveTopic(topic)
		const message = typeof payload === 'string' ? payload : JSON.stringify(payload)

		if (this.client && this.connected) {
			this.client.publish(resolvedTopic, message, { qos }, (err) => {
				if (err) {
					console.error(`[MQTT] 发布失败: ${resolvedTopic}`, err)
				} else {
					console.log(`[MQTT] 已发布: ${resolvedTopic}`)
				}
			})
		} else {
			console.warn('[MQTT] 未连接，无法发布消息')
		}
	}

	/**
	 * 取消订阅
	 * @param {string} topic
	 */
	unsubscribe(topic) {
		const resolvedTopic = mqttConfig.resolveTopic(topic)
		delete this.listeners[resolvedTopic]

		if (this.client && this.connected) {
			this.client.unsubscribe(resolvedTopic)
			console.log(`[MQTT] 已取消订阅: ${resolvedTopic}`)
		}
	}

	/**
	 * 监听连接状态变化
	 * @param {function} callback - (status: 'connected'|'disconnected'|'connecting') => {}
	 */
	onStatusChange(callback) {
		this.statusListeners.push(callback)
	}

	/**
	 * 移除连接状态监听
	 * @param {function} callback
	 */
	offStatusChange(callback) {
		this.statusListeners = this.statusListeners.filter(cb => cb !== callback)
	}

	/**
	 * 断开连接
	 */
	disconnect() {
		if (this.client) {
			this.client.end(true)
			this.client = null
			this.connected = false
			this.connecting = false
			this.listeners = {}
			this._notifyStatus('disconnected')
			console.log('[MQTT] 已断开连接')
		}
	}

	/**
	 * 获取当前连接状态
	 * @returns {string} 'connected' | 'disconnected' | 'connecting'
	 */
	getStatus() {
		if (this.connected) return 'connected'
		if (this.connecting) return 'connecting'
		return 'disconnected'
	}

	// ---- 内部方法 ----

	_notifyListeners(topic, data) {
		const callbacks = this.listeners[topic]
		if (callbacks && callbacks.length > 0) {
			callbacks.forEach(cb => {
				try {
					cb(data)
				} catch (e) {
					console.error('[MQTT] 回调执行错误:', e)
				}
			})
		}
	}

	_notifyStatus(status) {
		this.statusListeners.forEach(cb => {
			try {
				cb(status)
			} catch (e) {
				console.error('[MQTT] 状态回调错误:', e)
			}
		})
	}
}

// 导出单例
const mqttService = new MqttService()
export default mqttService
