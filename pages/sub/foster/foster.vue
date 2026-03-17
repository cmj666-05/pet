<template>
	<view class="sub-page">
		<view class="sub-banner">
			<text class="sub-banner-icon">🏠</text>
			<text class="sub-banner-title">寄养屋</text>
			<text class="sub-banner-desc">环境监控与智能调节</text>
		</view>

		<!-- 环境监控 -->
		<view class="sub-section">
			<text class="sub-section-title">🌡️ 环境数据</text>
			<view class="metric-grid">
				<view class="metric-card">
					<text class="metric-icon">🌡️</text>
					<text class="metric-label">温度</text>
					<text class="metric-value">{{ data.temperature || '--' }} <text class="metric-unit">℃</text></text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">💧</text>
					<text class="metric-label">湿度</text>
					<text class="metric-value">{{ data.humidity || '--' }} <text class="metric-unit">%</text></text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">🌬️</text>
					<text class="metric-label">空气质量</text>
					<text class="metric-value">{{ data.airQuality || '--' }} <text class="metric-unit">AQI</text></text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">💡</text>
					<text class="metric-label">光线强度</text>
					<text class="metric-value">{{ data.lightLevel || '--' }} <text class="metric-unit">lux</text></text>
				</view>
			</view>
		</view>

		<!-- 智能调节 -->
		<view class="sub-section">
			<text class="sub-section-title">🎛️ 智能调节</text>
			<view class="data-card">
				<view class="data-card-header">
					<text class="data-card-title">温度设定</text>
					<text class="status-tag tag-info">{{ targetTemp }}℃</text>
				</view>
				<slider :value="targetTemp" :min="16" :max="32" :step="1"
					activeColor="#0EA5E9" backgroundColor="#E2E8F0"
					@change="onTempChange" />
			</view>
			<view class="data-card">
				<view class="data-card-header">
					<text class="data-card-title">湿度设定</text>
					<text class="status-tag tag-info">{{ targetHumidity }}%</text>
				</view>
				<slider :value="targetHumidity" :min="30" :max="80" :step="5"
					activeColor="#0EA5E9" backgroundColor="#E2E8F0"
					@change="onHumidityChange" />
			</view>
		</view>

		<!-- 宠物活动状态 -->
		<view class="sub-section">
			<text class="sub-section-title">🐾 宠物状态</text>
			<view class="data-card">
				<view class="data-card-header">
					<text class="data-card-title">活动状态</text>
					<text class="status-tag" :class="activityTagClass">{{ data.activity || '等待数据' }}</text>
				</view>
				<text style="font-size: 26rpx; color: #64748B; line-height: 1.6;">
					情感状态: {{ data.emotionFeedback || '等待分析' }}
				</text>
			</view>
			<view class="metric-grid">
				<view class="metric-card">
					<text class="metric-icon">⚖️</text>
					<text class="metric-label">体重</text>
					<text class="metric-value">{{ data.petWeight || '--' }} <text class="metric-unit">kg</text></text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">🍖</text>
					<text class="metric-label">今日饮食</text>
					<text class="metric-value">{{ data.foodIntake || '--' }} <text class="metric-unit">g</text></text>
				</view>
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
				targetTemp: 24,
				targetHumidity: 55
			}
		},

		computed: {
			activityTagClass() {
				const act = (this.data.activity || '').toLowerCase()
				if (['休息', '睡觉', 'sleeping'].includes(act)) return 'tag-info'
				if (['活跃', '运动', 'active'].includes(act)) return 'tag-normal'
				return 'tag-info'
			}
		},

		onLoad() {
			this.subscribeFoster()
		},

		onUnload() {
			mqttService.unsubscribe(mqttConfig.topics.fosterPropertyPost)
		},

		methods: {
			subscribeFoster() {
				mqttService.subscribe(
					mqttConfig.topics.fosterPropertyPost,
					(payload) => {
						if (payload.params) {
							this.data = { ...this.data, ...payload.params }
						}
					}
				)
			},

			onTempChange(e) {
				this.targetTemp = e.detail.value
				this.publishControl({ targetTemperature: this.targetTemp })
			},

			onHumidityChange(e) {
				this.targetHumidity = e.detail.value
				this.publishControl({ targetHumidity: this.targetHumidity })
			},

			publishControl(params) {
				mqttService.publish(
					mqttConfig.topics.fosterProperty,
					{
						method: 'thing.service.property.set',
						params
					}
				)
				uni.showToast({ title: '指令已发送', icon: 'none' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	@import '@/common/styles/sub-page.scss';
	@import '@/common/styles/common.scss';
</style>
