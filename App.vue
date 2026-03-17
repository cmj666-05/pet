<script>
	import mqttService from './utils/mqtt-service'

	export default {
		onLaunch() {
			console.log('App Launch')
			// 应用启动时尝试连接 MQTT
			this.initMqtt()
		},

		onShow() {
			console.log('App Show')
		},

		onHide() {
			console.log('App Hide')
		},

		methods: {
			async initMqtt() {
				try {
					await mqttService.connect()
					console.log('[App] MQTT 连接成功')
				} catch (err) {
					console.error('[App] MQTT 连接失败:', err)
					uni.showToast({
						title: 'IoT 连接失败，将自动重试',
						icon: 'none',
						duration: 3000
					})
				}
			}
		}
	}
</script>

<style lang="scss">
	@import '@/common/styles/common.scss';

	/* 全局基础样式 */
	page {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
			'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica,
			Arial, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		background-color: #F8FAFC;
	}

	/* 全局滚动条隐藏 */
	::-webkit-scrollbar {
		display: none;
	}

	/* 去除按钮默认样式 */
	button::after {
		border: none;
	}
</style>
