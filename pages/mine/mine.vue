<template>
	<view class="page">
		<!-- 用户头像区 -->
		<view class="profile-section">
			<view class="profile-card">
				<view class="avatar-wrapper">
					<view class="avatar">
						<text class="avatar-text">🐱</text>
					</view>
					<view class="avatar-badge">
						<text class="badge-text">Lv.1</text>
					</view>
				</view>
				<text class="user-name">铲屎官</text>
				<text class="user-desc">和毛孩子一起记录美好生活</text>
				<view class="stats-row">
					<view class="stat-item">
						<text class="stat-num">0</text>
						<text class="stat-label">记录天数</text>
					</view>
					<view class="stat-divider"></view>
					<view class="stat-item">
						<text class="stat-num">0</text>
						<text class="stat-label">心情记录</text>
					</view>
					<view class="stat-divider"></view>
					<view class="stat-item">
						<text class="stat-num">1</text>
						<text class="stat-label">宠物数量</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 菜单列表 -->
		<view class="menu-section">
			<view class="menu-group">
				<view class="menu-item">
					<view class="menu-left">
						<text class="menu-icon">🐾</text>
						<text class="menu-text">我的宠物</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-item">
					<view class="menu-left">
						<text class="menu-icon">📊</text>
						<text class="menu-text">数据统计</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-item">
					<view class="menu-left">
						<text class="menu-icon">🔔</text>
						<text class="menu-text">提醒设置</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
			</view>

			<view class="menu-group">
				<view class="menu-item">
					<view class="menu-left">
						<text class="menu-icon">⭐</text>
						<text class="menu-text">给我们评分</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-item">
					<view class="menu-left">
						<text class="menu-icon">💬</text>
						<text class="menu-text">意见反馈</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-item">
					<view class="menu-left">
						<text class="menu-icon">ℹ️</text>
						<text class="menu-text">关于我们</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 版本号 -->
		<view class="version-section">
			<text class="version-text">MoodPaws v1.0.0</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {}
		},

		methods: {}
	}
</script>

<style lang="scss" scoped>
	@import './mine.scss';
</style>
