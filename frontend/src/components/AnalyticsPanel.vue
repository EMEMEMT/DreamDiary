<script setup>
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { PublicApi, DreamApi } from '../services/api'

const props = defineProps({
  initialScope: { type: String, default: 'public' }, // 'public' | 'me'
  initialRange: { type: String, default: '7d' } // '7d' | '30d' | '1y'
})

const scope = ref(props.initialScope)
const range = ref(props.initialRange)
const loading = ref(false)
const stats = ref(null)
const error = ref('')

let lineChart, pieChart
const lineRef = ref(null)
const pieRef = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const api = scope.value === 'me' ? DreamApi.getMyStats : PublicApi.getStats
    // 显示加载动画
    if (lineChart) lineChart.showLoading('default', { text: '加载中' })
    if (pieChart) pieChart.showLoading('default', { text: '加载中' })
    const res = await api(range.value)
    stats.value = normalizeStats(res)
    await nextTick()
    renderCharts(true)
  } catch (e) {
    const msg = e?.message || ''
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
      error.value = '请先登录后查看“我的”统计'
    } else {
      error.value = '加载统计失败：' + (msg || '未知错误')
    }
    // 保持已有图表不被清空，但结束加载动画
    if (lineChart) lineChart.hideLoading()
    if (pieChart) pieChart.hideLoading()
  } finally {
    loading.value = false
  }
}

function renderCharts(fresh = false) {
  if (lineRef.value) {
    if (!lineChart) lineChart = echarts.init(lineRef.value)
    const dates = stats.value?.frequency?.map(i => i.date) || []
    const counts = stats.value?.frequency?.map(i => i.count) || []
    if (fresh) lineChart.clear()
    lineChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 30, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category', data: dates, boundaryGap: false, axisLabel: { color: '#9aa4b2' } },
      yAxis: { type: 'value', axisLabel: { color: '#9aa4b2' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } } },
      series: [{ type: 'line', data: counts, smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { width: 3, color: '#6EA8FE' }, areaStyle: { color: 'rgba(110,168,254,0.18)' } }]
    })
    lineChart.hideLoading()
  }
  if (pieRef.value) {
    if (!pieChart) pieChart = echarts.init(pieRef.value)
    const data = stats.value?.tags || []
    if (fresh) pieChart.clear()
    pieChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: '#9aa4b2' } },
      series: [{
        name: '标签分布', type: 'pie',
        center: ['50%', '44%'],
        radius: ['42%', '60%'],
        avoidLabelOverlap: true,
        minAngle: 5,
        minShowLabelAngle: 5,
        itemStyle: { borderRadius: 8, borderColor: '#0b1020', borderWidth: 2 },
        label: {
          color: '#cbd5e1',
          show: true,
          position: 'outer',
          distance: 40,
          formatter: '{b}: {d}%'
        },
        labelLine: {
          show: true,
          length: 20,
          length2: 12,
          minTurnAngle: 55,
          smooth: true
        },
        labelLayout: params => ({
          moveOverlap: 'shiftY',
          hideOverlap: true
        }),
        emphasis: { scale: false },
        data
      }]
    })
    pieChart.hideLoading()
  }
}

function onResize() {
  lineChart?.resize(); pieChart?.resize()
}

onMounted(() => {
  load()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  lineChart?.dispose(); pieChart?.dispose()
})

watch([scope, range], load)

function normalizeStats(input) {
  const out = input || {}
  if (!Array.isArray(out.frequency)) out.frequency = []
  if (!Array.isArray(out.tags)) out.tags = []
  return out
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div class="tabs">
        <button class="tab" :class="{active: scope==='public'}" @click="scope='public'">全站</button>
        <button class="tab" :class="{active: scope==='me'}" @click="scope='me'">我的</button>
      </div>
      <div class="ranges">
        <button class="chip" :class="{active: range==='7d'}" @click="range='7d'">近一周</button>
        <button class="chip" :class="{active: range==='30d'}" @click="range='30d'">近一月</button>
        <button class="chip" :class="{active: range==='1y'}" @click="range='1y'">近一年</button>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else class="charts">
      <div class="chart-card">
        <div class="chart-title">做梦频率</div>
        <div ref="lineRef" class="chart"></div>
        <div v-if="loading" class="loading">加载中…</div>
      </div>
      <div class="chart-card">
        <div class="chart-title">标签占比（Top10，其余归类“其他”）</div>
        <div ref="pieRef" class="chart"></div>
        <div v-if="loading" class="loading">加载中…</div>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.panel { 
  margin: 16px 0; padding: 16px; background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
}
.panel-header {
  display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom: 12px;
}
.tabs { display:flex; gap:8px; }
.tab { appearance:none; border:1px solid var(--border); background: var(--elev); color: var(--muted); padding:6px 12px; border-radius:10px; cursor:pointer }
.tab.active { background: var(--primary); color: #0b1020; border-color: var(--primary) }
.ranges { display:flex; gap:8px }
.chip { appearance:none; border:1px solid var(--border); background:transparent; color: var(--muted); padding:6px 10px; border-radius:20px; cursor:pointer }
.chip.active { background: rgba(110,168,254,0.15); color:#cfe1ff; border-color: rgba(110,168,254,0.5) }
.charts { display:grid; grid-template-columns: 1fr; gap:12px }
@media (min-width: 960px) { .charts { grid-template-columns: 1fr 1fr } }
.chart-card { position:relative; background: var(--elev); border: 1px solid var(--border); border-radius: 12px; padding: 12px; overflow: hidden }
.chart-title { font-weight:600; color:#dbe1ea; margin-bottom: 8px }
.chart { width: 100%; height: 300px }
.charts { margin-bottom: 12px }
.loading { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#9aa4b2; backdrop-filter: blur(1px) }
.error { color: var(--danger) }
</style>


