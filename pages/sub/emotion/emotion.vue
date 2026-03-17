<template>
	<view class="sub-page">
		<view class="sub-banner">
			<text class="sub-banner-icon">🧠</text>
			<text class="sub-banner-title">情感分析</text>
			<text class="sub-banner-desc">基于 AI 的宠物情绪识别</text>
		</view>

		<!-- 当前情感状态 -->
		<view class="sub-section">
			<text class="sub-section-title">😸 当前状态</text>
			<view class="data-card" style="text-align: center; padding: 50rpx 30rpx;">
				<text style="font-size: 100rpx; display: block; margin-bottom: 20rpx;">{{ currentEmoji }}</text>
				<text style="font-size: 36rpx; font-weight: 700; color: #0F172A; display: block; margin-bottom: 10rpx;">
					{{ data.status || '等待分析' }}
				</text>
				<text style="font-size: 24rpx; color: #94A3B8;">
					置信度: {{ data.confidence ? (data.confidence * 100).toFixed(0) + '%' : '--' }}
				</text>
			</view>
		</view>

		<!-- 分析来源 -->
		<view class="sub-section">
			<text class="sub-section-title">📊 分析维度</text>
			<view class="metric-grid">
				<view class="metric-card">
					<text class="metric-icon">🎤</text>
					<text class="metric-label">声音分析</text>
					<text class="metric-value">{{ data.soundEmotion || '--' }}</text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">🐕</text>
					<text class="metric-label">姿态识别</text>
					<text class="metric-value">{{ data.postureEmotion || '--' }}</text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">💓</text>
					<text class="metric-label">生理指标</text>
					<text class="metric-value">{{ data.physioEmotion || '--' }}</text>
				</view>
				<view class="metric-card">
					<text class="metric-icon">📈</text>
					<text class="metric-label">综合评分</text>
					<text class="metric-value">{{ data.score || '--' }} <text class="metric-unit">/ 100</text></text>
				</view>
			</view>
		</view>

		<!-- 情感历史 -->
		<view class="sub-section">
			<text class="sub-section-title">📋 情感记录</text>
			<view v-if="history.length > 0">
				<view class="data-card" v-for="(item, index) in history" :key="index"
					style="display: flex; align-items: center; margin-bottom: 16rpx;">
					<text style="font-size: 44rpx; margin-right: 20rpx;">{{ item.emoji }}</text>
					<view style="flex: 1;">
						<text style="font-size: 28rpx; font-weight: 600; color: #0F172A; display: block;">{{ item.status }}</text>
						<text style="font-size: 22rpx; color: #94A3B8;">{{ item.time }}</text>
					</view>
					<text style="font-size: 24rpx; color: #0EA5E9; font-weight: 500;">{{ item.score }}/100</text>
				</view>
			</view>
			<view class="empty-state" v-else>
				<text class="empty-icon">📊</text>
				<text class="empty-text">等待情感数据分析...</text>
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
				history: []
			}
		},

		computed: {
			currentEmoji() {
				const emojiMap = {
					'开心': '😸', '放松': '😺', '平静': '😐',
					'焦虑': '😿', '紧张': '🙀', '生气': '😾',
					'撒娇': '😻', '害怕': '🙀'
				}
				return emojiMap[this.data.status] || '🐱'
			}
		},

		onLoad() {
			this.subscribeEmotion()
		},

		onUnload() {
			mqttService.unsubscribe(mqttConfig.topics.emotionEvent)
		},

		methods: {
			subscribeEmotion() {
				mqttService.subscribe(
					mqttConfig.topics.emotionEvent,
					(payload) => {
						if (payload.params) {
							this.data = { ...this.data, ...payload.params }
							this.addHistory(payload.params)
						}
					}
				)
			},

			addHistory(params) {
				const now = new Date()
				const time = `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
				const emojiMap = {
					'开心': '😸', '放松': '😺', '平静': '😐',
					'焦虑': '😿', '紧张': '🙀', '生气': '😾'
				}
				this.history.unshift({
					status: params.status || '未知',
					score: params.score || 0,
					emoji: emojiMap[params.status] || '🐱',
					time
				})
				if (this.history.length > 20) {
					this.history = this.history.slice(0, 20)
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	@import '@/common/styles/sub-page.scss';
	@import '@/common/styles/common.scss';
</style>
