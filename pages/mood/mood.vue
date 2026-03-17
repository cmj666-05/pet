<template>
	<view class="page">
		<!-- MQTT 连接状态栏 -->
		<view class="connection-bar">
			<text class="connection-label">IoT 连接状态</text>
			<view class="connection-status" :class="mqttStatus">
				<view class="status-dot"></view>
				<text>{{ mqttStatusText }}</text>
			</view>
		</view>

		<!-- 设备数据概览 -->
		<view class="sub-section">
			<text class="section-title">📊 实时数据概览</text>
			<view class="overview-grid">
				<view class="overview-card collar">
					<text class="overview-title">❤️ 心率</text>
					<text class="overview-value">{{ collarData.heartRate || '--' }}
						<text class="overview-desc"> bpm</text>
					</text>
				</view>
				<view class="overview-card collar">
					<text class="overview-title">🫁 血氧</text>
					<text class="overview-value">{{ collarData.bloodOxygen || '--' }}
						<text class="overview-desc"> %</text>
					</text>
				</view>
				<view class="overview-card foster">
					<text class="overview-title">🌡️ 温度</text>
					<text class="overview-value">{{ fosterData.temperature || '--' }}
						<text class="overview-desc"> ℃</text>
					</text>
				</view>
				<view class="overview-card foster">
					<text class="overview-title">💧 湿度</text>
					<text class="overview-value">{{ fosterData.humidity || '--' }}
						<text class="overview-desc"> %</text>
					</text>
				</view>
				<view class="overview-card emotion">
					<text class="overview-title">😸 情感状态</text>
					<text class="overview-value">{{ emotionData.status || '--' }}</text>
				</view>
				<view class="overview-card social">
					<text class="overview-title">🤝 社交互动</text>
					<text class="overview-value">{{ socialData.todayCount || 0 }}
						<text class="overview-desc"> 次</text>
					</text>
				</view>
			</view>
		</view>

		<!-- 最近数据流 -->
		<view class="stream-section">
			<text class="section-title">📡 最近数据流</text>
			<view class="stream-list" v-if="streamList.length > 0">
				<view class="stream-item" v-for="(item, index) in streamList" :key="index">
					<text class="stream-icon">{{ item.icon }}</text>
					<view class="stream-info">
						<text class="stream-title">{{ item.title }}</text>
						<text class="stream-time">{{ item.time }}</text>
					</view>
					<text class="stream-value">{{ item.value }}</text>
				</view>
			</view>
			<view class="empty-state" v-else>
				<text class="empty-icon">📡</text>
				<text class="empty-text">等待设备数据接入...</text>
			</view>
		</view>
	</view>
</template>

<script>
	import mqttService from '@/utils/mqtt-service'
	import mqttConfig from '@/utils/mqtt-config'

	export default {
		data() {
			return {
				mqttStatus: 'disconnected',
				collarData: {},
				fosterData: {},
				emotionData: {},
				socialData: {},
				streamList: []
			}
		},

		computed: {
			mqttStatusText() {
				const map = {
					connected: '已连接',
					connecting: '连接中...',
					disconnected: '未连接'
				}
				return map[this.mqttStatus] || '未连接'
			}
		},

		onShow() {
			this.mqttStatus = mqttService.getStatus()
			mqttService.onStatusChange(this.handleStatus)
			this.subscribeTopics()
		},

		onHide() {
			mqttService.offStatusChange(this.handleStatus)
		},

		methods: {
			handleStatus(status) {
				this.mqttStatus = status
			},

			subscribeTopics() {
				// 订阅项圈属性上报
				mqttService.subscribe(
					mqttConfig.topics.collarPropertyPost,
					(data) => {
						if (data.params) {
							this.collarData = { ...this.collarData, ...data.params }
							this.addStream('❤️', '项圈数据更新', JSON.stringify(data.params))
						}
					}
				)

				// 订阅寄养屋属性上报
				mqttService.subscribe(
					mqttConfig.topics.fosterPropertyPost,
					(data) => {
						if (data.params) {
							this.fosterData = { ...this.fosterData, ...data.params }
							this.addStream('🏠', '寄养屋数据更新', JSON.stringify(data.params))
						}
					}
				)

				// 订阅情感事件
				mqttService.subscribe(
					mqttConfig.topics.emotionEvent,
					(data) => {
						if (data.params) {
							this.emotionData = { ...this.emotionData, ...data.params }
							this.addStream('🧠', '情感状态变化', data.params.status || '')
						}
					}
				)

				// 订阅社交事件
				mqttService.subscribe(
					mqttConfig.topics.socialEvent,
					(data) => {
						if (data.params) {
							this.socialData = { ...this.socialData, ...data.params }
							this.addStream('📱', 'NFC 社交互动', data.params.peerName || '')
						}
					}
				)
			},

			addStream(icon, title, value) {
				const now = new Date()
				const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
				this.streamList.unshift({ icon, title, value, time })
				if (this.streamList.length > 20) {
					this.streamList = this.streamList.slice(0, 20)
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	@import './mood.scss';
</style>
