<template>
	<view class="sub-page">
		<view class="sub-banner">
			<text class="sub-banner-icon">📱</text>
			<text class="sub-banner-title">NFC 社交</text>
			<text class="sub-banner-desc">碰一碰，建立宠物社交连接</text>
		</view>

		<!-- NFC 扫描 -->
		<view class="sub-section">
			<text class="sub-section-title">📡 NFC 互动</text>
			<view class="data-card" style="text-align: center; padding: 40rpx;">
				<text style="font-size: 80rpx; display: block; margin-bottom: 20rpx;">{{ isScanning ? '📡' : '📱' }}</text>
				<text style="font-size: 30rpx; font-weight: 600; color: #0F172A; display: block; margin-bottom: 16rpx;">
					{{ isScanning ? '正在扫描附近宠物...' : '开启 NFC 社交' }}
				</text>
				<text style="font-size: 24rpx; color: #94A3B8; display: block; margin-bottom: 30rpx;">
					当佩戴项圈的宠物靠近时，自动建立社交连接
				</text>
				<view class="sub-action-btn" @click="toggleScan" style="margin-bottom: 0;">
					<text class="btn-text">{{ isScanning ? '停止扫描' : '开始扫描' }}</text>
				</view>
			</view>
		</view>

		<!-- 社交统计 -->
		<view class="sub-section">
			<text class="sub-section-title">📊 社交统计</text>
			<view class="metric-grid">
				<view class="metric-card">
					<text class="metric-icon">🤝</text>
					<text class="metric-label">今日互动</text>
					<text class="metric-value">{{ socialStats.todayCount || 0 }}</text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">🐾</text>
					<text class="metric-label">好友数量</text>
					<text class="metric-value">{{ socialStats.friendCount || 0 }}</text>
				</view>
			</view>
		</view>

		<!-- 好友列表 -->
		<view class="sub-section">
			<text class="sub-section-title">🐾 宠物好友</text>
			<view v-if="friends.length > 0">
				<view class="data-card" v-for="(friend, index) in friends" :key="index"
					style="display: flex; align-items: center; margin-bottom: 16rpx;">
					<text style="font-size: 48rpx; margin-right: 20rpx;">{{ friend.avatar }}</text>
					<view style="flex: 1;">
						<text style="font-size: 28rpx; font-weight: 600; color: #0F172A; display: block;">{{ friend.name }}</text>
						<text style="font-size: 22rpx; color: #94A3B8;">上次互动: {{ friend.lastMeet }}</text>
					</view>
					<text class="status-tag tag-normal">{{ friend.meetCount }}次</text>
				</view>
			</view>
			<view class="empty-state" v-else>
				<text class="empty-icon">🤝</text>
				<text class="empty-text">还没有宠物好友，快去碰一碰吧！</text>
			</view>
		</view>

		<!-- 社交记录 -->
		<view class="sub-section">
			<text class="sub-section-title">📋 社交记录</text>
			<view v-if="records.length > 0">
				<view class="data-card" v-for="(rec, index) in records" :key="'r'+index"
					style="display: flex; align-items: center; margin-bottom: 16rpx;">
					<text style="font-size: 36rpx; margin-right: 16rpx;">🐾</text>
					<view style="flex: 1;">
						<text style="font-size: 26rpx; font-weight: 500; color: #0F172A; display: block;">
							与 {{ rec.peerName }} {{ rec.action }}
						</text>
						<text style="font-size: 22rpx; color: #94A3B8;">{{ rec.time }}</text>
					</view>
				</view>
			</view>
			<view class="empty-state" v-else>
				<text class="empty-icon">📭</text>
				<text class="empty-text">暂无社交记录</text>
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
				isScanning: false,
				socialStats: {},
				friends: [],
				records: []
			}
		},

		onLoad() {
			this.subscribeSocial()
		},

		onUnload() {
			mqttService.unsubscribe(mqttConfig.topics.socialEvent)
		},

		methods: {
			subscribeSocial() {
				mqttService.subscribe(
					mqttConfig.topics.socialEvent,
					(payload) => {
						if (payload.params) {
							this.handleSocialEvent(payload.params)
						}
					}
				)
			},

			handleSocialEvent(params) {
				// 更新统计
				if (params.todayCount !== undefined) {
					this.socialStats = { ...this.socialStats, ...params }
				}

				// 新好友
				if (params.newFriend) {
					const exists = this.friends.find(f => f.id === params.newFriend.id)
					if (!exists) {
						this.friends.unshift({
							id: params.newFriend.id,
							name: params.newFriend.name,
							avatar: params.newFriend.avatar || '🐱',
							lastMeet: this.formatTime(),
							meetCount: 1
						})
						this.socialStats.friendCount = this.friends.length
					} else {
						exists.meetCount += 1
						exists.lastMeet = this.formatTime()
					}
				}

				// 添加记录
				if (params.peerName) {
					this.records.unshift({
						peerName: params.peerName,
						action: params.action || '相遇',
						time: this.formatTime()
					})
					if (this.records.length > 30) {
						this.records = this.records.slice(0, 30)
					}
				}
			},

			toggleScan() {
				this.isScanning = !this.isScanning
				if (this.isScanning) {
					uni.showToast({ title: '已开启 NFC 扫描', icon: 'none' })
				} else {
					uni.showToast({ title: '已停止扫描', icon: 'none' })
				}
			},

			formatTime() {
				const now = new Date()
				return `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
			}
		}
	}
</script>

<style lang="scss" scoped>
	@import '@/common/styles/sub-page.scss';
	@import '@/common/styles/common.scss';
</style>
