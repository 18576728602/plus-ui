<template>
  <div class="app-container">
    <!-- 顶部筛选 -->
    <el-card class="mb-4" shadow="never">
      <el-form :inline="true">
        <el-form-item label="预算方案">
          <el-select v-model="query.planId" placeholder="请选择" style="width: 260px" @change="loadData">
            <el-option v-for="item in planOptions" :key="item.id" :label="item.planName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="抵销类型">
          <el-select v-model="query.transactionType" placeholder="全部" clearable style="width: 180px" @change="loadData">
            <el-option label="利润表抵销" value="IS" />
            <el-option label="资产负债表抵销" value="BS" />
            <el-option label="现金流量表抵销" value="CF" />
          </el-select>
        </el-form-item>
        <el-form-item label="抵销项目">
          <el-select v-model="query.projectCode" placeholder="全部" clearable filterable style="width: 220px" @change="loadData">
            <el-option v-for="item in projectOptions" :key="item.itemCode" :label="item.label" :value="item.itemCode" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="!query.planId" shadow="never">
      <el-empty description="请先选择预算方案" />
    </el-card>

    <template v-else>
      <!-- 概览 -->
      <el-row :gutter="12" class="mb-4">
        <el-col :span="8"><el-card shadow="never">
          <div class="stat"><div class="stat-label">已确认内部交易</div><div class="stat-value">{{ rows.length }}</div></div>
        </el-card></el-col>
        <el-col :span="8"><el-card shadow="never">
          <div class="stat"><div class="stat-label">抵销分录合计(万元)</div><div class="stat-value text-danger">{{ formatAmount(totalElimination) }}</div></div>
        </el-card></el-col>
        <el-col :span="8"><el-card shadow="never">
          <div class="stat"><div class="stat-label">自动抵销依据</div><div class="stat-value" style="font-size:13px">已确认内部交易 + 抵销项目配置</div></div>
        </el-card></el-col>
      </el-row>

      <!-- 分录列表 -->
      <el-card shadow="never" v-loading="loading">
        <div class="font-bold mb-4">抵销分录清单</div>
        <el-table :data="rows" border size="small" :row-key="rowKey" :row-class-name="rowClass">
          <el-table-column label="抵销类型" width="140" align="center">
            <template #default="{ row }">{{ row.transactionTypeName }}</template>
          </el-table-column>
          <el-table-column label="抵销项目" min-width="180">
            <template #default="{ row }">{{ row.projectName || row.eliminationProject }}</template>
          </el-table-column>
          <el-table-column label="交易双方" min-width="220">
            <template #default="{ row }">{{ row.fromDeptName }} → {{ row.toDeptName }}</template>
          </el-table-column>
          <el-table-column label="关联科目" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.itemCode ? `(${row.itemCode})${row.itemName}` : '-（未匹配）' }}</template>
          </el-table-column>
          <el-table-column label="方向" width="100" align="center">
            <template #default="{ row }">{{ row.direction || '' }}</template>
          </el-table-column>
          <el-table-column label="交易金额(万元)" width="130" align="right">
            <template #default="{ row }">{{ row.amount === '—' ? '—' : formatAmount(row.amount) }}</template>
          </el-table-column>
          <el-table-column label="抵销金额(万元)" width="130" align="right">
            <template #default="{ row }">
              <span class="text-danger">{{ row.eliminationAmount === '—' || row.eliminationAmount == null ? (row.isSummary ? '' : '—') : formatAmount(row.eliminationAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="关联预算表" width="160" align="center">
            <template #default="{ row }">{{ row.templateName || row.templateCode || '-' }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts" name="BudgetElimination">
import { ref, reactive, computed, onMounted } from 'vue';
import { listEliminationEntries, getEliminationConfigs, listPlanOptions } from '@/api/budget/elimination';

const loading = ref(false);
const rows = ref<any[]>([]);
const planOptions = ref<any[]>([]);
const projectOptions = ref<any[]>([]);

const query = reactive({
  planId: undefined as number | undefined,
  transactionType: undefined as string | undefined,
  projectCode: undefined as string | undefined
});

const formatAmount = (val: any) => {
  if (val == null || val === '—' || Number.isNaN(Number(val))) return '0.00';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const totalElimination = computed(() => {
  return rows.value
    .filter((r: any) => !r.isSummary)
    .reduce((sum: number, r: any) => sum + (Number(r.eliminationAmount) || 0), 0);
});

const rowKey = (row: any) => row.isSummary ? 'summary' : row.id;
const rowClass = ({ row }: any) => (row.isSummary ? 'summary-row' : '');

const loadOptions = async () => {
  try {
    const planRes = await listPlanOptions();
    const planList = planRes.rows || planRes.data || [];
    planOptions.value = planList.filter((p: any) => p.status === 'PUBLISHED' || p.status === 'ARCHIVED');

    const cfgRes = await getEliminationConfigs();
    const cfgList = cfgRes.data || cfgRes.rows || [];
    projectOptions.value = cfgList.map((c: any) => ({
      itemCode: c.projectCode,
      label: `${c.projectCode}-${c.projectName}`
    }));
  } catch (e) {
    console.error(e);
  }
};

const loadData = async () => {
  if (!query.planId) return;
  loading.value = true;
  try {
    const res = await listEliminationEntries({
      planId: query.planId,
      transactionType: query.transactionType,
      projectCode: query.projectCode
    });
    rows.value = res.data || res.rows || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadOptions();
});
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.font-bold { font-weight: bold; }
.text-danger { color: #f56c6c; }
.stat-label { font-size: 13px; color: #909399; margin-bottom: 6px; }
.stat-value { font-size: 22px; font-weight: 700; }
:deep(.summary-row) { background-color: #f5f7fa !important; font-weight: bold; }
</style>