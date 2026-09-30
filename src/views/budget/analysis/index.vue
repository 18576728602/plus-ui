<template>
  <div class="app-container">
    <!-- 筛选 -->
    <el-card shadow="never" class="mb-14">
      <div class="filter-row">
        <div class="filter-item">
          <span class="label">预算方案</span>
          <el-select v-model="query.planId" placeholder="选择预算方案" filterable style="width: 240px" @change="handleQuery">
            <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="label">归因维度</span>
          <el-radio-group v-model="query.dimension" @change="handleQuery">
            <el-radio-button value="UNIT">按单位</el-radio-button>
            <el-radio-button value="ITEM">按科目</el-radio-button>
          </el-radio-group>
        </div>
        <div class="filter-item">
          <span class="label">报表类型</span>
          <el-input v-model="query.templateCode" placeholder="空=全部表" clearable style="width: 140px" @keyup.enter="handleQuery" @clear="handleQuery" />
        </div>
        <div class="filter-item">
          <el-button type="primary" :icon="'Search'" :loading="loading" @click="handleQuery">分析</el-button>
        </div>
      </div>
    </el-card>

    <!-- 概览卡 -->
    <el-row :gutter="16" class="mb-14" v-if="overview">
      <el-col :span="6">
        <div class="ov-card">
          <div class="ov-title">预算合计</div>
          <div class="ov-val">{{ fmt(overview.budgetTotal) }}</div>
          <div class="ov-unit">万元</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="ov-card">
          <div class="ov-title">执行合计</div>
          <div class="ov-val">{{ fmt(overview.execTotal) }}</div>
          <div class="ov-unit">万元</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="ov-card">
          <div class="ov-title">差异额（预算-执行）</div>
          <div class="ov-val" :style="{ color: Number(overview.diffTotal) >= 0 ? '#16a34a' : '#dc2626' }">
            {{ fmt(overview.diffTotal) }}
          </div>
          <div class="ov-unit" :style="{ color: '#909399' }">{{ overview.execRate }}% 执行率</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="ov-card">
          <div class="ov-title">归因范围</div>
          <div class="ov-val" style="font-size: 26px">{{ overview.orgCount }}</div>
          <div class="ov-unit">单位 · {{ overview.itemCount }} 科目</div>
        </div>
      </el-col>
    </el-row>

    <!-- 归因表 -->
    <el-card shadow="never" v-loading="loading">
      <template #header>
        <div class="card-head">
          <span>{{ query.dimension === 'ITEM' ? '科目差异归因' : '单位差异归因' }}（按差异额贡献度排序）</span>
          <span class="tip">负差异 = 超支，按贡献度从大到小定位主因</span>
        </div>
      </template>
      <el-table :data="rows" border stripe size="small" style="width: 100%">
        <el-table-column :label="query.dimension === 'ITEM' ? '科目' : '单位'" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="query.dimension === 'ITEM'">
              <span>{{ row.code }}</span>
              <el-tag v-if="row.templateCode" size="small" type="info" style="margin-left: 6px">{{ row.templateName }}</el-tag>
            </template>
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="预算(万元)" width="130" align="right">
          <template #default="{ row }">{{ fmt(row.budget) }}</template>
        </el-table-column>
        <el-table-column label="执行(万元)" width="130" align="right">
          <template #default="{ row }">{{ fmt(row.exec) }}</template>
        </el-table-column>
        <el-table-column label="差异额(万元)" width="140" align="right">
          <template #default="{ row }">
            <span :style="{ color: Number(row.diff) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }">
              {{ Number(row.diff) >= 0 ? '+' : '' }}{{ fmt(row.diff) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="执行率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.overrun ? 'danger' : 'success'" effect="light" size="small">{{ row.execRate }}%</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="差异率" width="100" align="center">
          <template #default="{ row }">{{ row.diffRate }}%</template>
        </el-table-column>
        <el-table-column label="贡献度" width="130" align="center">
          <template #default="{ row }">
            <el-progress :percentage="Number(row.contribution)" :stroke-width="8" :format="() => row.contribution + '%'" />
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && rows.length === 0" description="暂无数据：所选方案无已审批通过的预算执行数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { getAnalysis, getAnalysisOverview } from '@/api/budget/analysis';
import { listPlan } from '@/api/budget/plan';

const loading = ref(false);
const query = reactive<any>({ planId: undefined, dimension: 'UNIT', templateCode: undefined });
const planOptions = ref<any[]>([]);
const overview = ref<any>(null);
const rows = ref<any[]>([]);

const fmt = (v: any) => {
  if (v === null || v === undefined || v === '') return '0.00';
  return Number(v).toFixed(2);
};

const loadPlans = async () => {
  const res: any = await listPlan({ pageSize: 100 });
  planOptions.value = res.rows || res.data || [];
  if (planOptions.value.length > 0 && !query.planId) {
    query.planId = planOptions.value[0].id;
  }
};

const handleQuery = async () => {
  if (!query.planId) {
    rows.value = [];
    overview.value = null;
    return;
  }
  loading.value = true;
  try {
    const o: any = await getAnalysisOverview(query);
    overview.value = o.data || o;
    const a: any = await getAnalysis(query);
    const res = a.data || a;
    rows.value = res.rows || [];
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadPlans();
  handleQuery();
});
</script>

<style scoped>
.mb-14 {
  margin-bottom: 14px;
}
.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 20px;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}
.filter-item .label {
  color: #606266;
  font-size: 13px;
  white-space: nowrap;
}
.ov-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-left: 4px solid #409eff;
  border-radius: 6px;
  padding: 16px 18px;
  height: 100%;
  box-sizing: border-box;
}
.ov-title {
  font-size: 13px;
  color: #909399;
}
.ov-val {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin: 6px 0 2px;
  font-variant-numeric: tabular-nums;
}
.ov-unit {
  font-size: 12px;
  color: #c0c4cc;
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
</style>