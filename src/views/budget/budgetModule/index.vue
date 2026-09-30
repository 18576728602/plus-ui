<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="mb-[10px]">
        <el-card shadow="hover">
          <el-form ref="queryFormRef" :model="queryParams" :inline="true">
            <el-form-item label="部门ID" prop="deptId">
              <el-input v-model="queryParams.deptId" placeholder="请输入部门ID" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="预算表编号" prop="templateCode">
              <el-input v-model="queryParams.templateCode" placeholder="请输入预算表编号" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="负责科目编码列表(逗号分隔)" prop="itemCodes">
              <el-input v-model="queryParams.itemCodes" placeholder="请输入负责科目编码列表(逗号分隔)" clearable @keyup.enter="handleQuery" />
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
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['budget:budgetModule:add']">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()" v-hasPermi="['budget:budgetModule:edit']">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()" v-hasPermi="['budget:budgetModule:remove']">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['budget:budgetModule:export']">导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" border :data="budgetModuleList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="主键ID" align="center" prop="id" v-if="true" />
        <el-table-column label="部门ID" align="center" prop="deptId" />
        <el-table-column label="预算表编号" align="center" prop="templateCode" />
        <el-table-column label="负责科目编码列表(逗号分隔)" align="center" prop="itemCodes" />
        <el-table-column label="操作" align="center" fixed="right"  class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['budget:budgetModule:edit']"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['budget:budgetModule:remove']"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>
    <!-- 添加或修改部门-预算板块映射对话框 -->
    <el-dialog :title="dialog.title" v-model="dialog.visible" width="500px" append-to-body>
      <el-form ref="budgetModuleFormRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="部门ID" prop="deptId">
          <el-input v-model="form.deptId" placeholder="请输入部门ID" />
        </el-form-item>
        <el-form-item label="预算表编号" prop="templateCode">
          <el-input v-model="form.templateCode" placeholder="请输入预算表编号" />
        </el-form-item>
        <el-form-item label="负责科目编码列表(逗号分隔)" prop="itemCodes">
            <el-input v-model="form.itemCodes" type="textarea" placeholder="请输入内容" />
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

<script setup name="BudgetModule" lang="ts">
import { listBudgetModule, getBudgetModule, delBudgetModule, addBudgetModule, updateBudgetModule } from '@/api/budget/budgetModule';
import { BudgetModuleVO, BudgetModuleQuery, BudgetModuleForm } from '@/api/budget/budgetModule/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const budgetModuleList = ref<BudgetModuleVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const budgetModuleFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: BudgetModuleForm = {
  id: undefined,
  deptId: undefined,
  templateCode: undefined,
  itemCodes: undefined,
}
const data = reactive<PageData<BudgetModuleForm, BudgetModuleQuery>>({
  form: {...initFormData},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    deptId: undefined,
    templateCode: undefined,
    itemCodes: undefined,
    params: {
    }
  },
  rules: {
    id: [
      { required: true, message: "主键ID不能为空", trigger: "blur" }
    ],
    deptId: [
      { required: true, message: "部门ID不能为空", trigger: "blur" }
    ],
    templateCode: [
      { required: true, message: "预算表编号不能为空", trigger: "blur" }
    ],
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询部门-预算板块映射列表 */
const getList = async () => {
  loading.value = true;
  const res = await listBudgetModule(queryParams.value);
  budgetModuleList.value = res.rows;
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
  budgetModuleFormRef.value?.resetFields();
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
const handleSelectionChange = (selection: BudgetModuleVO[]) => {
  ids.value = selection.map(item => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
}

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = "添加部门-预算板块映射";
}

/** 修改按钮操作 */
const handleUpdate = async (row?: BudgetModuleVO) => {
  reset();
  const _id = row?.id || ids.value[0]
  const res = await getBudgetModule(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = "修改部门-预算板块映射";
}

/** 提交按钮 */
const submitForm = () => {
  budgetModuleFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      if (form.value.id) {
        await updateBudgetModule(form.value).finally(() =>  buttonLoading.value = false);
      } else {
        await addBudgetModule(form.value).finally(() =>  buttonLoading.value = false);
      }
      proxy?.$modal.msgSuccess("操作成功");
      dialog.visible = false;
      await getList();
    }
  });
}

/** 删除按钮操作 */
const handleDelete = async (row?: BudgetModuleVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除部门-预算板块映射编号为"' + _ids + '"的数据项？').finally(() => loading.value = false);
  await delBudgetModule(_ids);
  proxy?.$modal.msgSuccess("删除成功");
  await getList();
}

/** 导出按钮操作 */
const handleExport = () => {
  proxy?.download('system/budgetModule/export', {
    ...queryParams.value
  }, `budgetModule_${new Date().getTime()}.xlsx`)
}

onMounted(() => {
  getList();
});
</script>
