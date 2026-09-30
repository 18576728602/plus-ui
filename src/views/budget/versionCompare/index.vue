<template>
  <div class="app-container">
    <!-- 筛选与操作 -->
    <el-card shadow="never" class="mb-14">
      <div class="toolbar">
        <div class="filter-item">
          <span class="label">对比版本A（基准）</span>
          <el-select v-model="query.planIdA" placeholder="选择方案" filterable style="width: 200px" @change="compare">
            <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="label">对比版本B</span>
          <el-select v-model="query.planIdB" placeholder="选择方案" filterable style="width: 200px" @change="compare">
            <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="label">单位</span>
          <el-select v-model="query.orgId" placeholder="全部单位" clearable filterable style="width: 180px" @change="compare">
            <el-option v-for="u in unitOptions" :key="u.deptId" :label="u.deptName" :value="u.deptId" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="label">报表类型</span>
          <el-input v-model="query.templateCode" placeholder="空=全部表" clearable style="width: 120px" @change="compare" />
        </div>
        <div class="filter-item">
          <el-button type="primary" :icon="'Refresh'" :loading="loading" @click="compare">对比</el-button>
          <el-button type="success" plain :icon="'Download'" @click="exportXlsx">导出Excel</el-button>
        </div>
      </div>
    </el-card>

    <template v-if="result">
      <!-- 差异统计 -->
      <el-row :gutter="12" class="mb-14">
        <el-col :span="6"><div class="st"><div class="k">参与对比科目</div><div class="v">{{ result.stat.totalCount }}</div></div></el-col>
        <el-col :span="6"><div class="st"><div class="k">存在差异科目</div><div class="v" style="color:#e6a23c">{{ result.stat.diffCount }} <span class="t">(\u2b06{{ result.stat.upCount }} \u2b07{{ result.stat.downCount }})</span></div></div></el-col>
        <el-col :span="6"><div class="st"><div class="k">变化绝对值总额</div><div class="v" style="color:#e6a23c">{{ fmt(result.stat.changeTotal) }} 万元</div></div></el-col>
        <el-col :span="6"><div class="st"><div class="k">版本B净变化(B-A)</div><div class="v" :style="{ color: Number(result.diffTotal) >= 0 ? '#16a34a' : '#dc2626' }">{{ fmt(result.diffTotal) }} 万元</div></div></el-col>
      </el-row>

      <!-- 双栏对比表 -->
      <el-card shadow="never" v-loading="loading">
        <template #header>
          <div class="card-head">
            <span>{{ result.planNameA }}（基准） ↔ {{ result.planNameB }}（对比）</span>
            <div>
              <el-button size="small" text @click="gotoDiff(-1)">{{ '上一处差异' }}</el-button>
              <el-button size="small" text @click="gotoDiff(1)">{{ '下一处差异' }}</el-button>
            </div>
          </div>
        </template>
        <el-table ref="diffTableRef" :data="result.rows" border stripe size="small" row-key="key" style="width: 100%">
          <el-table-column label="单位" prop="orgName" min-width="150" show-overflow-tooltip />
          <el-table-column label="预算表" prop="templateName" min-width="120" show-overflow-tooltip />
          <el-table-column label="科目" min-width="200" show-overflow-tooltip>
            <template #default="{ row }"><span class="code">{{ row.itemCode }}</span> {{ row.itemName }}</template>
          </el-table-column>
          <el-table-column label="基准金额(万元)" width="130" align="right">
            <template #default="{ row }">{{ fmt(row.amountA) }}</template>
          </el-table-column>
          <el-table-column label="对比金额(万元)" width="130" align="right">
            <template #default="{ row }">{{ fmt(row.amountB) }}</template>
          </el-table-column>
          <el-table-column label="差异额(万元)" width="130" align="right">
            <template #default="{ row }">
              <span v-if="row.changed" :style="{ color: Number(row.diff) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }">
                {{ Number(row.diff) >= 0 ? '+' : '' }}{{ fmt(row.diff) }}
              </span>
              <span v-else class="dim">-</span>
            </template>
          </el-table-column>
          <el-table-column label="差异率" width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.changed" :style="{ color: Number(row.diff) >= 0 ? '#16a34a' : '#dc2626' }">
                {{ Number(row.diff) >= 0 ? '+' : '' }}{{ row.diffRate }}%
              </span>
              <span v-else class="dim">-</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && result.rows.length === 0" description="两个方案无已审批预算可比数据" />
      </el-card>
    </template>
    <el-empty v-else description="请选择两个方案并执行对比" style="padding: 60px 0" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { compareVersions, exportVersions } from '@/api/budget/versionCompare';
import { listPlan } from '@/api/budget/plan';
import { getUnitOptions } from '@/api/budget/dashboard';

const loading = ref(false);
const result = ref<any>(null);
const query = reactive<any>({ planIdA: undefined, planIdB: undefined, orgId: undefined, templateCode: undefined });
const planOptions = ref<any[]>([]);
const unitOptions = ref<any[]>([]);
const diffTableRef = ref<any>(null);

const fmt = (v: any) => (v === null || v === undefined || v === '' ? '0.00' : Number(v).toFixed(2));

const loadPlans = async () => {
  const res: any = await listPlan({ pageSize: 200 });
  planOptions.value = res.rows || res.data || [];
  if (planOptions.value.length >= 2 && !query.planIdA) {
    const sorted = [...planOptions.value].sort((a, b) => (a.budgetYear || 0) - (b.budgetYear || 0));
    query.planIdA = sorted[0].id;
    query.planIdB = sorted[sorted.length - 1].id;
  }
};

const loadUnits = async () => {
  try {
    const res: any = await getUnitOptions();
    unitOptions.value = res.data || res || [];
  } catch (e) {
    unitOptions.value = [];
  }
};

const compare = async () => {
  if (!query.planIdA || !query.planIdB) {
    result.value = null;
    return;
  }
  if (query.planIdA === query.planIdB) {
    ElMessage.warning('请选择两个不同的方案进行对比');
    return;
  }
  loading.value = true;
  try {
    const res: any = await compareVersions(query);
    result.value = res.data || res;
  } finally {
    loading.value = false;
  }
};

// 逐格导航：跳到下一处/上一处差异
let diffIndex = 0;
const gotoDiff = async (dir: number) => {
  if (!result.value) return;
  const rows = result.value.rows || [];
  const changed = rows.map((r: any, i: number) => (r.changed ? i : -1)).filter((i: number) => i >= 0);
  if (changed.length === 0) return;
  diffIndex += dir;
  if (diffIndex < 0) diffIndex = changed.length - 1;
  if (diffIndex >= changed.length) diffIndex = 0;
  await nextTick();
  const table: any = diffTableRef.value;
  if (table && table.setCurrentRow) table.setCurrentRow(rows[changed[diffIndex]]);
  const el = document.querySelector('.el-table__body-wrapper');
  if (el) el.scrollTo({ top: changed[diffIndex] * 40, behavior: 'smooth' });
};

const exportXlsx = async () => {
  if (!query.planIdA || !query.planIdB) {
    ElMessage.warning('请先选择两个方案进行对比');
    return;
  }
  if (query.planIdA === query.planIdB) {
    ElMessage.warning('请选择两个不同的方案进行导出');
    return;
  }
  loading.value = true;
  try {
    const res: any = await exportVersions(query);
    const disposition = res?.headers?.['content-disposition'] || '';
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
    let name = '版本对比结果.xlsx';
    if (match) name = decodeURIComponent(match[1]).replace(/["']/g, '');
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    ElMessage.error('导出失败，请重试');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadPlans(), loadUnits()]);
  compare();
});
</script>

<style scoped>
.mb-14 { margin-bottom: 14px; }
.toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 18px; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item .label { color: #606266; font-size: 13px; white-space: nowrap; }

.st { background: #fff; border: 1px solid #e4e7ed; border-left: 4px solid #409eff; border-radius: 6px; padding: 12px 16px; }
.st .k { font-size: 12px; color: #909399; }
.st .v { font-size: 22px; font-weight: 700; color: #303133; margin-top: 4px; font-variant-numeric: tabular-nums; }
.st .t { font-size: 13px; color: #909399; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.code { color: #909399; font-family: monospace; margin-right: 4px; }
.dim { color: #c0c4cc; }
</style>