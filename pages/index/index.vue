<template>
	<view class="page">
		<!-- 欢迎区域 -->
		<view class="welcome-section">
			<view class="welcome-card">
				<view class="paw-icon">🐾</view>
				<text class="welcome-title">MoodPaws</text>
				<text class="welcome-desc">智能宠物 IoT 管理平台</text>
			</view>
		</view>

		<!-- 功能卡片区 -->
		<view class="feature-grid">
			<view class="feature-card card-collar" @click="navigateTo('/pages/sub/collar/collar')">
				<view class="card-icon">📡</view>
				<text class="card-title">宠物项圈</text>
				<text class="card-desc">健康监测 · GPS追踪</text>
			</view>
			<view class="feature-card card-foster" @click="navigateTo('/pages/sub/foster/foster')">
				<view class="card-icon">🏠</view>
				<text class="card-title">寄养屋</text>
				<text class="card-desc">环境监控 · 智能调节</text>
			</view>
			<view class="feature-card card-emotion" @click="navigateTo('/pages/sub/emotion/emotion')">
				<view class="card-icon">🧠</view>
				<text class="card-title">情感分析</text>
				<text class="card-desc">AI情绪识别</text>
			</view>
			<view class="feature-card card-social" @click="navigateTo('/pages/sub/social/social')">
				<view class="card-icon">📱</view>
				<text class="card-title">NFC社交</text>
				<text class="card-desc">碰一碰社交</text>
			</view>
		</view>

		<!-- 设备状态 -->
		<view class="status-section">
			<text class="section-title">📊 设备状态</text>
			<view class="status-card">
				<view class="status-item">
					<text class="status-label">MQTT</text>
					<text class="status-value" :class="mqttStatus">{{ mqttStatusText }}</text>
				</view>
				<view class="status-divider"></view>
				<view class="status-item">
					<text class="status-label">项圈</text>
					<text class="status-value" :class="collarOnline ? 'online' : 'offline'">
						{{ collarOnline ? '在线' : '离线' }}
					</text>
				</view>
				<view class="status-divider"></view>
				<view class="status-item">
					<text class="status-label">寄养屋</text>
					<text class="status-value" :class="fosterOnline ? 'online' : 'offline'">
						{{ fosterOnline ? '在线' : '离线' }}
					</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import mqttService from '@/utils/mqtt-service'

	export default {
		data() {
			return {
				mqttStatus: 'disconnected',
				collarOnline: false,
				fosterOnline: false
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
			mqttService.onStatusChange(this.handleStatusChange)
		},

		onHide() {
			mqttService.offStatusChange(this.handleStatusChange)
		},

		methods: {
			navigateTo(url) {
				uni.navigateTo({ url })
			},

			handleStatusChange(status) {
				this.mqttStatus = status
			}
		}
	}
</script>

<style lang="scss" scoped>
	@import './index.scss';
</style>
