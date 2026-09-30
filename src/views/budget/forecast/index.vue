<template>
  <div class="app-container">
    <!-- 顶部筛选 -->
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true" size="small">
        <el-form-item label="预算方案">
          <el-select v-model="query.planId" placeholder="选择预算方案" filterable style="width: 240px">
            <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="填报单位">
          <el-select v-model="query.orgId" placeholder="选择填报单位" filterable style="width: 200px">
            <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.deptName" :value="d.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="刷新时点">
          <el-select v-model="query.refreshType" style="width: 110px">
            <el-option v-for="r in refreshOptions" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="预测算法">
          <el-select v-model="query.forecastMethod" style="width: 140px">
            <el-option label="趋势法(按进度推算)" value="TREND" />
            <el-option label="简单法(预算均值)" value="SIMPLE" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleGenerate">生成滚动预测</el-button>
          <el-button @click="loadVersions">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 版本列表 -->
    <el-card shadow="never" v-loading="loading" class="mb-4">
      <template #header>
        <div class="card-head">
          <span>预测版本（按刷新时点截取实际，剩余季度推算）</span>
          <span class="tip">非全局账号仅可查看本单位数据</span>
        </div>
      </template>
      <el-table :data="versions" border stripe size="small" highlight-current-row @current-change="row => currentVersion = row" style="width: 100%">
        <el-table-column label="预测版本号" prop="forecastNo" min-width="170" show-overflow-tooltip />
        <el-table-column label="刷新时点" prop="refreshType" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="light">
              {{ row.refreshType === 'YTD' ? '至今累计(YTD)' : row.refreshType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="算法" prop="forecastMethod" width="120" align="center">
          <template #default="{ row }">{{ row.forecastMethod === 'SIMPLE' ? '简单法' : '趋势法' }}</template>
        </el-table-column>
        <el-table-column label="刷新时间" prop="refreshDate" min-width="160" align="center">
          <template #default="{ row }">{{ fmtTime(row.refreshDate) }}</template>
        </el-table-column>
        <el-table-column label="生成人" prop="operatorName" width="110" align="center" />
        <el-table-column label="状态" prop="status" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small" effect="dark">
              {{ row.status === 'ACTIVE' ? '当前版本' : '已覆盖' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="viewDetail(row)">查看</el-button>
            <el-button link type="danger" size="small" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 详情：汇总 + 趋势图 + 明细 -->
    <el-card shadow="never" v-if="detail" class="mb-4">
      <template #header>
        <div class="card-head">
          <span>版本详情：{{ detail.forecastNo }}（{{ detail.orgName }}）</span>
          <el-button link type="primary" size="small" @click="viewDetail(currentVersion)">重新加载</el-button>
        </div>
      </template>

      <el-row :gutter="16" class="mb-4">
        <el-col :span="4"><div class="ov-card"><div class="ov-title">全年预算</div><div class="ov-val">{{ fmtA(detail.totalBudget) }}</div></div></el-col>
        <el-col :span="4"><div class="ov-card"><div class="ov-title">已完成实际</div><div class="ov-val">{{ fmtA(detail.totalActual) }}</div></div></el-col>
        <el-col :span="4"><div class="ov-card"><div class="ov-title">全年预测</div><div class="ov-val">{{ fmtA(detail.totalForecast) }}</div></div></el-col>
        <el-col :span="4"><div class="ov-card"><div class="ov-title">预测-预算差异</div><div class="ov-val" :style="{ color: Number(detail.totalDeviation) >= 0 ? '#16a34a' : '#dc2626' }">{{ fmtA(detail.totalDeviation) }}</div></div></el-col>
        <el-col :span="4"><div class="ov-card"><div class="ov-title">预测完成率</div><div class="ov-val">{{ detail.forecastRate }}%</div></div></el-col>
      </el-row>

      <div ref="trendEl" class="chart-body mb-4"></div>

      <el-table :data="detail.items || []" border stripe size="small" :max-height="420" style="width: 100%">
        <el-table-column label="科目编码" prop="itemCode" width="120" align="center" />
        <el-table-column label="科目名称" prop="itemName" min-width="180" show-overflow-tooltip />
        <el-table-column label="预算金额" align="right" width="120">
          <template #default="{ row }">{{ fmtA(row.budgetAmount) }}</template>
        </el-table-column>
        <el-table-column label="实际Q1" align="right" width="100"><template #default="{ row }">{{ fmtA(row.actualQ1) }}</template></el-table-column>
        <el-table-column label="实际Q2" align="right" width="100"><template #default="{ row }">{{ fmtA(row.actualQ2) }}</template></el-table-column>
        <el-table-column label="实际Q3" align="right" width="100"><template #default="{ row }">{{ fmtA(row.actualQ3) }}</template></el-table-column>
        <el-table-column label="实际Q4" align="right" width="100"><template #default="{ row }">{{ fmtA(row.actualQ4) }}</template></el-table-column>
        <el-table-column label="预测Q1" align="right" width="100"><template #default="{ row }">{{ fmtA(row.forecastQ1) }}</template></el-table-column>
        <el-table-column label="预测Q2" align="right" width="100"><template #default="{ row }">{{ fmtA(row.forecastQ2) }}</template></el-table-column>
        <el-table-column label="预测Q3" align="right" width="100"><template #default="{ row }">{{ fmtA(row.forecastQ3) }}</template></el-table-column>
        <el-table-column label="预测Q4" align="right" width="100"><template #default="{ row }">{{ fmtA(row.forecastQ4) }}</template></el-table-column>
        <el-table-column label="预测合计" align="right" width="120">
          <template #default="{ row }"><b>{{ fmtA(row.forecastTotal) }}</b></template>
        </el-table-column>
        <el-table-column label="差异额" align="right" width="120">
          <template #default="{ row }">
            <span :style="{ color: Number(row.deviation) >= 0 ? '#16a34a' : '#dc2626' }">{{ fmtA(row.deviation) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="BudgetForecast">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';
import * as echarts from 'echarts';
import request from '@/utils/request';
import { listPlan } from '@/api/budget/plan';

interface VersionRow {
  id: number;
  forecastNo: string;
  refreshType: string;
  forecastMethod: string;
  refreshDate: string;
  operatorName: string;
  status: string;
}

const route = useRoute();
const loading = ref(false);
const planOptions = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
const versions = ref<VersionRow[]>([]);
const currentVersion = ref<VersionRow | null>(null);
const detail = ref<any>(null);
const trendEl = ref<HTMLDivElement | null>(null);
let trendChart: echarts.ECharts | null = null;

const refreshOptions = [
  { label: 'Q1', value: 'Q1' },
  { label: 'Q2', value: 'Q2' },
  { label: 'Q3', value: 'Q3' },
  { label: 'Q4', value: 'Q4' },
  { label: '至今累计', value: 'YTD' }
];

const query = reactive<any>({
  planId: route.query.planId ? Number(route.query.planId) : undefined,
  orgId: route.query.orgId ? Number(route.query.orgId) : undefined,
  refreshType: (route.query.refreshType as string) || 'Q3',
  forecastMethod: 'TREND'
});

const fmtA = (v: any) => (v === null || v === undefined || v === '' ? '0.00' : Number(v).toFixed(2));
const fmtTime = (v: any) => (v ? String(v).replace('T', ' ').slice(0, 19) : '');

const loadPlans = async () => {
  const res: any = await listPlan({ pageSize: 100 });
  const list = res.data || res;
  planOptions.value = Array.isArray(list) ? list : list.rows || [];
  if (!query.planId && planOptions.value.length) query.planId = planOptions.value[0].id;
};

const loadUnits = async () => {
  const res: any = await request({ url: '/budget/dashboard/unitOptions', method: 'get' });
  const data = res.data || res;
  deptOptions.value = Array.isArray(data) ? data : Array.isArray(data.rows) ? data.rows : [];
};

const loadVersions = async () => {
  if (!query.planId) return;
  loading.value = true;
  try {
    const res: any = await request({
      url: '/budget/forecast/list',
      method: 'get',
      params: { planId: query.planId, orgId: query.orgId || undefined }
    });
    const data = res.data || res;
    versions.value = Array.isArray(data) ? data : [];
    if (versions.value.length) {
      currentVersion.value = versions.value[0];
      viewDetail(versions.value[0]);
    } else {
      currentVersion.value = null;
      detail.value = null;
    }
  } finally {
    loading.value = false;
  }
};

const handleGenerate = async () => {
  if (!query.planId) {
    ElMessage.warning('请先选择预算方案');
    return;
  }
  if (!query.orgId) {
    ElMessage.warning('请选择填报单位');
    return;
  }
  loading.value = true;
  try {
    const res: any = await request({
      url: '/budget/forecast/generate',
      method: 'post',
      data: {
        planId: query.planId,
        orgId: query.orgId,
        refreshType: query.refreshType,
        forecastMethod: query.forecastMethod
      }
    });
    ElMessage.success(`滚动预测已生成（版本ID：${res.data || ''}）`);
    await loadVersions();
  } catch (e: any) {
    ElMessage.error(e?.msg || '生成失败');
  } finally {
    loading.value = false;
  }
};

const viewDetail = async (row: VersionRow) => {
  currentVersion.value = row;
  loading.value = true;
  try {
    const res: any = await request({ url: `/budget/forecast/detail/${row.id}`, method: 'get' });
    detail.value = res.data || res;
    await nextTick();
    renderTrend();
  } finally {
    loading.value = false;
  }
};

const handleDelete = async (row: VersionRow) => {
  await ElMessageBox.confirm(`确认删除预测版本「${row.forecastNo}」吗？`, '提示', { type: 'warning' });
  await request({ url: `/budget/forecast/${row.id}`, method: 'delete' });
  ElMessage.success('已删除');
  if (currentVersion.value?.id === row.id) {
    currentVersion.value = null;
    detail.value = null;
  }
  loadVersions();
};

const renderTrend = () => {
  if (!detail.value || !trendEl.value) return;
  if (!trendChart) trendChart = echarts.init(trendEl.value);
  const quarters = detail.value.quarters || ['Q1', 'Q2', 'Q3', 'Q4'];
  trendChart.setOption({
    title: { text: '预算/实际/预测 累计趋势', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['预算累计', '实际累计', '预测累计'], bottom: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', boundaryGap: false, data: quarters },
    yAxis: { type: 'value', name: '万元' },
    series: [
      { name: '预算累计', type: 'line', smooth: true, data: detail.value.budgetLine || [], lineStyle: { color: '#909399' }, itemStyle: { color: '#909399' } },
      { name: '实际累计', type: 'line', smooth: true, data: detail.value.actualLine || [], lineStyle: { color: '#409eff' }, itemStyle: { color: '#409eff' } },
      { name: '预测累计', type: 'line', smooth: true, data: detail.value.forecastLine || [], lineStyle: { color: '#e6a23c', type: 'dashed' }, itemStyle: { color: '#e6a23c' } }
    ]
  });
};

onMounted(async () => {
  await loadPlans();
  await loadUnits();
  await loadVersions();
});

onBeforeUnmount(() => {
  trendChart?.dispose();
});
</script>

<style scoped>
.mb-4 {
  margin-bottom: 14px;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-head .tip {
  font-size: 12px;
  color: #909399;
}
.chart-body {
  width: 100%;
  height: 300px;
}
.ov-card {
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-left: 4px solid #409eff;
  border-radius: 6px;
  padding: 14px 16px;
}
.ov-title {
  font-size: 12px;
  color: #909399;
}
.ov-val {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
</style>