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
        <el-form-item v-if="planStatus === 'ARCHIVED'">
          <el-tag type="warning">已归档方案，仅供查看</el-tag>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 空状态 -->
    <el-card v-if="!planId" shadow="never">
      <el-empty description="请先选择预算方案" />
    </el-card>

    <!-- 矩阵数据 -->
    <el-card v-else shadow="never" v-loading="loading">
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
        stripe
        size="small"
        style="width: 100%"
        :header-cell-style="{ whiteSpace: 'normal', lineHeight: '18px', padding: '6px 2px', wordBreak: 'break-all', textAlign: 'center' }"
      >
        <el-table-column
          v-for="col in displayColumns"
          :key="col.field"
          :prop="col.field"
          :label="col.label"
          :fixed="col.fixed"
          :min-width="col.minWidth || col.width || 120"
          :align="col.align || 'left'"
        >
          <template #default="{ row }">
            <!-- 科目名称列 -->
            <template v-if="col.field === 'itemName'">
              <span :style="{
                display: 'block',
                whiteSpace: 'normal',
                wordBreak: 'break-all',
                lineHeight: '1.4',
                paddingLeft: ((row.itemLevel || 1) - 1) * 16 + 'px',
                fontWeight: row.isSummary === 1 ? 'bold' : 'normal',
                color: row.isSummary === 1 ? '#303133' : '#606266'
              }">
                {{ row.itemName }}
              </span>
            </template>
            <!-- 合计列 -->
            <template v-else-if="col.field === 'total'">
              <span v-if="row.total === '-' || row.total == null" style="color: #c0c4cc">-</span>
              <span v-else style="font-weight: bold; color: #409eff">
                {{ formatAmount(row.total) }}
              </span>
            </template>
            <!-- 文本类模板（01公司基本信息） -->
            <template v-else-if="matrixData.isTextTemplate">
              <span>{{ row[col.field] || '-' }}</span>
            </template>
            <!-- 数值列 -->
            <template v-else>
              <span :style="{ color: row[col.field] != null ? '#303133' : '#c0c4cc' }">
                {{ row[col.field] != null ? formatAmount(row[col.field]) : '-' }}
              </span>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 无数据 -->
      <el-empty v-else-if="!loading && activeTab" description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts" name="BudgetMatrix">
import request from '@/utils/request';

const loading = ref(false);
const planId = ref<any>(null);
const planOptions = ref<any[]>([]);
const planStatus = ref<string>('');
const templates = ref<any[]>([]);
const activeTab = ref('');
const matrixData = ref<any>(null);

// 把合计列从最右侧挪到"预算科目"列右侧
const displayColumns = computed(() => {
  const cols = matrixData.value?.columns || [];
  if (!Array.isArray(cols) || cols.length === 0) return cols;
  const totalIdx = cols.findIndex((c: any) => c.field === 'total');
  if (totalIdx < 0) return cols;
  const totalCol = cols[totalIdx];
  const nameIdx = cols.findIndex((c: any) => c.field === 'itemName');
  const rest = cols.filter((c: any) => c.field !== 'total');
  const insertAt = nameIdx >= 0 ? nameIdx + 1 : 1;
  const result = [...rest];
  // 合计列与预算项目列一样固定，滚动各单位列时始终可见
  result.splice(insertAt, 0, { ...totalCol, fixed: 'left' });
  return result;
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
      url: '/budget/matrix/templates',
      method: 'get'
    });
    templates.value = res.data || [];
    if (templates.value.length > 0) {
      activeTab.value = templates.value[0].code;
    }
  } catch (e) {
    console.error('加载模板列表失败', e);
  }
};

// 加载矩阵数据
const loadMatrixData = async () => {
  if (!planId.value || !activeTab.value) return;
  loading.value = true;
  try {
    const res = await request({
      url: '/budget/matrix/data',
      method: 'get',
      params: { planId: planId.value, templateCode: activeTab.value }
    });
    matrixData.value = res.data;
  } catch (e) {
    console.error('加载矩阵数据失败', e);
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
  if (isNaN(num)) return val;
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
</style>
