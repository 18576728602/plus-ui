<template>
  <div class="app-container">
    <!-- 顶部：方案选择 + 合并范围 -->
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
        <el-form-item label="申报单位">
          <el-select v-model="orgId" placeholder="全部单位（全集团）" clearable style="width: 260px" @change="handleOrgChange">
            <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.deptName" :value="d.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="scopeData">
          <el-tag type="info">合并范围：{{ scopeData.scopeDeptCount }} 家单位</el-tag>
        </el-form-item>
        <el-form-item v-if="scopeData">
          <el-tag type="warning">抵销调整：{{ totalEliminationCount }} 条，合计 {{ formatAmount(totalEliminationAmount) }} 万元</el-tag>
        </el-form-item>
      </el-form>
      <div v-if="scopeData && scopeData.scopeDeptNames && scopeData.scopeDeptNames.length > 0" class="scope-names">
        <span class="scope-label">合并单位：</span>
        <el-tag v-for="name in scopeData.scopeDeptNames" :key="name" size="small" class="scope-tag">{{ name }}</el-tag>
      </div>
      <div class="consol-toolbar">
        <span v-if="!canEdit && selectedPlan" class="readonly-tip">当前方案已归档/关闭，抵销调整只读</span>
        <el-button v-if="canEdit" type="success" size="small" @click="saveAdjustments">保存抵销调整</el-button>
        <el-button type="primary" size="small" @click="goToElimination">查看抵销分录明细</el-button>
      </div>
    </el-card>

    <el-card v-if="!planId" shadow="never">
      <el-empty description="请先选择预算方案" />
    </el-card>

    <div v-else>
      <!-- 合并报表 - Tab形式 -->
      <el-card shadow="never" class="mb-4">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="合并利润预算表" name="IS" />
          <el-tab-pane label="合并资产负债预算表" name="BS" />
          <el-tab-pane label="合并现金流量预算表" name="CF" />
        </el-tabs>

        <div v-if="loading" class="text-center py-8">
          <el-icon class="is-loading" :size="24"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <el-table
          v-else
          :data="statementData"
          border
          stripe
          :row-class-name="getRowClass"
          show-summary
          :summary-method="getSummaryRow"
        >
          <el-table-column label="项目" min-width="320">
            <template #default="{ row, $index }">
              <span v-if="isCollapsible(row, $index)" class="collapse-toggle" @click="toggleCollapse($index)">
                {{ isCollapsed($index) ? '►' : '▼' }}
              </span>
              <span :style="{ paddingLeft: (row.itemLevel - 1) * 20 + 'px', fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">
                {{ row.itemName }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="合并前合计(万元)" width="200" align="right">
            <template #default="{ row }">
              <span :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">{{ formatAmount(row.totalBefore) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="抵销调整(万元)" width="200" align="right">
            <template #default="{ row }">
              <el-input-number
                v-if="canEdit"
                v-model="row.adjustment"
                :precision="2"
                :controls="false"
                size="small"
                class="adjust-input"
                @change="onAdjustChange(row)"
              />
              <span v-else-if="row.adjustment && Number(row.adjustment) !== 0" class="text-danger" :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">
                {{ formatAmount(row.adjustment) }}
              </span>
              <span v-else :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">-</span>
            </template>
          </el-table-column>
          <el-table-column label="合并后金额(万元)" width="200" align="right">
            <template #default="{ row }">
              <span :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal', color: Number(row.totalAfter) < 0 ? '#f56c6c' : '' }">
                {{ formatAmount(row.totalAfter) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 抵销汇总 -->
      <el-card shadow="never" v-if="eliminationSummary.length > 0" class="mb-4">
        <template #header>
          <span class="font-bold">抵销汇总</span>
        </template>
        <el-table :data="eliminationSummary" border stripe size="small">
          <el-table-column label="抵销类型" prop="transactionTypeName" width="180" />
          <el-table-column label="抵销项目" prop="projectName" min-width="200" />
          <el-table-column label="记录数" prop="count" width="100" align="center" />
          <el-table-column label="抵销金额(万元)" width="180" align="right">
            <template #default="{ row }">
              <span class="text-danger">-{{ formatAmount(row.totalAmount) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 合并说明 -->
      <el-card shadow="never">
        <template #header>
          <span class="font-bold">合并说明</span>
        </template>
        <div class="consolidation-note">
          <p><strong>合并范围：</strong>九江市工业发展集团有限公司本部及下属13家子公司</p>
          <p><strong>合并方法：</strong>合并后金额 = 合并前合计 + 抵销调整</p>
          <p><strong>数据来源：</strong>合并前合计来自各单位已审批的预算数据，抵销调整来自已确认的内部交易登记</p>
          <p><strong>明细依据：</strong>合并结果基于已确认内部交易生成的逐笔抵销分录，点击页面「查看抵销分录明细」可核对每笔抵销依据、关联科目与方向。</p>
          <p><strong>抵销类型：</strong></p>
          <ul>
            <li>利润表抵销：内部销售收入、内部销售成本、内部利息收支等</li>
            <li>资产负债表抵销：内部应收应付账款、内部其他应收应付款、内部长期借款等</li>
            <li>现金流量表抵销：内部经营活动现金流、内部投资活动现金流、内部筹资活动现金流</li>
          </ul>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts" name="ConsolidatedStatements">
import { ref, computed, getCurrentInstance, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  getConsolidatedStatement,
  getConsolidationScope,
  getEliminationSummary,
  saveConsolidatedAdjustments
} from '@/api/budget/internal';
import { getUnitOptions } from '@/api/budget/dashboard';
import request from '@/utils/request';

const { proxy } = getCurrentInstance() as any;
const router = useRouter();

const loading = ref(false);
const planId = ref<number | undefined>(undefined);
const orgId = ref<number | undefined>(undefined);
const planOptions = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
const selectedPlan = ref<any>(null);
const activeTab = ref('IS');
const statementData = ref<any[]>([]);
const scopeData = ref<any>(null);
const eliminationSummary = ref<any[]>([]);
const collapsedSet = ref<Set<number>>(new Set());

const getPlanList = async () => {
  try {
    const res = await request({ url: '/budget/plan/list', method: 'get', params: { pageSize: 999 } });
    if (res.code === 200) {
      const rows = res.rows || res.data || [];
      planOptions.value = rows.filter((p: any) => p.status === 'PUBLISHED' || p.status === 'ARCHIVED');
    }
  } catch (e) {
    // fallback
  }
};

const getStatement = async () => {
  if (!planId.value) return;
  loading.value = true;
  try {
    const res = await getConsolidatedStatement(planId.value, activeTab.value, orgId.value);
    statementData.value = (res.data || []).map((r: any) => {
      r.adjustment = Number(r.adjustment) || 0;
      r._edited = false;
      return r;
    });
    // 默认收缩资产负债表中有明细的大类（流动资产/非流动资产等）
    const s = new Set<number>();
    if (activeTab.value === 'BS') {
      const data = statementData.value;
      for (let i = 0; i < data.length; i++) {
        if (data[i].itemLevel > 1) {
          const g = groupOf(i);
          if (g >= 0) s.add(g);
        }
      }
    }
    collapsedSet.value = s;
  } finally {
    loading.value = false;
  }
};

const getScope = async () => {
  if (!planId.value) return;
  const res = await getConsolidationScope(planId.value, orgId.value);
  scopeData.value = res.data;
};

const getEliminationSummaryData = async () => {
  if (!planId.value) return;
  const res = await getEliminationSummary(planId.value, orgId.value);
  eliminationSummary.value = res.data || [];
};

const handlePlanChange = () => {
  setSelectedPlan();
  getStatement();
  getScope();
  getEliminationSummaryData();
};

const handleOrgChange = () => {
  getStatement();
  getScope();
  getEliminationSummaryData();
};

const setSelectedPlan = () => {
  selectedPlan.value = planOptions.value.find((p: any) => p.id === planId.value) || null;
};

const goToElimination = () => {
  router.push('/budget/elimination');
};

const handleTabChange = () => {
  getStatement();
};

// ---- 抵销调整手动编辑 ----
const canEdit = computed(() => !!selectedPlan.value && selectedPlan.value.status === 'PUBLISHED');

const onAdjustChange = (row: any) => {
  row._edited = true;
  row.adjustment = Number(row.adjustment) || 0;
};

const saveAdjustments = async () => {
  if (!planId.value) return;
  const edited = statementData.value.filter((r: any) => r._edited && r.itemCode);
  if (edited.length === 0) {
    proxy?.$modal.msgWarning('没有需要保存的改动');
    return;
  }
  const adjustments = edited.map((r: any) => ({
    itemCode: r.itemCode,
    adjustAmount: Number(r.adjustment) || 0
  }));
  try {
    const res = await saveConsolidatedAdjustments({
      planId: planId.value,
      statementType: activeTab.value,
      adjustments
    });
    if (res.code === 200) {
      proxy?.$modal.msgSuccess('抵销调整已保存');
      await getStatement();
    }
  } catch (e) {
    // 错误由拦截器统一提示
  }
};

// ---- 资产负债大类伸缩 ----
const groupOf = (idx: number) => {
  const data = statementData.value;
  for (let j = idx - 1; j >= 0; j--) {
    if (data[j].itemLevel === 1) return j;
  }
  return -1;
};

const collapsibleSet = computed(() => {
  const s = new Set<number>();
  if (activeTab.value !== 'BS') return s;
  const data = statementData.value;
  for (let i = 0; i < data.length; i++) {
    if (data[i].itemLevel > 1) {
      const g = groupOf(i);
      if (g >= 0) s.add(g);
    }
  }
  return s;
});

const isCollapsible = (row: any, idx: number) =>
  activeTab.value === 'BS' && row.itemLevel === 1 && collapsibleSet.value.has(idx);

const isCollapsed = (idx: number) => collapsedSet.value.has(idx);

const toggleCollapse = (idx: number) => {
  const s = new Set(collapsedSet.value);
  if (s.has(idx)) {
    s.delete(idx);
  } else {
    s.add(idx);
  }
  collapsedSet.value = s;
};

const rowHidden = (idx: number) => {
  if (activeTab.value !== 'BS') return false;
  const row = statementData.value[idx];
  if (!row || row.itemLevel === 1) return false;
  const g = groupOf(idx);
  return g >= 0 && collapsedSet.value.has(g);
};

const getRowClass = ({ row, rowIndex }: any) => {
  if (rowHidden(rowIndex)) return 'collapse-hidden';
  if (row.isSummary === 1) return 'summary-row';
  if (row.adjustment && Number(row.adjustment) !== 0) return 'adjustment-row';
  return '';
};

const getSummaryRow = (param: any) => {
	  const { columns, data } = param;
	  // 叶子行 = 不以任何行为父级（双向判定，兼容"合计行在下、明细在上"的16表结构）。
	  // 作用是让底部合计=所有叶子明细之和，既保留营业收入这类无子的一级行(含抵销调整)，
	  // 又不重复计入已被汇总的三公费用合计(1604)。解决利润表-120未计入、现金流量表合计为0的问题。
	  const isUnder = (i: number, j: number) => {
	    const lvi = Number(data[i]?.itemLevel) || 0;
	    const lvj = Number(data[j]?.itemLevel) || 0;
	    if (lvj <= lvi) return false;
	    const lo = Math.min(i, j) + 1;
	    const hi = Math.max(i, j);
	    for (let k = lo; k < hi; k++) {
	      if (Number(data[k]?.itemLevel) <= lvi) return false;
	    }
	    return true;
	  };
	  const hasChild = new Set<number>();
	  for (let i = 0; i < data.length; i++) {
	    for (let j = 0; j < data.length; j++) {
	      if (i !== j && isUnder(i, j)) { hasChild.add(i); break; }
	    }
	  }
	  const leafRows = data.filter((_: any, i: number) => !hasChild.has(i));
	  const sums: string[] = [];
	  columns.forEach((column: any, index: number) => {
	    if (index === 0) {
	      sums[index] = '合计';
	      return;
	    }
	    const filteredValues = leafRows.map((item: any) => {
	      if (index === 1) return Number(item.totalBefore) || 0;
	      if (index === 2) return Number(item.adjustment) || 0;
	      if (index === 3) return Number(item.totalAfter) || 0;
	      return 0;
	    });
	    const total = filteredValues.reduce((sum: number, val: number) => sum + val, 0);
	    sums[index] = total !== 0 ? formatAmount(total) : '-';
	  });
	  return sums;
	};

const formatAmount = (val: any) => {
  if (val == null) return '-';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const totalEliminationCount = computed(() => {
  return eliminationSummary.value.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
});

const totalEliminationAmount = computed(() => {
  return eliminationSummary.value.reduce((sum: number, item: any) => sum + Number(item.totalAmount || 0), 0);
});

const getUnitList = async () => {
  try {
    const res = await getUnitOptions();
    const list = res.rows || res.data || [];
    deptOptions.value = Array.isArray(list) ? list : [];
  } catch (e) {
    // fallback
  }
};

onMounted(async () => {
  await getPlanList();
  setSelectedPlan();
  getUnitList();
});
</script>

<style scoped>
.scope-names {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.scope-label {
  color: #606266;
  font-size: 13px;
  margin-right: 8px;
}
.scope-tag {
  margin-right: 6px;
  margin-bottom: 4px;
}
.consol-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.text-danger {
  color: #f56c6c;
}
.font-bold {
  font-weight: bold;
}
.mb-4 {
  margin-bottom: 16px;
}
.py-8 {
  padding: 32px 0;
}
.text-center {
  text-align: center;
}
:deep(.summary-row) {
  background-color: #f5f7fa !important;
  font-weight: bold;
}
:deep(.adjustment-row) {
  background-color: #fef0f0 !important;
}
:deep(.collapse-hidden) {
  display: none !important;
}
.collapse-toggle {
  display: inline-block;
  width: 16px;
  cursor: pointer;
  color: #409eff;
  font-size: 12px;
  margin-right: 2px;
  user-select: none;
}
.adjust-input {
  width: 100%;
}
.readonly-tip {
  color: #909399;
  font-size: 13px;
  margin-right: 12px;
}
.consolidation-note {
  line-height: 1.8;
  color: #606266;
  font-size: 14px;
}
.consolidation-note ul {
  padding-left: 20px;
}
.consolidation-note li {
  margin-bottom: 4px;
}
</style>
