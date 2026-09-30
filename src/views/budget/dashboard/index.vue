<template>
  <div class="app-container">
    <!-- 顶部筛选 -->
    <el-card shadow="never" class="mb-4 filter-card">
      <el-form :inline="true" size="small" class="filter-form">
        <el-form-item label="预算方案">
          <el-select v-model="planId" placeholder="全部方案" clearable style="width: 240px" @change="loadData">
            <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="填报单位" v-if="!singleUnit">
          <el-select v-model="orgId" placeholder="全部单位" clearable style="width: 200px" @change="loadData">
            <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.deptName" :value="d.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-tip">
          <span style="color: #909399; font-size: 13px">切换方案/单位后页面数据联动，不选则汇总全部</span>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card-box">
          <div class="stat-icon" style="background: #ecf5ff; color: #409eff">
            <el-icon size="28"><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">预算方案</div>
            <div class="stat-value">{{ stats.planCount || 0 }}</div>
            <div class="stat-sub">个在用方案</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card-box">
          <div class="stat-icon" style="background: #f0f9eb; color: #67c23a">
            <el-icon size="28"><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">预算总额(万元)</div>
            <div class="stat-value">{{ formatAmount(stats.totalBudget) }}</div>
            <div class="stat-sub">{{ stats.orgCount || 0 }} 个单位</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card-box">
          <div class="stat-icon" style="background: #fdf6ec; color: #e6a23c">
            <el-icon size="28"><TrendCharts /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">总体执行率</div>
            <div class="stat-value" :style="{ color: getRateColor(stats.executionRate) }">
              {{ stats.executionRate || 0 }}%
            </div>
            <div class="stat-sub">执行: {{ formatAmount(stats.totalExecution) }}万元</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" v-hasPermi="['budget:approval:query']">
        <el-card shadow="never" class="stat-card-box">
          <div class="stat-icon" style="background: #fef0f0; color: #f56c6c">
            <el-icon size="28"><Bell /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">待办事项</div>
            <div class="stat-value">{{ todoList.length }}</div>
            <div class="stat-sub">项待处理</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 执行趋势 -->
    <el-card shadow="never" class="mb-4">
      <div class="chart-tabs-head">
        <span
          v-for="t in trendTabs"
          :key="t.name"
          class="chart-tab"
          :class="{ active: trendTab === t.name }"
          @click="switchTrendTab(t.name)"
        >{{ t.label }}</span>
      </div>
      <div v-if="trendTab === 'trend'" ref="trendEl" class="chart-body"></div>
      <div v-else ref="diffEl" class="chart-body"></div>
    </el-card>

    <!-- 填报进度 + 待办 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <span class="font-bold">各单位填报进度</span>
          </template>
          <el-table :data="fillProgress" border style="width: 100%" :max-height="360">
            <el-table-column label="预算方案" prop="planName" min-width="140" show-overflow-tooltip />
            <el-table-column label="单位名称" prop="deptName" min-width="180" />
            <el-table-column label="填报进度" width="200" align="center">
              <template #default="{ row }">
                <el-progress :percentage="row.progress" :color="getProgressColor(row.progress)" />
              </template>
            </el-table-column>
            <el-table-column label="已提交/审批" width="120" align="center">
              <template #default="{ row }">
                <span style="color: #67c23a">{{ row.submitted + row.approved }}</span> / {{ row.total }}
              </template>
            </el-table-column>
            <el-table-column label="草稿" prop="draft" width="80" align="center" />
            <el-table-column label="预算金额(万元)" width="140" align="right">
              <template #default="{ row }">
                {{ formatAmount(row.budget) }}
              </template>
            </el-table-column>
            <el-table-column label="执行金额(万元)" width="140" align="right">
              <template #default="{ row }">
                {{ formatAmount(row.execution) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="mb-4 warn-card" @click="goWarning" v-if="stats.warnTotal !== undefined">
          <div class="warn-bar">
            <span class="warn-title">
              <el-icon><Warning /></el-icon> 预算执行预警
            </span>
            <el-icon class="warn-arrow"><ArrowRight /></el-icon>
          </div>
          <template v-if="(stats.warnTotal || 0) > 0">
            <div class="warn-row">超预算(红) <b class="warn-red">{{ stats.warnRed || 0 }}</b></div>
            <div class="warn-row">临近阈值(黄) <b class="warn-yellow">{{ stats.warnYellow || 0 }}</b></div>
            <div class="warn-row warn-total">共计 {{ stats.warnTotal || 0 }} 条预警</div>
          </template>
          <div v-else class="warn-empty">当前筛选下暂无预算执行预警</div>
        </el-card>
        <el-card shadow="never" v-hasPermi="['budget:approval:query']">
          <template #header>
            <span class="font-bold">待办事项</span>
          </template>
          <div v-if="todoList.length === 0" class="text-center py-8 text-gray-400">
            <el-icon size="32" color="#c0c4cc"><CircleCheck /></el-icon>
            <div class="mt-2">暂无待办</div>
          </div>
          <div v-else>
            <div
              v-for="(item, index) in todoList"
              :key="index"
              class="todo-item"
              @click="handleTodoClick(item)"
            >
              <el-icon :color="todoIconColor(item.type)" size="20">
                <component :is="todoIcon(item.type)" />
              </el-icon>
              <div style="flex: 1">
                <div class="todo-title">{{ item.title }}</div>
                <div class="todo-count">{{ item.count }} {{ item.type === 'over_budget' ? '个科目超预算' : '项待处理' }}</div>
              </div>
              <el-icon color="#c0c4cc"><ArrowRight /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最新动态 -->
    <el-card shadow="never">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="font-bold">最新动态</span>
          <el-link
            type="primary"
            :underline="false"
            @click="showAllActivities = !showAllActivities"
            v-if="activities.length > visibleCount"
          >{{ showAllActivities ? '收起' : '更多' }}<el-icon class="el-icon--right"><component :is="showAllActivities ? 'ArrowUp' : 'ArrowDown'" /></el-icon></el-link>
        </div>
      </template>
      <el-timeline v-if="activities.length > 0">
        <el-timeline-item
          v-for="(item, index) in displayedActivities"
          :key="index"
          :timestamp="formatTime(item.time)"
          :type="item.type === 'fill' ? 'primary' : 'warning'"
          placement="top"
        >
          <div class="activity-item" @click="goToDetail(item)">
            <div class="activity-title">{{ item.title }}
              <span class="activity-meta" v-if="item.operatorName">（{{ item.operatorName }}）</span>
            </div>
            <div class="activity-sub">
              <template v-if="item.planName">{{ item.planName }}</template>
              <template v-if="item.planName && item.templateName"> / </template>
              <template v-if="item.templateName">{{ item.templateName }}（{{ item.templateCode }}表）</template>
              <template v-if="item.templateName && item.remark"> · </template>
              <span v-if="item.remark" style="color: #f56c6c">{{ item.remark }}</span>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <div v-else class="text-center py-8 text-gray-400">
        暂无动态
      </div>
    </el-card>

    <!-- 动态详情弹窗 -->
    <el-dialog v-model="detailDialog.visible" :title="detailDialog.title" width="700px" top="8vh">
      <div v-loading="detailDialog.loading">
        <el-descriptions :column="2" border size="small" class="mb-4">
          <el-descriptions-item label="预算方案">{{ detailDialog.data?.planName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="填报单位">{{ detailDialog.data?.deptName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预算表">{{ detailDialog.data?.templateName || '-' }}（{{ detailDialog.data?.templateCode || '-' }}表）</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ detailDialog.data?.operatorName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="操作时间">{{ detailDialog.data?.time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提交轮次" v-if="detailDialog.data?.submitRound">第 {{ detailDialog.data.submitRound }} 轮</el-descriptions-item>
          <el-descriptions-item label="备注" v-if="detailDialog.data?.remark">
            <span style="color: #f56c6c">{{ detailDialog.data?.remark }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-table v-if="detailDialog.rows.length > 0" :data="detailDialog.rows" border size="small" max-height="400">
          <el-table-column label="科目编码" prop="itemCode" width="100" />
          <el-table-column label="科目名称" prop="itemName" min-width="180" />
          <el-table-column label="上年实际(万元)" prop="lastActual" width="130" align="right">
            <template #default="{ row }">
              <span :class="{ 'summary-cell': row.isSummary === 1 }">{{ formatNum(row.lastActual) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="本年预算(万元)" prop="budgetAmount" width="130" align="right">
            <template #default="{ row }">
              <span :class="{ 'summary-cell': row.isSummary === 1 }">{{ formatNum(row.budgetAmount) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无明细数据" :image-size="60" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="BudgetDashboard">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import request from '@/utils/request';
import { getStats, getFillProgress, getTodoList, getRecentActivities, getQuarterTrend, getUnitOptions } from '@/api/budget/dashboard';

const router = useRouter();

const goWarning = () => {
  router.push('/budget/warning');
};

// 点击动态 -> 弹窗展示该次提交的预算数据
const detailDialog = ref<{ visible: boolean; title: string; loading: boolean; data: any; rows: any[] }>({
  visible: false,
  title: '',
  loading: false,
  data: null,
  rows: []
});

const formatNum = (val: any) => {
  if (val === null || val === undefined || val === '') return '-';
  return Number(val).toFixed(2);
};

const goToDetail = async (item: any) => {
  detailDialog.value.visible = true;
  detailDialog.value.loading = true;
  detailDialog.value.data = item;
  detailDialog.value.rows = [];
  detailDialog.value.title = item.title || '动态详情';

  try {
    if (item.planId && item.deptId && item.submitRound) {
      // 查该次提交的版本快照明细（展示提交时的真实金额）
      const res = await request({
        url: '/budget/dataVersion/versionDetail',
        method: 'get',
        params: {
          planId: item.planId,
          deptId: item.deptId,
          templateCode: item.templateCode || undefined,
          versionNo: item.submitRound
        }
      });
      if (res && res.data) {
        detailDialog.value.rows = Array.isArray(res.data) ? res.data : [];
      }
    }
  } catch (e) {
    console.warn('获取明细数据失败', e);
  } finally {
    detailDialog.value.loading = false;
  }
};
const planId = ref<number | null>(null);
const orgId = ref<number | null>(null);
const planOptions = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
// 仅能选一个单位（本部门受限账号）时隐藏"填报单位"筛选
const singleUnit = ref(false);
const stats = ref<any>({});
const fillProgress = ref<any[]>([]);
const todoList = ref<any[]>([]);
const activities = ref<any[]>([]);

// 最新动态折叠：默认显示前 visibleCount 条，超过则显示"更多/收起"
const visibleCount = ref(5);
const showAllActivities = ref(false);
const displayedActivities = computed(() => {
  if (showAllActivities.value) return activities.value;
  return activities.value.slice(0, visibleCount.value);
});

// ===== 趋势图 =====
const trendEl = ref<HTMLElement | null>(null);
let trendChart: echarts.ECharts | null = null;
const diffEl = ref<HTMLElement | null>(null);
let diffChart: echarts.ECharts | null = null;
const trendTab = ref('trend');
const trendTabs = [
  { name: 'trend', label: '年度' },
  { name: 'diff', label: '累计' }
];
let lastTrend: any = null;
let lastCum: any = null;
let resizeHandler: (() => void) | null = null;

// 左轴(金额)按数据自适应：同时容纳各季执行额与全年预算线，向上取整保留头部空间
const calcAmountMax = (budget: number, values: number[]) => {
  const maxVal = Math.max(budget, ...(values || []).map((v) => Number(v) || 0), 1);
  let nice = Math.ceil(maxVal * 1.2);
  if (nice < 10) nice = Math.ceil(nice);
  else if (nice < 100) nice = Math.ceil(nice / 10) * 10;
  else if (nice < 1000) nice = Math.ceil(nice / 100) * 100;
  else nice = Math.ceil(nice / 1000) * 1000;
  return nice;
};

const renderTrend = (data: any) => {
  if (!trendEl.value) return;
  trendChart?.dispose();
  trendChart = echarts.init(trendEl.value);
  lastTrend = data;

  const quarters = data?.quarters || [];
  const labels = quarters.map((q: any) => q.label);
  const execArr = quarters.map((q: any) => Number(q.exec || 0));
  const budget = Number(data?.budgetTotal || 0);
  // 执行率 = 该季实际执行 ÷ 全年预算
  const rateArr = quarters.map((q: any) =>
    budget > 0 ? Number(((Number(q.exec || 0) / budget) * 100).toFixed(2)) : 0
  );

  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { show: true, data: ['执行金额', '执行率', '全年预算'] },
    grid: { left: 70, right: 70, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: labels },
    yAxis: [
      { type: 'value', name: '金额(万元)', max: calcAmountMax(budget, execArr) },
      { type: 'value', name: '执行率(%)', max: 100, axisLabel: { formatter: '{value}%' } }
    ],
    series: [
      {
        name: '执行金额',
        type: 'bar',
        data: execArr,
        barMaxWidth: 46,
        itemStyle: { color: '#409eff' },
        label: { show: true, position: 'top', formatter: (p: any) => p.value.toFixed(2) }
      },
      {
        name: '执行率',
        type: 'line',
        yAxisIndex: 1,
        data: rateArr,
        itemStyle: { color: '#67c23a' },
        label: { show: true, formatter: '{c}%' }
      },
      {
        name: '全年预算',
        type: 'line',
        data: [],
        markLine: {
          symbol: 'none',
          label: { formatter: '全年预算 ' + budget },
          lineStyle: { color: '#e6a23c', type: 'dashed' },
          data: [{ yAxis: budget }]
        }
      }
    ]
  } as any);
};

const renderCum = (data: any) => {
  if (!diffEl.value) return;
  diffChart?.dispose();
  diffChart = echarts.init(diffEl.value);
  lastCum = data;

  const quarters = data?.quarters || [];
  const budget = Number(data?.budgetTotal || 0);
  const qCnt = quarters.length || 4;
  const labels = quarters.map((q: any) => q.label);

  let cumExec = 0;
  const cumExecArr: number[] = [];
  const cumRateArr: number[] = [];
  quarters.forEach((q: any) => {
    const qe = Number(q.exec || 0);
    cumExec = Math.round((cumExec + qe) * 100) / 100;
    cumExecArr.push(cumExec);
    // 累计执行率 = 累计执行 ÷ 全年预算
    cumRateArr.push(budget > 0 ? Number(((cumExec / budget) * 100).toFixed(2)) : 0);
  });

  diffChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { show: true, data: ['累计执行', '累计执行率', '全年预算'] },
    grid: { left: 70, right: 70, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: labels },
    yAxis: [
      { type: 'value', name: '金额(万元)', max: calcAmountMax(budget, cumExecArr) },
      { type: 'value', name: '执行率(%)', max: 100, axisLabel: { formatter: '{value}%' } }
    ],
    series: [
      {
        name: '累计执行',
        type: 'bar',
        data: cumExecArr,
        barMaxWidth: 46,
        itemStyle: { color: '#409eff' },
        label: { show: true, position: 'top', formatter: (p: any) => p.value.toFixed(2) }
      },
      {
        name: '累计执行率',
        type: 'line',
        yAxisIndex: 1,
        data: cumRateArr,
        itemStyle: { color: '#67c23a' },
        label: { show: true, formatter: '{c}%' }
      },
      {
        name: '全年预算',
        type: 'line',
        data: [],
        markLine: {
          symbol: 'none',
          label: { formatter: '全年预算 ' + budget },
          lineStyle: { color: '#e6a23c', type: 'dashed' },
          data: [{ yAxis: budget }]
        }
      }
    ]
  } as any);
};

const switchTrendTab = (name: string) => {
  if (trendTab.value === name) return;
  trendTab.value = name;
  nextTick(() => {
    if (name === 'trend') {
      renderTrend(lastTrend);
    } else {
      renderCum(lastCum);
    }
  });
};

const formatAmount = (val: any) => {
  if (val == null) return '0.00';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTime = (time: any) => {
  if (!time) return '';
  const date = new Date(time);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
};

const getRateColor = (rate: number) => {
  if (rate >= 90) return '#67c23a';
  if (rate >= 50) return '#409eff';
  if (rate > 0) return '#e6a23c';
  return '#909399';
};

const getProgressColor = (rate: number) => {
  if (rate >= 90) return '#67c23a';
  if (rate >= 50) return '#409eff';
  if (rate > 0) return '#e6a23c';
  return '#909399';
};

const handleTodoClick = (item: any) => {
  if (item.type === 'fill_approval') {
    router.push('/budget/approval');
  } else if (item.type === 'adjustment_approval') {
    router.push('/budget/adjustment');
  } else if (item.type === 'over_budget') {
    router.push('/budget/warning');
  }
};

// 待办图标与颜色映射：fill_approval蓝、adjustment黄、over_budget红
const todoIcon = (type: string) => {
  if (type === 'fill_approval') return 'Document';
  if (type === 'over_budget') return 'Warning';
  return 'Edit';
};
const todoIconColor = (type: string) => {
  if (type === 'fill_approval') return '#409eff';
  if (type === 'over_budget') return '#f56c6c';
  return '#e6a23c';
};

const loadPlanOptions = async () => {
  try {
    const res = await request({ url: '/budget/plan/list', method: 'get' });
    let list = res.rows || res.data || [];
    list = Array.isArray(list) ? list : [];
    // 只展示已发布 / 已归档的方案，屏蔽草稿与已关闭
    list = list.filter((p: any) => p.status === 'PUBLISHED' || p.status === 'ARCHIVED');
    planOptions.value = list;
  } catch (error) {
    console.error(error);
  }
};

const loadUnitOptions = async () => {
  try {
    const res = await getUnitOptions();
    const list = res.rows || res.data || [];
    deptOptions.value = Array.isArray(list) ? list : [];
    // 受限账号只有本单位一个选项时，隐藏"填报单位"筛选并固定为本单位
    singleUnit.value = deptOptions.value.length <= 1;
    if (deptOptions.value.length === 1) {
      if (orgId.value !== deptOptions.value[0].deptId) {
        orgId.value = deptOptions.value[0].deptId;
        loadData();
      }
    }
  } catch (error) {
    console.error(error);
  }
};

const loadData = async () => {
  try {
    const pid = planId.value || undefined;
    const oid = orgId.value || undefined;
    const [statsRes, progressRes, todoRes, activitiesRes, trendRes] = await Promise.all([
      getStats(pid, oid),
      getFillProgress(pid, oid),
      getTodoList(),
      getRecentActivities(pid, oid),
      getQuarterTrend(pid, oid)
    ]);
    stats.value = statsRes.data || {};
    fillProgress.value = progressRes.data || [];
    todoList.value = todoRes.data || [];
    const actRaw = activitiesRes.data;
    activities.value = Array.isArray(actRaw) ? actRaw : (actRaw?.list || []);
    // 「年度」Tab 默认可见，直接渲染；「累计」Tab 等切换时再渲染，避免隐藏在容器 init 产生 0 宽变形
    lastTrend = trendRes.data || {};
    lastCum = trendRes.data || {};
    if (trendTab.value === 'trend') {
      renderTrend(lastTrend);
    } else {
      renderCum(lastCum);
    }
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  loadPlanOptions();
  loadUnitOptions();
  loadData();
  resizeHandler = () => {
    trendChart?.resize();
    diffChart?.resize();
  };
  window.addEventListener('resize', resizeHandler);
});

onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  trendChart?.dispose();
  diffChart?.dispose();
  trendChart = null;
  diffChart = null;
});
</script>

<style scoped>
.filter-card :deep(.el-card__body) {
  padding: 10px 16px;
}

.filter-form :deep(.el-form-item) {
  margin-right: 14px;
  margin-bottom: 0;
}

.filter-form :deep(.el-form-item__label) {
  line-height: 24px;
}

.filter-tip {
  align-self: center;
}

.chart-tabs-head {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 12px;
}

.chart-tab {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  border-bottom: 2px solid transparent;
  user-select: none;
}

.chart-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 600;
}

.chart-body {
  width: 100%;
  height: 320px;
}

.stat-card-box {
  display: flex;
  align-items: center;
}

.warn-card {
  cursor: pointer;
  transition: all 0.2s;
}

.warn-card:hover {
  border-color: #e6a23c;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.warn-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #303133;
}

.warn-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #e6a23c;
}

.warn-row {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}

.warn-total {
  font-weight: 600;
  color: #606266;
}

.warn-empty {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}

.warn-red {
  color: #f56c6c;
  font-weight: 600;
}

.warn-yellow {
  color: #e6a23c;
  font-weight: 600;
}

.warn-arrow {
  color: #c0c4cc;
}

.stat-card-box :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  width: 100%;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.stat-sub {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 2px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.todo-item:hover {
  background: #f5f7fa;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-title {
  font-size: 14px;
  color: #303133;
}

.todo-count {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.activity-item {
  cursor: pointer;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.activity-item:hover {
  background: #f0f7ff;
}

.activity-item:hover .activity-title {
  color: #409eff;
}

.activity-title {
  font-size: 14px;
  color: #303133;
  transition: color 0.2s;
}

.activity-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.activity-meta {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.summary-cell {
  font-weight: 700;
  color: #303133;
}
</style>
