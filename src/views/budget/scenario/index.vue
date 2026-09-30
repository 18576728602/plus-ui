<template>
  <div class="app-container">
    <!-- 顶部筛选 -->
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true" size="small">
        <el-form-item label="预算方案">
          <el-select v-model="query.planId" placeholder="选择预算方案" filterable style="width: 240px" @change="loadAll">
            <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="填报单位">
          <el-select v-model="query.orgId" placeholder="选择填报单位" filterable style="width: 200px" @change="loadAll">
            <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.deptName" :value="d.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="loadAll">模拟</el-button>
          <el-button type="success" plain :icon="'Plus'" @click="openDialog()">新增情景</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 情景参数管理 -->
    <el-card shadow="never" class="mb-4" v-loading="loading">
      <template #header>
        <div class="card-head"><span>情景参数配置</span><span class="tip">各费率均以收入占比（%）口径建模</span></div>
      </template>
      <el-table :data="scenarios" border stripe size="small" style="width: 100%">
        <el-table-column label="情景名称" prop="scenarioName" min-width="130">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault === 1" type="success" size="small" effect="dark" style="margin-right: 6px">默认</el-tag>{{ row.scenarioName }}
          </template>
        </el-table-column>
        <el-table-column label="类型" prop="scenarioType" width="110" align="center">
          <template #default="{ row }">{{ typeName(row.scenarioType) }}</template>
        </el-table-column>
        <el-table-column label="收入增长率" width="100" align="right"><template #default="{ row }">{{ row.revenueGrowth }}%</template></el-table-column>
        <el-table-column label="毛利率" width="90" align="right"><template #default="{ row }">{{ row.grossMargin }}%</template></el-table-column>
        <el-table-column label="成本费用率" width="110" align="right"><template #default="{ row }">{{ row.costExpenseRate }}%</template></el-table-column>
        <el-table-column label="融资成本" width="90" align="right"><template #default="{ row }">{{ row.financingRate }}%</template></el-table-column>
        <el-table-column label="投资回报率" width="100" align="right"><template #default="{ row }">{{ row.investReturnRate }}%</template></el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 模拟结果 -->
    <el-card shadow="never" v-loading="loading" v-if="result">
      <template #header>
        <div class="card-head">
          <span>多情景对比（{{ result.orgName || '—' }}）</span>
          <span class="tip">{{ incomeMode ? '基于「收入类科目」口径建模' : '未识别到收入类科目，仅展示预算总额（不输出净利润）' }}</span>
        </div>
      </template>

      <el-table :data="result.metrics || []" border stripe size="small" style="width: 100%" class="mb-4">
        <el-table-column label="指标" prop="metricName" width="140" fixed />
        <el-table-column v-for="s in result.series || []" :key="s.name" :label="s.name" align="right" min-width="120">
          <template #default="{ row }">
            <template v-if="row.values && row.values.length">
              <template v-for="(v, idx) in row.values" :key="idx">
                <span v-if="v.scenarioName === s.name">{{ fmtM(v.value) }}</span>
              </template>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <el-row :gutter="16">
        <el-col :span="12">
          <div ref="radarEl" class="chart-body"></div>
        </el-col>
        <el-col :span="12">
          <div ref="waterfallEl" class="chart-body"></div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 敏感性分析 -->
    <el-card shadow="never" v-loading="loading" v-if="sensRows.length" class="mt-4">
      <template #header>
        <div class="card-head"><span>敏感性分析（龙卷风图：各因素对净利润的影响）</span><span class="tip">±5% / ±5个百分点扰动，按影响绝对值排序</span></div>
      </template>
      <div ref="tornadoEl" class="chart-body" style="height: 360px"></div>
    </el-card>

    <!-- 新增/编辑情景弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑情景' : '新增情景'" width="560">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" size="small">
        <el-form-item label="情景名称" prop="scenarioName">
          <el-input v-model="form.scenarioName" placeholder="如：乐观情景" maxlength="50" />
        </el-form-item>
        <el-form-item label="情景类型" prop="scenarioType">
          <el-select v-model="form.scenarioType" style="width: 100%">
            <el-option label="基准情景" value="BASE" />
            <el-option label="乐观情景" value="OPTIMISTIC" />
            <el-option label="悲观情景" value="PESSIMISTIC" />
            <el-option label="自定义情景" value="CUSTOM" />
          </el-select>
        </el-form-item>
        <el-form-item label="收入增长率(%)"><el-input-number v-model="form.revenueGrowth" :precision="2" style="width: 200px" /></el-form-item>
        <el-form-item label="毛利率(%)"><el-input-number v-model="form.grossMargin" :precision="2" style="width: 200px" /></el-form-item>
        <el-form-item label="成本费用率(%)"><el-input-number v-model="form.costExpenseRate" :precision="2" style="width: 200px" /></el-form-item>
        <el-form-item label="融资成本(%)"><el-input-number v-model="form.financingRate" :precision="2" style="width: 200px" /></el-form-item>
        <el-form-item label="投资回报率(%)"><el-input-number v-model="form.investReturnRate" :precision="2" style="width: 200px" /></el-form-item>
        <el-form-item label="设为默认情景"><el-switch v-model="isDefault" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saveLoading" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="BudgetScenario">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import * as echarts from 'echarts';
import request from '@/utils/request';
import { listPlan } from '@/api/budget/plan';

const loading = ref(false);
const saveLoading = ref(false);
const planOptions = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
const scenarios = ref<any[]>([]);
const result = ref<any>(null);
const sensRows = ref<any[]>([]);

const radarEl = ref<HTMLDivElement | null>(null);
const waterfallEl = ref<HTMLDivElement | null>(null);
const tornadoEl = ref<HTMLDivElement | null>(null);
let radarChart: echarts.ECharts | null = null;
let waterfallChart: echarts.ECharts | null = null;
let tornadoChart: echarts.ECharts | null = null;

const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const isDefault = ref(false);
const form = reactive<any>({ id: undefined, planId: undefined, scenarioType: 'CUSTOM', scenarioName: '', revenueGrowth: 0, grossMargin: 0, costExpenseRate: 0, financingRate: 0, investReturnRate: 0, remark: '' });
const rules = {
  scenarioName: [{ required: true, message: '请输入情景名称', trigger: 'blur' }],
  scenarioType: [{ required: true, message: '请选择情景类型', trigger: 'change' }]
};

const query = reactive<any>({ planId: undefined, orgId: undefined });

const incomeMode = computed(() => (result.value?.metrics?.length || 0) > 1);

const typeName = (t: string) => ({ BASE: '基准', OPTIMISTIC: '乐观', PESSIMISTIC: '悲观', CUSTOM: '自定义' }[t] || t);
const fmtM = (v: any) => (v === null || v === undefined || v === '' ? '0.00' : Number(v).toFixed(2));

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

const loadScenarios = async () => {
  if (!query.planId) return;
  const res: any = await request({ url: '/budget/scenario/list', method: 'get', params: { planId: query.planId } });
  const data = res.data || res;
  scenarios.value = Array.isArray(data) ? data : [];
};

const loadSimulate = async () => {
  if (!query.planId || !query.orgId) return;
  loading.value = true;
  try {
    const res: any = await request({ url: '/budget/scenario/simulate', method: 'get', params: { planId: query.planId, orgId: query.orgId } });
    result.value = res.data || res;
    await nextTick();
    renderRadar();
    renderWaterfall();
  } finally {
    loading.value = false;
  }
};

const loadSensitivity = async () => {
  if (!query.planId || !query.orgId) return;
  const res: any = await request({ url: '/budget/scenario/sensitivity', method: 'get', params: { planId: query.planId, orgId: query.orgId } });
  const data = res.data || res;
  sensRows.value = Array.isArray(data) ? data : [];
  await nextTick();
  renderTornado();
};

const loadAll = async () => {
  await loadScenarios();
  await loadSimulate();
  await loadSensitivity();
};

const openDialog = (row?: any) => {
  isDefault.value = false;
  if (row) {
    Object.assign(form, {
      id: row.id, planId: row.planId, scenarioType: row.scenarioType, scenarioName: row.scenarioName,
      revenueGrowth: row.revenueGrowth ?? 0, grossMargin: row.grossMargin ?? 0,
      costExpenseRate: row.costExpenseRate ?? 0, financingRate: row.financingRate ?? 0,
      investReturnRate: row.investReturnRate ?? 0, remark: row.remark || ''
    });
    isDefault.value = row.isDefault === 1;
  } else {
    Object.assign(form, { id: undefined, planId: query.planId, scenarioType: 'CUSTOM', scenarioName: '', revenueGrowth: 0, grossMargin: 0, costExpenseRate: 0, financingRate: 0, investReturnRate: 0, remark: '' });
  }
  dialogVisible.value = true;
};

const handleSave = async () => {
  if (!formRef.value) return;
  await formRef.value.validate();
  if (!form.planId) {
    ElMessage.warning('请先选择预算方案');
    return;
  }
  saveLoading.value = true;
  try {
    await request({
      url: '/budget/scenario/save',
      method: 'post',
      data: {
        id: form.id,
        planId: form.planId,
        scenarioType: form.scenarioType,
        scenarioName: form.scenarioName,
        revenueGrowth: form.revenueGrowth,
        grossMargin: form.grossMargin,
        costExpenseRate: form.costExpenseRate,
        financingRate: form.financingRate,
        investReturnRate: form.investReturnRate,
        isDefault: isDefault.value ? 1 : 0,
        remark: form.remark
      }
    });
    ElMessage.success('保存成功');
    dialogVisible.value = false;
    loadAll();
  } finally {
    saveLoading.value = false;
  }
};

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确认删除情景「${row.scenarioName}」吗？`, '提示', { type: 'warning' });
  await request({ url: `/budget/scenario/${row.id}`, method: 'delete' });
  ElMessage.success('已删除');
  loadAll();
};

const renderRadar = () => {
  if (!result.value || !radarEl.value) return;
  if (!radarChart) radarChart = echarts.init(radarEl.value);
  const indicators = result.value.indicators || [];
  const series = result.value.series || [];
  radarChart.setOption({
    title: { text: '关键指标雷达图', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: {},
    legend: { data: series.map((s: any) => s.name), bottom: 0 },
    radar: { indicator: indicators.map((n: string) => ({ name: n })), radius: '62%' },
    series: [{
      type: 'radar',
      data: series.map((s: any) => ({ name: s.name, value: s.values || [] }))
    }]
  });
};

const renderWaterfall = () => {
  if (!result.value || !waterfallEl.value) return;
  if (!waterfallChart) waterfallChart = echarts.init(waterfallEl.value);
  const items = result.value.waterfall || [];
  waterfallChart.setOption({
    title: { text: '乐观情景净利润因素贡献', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 30, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: items.map((i: any) => i.name), axisLabel: { interval: 0, fontSize: 11 } },
    yAxis: { type: 'value', name: '万元' },
    series: [{
      type: 'bar',
      data: items.map((i: any) => ({
        value: Number(i.value),
        itemStyle: { color: Number(i.value) >= 0 ? '#67c23a' : '#f56c6c' }
      })),
      label: { show: true, position: 'top', formatter: (p: any) => p.value.toFixed(0) }
    }]
  });
};

const renderTornado = () => {
  if (!tornadoEl.value || !sensRows.value.length) return;
  if (!tornadoChart) tornadoChart = echarts.init(tornadoEl.value);
  const labels = sensRows.value.map((r: any) => `${r.factor}  ${r.changeRange}`);
  const values = sensRows.value.map((r: any) => Number(r.impact));
  tornadoChart.setOption({
    title: { text: '敏感性龙卷风图（净利润影响，万元）', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 90, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: labels },
    series: [{
      type: 'bar',
      data: values.map((v: number) => ({ value: v, itemStyle: { color: v >= 0 ? '#67c23a' : '#f56c6c' } })),
      label: { show: true, position: 'right', formatter: (p: any) => p.value.toFixed(1) }
    }]
  });
};

onMounted(async () => {
  await loadPlans();
  await loadUnits();
  await loadAll();
});

onBeforeUnmount(() => {
  radarChart?.dispose();
  waterfallChart?.dispose();
  tornadoChart?.dispose();
});
</script>

<style scoped>
.mb-4 {
  margin-bottom: 14px;
}
.mt-4 {
  margin-top: 14px;
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
  height: 320px;
}
</style>