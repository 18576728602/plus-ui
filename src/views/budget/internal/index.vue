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
        <el-form-item v-if="planId">
          <el-tag type="info">共 {{ totalCount }} 条记录，已确认 {{ confirmedCount }} 条</el-tag>
          <el-tag v-if="currentPlanStatus && currentPlanStatus !== 'PUBLISHED'" type="warning" style="margin-left: 8px">归档/关闭方案，仅供查看</el-tag>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="!planId" shadow="never">
      <el-empty description="请先选择预算方案" />
    </el-card>

    <el-card v-else shadow="never">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="利润表抵销" name="IS" />
        <el-tab-pane label="资产负债表抵销" name="BS" />
        <el-tab-pane label="现金流量表抵销" name="CF" />
      </el-tabs>

      <!-- 操作栏 -->
      <el-row :gutter="10" class="mb-2">
        <el-col :span="1.5">
          <el-button type="primary" plain icon="Plus" :disabled="!planExecutable" @click="handleAdd">新增</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="success" plain icon="Check" :disabled="selectedIds.length === 0 || !planExecutable" @click="handleConfirm">批量确认</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="warning" plain icon="RefreshLeft" :disabled="selectedIds.length === 0 || !planExecutable" @click="handleRevoke">撤销确认</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0 || !planExecutable" @click="handleBatchDelete">批量删除</el-button>
        </el-col>
      </el-row>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
        :max-height="560"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column label="付款方/卖方" prop="fromDeptName" min-width="180" show-overflow-tooltip />
        <el-table-column label="收款方/买方" prop="toDeptName" min-width="180" show-overflow-tooltip />
        <el-table-column label="抵销项目" prop="projectName" min-width="160" show-overflow-tooltip />
        <el-table-column label="金额(万元)" prop="amount" width="140" align="right">
          <template #default="{ row }">
            <span :class="row.adjustment < 0 ? 'text-danger' : ''">{{ formatAmount(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="交易日期" prop="transactionDate" width="120" align="center">
          <template #default="{ row }">
            <span>{{ row.transactionDate ? row.transactionDate.substring(0, 10) : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" prop="status" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'CONFIRMED'" type="success" size="small">已确认</el-tag>
            <el-tag v-else type="info" size="small">草稿</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="180">
          <template #default="{ row }">
            <div style="white-space: pre-wrap; word-break: break-word; line-height: 1.4;">
              {{ row.remark || '-' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="160" align="center">
          <template #default="{ row }">
            <span>{{ row.createTime ? row.createTime.substring(0, 16) : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-tooltip content="修改" placement="top" v-if="row.status === 'DRAFT' && planExecutable">
              <el-button link type="primary" icon="Edit" @click="handleEdit(row)" />
            </el-tooltip>
            <el-tooltip content="确认" placement="top" v-if="row.status === 'DRAFT' && planExecutable">
              <el-button link type="success" icon="Check" @click="handleConfirmSingle(row)" />
            </el-tooltip>
            <el-tooltip content="撤销" placement="top" v-if="row.status === 'CONFIRMED' && planExecutable">
              <el-button link type="warning" icon="RefreshLeft" @click="handleRevokeSingle(row)">撤销</el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top" v-if="row.status === 'DRAFT' && planExecutable">
              <el-button link type="danger" icon="Delete" @click="handleDelete(row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-show="total > 0"
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="getList"
          @current-change="getList"
        />
      </div>
    </el-card>

    <!-- 新增/修改对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="付款方/卖方" prop="fromDeptId">
          <el-select v-model="form.fromDeptId" placeholder="请选择付款方/卖方" filterable style="width: 100%">
            <el-option v-for="item in deptOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="收款方/买方" prop="toDeptId">
          <el-select v-model="form.toDeptId" placeholder="请选择收款方/买方" filterable style="width: 100%">
            <el-option v-for="item in deptOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="抵销项目" prop="eliminationProject">
          <el-select v-model="form.eliminationProject" placeholder="请选择抵销项目" style="width: 100%">
            <el-option
              v-for="item in currentConfigs"
              :key="item.projectCode"
              :label="item.projectName"
              :value="item.projectCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="金额(万元)" prop="amount">
          <el-input-number v-model="form.amount" :precision="2" :controls="false" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="交易日期" prop="transactionDate">
          <el-date-picker v-model="form.transactionDate" type="date" value-format="YYYY-MM-DD" placeholder="选择交易日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="dialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="InternalTransaction">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  listInternalTransaction,
  addInternalTransaction,
  updateInternalTransaction,
  delInternalTransaction,
  delInternalTransactionBatch,
  confirmInternalTransaction,
  revokeInternalTransaction,
  getEliminationConfigs,
  getDeptOptions
} from '@/api/budget/internal';
import request from '@/utils/request';

const { proxy } = getCurrentInstance() as any;

// 数据
const loading = ref(false);
const planId = ref<number | undefined>(undefined);
const planOptions = ref<any[]>([]);
const activeTab = ref('IS');
const tableData = ref<any[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const deptOptions = ref<any[]>([]);
const allConfigs = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10
});

const dialog = reactive({
  visible: false,
  title: ''
});

const form = reactive<any>({
  id: undefined,
  planId: undefined,
  transactionType: 'IS',
  fromDeptId: undefined,
  toDeptId: undefined,
  eliminationProject: undefined,
  amount: 0,
  transactionDate: undefined,
  remark: undefined
});

const rules = {
  fromDeptId: [{ required: true, message: '请选择付款方/卖方', trigger: 'change' }],
  toDeptId: [{ required: true, message: '请选择收款方/买方', trigger: 'change' }],
  eliminationProject: [{ required: true, message: '请选择抵销项目', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
};

// 当前Tab的抵销项目配置
const currentConfigs = computed(() => {
  return allConfigs.value.filter(c => c.transactionType === activeTab.value);
});

// 统计
const totalCount = computed(() => total.value);
const confirmedCount = computed(() => {
  return tableData.value.filter((d: any) => d.status === 'CONFIRMED').length;
});

// 仅执行中(PUBLISHED)方案可登记内部交易；归档/关闭只读查看
const planExecutable = computed(() => {
  const p = planOptions.value.find((x: any) => x.id === planId.value);
  return !!p && p.status === 'PUBLISHED';
});
const currentPlanStatus = computed(() => {
  const p = planOptions.value.find((x: any) => x.id === planId.value);
  return p ? p.status : '';
});

// 获取预算方案列表
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

// 查询列表
const getList = async () => {
  if (!planId.value) return;
  loading.value = true;
  try {
    const res = await listInternalTransaction({
      planId: planId.value,
      transactionType: activeTab.value,
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize
    });
    tableData.value = res.rows || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
};

// 方案切换
const handlePlanChange = () => {
  queryParams.pageNum = 1;
  getList();
};

// Tab切换
const handleTabChange = () => {
  queryParams.pageNum = 1;
  getList();
};

// 选择
const handleSelectionChange = (selection: any[]) => {
  selectedIds.value = selection.map(item => item.id);
};

// 新增
const handleAdd = () => {
  Object.assign(form, {
    id: undefined,
    planId: planId.value,
    transactionType: activeTab.value,
    fromDeptId: undefined,
    toDeptId: undefined,
    eliminationProject: undefined,
    amount: 0,
    transactionDate: undefined,
    remark: undefined
  });
  dialog.title = '新增内部交易';
  dialog.visible = true;
};

// 修改
const handleEdit = (row: any) => {
  Object.assign(form, {
    id: row.id,
    planId: row.planId,
    transactionType: row.transactionType,
    fromDeptId: row.fromDeptId,
    toDeptId: row.toDeptId,
    eliminationProject: row.eliminationProject,
    amount: row.amount,
    transactionDate: row.transactionDate ? row.transactionDate.substring(0, 10) : undefined,
    remark: row.remark
  });
  dialog.title = '修改内部交易';
  dialog.visible = true;
};

// 提交
const submitForm = async () => {
  await proxy.$refs.formRef.validate(async (valid: boolean) => {
    if (!valid) return;
    if (form.fromDeptId === form.toDeptId) {
      ElMessage.warning('付款方和收款方不能是同一单位');
      return;
    }
    try {
      if (form.id) {
        await updateInternalTransaction(form);
        ElMessage.success('修改成功');
      } else {
        await addInternalTransaction(form);
        ElMessage.success('新增成功');
      }
      dialog.visible = false;
      getList();
    } catch (e) {
      // error handled by interceptor
    }
  });
};

// 删除
const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确认删除该条内部交易记录？`, '提示', { type: 'warning' });
  await delInternalTransaction(row.id);
  ElMessage.success('删除成功');
  getList();
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return;
  await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 条记录？`, '提示', { type: 'warning' });
  await delInternalTransactionBatch(selectedIds.value);
  ElMessage.success('删除成功');
  getList();
};

// 确认
const handleConfirm = async () => {
  if (selectedIds.value.length === 0) return;
  await ElMessageBox.confirm(`确认选中的 ${selectedIds.value.length} 条记录？确认后将纳入合并报表。`, '提示', { type: 'warning' });
  await confirmInternalTransaction(selectedIds.value);
  ElMessage.success('确认成功');
  getList();
};

const handleConfirmSingle = async (row: any) => {
  if (row.status !== 'DRAFT') return;
  await ElMessageBox.confirm(`确认该条记录将会纳入合并报表？`, '提示', { type: 'warning' });
  await confirmInternalTransaction([row.id]);
  ElMessage.success('确认成功');
  getList();
};

// 撤销确认
const handleRevoke = async () => {
  if (selectedIds.value.length === 0) return;
  await ElMessageBox.confirm(`确认撤销选中的 ${selectedIds.value.length} 条记录？`, '提示', { type: 'warning' });
  await revokeInternalTransaction(selectedIds.value);
  ElMessage.success('撤销成功');
  getList();
};

const handleRevokeSingle = (row: any) => {
  if (row.status !== 'CONFIRMED') return;
  // 撤销会退出合并报表，属危险操作，执行两级确认
  proxy.$modal
    .confirm(`确认撤销该条记录的确认？撤销后将退出合并报表。`, '撤销确认', { type: 'warning' })
    .then(() => proxy.$modal.confirm('请再次确认：撤销后将退出合并报表，且不可恢复，确认撤销？', '最终确认', { type: 'warning' }))
    .then(async () => {
      await revokeInternalTransaction([row.id]);
      ElMessage.success('撤销成功');
      getList();
    });
};

// 金额格式化
const formatAmount = (val: any) => {
  if (val == null) return '-';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// 初始化
onMounted(async () => {
  await getPlanList();
  // 获取部门选项
  const deptRes = await getDeptOptions();
  deptOptions.value = deptRes.data || [];
  // 获取抵销项目配置
  const configRes = await getEliminationConfigs();
  allConfigs.value = configRes.data || [];
});
</script>

<style scoped>
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.text-danger {
  color: #f56c6c;
}
.mb-2 {
  margin-bottom: 12px;
}
</style>
