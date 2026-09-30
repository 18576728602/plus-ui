<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="mb-[10px]">
        <el-card shadow="hover">
          <el-form ref="queryFormRef" :model="queryParams" :inline="true">
            <el-form-item label="预算方案" prop="planId">
              <el-select v-model="queryParams.planId" placeholder="请选择预算方案" clearable filterable @change="handleQuery" class="!w-56">
                <el-option v-for="item in planOptions" :key="item.id" :label="item.planName" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="预算表编号(01-16)" prop="templateCode">
              <el-input v-model="queryParams.templateCode" placeholder="请输入预算表编号(01-16)" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="预算表名称" prop="templateName">
              <el-input v-model="queryParams.templateName" placeholder="请输入预算表名称" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="科目编码" prop="itemCode">
              <el-input v-model="queryParams.itemCode" placeholder="请输入科目编码" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="科目名称" prop="itemName">
              <el-input v-model="queryParams.itemName" placeholder="请输入科目名称" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="上级科目编码" prop="parentCode">
              <el-input v-model="queryParams.parentCode" placeholder="请输入上级科目编码" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="层级" prop="itemLevel">
              <el-input v-model="queryParams.itemLevel" placeholder="请输入层级" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="排序号" prop="itemOrder">
              <el-input v-model="queryParams.itemOrder" placeholder="请输入排序号" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="负责部门编码" prop="responsibleDept">
              <el-input v-model="queryParams.responsibleDept" placeholder="请输入负责部门编码" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="是否汇总行: 0=否, 1=是" prop="isSummary">
              <el-input v-model="queryParams.isSummary" placeholder="请输入是否汇总行: 0=否, 1=是" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="是否可编辑: 0=否, 1=是" prop="isEditable">
              <el-input v-model="queryParams.isEditable" placeholder="请输入是否可编辑: 0=否, 1=是" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="计算公式(如: SUM(children))" prop="formula">
              <el-input v-model="queryParams.formula" placeholder="请输入计算公式(如: SUM(children))" clearable @keyup.enter="handleQuery" />
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
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['budget:templateItem:add']">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()" v-hasPermi="['budget:templateItem:edit']">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()" v-hasPermi="['budget:templateItem:remove']">停用</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="RefreshLeft" :disabled="queryParams.planId === undefined || queryParams.planId === null" @click="openDisabled" v-hasPermi="['budget:templateItem:edit']">已停用</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['budget:templateItem:export']">导出</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-switch v-model="treeMode" active-text="树形" inactive-text="列表" inline-prompt @change="handleViewChange" />
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" border row-key="id" :data="treeMode ? treeData : templateItemList" :tree-props="{ children: 'children' }" :default-expand-all="treeMode" :indent="22" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" :selectable="(row) => !row._isRoot" />
        <el-table-column label="主键ID" align="center" prop="id" v-if="true" />
        <el-table-column label="预算表编号(01-16)" align="center" prop="templateCode" />
        <el-table-column label="预算表名称" align="center" prop="templateName" />
        <el-table-column label="科目编码" align="center" prop="itemCode" min-width="110" />
        <el-table-column label="科目名称" align="center" prop="itemName" min-width="160" />
        <el-table-column label="来源" align="center" width="130">
          <template #default="scope">
            <el-tag v-if="scope.row._isRoot" type="primary" disable-transitions>模板</el-tag>
            <el-tag v-else-if="scope.row.planId === 0" type="info" disable-transitions>基础模板</el-tag>
            <el-tag v-else-if="scope.row.fromPlanId == null" type="success" disable-transitions>本方案新增</el-tag>
            <el-tag v-else-if="scope.row.fromPlanId === 0" type="warning" disable-transitions>继承自基础</el-tag>
            <el-tag v-else type="warning" disable-transitions>继承自历史方案</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上级科目编码" align="center" prop="parentCode" />
        <el-table-column label="层级" align="center" prop="itemLevel" />
        <el-table-column label="排序号" align="center" prop="itemOrder" />
        <el-table-column label="负责部门编码" align="center" prop="responsibleDept" />
        <el-table-column label="是否汇总行: 0=否, 1=是" align="center" prop="isSummary" />
        <el-table-column label="是否可编辑: 0=否, 1=是" align="center" prop="isEditable" />
        <el-table-column label="计算公式(如: SUM(children))" align="center" prop="formula" />
        <el-table-column label="操作" align="center" fixed="right"  class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip v-if="!scope.row._isRoot" content="修改" placement="top">
              <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['budget:templateItem:edit']"></el-button>
            </el-tooltip>
            <el-tooltip v-if="!scope.row._isRoot" content="停用" placement="top">
              <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['budget:templateItem:remove']"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0 && !treeMode" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>
    <!-- 添加或修改预算模板科目对话框 -->
    <el-dialog :title="dialog.title" v-model="dialog.visible" width="500px" append-to-body>
      <el-form ref="templateItemFormRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="预算表编号(01-16)" prop="templateCode">
          <el-input v-model="form.templateCode" placeholder="请输入预算表编号(01-16)" />
        </el-form-item>
        <el-form-item label="预算表名称" prop="templateName">
          <el-input v-model="form.templateName" placeholder="请输入预算表名称" />
        </el-form-item>
        <el-form-item label="科目编码" prop="itemCode">
          <el-input v-model="form.itemCode" placeholder="请输入科目编码" />
        </el-form-item>
        <el-form-item label="科目名称" prop="itemName">
          <el-input v-model="form.itemName" placeholder="请输入科目名称" />
        </el-form-item>
        <el-form-item label="上级科目编码" prop="parentCode">
          <el-input v-model="form.parentCode" placeholder="请输入上级科目编码" />
        </el-form-item>
        <el-form-item label="层级" prop="itemLevel">
          <el-input v-model="form.itemLevel" placeholder="请输入层级" />
        </el-form-item>
        <el-form-item label="排序号" prop="itemOrder">
          <el-input v-model="form.itemOrder" placeholder="请输入排序号" />
        </el-form-item>
        <el-form-item label="负责部门编码" prop="responsibleDept">
          <el-input v-model="form.responsibleDept" placeholder="请输入负责部门编码" />
        </el-form-item>
        <el-form-item label="是否汇总行: 0=否, 1=是" prop="isSummary">
          <el-input v-model="form.isSummary" placeholder="请输入是否汇总行: 0=否, 1=是" />
        </el-form-item>
        <el-form-item label="是否可编辑: 0=否, 1=是" prop="isEditable">
          <el-input v-model="form.isEditable" placeholder="请输入是否可编辑: 0=否, 1=是" />
        </el-form-item>
        <el-form-item label="计算公式(如: SUM(children))" prop="formula">
          <el-input v-model="form.formula" placeholder="请输入计算公式(如: SUM(children))">
            <template #append>
              <el-button :loading="previewLoading" @click="handlePreviewFormula">预览</el-button>
            </template>
          </el-input>
          <div v-if="previewResult !== null" class="formula-preview">
            <span class="label">计算结果：</span>
            <span class="value">{{ previewResult }}</span>
          </div>
          <div v-if="previewError" class="formula-preview error">
            <span class="value">{{ previewError }}</span>
          </div>
          <div class="formula-help">
            支持：<code>SUM(children)</code> 递归子级、<code>SUM(0201, 0202)</code> 按编码求和、
            <code>SUM(02.0201, 03.0301)</code> 跨表、四则运算 <code>+ - * /</code>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
    <!-- 已停用科目对话框（还原管理） -->
    <el-dialog title="已停用科目（可还原）" v-model="disabledDialog.visible" width="800px" append-to-body>
      <el-form :inline="true" :model="disabledQuery">
        <el-form-item label="预算表编号">
          <el-input v-model="disabledQuery.templateCode" placeholder="01-16" clearable @keyup.enter="getDisabledList" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="getDisabledList">搜索</el-button>
        </el-form-item>
      </el-form>
      <el-table v-loading="disabledLoading" border :data="disabledList" height="420">
        <el-table-column label="模板编号" align="center" prop="templateCode" width="100" />
        <el-table-column label="模板名称" align="center" prop="templateName" />
        <el-table-column label="科目编码" align="center" prop="itemCode" width="140" />
        <el-table-column label="科目名称" align="center" prop="itemName" />
        <el-table-column label="层级" align="center" prop="itemLevel" width="70" />
        <el-table-column label="操作" align="center" width="120">
          <template #default="scope">
            <el-tooltip content="还原" placement="top">
              <el-button link type="primary" icon="RefreshLeft" @click="handleRestore(scope.row)">还原</el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="disabledTotal > 0" :total="disabledTotal" v-model:page="disabledQuery.pageNum" v-model:limit="disabledQuery.pageSize" @pagination="getDisabledList" />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="disabledDialog.visible = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="TemplateItem" lang="ts">
import { ref, computed, getCurrentInstance, onMounted } from 'vue';
import type { ComponentInternalInstance } from 'vue';
import { listTemplateItem, listDisabledTemplateItem, restoreTemplateItem, getTemplateItem, delTemplateItem, addTemplateItem, updateTemplateItem } from '@/api/budget/templateItem';
import { TemplateItemVO, TemplateItemQuery, TemplateItemForm } from '@/api/budget/templateItem/types';
import { listPlan } from '@/api/budget/plan';
import { previewFormula } from '@/api/budget/formula';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const templateItemList = ref<TemplateItemVO[]>([]);
const planOptions = ref<any[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

// ---- 树形视图 ----
const treeMode = ref(false);
const treeData = ref<any[]>([]);

/** 将科目列表构造成树（一级=模板根节点，其后按 parentCode 分层） */
const buildTree = (rows: TemplateItemVO[]): any[] => {
  const tplMap = new Map<string, any>();
  const roots: any[] = [];
  const nodeByCode = new Map<string, any>();
  for (const r of rows) {
    nodeByCode.set(r.itemCode, { ...r, children: [] });
  }
  for (const r of rows) {
    const node = nodeByCode.get(r.itemCode);
    const parent = nodeByCode.get(r.parentCode);
    if (parent) {
      parent.children.push(node);
    } else {
      const key = r.templateCode || '';
      let tpl = tplMap.get(key);
      if (!tpl) {
        tpl = { id: 'root-' + key, _isRoot: true, templateCode: key, templateName: r.templateName, children: [] };
        tplMap.set(key, tpl);
        roots.push(tpl);
      }
      tpl.children.push(node);
    }
  }
  const sort = (nodes: any[]) => {
    nodes.sort((a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0) || String(a.itemCode || '').localeCompare(String(b.itemCode || '')));
    nodes.forEach(n => n.children && n.children.length && sort(n.children));
  };
  sort(roots);
  return roots;
};

/** 列表/树形视图切换 */
const handleViewChange = async (val: string | number | boolean) => {
  if (val) {
    await reloadCurrent();
  } else {
    getList();
  }
};

/** 按当前视图刷新数据（树形模式下拉全量并重建树） */
const reloadCurrent = async () => {
  loading.value = true;
  if (treeMode.value) {
    const res = await listTemplateItem({ ...queryParams.value, pageNum: 1, pageSize: 9999 });
    treeData.value = buildTree(res.rows || []);
  } else {
    const res = await listTemplateItem(queryParams.value);
    templateItemList.value = res.rows;
    total.value = res.total;
  }
  loading.value = false;
};

const queryFormRef = ref<ElFormInstance>();
const templateItemFormRef = ref<ElFormInstance>();

/** 加载预算方案下拉（含基础模板 0） */
const loadPlans = async () => {
  const res = await listPlan();
  planOptions.value = [{ id: 0, planName: '基础模板（系统）' }, ...(res.rows || [])];
};

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

// ---- 已停用科目（还原管理） ----
const disabledDialog = reactive({
  visible: false,
  title: ''
});
const disabledList = ref<TemplateItemVO[]>([]);
const disabledLoading = ref(false);
const disabledTotal = ref(0);
const disabledQuery = reactive<TemplateItemQuery>({
  pageNum: 1,
  pageSize: 10,
  planId: 0,
  templateCode: undefined,
  params: {}
});

const initFormData: TemplateItemForm = {
  id: undefined,
  planId: undefined,
  templateCode: undefined,
  templateName: undefined,
  itemCode: undefined,
  itemName: undefined,
  parentCode: undefined,
  itemLevel: undefined,
  itemOrder: undefined,
  responsibleDept: undefined,
  isSummary: undefined,
  isEditable: undefined,
  formula: undefined,
}
const data = reactive<PageData<TemplateItemForm, TemplateItemQuery>>({
  form: {...initFormData},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    planId: 0,
    templateCode: undefined,
    templateName: undefined,
    itemCode: undefined,
    itemName: undefined,
    parentCode: undefined,
    itemLevel: undefined,
    itemOrder: undefined,
    responsibleDept: undefined,
    isSummary: undefined,
    isEditable: undefined,
    formula: undefined,
    params: {
    }
  },
  rules: {
    id: [
      { required: true, message: "主键ID不能为空", trigger: "blur" }
    ],
    templateCode: [
      { required: true, message: "预算表编号(01-16)不能为空", trigger: "blur" }
    ],
    templateName: [
      { required: true, message: "预算表名称不能为空", trigger: "blur" }
    ],
    itemCode: [
      { required: true, message: "科目编码不能为空", trigger: "blur" }
    ],
    itemName: [
      { required: true, message: "科目名称不能为空", trigger: "blur" }
    ],
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询预算模板科目列表 */
const getList = async () => {
  loading.value = true;
  const res = await listTemplateItem(queryParams.value);
  templateItemList.value = res.rows;
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
  templateItemFormRef.value?.resetFields();
  previewResult.value = null;
  previewError.value = '';
};

// ===== 公式预览 =====
const previewLoading = ref(false);
const previewResult = ref<number | string | null>(null);
const previewError = ref('');

const currentBudgetYear = computed(() => {
  const plan = planOptions.value.find((p: any) => p.id === queryParams.value.planId);
  return plan?.budgetYear;
});

const handlePreviewFormula = async () => {
  if (!form.value.formula?.trim()) {
    previewError.value = '请输入公式';
    previewResult.value = null;
    return;
  }
  const year = currentBudgetYear.value;
  if (!year) {
    previewError.value = '请先选择预算方案';
    previewResult.value = null;
    return;
  }
  previewLoading.value = true;
  previewError.value = '';
  previewResult.value = null;
  try {
    const res = await previewFormula({
      formula: form.value.formula,
      templateCode: form.value.templateCode || '',
      budgetYear: year,
      itemCode: form.value.itemCode || '',
      valueField: 'budgetAmount',
    });
    previewResult.value = res.data ?? 0;
  } catch (e: any) {
    previewError.value = e?.msg || e?.message || '计算失败';
  } finally {
    previewLoading.value = false;
  }
};

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
const handleSelectionChange = (selection: TemplateItemVO[]) => {
  ids.value = selection.map(item => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
}

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  form.value.planId = queryParams.value.planId ?? 0;
  dialog.visible = true;
  dialog.title = "添加预算模板科目";
}

/** 修改按钮操作 */
const handleUpdate = async (row?: TemplateItemVO) => {
  reset();
  const _id = row?.id || ids.value[0]
  const res = await getTemplateItem(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = "修改预算模板科目";
}

/** 提交按钮 */
const submitForm = () => {
  templateItemFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      if (form.value.planId === undefined) {
        form.value.planId = queryParams.value.planId ?? 0;
      }
      buttonLoading.value = true;
      if (form.value.id) {
        await updateTemplateItem(form.value).finally(() =>  buttonLoading.value = false);
      } else {
        await addTemplateItem(form.value).finally(() =>  buttonLoading.value = false);
      }
      proxy?.$modal.msgSuccess("操作成功");
      dialog.visible = false;
      await reloadCurrent();
    }
  });
}

/** 删除按钮操作（逻辑删除即停用） */
const handleDelete = async (row?: TemplateItemVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否停用预算模板科目编号为"' + _ids + '"的数据项？').finally(() => loading.value = false);
  await delTemplateItem(_ids);
  proxy?.$modal.msgSuccess("停用成功");
  await reloadCurrent();
}

/** 打开已停用科目管理 */
const openDisabled = () => {
  disabledQuery.planId = queryParams.value.planId ?? 0;
  disabledQuery.templateCode = queryParams.value.templateCode;
  disabledQuery.pageNum = 1;
  disabledDialog.visible = true;
  getDisabledList();
}

/** 查询已停用科目 */
const getDisabledList = async () => {
  disabledLoading.value = true;
  const res = await listDisabledTemplateItem(disabledQuery);
  disabledList.value = res.rows;
  disabledTotal.value = res.total;
  disabledLoading.value = false;
}

/** 还原已停用科目 */
const handleRestore = async (row: TemplateItemVO) => {
  await proxy?.$modal.confirm('确认还原科目"' + row.itemName + '"？还原后该科目将重新生效。');
  await restoreTemplateItem([row.id]);
  proxy?.$modal.msgSuccess("还原成功");
  await getDisabledList();
}

/** 导出按钮操作 */
const handleExport = () => {
  proxy?.download('budget/templateItem/export', {
    ...queryParams.value
  }, `templateItem_${new Date().getTime()}.xlsx`)
}

onMounted(() => {
  loadPlans().then(() => getList());
});
</script>

<style scoped>
.formula-preview {
  margin-top: 6px;
  font-size: 12px;
  color: #67c23a;
}
.formula-preview .label {
  color: #909399;
}
.formula-preview .value {
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
}
.formula-preview.error {
  color: #f56c6c;
}
.formula-help {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
.formula-help code {
  background: #f5f7fa;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  color: #606266;
}
</style>
