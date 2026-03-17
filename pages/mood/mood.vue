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

		<!-- 实时趋势折线图 -->
		<view class="chart-section">
			<text class="section-title">📈 环境实时趋势 (最近20条)</text>
			<view id="trendChart" class="chart-container"></view>
			<view class="chart-empty" v-if="historyData.length === 0">
				<text>等候数据绘图中...</text>
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
	import * as echarts from 'echarts'

	export default {
		data() {
			return {
				mqttStatus: 'disconnected',
				collarData: {},
				fosterData: {},
				emotionData: {},
				socialData: {},
				streamList: [],
				historyData: [], // 存储历史温湿度用于画图
				chart: null // ECharts 实例
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
			
			// H5 环境下延迟初始化图表，确保 DOM 已挂载
			this.$nextTick(() => {
				setTimeout(() => {
					this.initChart()
				}, 300)
			})
		},

		onHide() {
			mqttService.offStatusChange(this.handleStatus)
			if (this.pollTimer) {
				clearInterval(this.pollTimer)
				this.pollTimer = null
			}
			// 隐藏时不需要销毁，但如果需要释放内存可以 handle
		},

		beforeUnmount() {
			if (this.chart) {
				this.chart.dispose()
				this.chart = null
			}
		},

		methods: {
			handleStatus(status) {
				this.mqttStatus = status
			},

			subscribeTopics() {
				// 现在我们是全新的、完全独立的网页专属设备 WebApp001 了！
				// 阿里云规则引擎会把 DHT11 上传来的一切数据，原封不动地转发到我们这个频道的 data.items 里。
				
				const customReceiveTopic = `/${mqttConfig.productKey}/${mqttConfig.deviceName}/user/get`;

				mqttService.subscribe(customReceiveTopic, (data) => {
					console.log('[App] 收到阿里云转发的物理监控数据: ', data);
					
					// 根据阿里云规则引擎转发的结构，数据通常在 items 里
					// 结构示例：items: { Temp1: { value: 23 }, Humi1: { value: 32 } }
					const currentData = data.items || data.params || data;
					
					if (currentData) {
						// 1. 处理项圈心率数据
						const heartRateObj = currentData.heartRate;
						const heartRateVal = (heartRateObj && typeof heartRateObj === 'object') ? heartRateObj.value : heartRateObj;
						if (heartRateVal !== undefined) {
							this.collarData = { ...this.collarData, heartRate: heartRateVal };
							this.addStream('❤️', '项圈数据更新', `心率 ${heartRateVal}`);
						}

						// 2. 处理温湿度数据（核心：解析 .value 嵌套结构）
						const t1 = currentData.Temp1;
						const h1 = currentData.Humi1;
						const tempVal = (t1 && typeof t1 === 'object') ? t1.value : t1;
						const humiVal = (h1 && typeof h1 === 'object') ? h1.value : h1;

						if (tempVal !== undefined || currentData.temperature !== undefined) {
							this.fosterData = {
								temperature: tempVal !== undefined ? tempVal : (currentData.temperature || this.fosterData.temperature),
								humidity: humiVal !== undefined ? humiVal : (currentData.humidity || this.fosterData.humidity)
							};
							
							this.addStream('🏠', '传感器环境更新', `温度 ${this.fosterData.temperature}℃ 湿度 ${this.fosterData.humidity}%`);
							
							// 添加到历史曲线数据
							this.updateHistory(this.fosterData.temperature, this.fosterData.humidity)
						}
						
						// 3. 处理情感分析结构
						const emotionObj = currentData.status || currentData.emotion;
						const emotionVal = (emotionObj && typeof emotionObj === 'object') ? emotionObj.value : emotionObj;
						if (emotionVal !== undefined) {
							this.emotionData = { ...this.emotionData, status: emotionVal };
							this.addStream('🧠', '情感状态变化', emotionVal);
						}
					}
				});
			},

			initChart() {
				const chartDom = document.getElementById('trendChart');
				if (!chartDom) return;
				
				this.chart = echarts.init(chartDom);
				const option = {
					tooltip: { trigger: 'axis' },
					legend: { data: ['温度 (℃)', '湿度 (%)'], bottom: 0 },
					grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
					xAxis: { 
						type: 'category', 
						data: [],
						axisLabel: { fontSize: 10 }
					},
					yAxis: { type: 'value', scale: true },
					series: [
						{
							name: '温度 (℃)',
							type: 'line',
							smooth: true,
							data: [],
							itemStyle: { color: '#007AFF' },
							areaStyle: {
								color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{ offset: 0, color: 'rgba(0,122,255,0.3)' },
									{ offset: 1, color: 'rgba(0,122,255,0)' }
								])
							}
						},
						{
							name: '湿度 (%)',
							type: 'line',
							smooth: true,
							data: [],
							itemStyle: { color: '#4CD964' },
							areaStyle: {
								color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{ offset: 0, color: 'rgba(76,217,100,0.3)' },
									{ offset: 1, color: 'rgba(76,217,100,0)' }
								])
							}
						}
					]
				};
				this.chart.setOption(option);
				
				// 监听窗口大小变化
				window.addEventListener('resize', () => {
					this.chart && this.chart.resize();
				});
			},

			updateHistory(temp, humi) {
				const now = new Date();
				const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
				
				this.historyData.push({ time: timeStr, temp, humi });
				if (this.historyData.length > 20) {
					this.historyData.shift();
				}
				
				if (this.chart) {
					this.chart.setOption({
						xAxis: { data: this.historyData.map(d => d.time) },
						series: [
							{ data: this.historyData.map(d => d.temp) },
							{ data: this.historyData.map(d => d.humi) }
						]
					});
				}
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
