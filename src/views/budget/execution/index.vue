<template>
  <div class="app-container">
    <!-- 顶部筛选 -->
    <el-card class="mb-4" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="预算方案">
          <el-select v-model="queryParams.planId" placeholder="请选择" style="width: 240px" @change="loadData">
            <el-option v-for="item in planOptions" :key="item.id" :label="item.planName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="填报单位">
          <el-select v-model="queryParams.orgId" :placeholder="singleUnit ? '本单位' : '请选择'" :disabled="singleUnit" :clearable="!singleUnit" style="width: 200px" @change="loadData">
            <el-option v-for="item in deptOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="预算表">
          <el-select v-model="queryParams.templateCode" placeholder="请选择" clearable style="width: 200px" @change="loadData">
            <el-option v-for="item in templateOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 汇总卡片 -->
    <el-row :gutter="16" class="mb-4 stat-row" v-if="summary">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-inner">
            <div class="stat-label">预算总额(万元)</div>
            <div class="stat-value">{{ formatAmount(summary.totalBudget) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-inner">
            <div class="stat-label">执行金额(万元)</div>
            <div class="stat-value" style="color: #409eff">{{ formatAmount(summary.totalExecution) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-inner">
            <div class="stat-label">总体执行率</div>
            <div class="stat-value" :style="{ color: getRateColor(summary.executionRate) }">
              {{ summary.executionRate }}%
            </div>
            <el-progress :percentage="Number(summary.executionRate)" :color="getProgressColor(summary.executionRate)" :show-text="false" :stroke-width="8" class="rate-progress" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-inner">
            <div class="stat-label">偏差(万元)</div>
            <div class="stat-value" :style="{ color: summary.deviation >= 0 ? '#67c23a' : '#f56c6c' }">
              {{ formatAmount(summary.deviation) }}
            </div>
            <div class="stat-sub" v-if="summary.itemCount">
              已录入: {{ summary.executedCount }} / {{ summary.itemCount }} 项
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 执行明细表 -->
    <el-card v-if="tableData.length > 0" shadow="never">
      <template #header>
        <span class="font-bold">预算执行明细</span>
      </template>

      <el-table v-if="tableData.length > 0" :data="tableData" border :row-class-name="rowClassName" :span-method="spanMethod" style="width: 100%">
        <el-table-column label="科目编码" width="100" align="center">
          <template #default="{ row }">
            <span v-if="isNoteRow(row)" class="exec-note-text">{{ row.itemName }}</span>
            <span v-else>{{ row.itemCode }}</span>
          </template>
        </el-table-column>

        <el-table-column label="科目名称" prop="itemName" min-width="200">
          <template #default="{ row }">
            <span :style="{ paddingLeft: (row.itemLevel - 1) * 16 + 'px', fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">
              {{ row.itemName }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="预算金额(万元)" prop="budgetAmount" width="130" align="right">
          <template #default="{ row }">
            <!-- 仅已审批通过(APPROVED)的预算才显示金额；草稿/提交/驳回显示 - 不计入 -->
            <span v-if="row.status === 'APPROVED' && row.budgetAmount != null && Number(row.budgetAmount) > 0" :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">{{ formatAmount(row.budgetAmount) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 执行金额：分组表头，4个季度子列 -->
        <el-table-column label="执行金额(万元)" align="center">
          <el-table-column label="第一季度" width="130" align="right">
            <template #default="{ row }">
              <el-input-number
                v-if="canInput && row.status === 'APPROVED' && row.isEditable === 1 && row.isSummary !== 1 && row.budgetAmount != null"
                v-model="row.q1Amount"
                :precision="2"
                :controls="false"
                size="small"
                style="width: 100px"
                @change="handleInput(row)"
              />
              <span v-else :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">{{ row.q1Amount != null && Number(row.q1Amount) > 0 ? formatAmount(row.q1Amount) : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="第二季度" width="130" align="right">
            <template #default="{ row }">
              <el-input-number
                v-if="canInput && row.status === 'APPROVED' && row.isEditable === 1 && row.isSummary !== 1 && row.budgetAmount != null"
                v-model="row.q2Amount"
                :precision="2"
                :controls="false"
                size="small"
                style="width: 100px"
                @change="handleInput(row)"
              />
              <span v-else :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">{{ row.q2Amount != null && Number(row.q2Amount) > 0 ? formatAmount(row.q2Amount) : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="第三季度" width="130" align="right">
            <template #default="{ row }">
              <el-input-number
                v-if="canInput && row.status === 'APPROVED' && row.isEditable === 1 && row.isSummary !== 1 && row.budgetAmount != null"
                v-model="row.q3Amount"
                :precision="2"
                :controls="false"
                size="small"
                style="width: 100px"
                @change="handleInput(row)"
              />
              <span v-else :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">{{ row.q3Amount != null && Number(row.q3Amount) > 0 ? formatAmount(row.q3Amount) : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="第四季度" width="130" align="right">
            <template #default="{ row }">
              <el-input-number
                v-if="canInput && row.status === 'APPROVED' && row.isEditable === 1 && row.isSummary !== 1 && row.budgetAmount != null"
                v-model="row.q4Amount"
                :precision="2"
                :controls="false"
                size="small"
                style="width: 100px"
                @change="handleInput(row)"
              />
              <span v-else :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">{{ row.q4Amount != null && Number(row.q4Amount) > 0 ? formatAmount(row.q4Amount) : '-' }}</span>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- 执行合计 = Q1+Q2+Q3+Q4 -->
        <el-table-column label="合计" width="120" align="right">
          <template #default="{ row }">
            <span style="font-weight: bold; color: #409eff">{{ formatAmount(getTotalExecution(row)) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="控制状态" width="180" align="center">
          <template #default="{ row }">
            <!-- 仅明细可编辑行显示控制状态；汇总/参考行不显示 -->
            <template v-if="row.isEditable === 1 && row.isSummary !== 1">
              <el-tag v-if="row.controlLevel === 'RED'" type="danger" effect="light" size="small">超标</el-tag>
              <el-tooltip v-else-if="row.controlLevel === 'YELLOW'" :content="row.controlMessage || ''" placement="top">
                <el-tag type="warning" effect="light" size="small">已达提示阈值</el-tag>
              </el-tooltip>
              <el-tooltip v-else :content="row.controlMessage || '未配置控制规则'" placement="top">
                <el-tag type="success" effect="light" size="small">正常</el-tag>
              </el-tooltip>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="执行率" width="160" align="center">
          <template #default="{ row }">
            <div v-if="row.budgetAmount > 0" style="display: flex; align-items: center; gap: 8px">
              <el-progress
                :percentage="Number(getExecutionRate(row))"
                :color="getProgressColor(getExecutionRate(row))"
                :show-text="false"
                style="flex: 1"
              />
              <span :style="{ color: getRateColor(getExecutionRate(row)), fontWeight: 'bold', minWidth: '50px' }">
                {{ getExecutionRate(row) }}%
              </span>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="偏差(万元)" width="120" align="right">
          <template #default="{ row }">
            <!-- 偏差 = 预算 - 执行；预算或执行任一非0即显示，保证0预算但已填执行数也能看到偏差 -->
            <span v-if="(Number(row.budgetAmount) > 0) || getTotalExecution(row) > 0" :style="{ color: getDeviation(row) >= 0 ? '#67c23a' : '#f56c6c', fontWeight: 'bold' }">
              {{ formatAmount(getDeviation(row)) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="上年实际(万元)" prop="lastActual" width="120" align="right">
          <template #default="{ row }">
            {{ row.lastActual != null && Number(row.lastActual) > 0 ? formatAmount(row.lastActual) : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-else-if="queryParams.planId" shadow="never">
      <el-empty description="暂无执行数据" />
    </el-card>

    <el-card v-else shadow="never">
      <el-empty description="请先选择预算方案" />
    </el-card>
  </div>
</template>

<script setup lang="ts" name="BudgetExecution">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getExecutionList, getExecutionSummary, inputExecution } from '@/api/budget/execution';
import type { ExecutionSummary } from '@/api/budget/execution';
import { listPlan } from '@/api/budget/fill';
import { useUserStore } from '@/store/modules/user';
import { getUnitOptions } from '@/api/budget/dashboard';

const planOptions = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
// 受限账号(非集团用户)仅有单位时，锁定填报单位，防止查看全集团数据
const singleUnit = ref(false);
const summary = ref<ExecutionSummary | null>(null);
const tableData = ref<any[]>([]);
const tableHeight = ref(600);

const templateOptions = ref([
  { value: '02', label: '02-营业收入预算表' },
  { value: '03', label: '03-营业成本预算表' },
  { value: '04', label: '04-税金及附加预算表' },
  { value: '05', label: '05-人工成本预算表' },
  { value: '06', label: '06-管理费用预算表' },
  { value: '07', label: '07-财务费用预算表' },
  { value: '08', label: '08-固定资产折旧预算表' },
  { value: '09', label: '09-固定资产投资预算表' },
  { value: '10', label: '10-融资预算表' },
  { value: '11', label: '11-现金流量预算表' },
  { value: '12', label: '12-预计利润表' },
  { value: '13', label: '13-预计资产负债表' },
  { value: '16', label: '16-三公经费预算表' }
]);

const queryParams = reactive({
  planId: undefined as number | undefined,
  orgId: undefined as number | undefined,
  templateCode: undefined as string | undefined
});

const userStore = useUserStore();

// 仅当所选方案处于"执行中(PUBLISHED)"时允许录入执行数；归档/关闭方案只读查看
const planExecutable = computed(() => {
  const p = planOptions.value.find(x => x.id === queryParams.planId);
  return !!p && p.status === 'PUBLISHED';
});

// 是否拥有录入执行数权限；仅拥有录入权限(填报员)的用户可录入，审批人/查看员只读
const hasInputPermit = () => {
  const p = userStore.permissions || [];
  if (p.includes('*:*:*')) return true;
  return p.includes('budget:execution:input');
};

// 可录入 = 方案执行中 + 用户拥有录入权限
const canInput = computed(() => planExecutable.value && hasInputPermit());

const formatAmount = (val: any) => {
  if (val == null) return '-';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getTotalExecution = (row: any) => {
  const total = (Number(row.q1Amount) || 0) + (Number(row.q2Amount) || 0) + (Number(row.q3Amount) || 0) + (Number(row.q4Amount) || 0);
  return total;
};

const getExecutionRate = (row: any) => {
  const budget = Number(row.budgetAmount) || 0;
  if (budget <= 0) return '0.00';
  const total = getTotalExecution(row);
  return (total * 100 / budget).toFixed(2);
};

const getDeviation = (row: any) => {
  return (Number(row.budgetAmount) || 0) - getTotalExecution(row);
};

const getRateColor = (rate: number) => {
  if (rate > 100) return '#f56c6c'; // 超执行(>100%)→ 红色警示
  if (rate >= 90) return '#67c23a';
  if (rate >= 50) return '#409eff';
  if (rate > 0) return '#e6a23c';
  return '#909399';
};

const getProgressColor = (rate: number) => {
  if (rate > 100) return '#f56c6c'; // 超执行(>100%)→ 红色警示
  if (rate >= 90) return '#67c23a';
  if (rate >= 50) return '#409eff';
  if (rate > 0) return '#e6a23c';
  return '#909399';
};

const rowClassName = ({ row }: { row: any }) => {
  if (isNoteRow(row)) return 'note-row';
  if (row.isSummary === 1) return 'summary-row';
  if (row.isEditable === 0) return 'readonly-row';
  return '';
};

// 表注行：只读且名称以"注"开头的说明行，整行跨列合并、淡色展示，不进入执行计算
const isNoteRow = (row: any) =>
  row.isEditable === 0 && /^注[:：]/.test(row.itemName || '');

// 每个叶子列数量（用于备注行跨整行）
const LEAF_COLUMNS = 12;
// 合并行：备注行在第一格跨全部列，其余格隐藏，实现整行通栏
const spanMethod = ({ row, columnIndex }: any) => {
  if (isNoteRow(row)) {
    if (columnIndex === 0) return { rowspan: 1, colspan: LEAF_COLUMNS };
    return { rowspan: 0, colspan: 0 };
  }
  return undefined;
};

const loadData = async () => {
  if (!queryParams.planId) return;
  try {
    const [listRes, summaryRes] = await Promise.all([
      getExecutionList({ planId: queryParams.planId, orgId: queryParams.orgId, templateCode: queryParams.templateCode }),
      getExecutionSummary({ planId: queryParams.planId, orgId: queryParams.orgId })
    ]);
    const rawData = listRes.data || [];
    // 动态计算分类小计行的预算金额和执行金额
    const computed = calculateSummaryRows(rawData);
    // 防御性去重：同一方案+科目的行只保留一条，避免因后端旧行为导致科目重复展示
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const r of computed) {
      const key = (r.templateCode || '') + '|' + r.itemCode;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }
    tableData.value = deduped;
    summary.value = summaryRes.data;
  } catch (error) {
    console.error(error);
  }
};

// 计算分类小计行（isSummary=1的行）的金额
// 汇总行：budgetAmount/q1~q4/lastActual 均从子项累加
// 参考行（上一年实际完成值等）：lastActual 从同表全部明细行求和
const calculateSummaryRows = (data: any[]) => {
  const result = [...data];
  // 建立 父科目 -> 子行 的索引（按模板隔离，避免跨表同码串扰）
  const childrenMap: Record<string, any[]> = {};
  result.forEach((r) => {
    if (r.parentCode) {
      const key = (r.templateCode || '') + '|' + r.parentCode;
      childrenMap[key] = childrenMap[key] || [];
      childrenMap[key].push(r);
    }
  });

  // 递归汇总某行的子项；无子项(叶子)行直接用自身值
  const compute = (r: any, templateCode: string) => {
    const kids = childrenMap[templateCode + '|' + r.itemCode] || [];
    if (kids.length === 0) {
      return {
        budget: Number(r.budgetAmount) || 0,
        q1: Number(r.q1Amount) || 0,
        q2: Number(r.q2Amount) || 0,
        q3: Number(r.q3Amount) || 0,
        q4: Number(r.q4Amount) || 0,
        lastActual: Number(r.lastActual) || 0,
      };
    }
    let budget = 0, q1 = 0, q2 = 0, q3 = 0, q4 = 0, lastActual = 0;
    kids.forEach((k) => {
      const v = compute(k, templateCode);
      budget += v.budget; q1 += v.q1; q2 += v.q2; q3 += v.q3; q4 += v.q4; lastActual += v.lastActual;
    });
    return { budget, q1, q2, q3, q4, lastActual };
  };

  // 预计算：每个 templateCode 下全部明细行(非汇总、非参考)的 lastActual 合计
  const templateLastActual: Record<string, number> = {};
  result.forEach((r) => {
    if (r.isSummary !== 1 && r.isEditable === 1) {
      const tc = r.templateCode || '';
      templateLastActual[tc] = (templateLastActual[tc] || 0) + (Number(r.lastActual) || 0);
    }
  });

  result.forEach((row) => {
    const isRefRow = row.itemCode?.endsWith('00') || row.itemName?.includes('上一年') || row.itemName?.includes('上年实际');
    if (row.isSummary === 1 && isRefRow) {
      // 参考行：lastActual = 同表全部明细行的上年实际合计
      row.lastActual = templateLastActual[row.templateCode || ''] || 0;
      return;
    }
    if (row.isSummary === 1) {
      const v = compute(row, row.templateCode);
      row.budgetAmount = v.budget;
      row.q1Amount = v.q1;
      row.q2Amount = v.q2;
      row.q3Amount = v.q3;
      row.q4Amount = v.q4;
      row.lastActual = v.lastActual;
    }
  });
  return result;
};

const handleInput = async (row: any) => {
  if (!queryParams.planId || !queryParams.orgId) {
    ElMessage.warning('请先选择预算方案和填报单位');
    return;
  }
  try {
    await inputExecution({
      planId: queryParams.planId,
      orgId: queryParams.orgId,
      templateCode: row.templateCode,
      itemCode: row.itemCode,
      q1Amount: row.q1Amount || 0,
      q2Amount: row.q2Amount || 0,
      q3Amount: row.q3Amount || 0,
      q4Amount: row.q4Amount || 0
    });
    ElMessage.success('执行数已保存');
    // 重新计算分类小计行
    tableData.value = calculateSummaryRows([...tableData.value]);
    // 重新加载顶部统计
    const summaryRes = await getExecutionSummary({ planId: queryParams.planId, orgId: queryParams.orgId });
    summary.value = summaryRes.data;
  } catch (error: any) {
    // 刚性控制拦截(超预算)或后端校验失败：弹出后端提示，并回滚当前行以还原显示
    ElMessage.error(error?.msg || error?.message || '保存失败');
    await loadData();
  }
};

const loadPlans = async () => {
  try {
    const res = await listPlan();
    const list = res.rows || res.data || [];
    planOptions.value = list.filter((p: any) => p.status === 'PUBLISHED' || p.status === 'ARCHIVED');
  } catch (error) {
    console.error(error);
  }
};

const loadDepts = async () => {
  try {
    // 使用按数据权限限缩的单位接口：集团账号返回全部填报单位，非集团账号只返回本单位
    const res = await getUnitOptions();
    const list = res.rows || res.data || [];
    deptOptions.value = Array.isArray(list) ? list : [];
    // 仅本单位时锁定填报单位并自动选中，不能查看全集团
    singleUnit.value = deptOptions.value.length <= 1;
    if (deptOptions.value.length === 1) {
      if (queryParams.orgId !== deptOptions.value[0].deptId) {
        queryParams.orgId = deptOptions.value[0].deptId;
        if (queryParams.planId) loadData();
      }
    }
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  loadPlans();
  loadDepts();
  tableHeight.value = window.innerHeight - 380;
});
</script>

<style scoped>
.stat-row {
  display: flex;
}

.stat-row :deep(.el-col) {
  display: flex;
}

.stat-row :deep(.el-col > .el-card) {
  width: 100%;
  display: flex;
  align-items: stretch;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: stretch;
}

.stat-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
}

.stat-inner {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
  line-height: 18px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 30px;
}

.stat-sub {
  height: 16px;
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  line-height: 16px;
}

.rate-progress {
  width: 90%;
  height: 16px;
  margin-top: 8px;
  max-width: 160px;
}

:deep(.summary-row) {
  background-color: #f0f7ff !important;
  font-weight: bold;
}

:deep(.readonly-row) {
  background-color: #fafafa !important;
  color: #999;
}

/* 备注行：整行淡色通栏展示 */
:deep(.note-row) {
  background-color: #fff6f4 !important;
}
.exec-note-text {
  display: inline-block;
  width: 100%;
  padding-left: 12px;
  color: #856b5e;
  font-size: 13px;
  line-height: 20px;
  white-space: normal;
}
</style>
