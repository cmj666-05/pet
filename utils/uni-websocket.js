/**
 * uni-app WebSocket 适配器
 * 将 uni.connectSocket 适配为标准 WebSocket 接口，供 mqtt.js 使用
 */

class UniWebSocket {
	constructor(url, protocols) {
		this.url = url
		this.readyState = 0 // CONNECTING
		this._callbacks = {
			open: [],
			message: [],
			close: [],
			error: []
		}

		// 创建 uni-app WebSocket 连接
		this.socketTask = uni.connectSocket({
			url,
			protocols: protocols ? (Array.isArray(protocols) ? protocols : [protocols]) : ['mqtt'],
			complete: () => {}
		})

		this.socketTask.onOpen(() => {
			this.readyState = 1 // OPEN
			this._emit('open', {})
		})

		this.socketTask.onMessage((res) => {
			this._emit('message', { data: res.data })
		})

		this.socketTask.onClose((res) => {
			this.readyState = 3 // CLOSED
			this._emit('close', res)
		})

		this.socketTask.onError((err) => {
			this.readyState = 3 // CLOSED
			this._emit('error', err)
		})
	}

	send(data) {
		if (this.readyState !== 1) return
		this.socketTask.send({
			data,
			fail: (err) => {
				console.error('[UniWebSocket] 发送失败:', err)
			}
		})
	}

	close(code, reason) {
		this.readyState = 2 // CLOSING
		this.socketTask.close({
			code: code || 1000,
			reason: reason || '',
			complete: () => {
				this.readyState = 3
			}
		})
	}

	// 事件监听器 setter（mqtt.js 使用 onopen / onmessage / onclose / onerror）
	set onopen(fn) { this._callbacks.open = [fn] }
	set onmessage(fn) { this._callbacks.message = [fn] }
	set onclose(fn) { this._callbacks.close = [fn] }
	set onerror(fn) { this._callbacks.error = [fn] }

	addEventListener(event, fn) {
		if (this._callbacks[event]) {
			this._callbacks[event].push(fn)
		}
	}

	removeEventListener(event, fn) {
		if (this._callbacks[event]) {
			this._callbacks[event] = this._callbacks[event].filter(cb => cb !== fn)
		}
	}

	_emit(event, data) {
		const callbacks = this._callbacks[event] || []
		callbacks.forEach(fn => {
			if (fn) {
				try { fn(data) } catch (e) {
					console.error(`[UniWebSocket] ${event} 回调错误:`, e)
				}
			}
		})
	}
}

// 导出工厂函数，符合 mqtt.js 的 WebSocket 创建器接口
export function uniWebSocketFactory(url, protocols) {
	return new UniWebSocket(url, protocols)
}

export default UniWebSocket
