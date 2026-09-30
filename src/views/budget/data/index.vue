<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="mb-[10px]">
        <el-card shadow="hover">
          <el-form ref="queryFormRef" :model="queryParams" :inline="true">
            <el-form-item label="预算方案ID" prop="planId">
              <el-input v-model="queryParams.planId" placeholder="请输入预算方案ID" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="组织ID(单位)" prop="orgId">
              <el-input v-model="queryParams.orgId" placeholder="请输入组织ID(单位)" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="部门ID(集团本部部门填报时)" prop="deptId">
              <el-input v-model="queryParams.deptId" placeholder="请输入部门ID(集团本部部门填报时)" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="预算表编号" prop="templateCode">
              <el-input v-model="queryParams.templateCode" placeholder="请输入预算表编号" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="科目编码" prop="itemCode">
              <el-input v-model="queryParams.itemCode" placeholder="请输入科目编码" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="预算金额" prop="budgetAmount">
              <el-input v-model="queryParams.budgetAmount" placeholder="请输入预算金额" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="上年实际金额" prop="lastActual">
              <el-input v-model="queryParams.lastActual" placeholder="请输入上年实际金额" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="实际执行金额" prop="executionAmount">
              <el-input v-model="queryParams.executionAmount" placeholder="请输入实际执行金额" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="数据版本: BUDGET=预算数, ACTUAL=上年实际, EXECUTION=执行数" prop="dataVersion">
              <el-input v-model="queryParams.dataVersion" placeholder="请输入数据版本: BUDGET=预算数, ACTUAL=上年实际, EXECUTION=执行数" clearable @keyup.enter="handleQuery" />
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
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['budget:data:add']">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()" v-hasPermi="['budget:data:edit']">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()" v-hasPermi="['budget:data:remove']">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['budget:data:export']">导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" border :data="dataList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="主键ID" align="center" prop="id" v-if="true" />
        <el-table-column label="预算方案ID" align="center" prop="planId" />
        <el-table-column label="组织ID(单位)" align="center" prop="orgId" />
        <el-table-column label="部门ID(集团本部部门填报时)" align="center" prop="deptId" />
        <el-table-column label="预算表编号" align="center" prop="templateCode" />
        <el-table-column label="科目编码" align="center" prop="itemCode" />
        <el-table-column label="预算金额" align="center" prop="budgetAmount" />
        <el-table-column label="上年实际金额" align="center" prop="lastActual" />
        <el-table-column label="实际执行金额" align="center" prop="executionAmount" />
        <el-table-column label="数据版本: BUDGET=预算数, ACTUAL=上年实际, EXECUTION=执行数" align="center" prop="dataVersion" />
        <el-table-column label="填报说明" align="center" prop="remark" />
        <el-table-column label="状态: DRAFT=草稿, SUBMITTED=已提交, APPROVED=已审批, REJECTED=已驳回" align="center" prop="status" />
        <el-table-column label="操作" align="center" fixed="right"  class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['budget:data:edit']"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['budget:data:remove']"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>
    <!-- 添加或修改预算填报数据对话框 -->
    <el-dialog :title="dialog.title" v-model="dialog.visible" width="500px" append-to-body>
      <el-form ref="dataFormRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="预算方案ID" prop="planId">
          <el-input v-model="form.planId" placeholder="请输入预算方案ID" />
        </el-form-item>
        <el-form-item label="组织ID(单位)" prop="orgId">
          <el-input v-model="form.orgId" placeholder="请输入组织ID(单位)" />
        </el-form-item>
        <el-form-item label="部门ID(集团本部部门填报时)" prop="deptId">
          <el-input v-model="form.deptId" placeholder="请输入部门ID(集团本部部门填报时)" />
        </el-form-item>
        <el-form-item label="预算表编号" prop="templateCode">
          <el-input v-model="form.templateCode" placeholder="请输入预算表编号" />
        </el-form-item>
        <el-form-item label="科目编码" prop="itemCode">
          <el-input v-model="form.itemCode" placeholder="请输入科目编码" />
        </el-form-item>
        <el-form-item label="预算金额" prop="budgetAmount">
          <el-input v-model="form.budgetAmount" placeholder="请输入预算金额" />
        </el-form-item>
        <el-form-item label="上年实际金额" prop="lastActual">
          <el-input v-model="form.lastActual" placeholder="请输入上年实际金额" />
        </el-form-item>
        <el-form-item label="实际执行金额" prop="executionAmount">
          <el-input v-model="form.executionAmount" placeholder="请输入实际执行金额" />
        </el-form-item>
        <el-form-item label="数据版本: BUDGET=预算数, ACTUAL=上年实际, EXECUTION=执行数" prop="dataVersion">
          <el-input v-model="form.dataVersion" placeholder="请输入数据版本: BUDGET=预算数, ACTUAL=上年实际, EXECUTION=执行数" />
        </el-form-item>
        <el-form-item label="填报说明" prop="remark">
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

<script setup name="Data" lang="ts">
import { listData, getData, delData, addData, updateData } from '@/api/budget/data';
import { DataVO, DataQuery, DataForm } from '@/api/budget/data/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const dataList = ref<DataVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const dataFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: DataForm = {
  id: undefined,
  planId: undefined,
  orgId: undefined,
  deptId: undefined,
  templateCode: undefined,
  itemCode: undefined,
  budgetAmount: undefined,
  lastActual: undefined,
  executionAmount: undefined,
  dataVersion: undefined,
  remark: undefined,
  status: undefined,
}
const data = reactive<PageData<DataForm, DataQuery>>({
  form: {...initFormData},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    planId: undefined,
    orgId: undefined,
    deptId: undefined,
    templateCode: undefined,
    itemCode: undefined,
    budgetAmount: undefined,
    lastActual: undefined,
    executionAmount: undefined,
    dataVersion: undefined,
    status: undefined,
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
    orgId: [
      { required: true, message: "组织ID(单位)不能为空", trigger: "blur" }
    ],
    templateCode: [
      { required: true, message: "预算表编号不能为空", trigger: "blur" }
    ],
    itemCode: [
      { required: true, message: "科目编码不能为空", trigger: "blur" }
    ],
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询预算填报数据列表 */
const getList = async () => {
  loading.value = true;
  const res = await listData(queryParams.value);
  dataList.value = res.rows;
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
  dataFormRef.value?.resetFields();
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
const handleSelectionChange = (selection: DataVO[]) => {
  ids.value = selection.map(item => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
}

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = "添加预算填报数据";
}

/** 修改按钮操作 */
const handleUpdate = async (row?: DataVO) => {
  reset();
  const _id = row?.id || ids.value[0]
  const res = await getData(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = "修改预算填报数据";
}

/** 提交按钮 */
const submitForm = () => {
  dataFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      if (form.value.id) {
        await updateData(form.value).finally(() =>  buttonLoading.value = false);
      } else {
        await addData(form.value).finally(() =>  buttonLoading.value = false);
      }
      proxy?.$modal.msgSuccess("操作成功");
      dialog.visible = false;
      await getList();
    }
  });
}

/** 删除按钮操作 */
const handleDelete = async (row?: DataVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除预算填报数据编号为"' + _ids + '"的数据项？').finally(() => loading.value = false);
  await delData(_ids);
  proxy?.$modal.msgSuccess("删除成功");
  await getList();
}

/** 导出按钮操作 */
const handleExport = () => {
  proxy?.download('system/data/export', {
    ...queryParams.value
  }, `data_${new Date().getTime()}.xlsx`)
}

onMounted(() => {
  getList();
});
</script>
