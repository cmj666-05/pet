<template>
	<view class="sub-page">
		<view class="sub-banner">
			<text class="sub-banner-icon">📡</text>
			<text class="sub-banner-title">宠物项圈</text>
			<text class="sub-banner-desc">实时监控健康指标与运动轨迹</text>
		</view>

		<!-- 健康指标 -->
		<view class="sub-section">
			<text class="sub-section-title">❤️ 健康指标</text>
			<view class="metric-grid">
				<view class="metric-card">
					<text class="metric-icon">💓</text>
					<text class="metric-label">心率</text>
					<text class="metric-value">{{ data.heartRate || '--' }} <text class="metric-unit">bpm</text></text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">🫁</text>
					<text class="metric-label">血氧饱和度</text>
					<text class="metric-value">{{ data.bloodOxygen || '--' }} <text class="metric-unit">%</text></text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">⚖️</text>
					<text class="metric-label">体重</text>
					<text class="metric-value">{{ data.weight || '--' }} <text class="metric-unit">kg</text></text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">🌡️</text>
					<text class="metric-label">体温</text>
					<text class="metric-value">{{ data.bodyTemp || '--' }} <text class="metric-unit">℃</text></text>
				</view>
			</view>
		</view>

		<!-- 活动量 -->
		<view class="sub-section">
			<text class="sub-section-title">🏃 活动数据</text>
			<view class="metric-grid">
				<view class="metric-card">
					<text class="metric-icon">👣</text>
					<text class="metric-label">今日步数</text>
					<text class="metric-value">{{ data.steps || '--' }}</text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">📍</text>
					<text class="metric-label">GPS 位置</text>
					<text class="metric-value" style="font-size: 24rpx;">{{ data.gpsLat ? data.gpsLat + ', ' + data.gpsLng : '--' }}</text>
				</view>
			</view>
		</view>

		<!-- 情感状态 -->
		<view class="sub-section">
			<text class="sub-section-title">😸 情感识别</text>
			<view class="data-card">
				<view class="data-card-header">
					<text class="data-card-title">当前情感</text>
					<text class="status-tag" :class="emotionTagClass">{{ data.emotion || '等待数据' }}</text>
				</view>
				<text style="font-size: 26rpx; color: #64748B; line-height: 1.6;">
					基于声音与姿态传感器的 AI 分析结果
				</text>
			</view>
		</view>

		<!-- 健康预警 -->
		<view class="sub-section" v-if="alerts.length > 0">
			<text class="sub-section-title">⚠️ 健康预警</text>
			<view class="data-card" v-for="(alert, index) in alerts" :key="index">
				<view class="data-card-header">
					<text class="data-card-title">{{ alert.title }}</text>
					<text class="status-tag tag-danger">异常</text>
				</view>
				<text style="font-size: 26rpx; color: #64748B;">{{ alert.message }}</text>
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
				data: {},
				alerts: []
			}
		},

		computed: {
			emotionTagClass() {
				const emotion = (this.data.emotion || '').toLowerCase()
				if (['开心', '放松', 'happy'].includes(emotion)) return 'tag-normal'
				if (['焦虑', '紧张', 'anxious'].includes(emotion)) return 'tag-warning'
				if (['生气', 'angry'].includes(emotion)) return 'tag-danger'
				return 'tag-info'
			}
		},

		onLoad() {
			this.subscribeCollar()
		},

		onUnload() {
			mqttService.unsubscribe(mqttConfig.topics.collarPropertyPost)
		},

		methods: {
			subscribeCollar() {
				mqttService.subscribe(
					mqttConfig.topics.collarPropertyPost,
					(payload) => {
						if (payload.params) {
							this.data = { ...this.data, ...payload.params }
							this.checkAlerts(payload.params)
						}
					}
				)
			},

			checkAlerts(params) {
				// 心率异常检测
				if (params.heartRate && (params.heartRate > 180 || params.heartRate < 40)) {
					this.addAlert('心率异常', `当前心率 ${params.heartRate} bpm，不在正常范围内`)
				}
				// 血氧异常检测
				if (params.bloodOxygen && params.bloodOxygen < 90) {
					this.addAlert('血氧偏低', `当前血氧 ${params.bloodOxygen}%，低于安全阈值`)
				}
				// 体温异常检测
				if (params.bodyTemp && (params.bodyTemp > 39.5 || params.bodyTemp < 37.5)) {
					this.addAlert('体温异常', `当前体温 ${params.bodyTemp}℃，请关注宠物健康`)
				}
			},

			addAlert(title, message) {
				this.alerts.unshift({ title, message })
				if (this.alerts.length > 5) {
					this.alerts = this.alerts.slice(0, 5)
				}
				uni.showModal({
					title: '⚠️ 健康预警',
					content: `${title}: ${message}`,
					showCancel: false
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	@import '@/common/styles/sub-page.scss';
	@import '@/common/styles/common.scss';
</style>
