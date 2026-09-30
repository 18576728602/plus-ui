<template>
  <div class="app-container">
    <!-- 顶部：方案选择 -->
    <el-card class="mb-4" shadow="never">
      <el-form :inline="true">
        <el-form-item label="预算方案">
          <el-select v-model="planId" placeholder="请选择预算方案" style="width: 280px" @change="handlePlanChange">
            <el-option
              v-for="item in planOptions"
              :key="item.id"
              :label="item.planName + (item.status === 'ARCHIVED' ? '（已归档）' : '')"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="季度">
          <el-select v-model="quarter" style="width: 110px" @change="loadMatrixData">
            <el-option v-for="opt in quarterOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="planStatus === 'ARCHIVED'">
          <el-tag type="warning">已归档方案，仅供查看</el-tag>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 空状态 -->
    <el-card v-if="!planId" shadow="never">
      <el-empty description="请先选择预算方案" />
    </el-card>

    <!-- 执行情况矩阵 -->
    <el-card v-else shadow="never" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span class="font-bold">预算执行情况（各单位执行率）</span>
          <span class="header-tip">绿色≥90% · 蓝色≥50% · 橙色&gt;0%</span>
        </div>
      </template>

      <!-- 模板Tab -->
      <el-tabs v-if="templates.length > 0" v-model="activeTab" @tab-change="handleTabChange" type="card">
        <el-tab-pane
          v-for="tpl in templates"
          :key="tpl.code"
          :label="tpl.code + ' ' + tpl.name"
          :name="tpl.code"
        />
      </el-tabs>

      <!-- 矩阵表格 -->
      <el-table
        v-if="matrixData && matrixData.rows && matrixData.rows.length > 0"
        :data="matrixData.rows"
        border
        size="small"
        style="width: 100%"
        row-key="itemCode"
        :tree-props="{ children: 'children' }"
        :default-expand-all="false"
        :row-class-name="rowClassName"
        :header-cell-style="{ whiteSpace: 'normal', lineHeight: '18px', padding: '6px 2px', wordBreak: 'break-all', textAlign: 'center' }"
      >
        <el-table-column
          v-for="col in matrixData.columns"
          :key="col.field"
          :prop="col.field"
          :label="col.label"
          :fixed="col.fixed"
          :min-width="col.minWidth || col.width || 150"
          :align="col.align || 'left'"
        >
          <template #default="{ row }">
            <!-- 科目名称列 -->
            <template v-if="col.field === 'itemName'">
              <span :style="{
                display: 'block',
                lineHeight: '1.4',
                fontWeight: row.isSummary === 1 ? 'bold' : 'normal',
                color: row.isSummary === 1 ? '#303133' : '#606266'
              }">
                {{ row.itemName }}
              </span>
            </template>
            <!-- 单位执行单元格 / 合计单元格 -->
            <template v-else>
              <div v-if="row[col.field]" class="exec-cell">
                <div class="exec-rate-row">
                  <el-progress
                    :percentage="Number(getRate(row[col.field].rate) || 0)"
                    :color="getProgressColor(getRate(row[col.field].rate))"
                    :stroke-width="8"
                    :show-text="false"
                    class="exec-bar"
                  />
                  <span
                    class="exec-rate-text"
                    :class="row.isSummary === 1 ? 'summary' : ''"
                    :style="{ color: getRateColor(getRate(row[col.field].rate)) }"
                  >
                    {{ formatRate(row[col.field].rate) }}
                  </span>
                </div>
                <div class="exec-amount">预算 {{ formatAmount(row[col.field].budget) }}</div>
                <div class="exec-amount">执行 {{ formatAmount(row[col.field].exec) }}</div>
                <div class="exec-amount" :style="{ color: getDevColor(row[col.field]) }">差异 {{ formatDev(row[col.field]) }}</div>
              </div>
              <span v-else style="color: #c0c4cc">-</span>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 单位底部合计行 -->
      <el-table
        v-if="matrixData && matrixData.columnTotals"
        :data="totalRows"
        border
        size="small"
        style="width: 100%; margin-bottom: 4px"
        :header-cell-style="{ display: 'none' }"
        :show-header="false"
        :row-class-name="() => 'summary-row'"
      >
        <el-table-column
          v-for="col in matrixData.columns"
          :key="col.field + '_t'"
          :prop="col.field"
          :label="col.label"
          :fixed="col.fixed"
          :min-width="col.minWidth || col.width || 150"
          :align="col.align || 'left'"
        >
          <template #default="{ row }">
            <template v-if="col.field === 'itemName'">
              <span class="total-label">各单位执行合计</span>
            </template>
            <template v-else>
              <div v-if="row[col.field]" class="exec-cell">
                <div class="exec-rate-row">
                  <el-progress
                    :percentage="Number(getRate(row[col.field].rate) || 0)"
                    :color="getProgressColor(getRate(row[col.field].rate))"
                    :stroke-width="8"
                    :show-text="false"
                    class="exec-bar"
                  />
                  <span class="exec-rate-text summary" :style="{ color: getRateColor(getRate(row[col.field].rate)) }">
                    {{ formatRate(row[col.field].rate) }}
                  </span>
                </div>
                <div class="exec-amount">预算 {{ formatAmount(row[col.field].budget) }}</div>
                <div class="exec-amount">执行 {{ formatAmount(row[col.field].exec) }}</div>
                <div class="exec-amount" :style="{ color: getDevColor(row[col.field]) }">差异 {{ formatDev(row[col.field]) }}</div>
              </div>
              <span v-else style="color: #c0c4cc">-</span>
            </template>
          </template>
        </el-table-column>
        <!-- 校验列数对齐：el-table无数据时用假行占位 -->
      </el-table>

      <!-- 无数据 -->
      <el-empty v-else-if="!loading && activeTab" description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts" name="BudgetExecMatrix">
import { ref, computed } from 'vue';
import request from '@/utils/request';

const loading = ref(false);
const planId = ref<any>(null);
const planOptions = ref<any[]>([]);
const planStatus = ref<string>('');
const templates = ref<any[]>([]);
const activeTab = ref('');
const matrixData = ref<any>(null);
// 季度维度：全年合计 / Q1~Q4
const quarterOptions = [
  { value: 'ALL', label: '全年合计' },
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'Q4', label: 'Q4' }
];
const quarter = ref('ALL');

// 底部合计行：单行占位
const totalRows = computed(() => {
  if (!matrixData.value || !matrixData.value.columnTotals) return [];
  return [matrixData.value.columnTotals];
});

// 加载预算方案列表
const loadPlans = async () => {
  try {
    const res = await request({
      url: '/budget/plan/list',
      method: 'get',
      params: { pageNum: 1, pageSize: 100 }
    });
    planOptions.value = (res.rows || []).filter((p: any) => p.status === 'PUBLISHED' || p.status === 'ARCHIVED');
    if (planOptions.value.length > 0) {
      planId.value = planOptions.value[0].id;
      planStatus.value = planOptions.value[0].status;
    } else {
      planStatus.value = '';
    }
  } catch (e) {
    console.error('加载预算方案失败', e);
  }
};

// 加载模板列表
const loadTemplates = async () => {
  try {
    const res = await request({
      url: '/budget/execmatrix/templates',
      method: 'get'
    });
    // 排除"15 预算调整审批表"，本页不展示
    templates.value = (res.data || []).filter((t: any) => String(t.code) !== '15');
    if (templates.value.length > 0) {
      activeTab.value = templates.value[0].code;
    }
  } catch (e) {
    console.error('加载模板列表失败', e);
  }
};

// 加载执行矩阵数据
const loadMatrixData = async () => {
  if (!planId.value || !activeTab.value) return;
  loading.value = true;
  try {
    const res = await request({
      url: '/budget/execmatrix/data',
      method: 'get',
      params: { planId: planId.value, templateCode: activeTab.value, quarter: quarter.value }
    });
    matrixData.value = res.data;
  } catch (e) {
    console.error('加载执行矩阵数据失败', e);
  } finally {
    loading.value = false;
  }
};

// 方案切换
const handlePlanChange = () => {
  const plan = planOptions.value.find((p: any) => p.id === planId.value);
  planStatus.value = plan?.status || '';
  if (activeTab.value) {
    loadMatrixData();
  }
};

// Tab切换
const handleTabChange = (tab: string) => {
  activeTab.value = tab;
  loadMatrixData();
};

// 格式化金额
const formatAmount = (val: any) => {
  if (val == null || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return '-';
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// 执行率数值（用于进度条）
const getRate = (v: any) => Number(v) || 0;

// 差异 = 实际执行 - 预算，正数带+绿色、负数带-红色（贴合参考图红绿标识）
const formatDev = (cell: any) => {
  const budget = Number(cell?.budget) || 0;
  const exec = Number(cell?.exec) || 0;
  const dev = exec - budget;
  if (dev === 0) return '0.00';
  return (dev > 0 ? '+' : '-') + formatAmount(Math.abs(dev));
};

const getDevColor = (cell: any) => {
  const dev = (Number(cell?.exec) || 0) - (Number(cell?.budget) || 0);
  if (dev > 0) return '#67c23a';
  if (dev < 0) return '#f56c6c';
  return '#909399';
};

// 执行率展示（保留2位小数并加%）
const formatRate = (v: any) => {
  if (v == null || v === '') return '-';
  return Number(v).toFixed(2) + '%';
};

// 执行率颜色
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

// 汇总行高亮
const rowClassName = ({ row }: any) => {
  return row.isSummary === 1 ? 'summary-row' : '';
};

// 页面初始化
onMounted(async () => {
  await loadPlans();
  await loadTemplates();
  if (planId.value && activeTab.value) {
    loadMatrixData();
  }
});

// 页面激活时刷新
onActivated(() => {
  if (planId.value && activeTab.value) {
    loadMatrixData();
  }
});
</script>

<style scoped>
.app-container {
  padding: 16px;
}
.mb-4 {
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-tip {
  font-size: 12px;
  color: #909399;
}
:deep(.el-tabs--card .el-tabs__header) {
  margin-bottom: 12px;
}
:deep(.el-tabs__item) {
  font-size: 13px;
  height: 36px;
  line-height: 36px;
}
:deep(.el-table .cell) {
  white-space: nowrap;
}
:deep(.el-table th.el-table__cell .cell) {
  white-space: normal !important;
  word-break: break-all;
  line-height: 20px;
}
:deep(.summary-row) {
  background-color: #f0f7ff !important;
}
:deep(.summary-row .cell) {
  font-weight: bold;
}

.exec-cell {
  padding: 4px 2px;
}
.exec-rate-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.exec-bar {
  flex: 1;
}
.exec-rate-text {
  font-weight: bold;
  min-width: 64px;
  text-align: right;
  font-size: 13px;
}
.exec-amount {
  font-size: 11px;
  color: #606266;
  line-height: 1.5;
}
</style>