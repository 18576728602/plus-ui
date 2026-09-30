<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="mb-[10px]">
        <el-card shadow="hover">
          <el-form ref="queryFormRef" :model="queryParams" :inline="true">
            <el-form-item label="预算方案ID" prop="planId">
              <el-input v-model="queryParams.planId" placeholder="请输入预算方案ID" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="借出方组织ID" prop="lenderOrgId">
              <el-input v-model="queryParams.lenderOrgId" placeholder="请输入借出方组织ID" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="借入方组织ID" prop="borrowerOrgId">
              <el-input v-model="queryParams.borrowerOrgId" placeholder="请输入借入方组织ID" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="金额(万元)" prop="amount">
              <el-input v-model="queryParams.amount" placeholder="请输入金额(万元)" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="利率" prop="interestRate">
              <el-input v-model="queryParams.interestRate" placeholder="请输入利率" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker clearable
                v-model="queryParams.startDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择开始日期"
              />
            </el-form-item>
            <el-form-item label="结束日期" prop="endDate">
              <el-date-picker clearable
                v-model="queryParams.endDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择结束日期"
              />
            </el-form-item>
            <el-form-item label="是否已配对: 0=否, 1=是" prop="matched">
              <el-input v-model="queryParams.matched" placeholder="请输入是否已配对: 0=否, 1=是" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
              <el-button icon="Refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['budget:transaction:add']">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()" v-hasPermi="['budget:transaction:edit']">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()" v-hasPermi="['budget:transaction:remove']">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['budget:transaction:export']">导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" border :data="transactionList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="主键ID" align="center" prop="id" v-if="true" />
        <el-table-column label="预算方案ID" align="center" prop="planId" />
        <el-table-column label="借出方组织ID" align="center" prop="lenderOrgId" />
        <el-table-column label="借入方组织ID" align="center" prop="borrowerOrgId" />
        <el-table-column label="交易类型: LOAN=统借统贷, FUND_TRANSFER=闲置资金调剂, INTERNAL_SALE=内部购销" align="center" prop="tradeType" />
        <el-table-column label="金额(万元)" align="center" prop="amount" />
        <el-table-column label="利率" align="center" prop="interestRate" />
        <el-table-column label="开始日期" align="center" prop="startDate" width="180">
          <template #default="scope">
            <span>{{ parseTime(scope.row.startDate, '{y}-{m}-{d}') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="结束日期" align="center" prop="endDate" width="180">
          <template #default="scope">
            <span>{{ parseTime(scope.row.endDate, '{y}-{m}-{d}') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="是否已配对: 0=否, 1=是" align="center" prop="matched" />
        <el-table-column label="备注" align="center" prop="remark" />
        <el-table-column label="操作" align="center" fixed="right"  class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['budget:transaction:edit']"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['budget:transaction:remove']"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>
    <!-- 添加或修改内部交易登记对话框 -->
    <el-dialog :title="dialog.title" v-model="dialog.visible" width="500px" append-to-body>
      <el-form ref="transactionFormRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="预算方案ID" prop="planId">
          <el-input v-model="form.planId" placeholder="请输入预算方案ID" />
        </el-form-item>
        <el-form-item label="借出方组织ID" prop="lenderOrgId">
          <el-input v-model="form.lenderOrgId" placeholder="请输入借出方组织ID" />
        </el-form-item>
        <el-form-item label="借入方组织ID" prop="borrowerOrgId">
          <el-input v-model="form.borrowerOrgId" placeholder="请输入借入方组织ID" />
        </el-form-item>
        <el-form-item label="金额(万元)" prop="amount">
          <el-input v-model="form.amount" placeholder="请输入金额(万元)" />
        </el-form-item>
        <el-form-item label="利率" prop="interestRate">
          <el-input v-model="form.interestRate" placeholder="请输入利率" />
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker clearable
            v-model="form.startDate"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择开始日期">
          </el-date-picker>
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker clearable
            v-model="form.endDate"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择结束日期">
          </el-date-picker>
        </el-form-item>
        <el-form-item label="是否已配对: 0=否, 1=是" prop="matched">
          <el-input v-model="form.matched" placeholder="请输入是否已配对: 0=否, 1=是" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Transaction" lang="ts">
import { listTransaction, getTransaction, delTransaction, addTransaction, updateTransaction } from '@/api/budget/transaction';
import { TransactionVO, TransactionQuery, TransactionForm } from '@/api/budget/transaction/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const transactionList = ref<TransactionVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const transactionFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: TransactionForm = {
  id: undefined,
  planId: undefined,
  lenderOrgId: undefined,
  borrowerOrgId: undefined,
  tradeType: undefined,
  amount: undefined,
  interestRate: undefined,
  startDate: undefined,
  endDate: undefined,
  matched: undefined,
  remark: undefined,
}
const data = reactive<PageData<TransactionForm, TransactionQuery>>({
  form: {...initFormData},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    planId: undefined,
    lenderOrgId: undefined,
    borrowerOrgId: undefined,
    tradeType: undefined,
    amount: undefined,
    interestRate: undefined,
    startDate: undefined,
    endDate: undefined,
    matched: undefined,
    params: {
    }
  },
  rules: {
    id: [
      { required: true, message: "主键ID不能为空", trigger: "blur" }
    ],
    planId: [
      { required: true, message: "预算方案ID不能为空", trigger: "blur" }
    ],
    lenderOrgId: [
      { required: true, message: "借出方组织ID不能为空", trigger: "blur" }
    ],
    borrowerOrgId: [
      { required: true, message: "借入方组织ID不能为空", trigger: "blur" }
    ],
    tradeType: [
      { required: true, message: "交易类型: LOAN=统借统贷, FUND_TRANSFER=闲置资金调剂, INTERNAL_SALE=内部购销不能为空", trigger: "change" }
    ],
    amount: [
      { required: true, message: "金额(万元)不能为空", trigger: "blur" }
    ],
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询内部交易登记列表 */
const getList = async () => {
  loading.value = true;
  const res = await listTransaction(queryParams.value);
  transactionList.value = res.rows;
  total.value = res.total;
  loading.value = false;
}

/** 取消按钮 */
const cancel = () => {
  reset();
  dialog.visible = false;
}

/** 表单重置 */
const reset = () => {
  form.value = {...initFormData};
  transactionFormRef.value?.resetFields();
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
}

/** 多选框选中数据 */
const handleSelectionChange = (selection: TransactionVO[]) => {
  ids.value = selection.map(item => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
}

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = "添加内部交易登记";
}

/** 修改按钮操作 */
const handleUpdate = async (row?: TransactionVO) => {
  reset();
  const _id = row?.id || ids.value[0]
  const res = await getTransaction(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = "修改内部交易登记";
}

/** 提交按钮 */
const submitForm = () => {
  transactionFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      if (form.value.id) {
        await updateTransaction(form.value).finally(() =>  buttonLoading.value = false);
      } else {
        await addTransaction(form.value).finally(() =>  buttonLoading.value = false);
      }
      proxy?.$modal.msgSuccess("操作成功");
      dialog.visible = false;
      await getList();
    }
  });
}

/** 删除按钮操作 */
const handleDelete = async (row?: TransactionVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除内部交易登记编号为"' + _ids + '"的数据项？').finally(() => loading.value = false);
  await delTransaction(_ids);
  proxy?.$modal.msgSuccess("删除成功");
  await getList();
}

/** 导出按钮操作 */
const handleExport = () => {
  proxy?.download('budget/transaction/export', {
    ...queryParams.value
  }, `transaction_${new Date().getTime()}.xlsx`)
}

onMounted(() => {
  getList();
});
</script>
