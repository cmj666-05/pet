/**
 * MoodPaws MQTT 服务模块
 *
 * 封装阿里云 IoT 平台的 MQTT 连接、订阅、发布逻辑
 * 使用 mqtt.js 通过 WebSocket 连接
 * 在 uni-app 环境下使用 uni.connectSocket 适配器
 */

import mqtt from 'mqtt/dist/mqtt'
import CryptoJS from 'crypto-js'
import mqttConfig from './mqtt-config'
import { uniWebSocketFactory } from './uni-websocket'

class MqttService {
	constructor() {
		this.client = null
		this.connected = false
		this.connecting = false
		this.listeners = {}         // topic -> [callback]
		this.statusListeners = []   // 连接状态监听
	}

	/**
	 * 生成阿里云 IoT MQTT 连接参数
	 * 优先使用预计算凭证，否则动态生成 HMAC-SHA256 签名
	 */
	_generateConnectParams() {
		const { productKey, deviceName, deviceSecret, host, port, precomputed } = mqttConfig

		let clientId, username, password

		if (precomputed && precomputed.clientId) {
			// 使用预计算的连接凭证
			clientId = precomputed.clientId
			username = precomputed.username
			password = precomputed.password
			console.log('[MQTT] 使用预计算凭证连接')
		} else {
			// 动态生成签名（移除 timestamp 参数，以解决系统时间不准导致的阿里云认证失败）
			clientId = `${productKey}.${deviceName}|securemode=2,signmethod=hmacsha256|`
			const signContent = `clientId${productKey}.${deviceName}deviceName${deviceName}productKey${productKey}`
			password = CryptoJS.HmacSHA256(signContent, deviceSecret).toString(CryptoJS.enc.Hex)
			username = `${deviceName}&${productKey}`
		}

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
				let { url, clientId, username, password } = this._generateConnectParams()
				
				// 判断运行环境：仅在小程序 / App 原生环境下注入 uni-app WebSocket 适配器
				const isH5 = typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined'
				
				if (isH5) {
					// H5 模式：强制走 Vite 配置的 /mqtt-proxy websocket 代理，绕过系统时间引起的 SSL 证书过期校验错误 ERR_CERT_AUTHORITY_INVALID
					url = `ws://${window.location.host}/mqtt-proxy`
				} else {
					// 其他原生环境直连：去除默认 443 端口，防止 Host 发送非法参数导致阿里云 WAF 拒绝连接
					url = `wss://${mqttConfig.host}${mqttConfig.port === 443 ? '' : ':' + mqttConfig.port}/mqtt`
					
					if (typeof uni !== 'undefined' && uni.connectSocket) {
						globalThis.WebSocket = function(socketUrl, protocols) {
							return uniWebSocketFactory(socketUrl, ['mqtt'])
						}
						console.log('[MQTT] 已注入 uni-app WebSocket 适配器（非H5环境）')
					}
				}

			// 浏览器环境中确保密码以 Buffer 形式传递，避免 UTF-8 转码导致签名变化
			const reqPassword = (typeof Buffer !== 'undefined') ? Buffer.from(password, 'utf8') : password

			this.client = mqtt.connect(url, {
				clientId,
				username,
				password: reqPassword,
				keepalive: mqttConfig.options.keepalive,
				connectTimeout: mqttConfig.options.connectTimeout,
				reconnectPeriod: mqttConfig.options.reconnectPeriod,
				clean: mqttConfig.options.clean,
				protocolVersion: 4,
				transformWsUrl: function(wsUrl, options, client) {
					// 强制覆盖 WebSocket 子协议为单一 'mqtt'，解决阿里云 LB 拒绝数组协议的问题
					if (options) {
						options.protocols = ['mqtt']
					}
					return wsUrl
				}
			})

				// 调试：监听 MQTT 协议包，用于诊断 CONNACK 错误
				this.client.on('packetreceive', (packet) => {
					console.log('[MQTT] 收到协议包:', packet.cmd, packet)
					if (packet.cmd === 'connack') {
						if (packet.returnCode !== 0) {
							const codes = {
								1: '协议版本不支持',
								2: 'clientId 被拒绝',
								3: '服务器不可用',
								4: '用户名或密码错误',
								5: '未授权'
							}
							console.error(`[MQTT] CONNACK 拒绝连接! 错误码: ${packet.returnCode} (${codes[packet.returnCode] || '未知'})`)
						}
					}
				})

				// 调试：监听发送的包
				this.client.on('packetsend', (packet) => {
					if (packet.cmd === 'connect') {
						console.log('[MQTT] 发送 CONNECT 包:', {
							clientId: packet.clientId?.substring(0, 50),
							username: packet.username,
							protocolVersion: packet.protocolVersion
						})
					}
				})

				this.client.on('connect', (connack) => {
					console.log('[MQTT] 连接成功! CONNACK:', connack)
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
					console.error('[MQTT] 错误:', err.message || err, err)
					this.connecting = false
					this._notifyStatus('disconnected')
					reject(err)
				})

				this.client.on('disconnect', (packet) => {
					console.log('[MQTT] 服务器主动断开:', packet)
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

		// 阿里云 IoT 安全限制：严禁设备端订阅自己的属性上报（/post）通道
		// 如果强行订阅，阿里云会立刻强制断开连接，导致无尽的 10 秒跳点离线排错
		if (resolvedTopic.endsWith('/post')) {
			console.warn(`[MQTT] 拦截非法订阅: ${resolvedTopic}。阿里云 IoT 协议禁止设备订阅属性/事件上报通道，只能 Publish！强制订阅会导致服务端立即断开连接。`)
			return
		}

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
