<template>
  <div class="app-container">
    <!-- 顶部：方案选择 -->
    <el-card class="mb-4" shadow="never">
      <el-form :inline="true">
        <el-form-item label="预算方案">
          <el-select v-model="planId" placeholder="请选择预算方案" style="width: 280px" @change="loadAll">
            <el-option
              v-for="item in planOptions"
              :key="item.id"
              :label="item.planName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-if="!planId">
      <el-empty description="请先选择预算方案" />
    </div>

    <div v-else>
      <!-- 集团总览卡片 -->
      <el-row :gutter="16" class="mb-4">
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-title">参与单位</div>
            <div class="stat-value">{{ overview.totalDepts || 0 }}</div>
            <div class="stat-sub">已提交 {{ overview.submittedDepts || 0 }} / 已审批 {{ overview.approvedDepts || 0 }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-title">填报进度</div>
            <div class="stat-value">{{ overview.fillProgress || 0 }}%</div>
            <el-progress :percentage="Number(overview.fillProgress || 0)" :stroke-width="8" :show-text="false" class="mt-2" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-title">本年预算总额</div>
            <div class="stat-value">{{ formatAmount(overview.totalBudget) }}</div>
            <div class="stat-sub">万元</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-title">同比增减</div>
            <div class="stat-value" :class="getDiffClass(overview.diffAmount)">
              {{ formatDiff(overview.diffAmount) }}
            </div>
            <div class="stat-sub" :class="getDiffClass(overview.diffAmount)">
              {{ overview.diffRate || 0 }}%
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 各单位填报汇总 -->
      <el-card shadow="never" class="mb-4">
        <template #header>
          <span class="font-bold">各单位填报汇总</span>
        </template>
        <el-table :data="deptSummaryList" border size="small" style="width: 100%">
          <el-table-column label="单位名称" prop="deptName" min-width="200" />
          <el-table-column label="填报进度" width="280" align="center">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 8px">
                <el-progress
                  :percentage="Number(row.fillProgress || 0)"
                  :stroke-width="16"
                  :text-inside="true"
                  :status="getProgressStatus(row.fillProgress)"
                  style="flex: 1"
                />
                <span style="min-width: 60px; font-weight: bold">{{ row.fillProgress || 0 }}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="已填/总数" width="120" align="center">
            <template #default="{ row }">
              {{ row.filledItems }} / {{ row.totalItems }}
            </template>
          </el-table-column>
          <el-table-column label="上年实际(万元)" width="150" align="right">
            <template #default="{ row }">
              {{ formatAmount(row.totalActual) }}
            </template>
          </el-table-column>
          <el-table-column label="本年预算填报(万元)" width="150" align="right">
            <template #default="{ row }">
              {{ formatAmount(row.reportBudget) }}
            </template>
          </el-table-column>
          <el-table-column label="本年预算(万元)" width="150" align="right">
            <template #default="{ row }">
              {{ formatAmount(row.totalBudget) }}
            </template>
          </el-table-column>
          <el-table-column label="增减额" width="130" align="right">
            <template #default="{ row }">
              <span :class="getDiffClass(row.diffAmount)">{{ formatDiff(row.diffAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="增减率" width="110" align="right">
            <template #default="{ row }">
              <span :class="getDiffClass(row.diffAmount)">{{ row.diffRate || 0 }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 各板块汇总 -->
      <el-card shadow="never">
        <template #header>
          <span class="font-bold">各预算板块汇总</span>
        </template>
        <el-table :data="visibleTemplateList" border size="small" style="width: 100%">
          <el-table-column label="预算表编号" prop="templateCode" width="120" align="center" />
          <el-table-column label="预算表名称" prop="templateName" min-width="200" />
          <el-table-column label="参与单位" width="100" align="center" prop="deptCount" />
          <el-table-column label="已填报单位" width="100" align="center" prop="filledDeptCount" />
          <el-table-column label="上年实际(万元)" width="140" align="right">
            <template #default="{ row }">
              {{ formatAmount(row.totalActual) }}
            </template>
          </el-table-column>
          <el-table-column label="本年预算填报(万元)" width="140" align="right">
            <template #default="{ row }">
              {{ formatAmount(row.reportBudget) }}
            </template>
          </el-table-column>
          <el-table-column label="本年预算(万元)" width="140" align="right">
            <template #default="{ row }">
              {{ formatAmount(row.totalBudget) }}
            </template>
          </el-table-column>
          <el-table-column label="填报进度" width="280" align="center">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 8px">
                <el-progress
                  :percentage="row.deptCount > 0 ? Math.round(row.filledDeptCount / row.deptCount * 100) : 0"
                  :stroke-width="16"
                  :text-inside="true"
                  style="flex: 1"
                />
                <span style="min-width: 50px">
                  {{ row.deptCount > 0 ? Math.round(row.filledDeptCount / row.deptCount * 100) : 0 }}%
                </span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts" name="BudgetSummary">
import { ref, computed, onMounted } from 'vue';
import { getOverview, getDeptSummaryList, getTemplateSummaryList, listPlan } from '@/api/budget/summary';

const planId = ref<number>();
const planOptions = ref<any[]>([]);
const overview = ref<any>({});
const deptSummaryList = ref<any[]>([]);
const templateSummaryList = ref<any[]>([]);
const visibleTemplateList = computed(() => {
  return templateSummaryList.value.filter((r: any) =>
    Number(r.deptCount) > 0 || Number(r.filledDeptCount) > 0 ||
    Number(r.totalActual) > 0 || Number(r.reportBudget) > 0 || Number(r.totalBudget) > 0
  );
});

const formatAmount = (val: number | undefined) => {
  if (val == null) return '0.00';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDiff = (val: number | undefined) => {
  if (val == null) return '-';
  const n = Number(val);
  return (n >= 0 ? '+' : '') + formatAmount(n);
};

const getDiffClass = (val: number | undefined) => {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  if (n > 0) return 'text-green-600';
  if (n < 0) return 'text-red-600';
  return 'text-gray-500';
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = { DRAFT: 'info', SUBMITTED: 'primary', APPROVED: 'success', REJECTED: 'danger' };
  return map[status] || 'info';
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = { DRAFT: '草稿', SUBMITTED: '已提交', APPROVED: '已审批', REJECTED: '已驳回' };
  return map[status] || status;
};

const getProgressStatus = (val: number | undefined) => {
  const p = Number(val || 0);
  if (p >= 100) return 'success';
  if (p >= 50) return 'warning';
  return '';
};

const loadPlans = async () => {
  try {
    const res = await listPlan();
    const list = res.rows || res.data || [];
    planOptions.value = list.filter((p: any) => p.status === 'PUBLISHED' || p.status === 'ARCHIVED');
  } catch (error) {
    console.error('加载方案失败', error);
  }
};

const loadAll = async () => {
  if (!planId.value) return;
  try {
    const [ov, deptList, templateList] = await Promise.all([
      getOverview(planId.value),
      getDeptSummaryList(planId.value),
      getTemplateSummaryList(planId.value)
    ]);
    overview.value = ov.data || {};
    deptSummaryList.value = deptList.data || [];
    templateSummaryList.value = templateList.data || [];
  } catch (error) {
    console.error('加载汇总数据失败', error);
  }
};

onMounted(() => {
  loadPlans();
});
</script>

<style scoped>
.stat-card {
  text-align: center;
  padding: 8px 0;
}
.stat-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}
.stat-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
