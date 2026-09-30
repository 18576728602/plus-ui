<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="mb-[10px]">
        <el-card shadow="hover">
          <el-form ref="queryFormRef" :model="queryParams" :inline="true">
            <el-form-item label="源部门" prop="deptId">
              <el-select v-model="queryParams.deptId" placeholder="全部" clearable filterable style="width: 200px" @change="handleQuery">
                <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.fullPath" :value="d.deptId" />
              </el-select>
            </el-form-item>
            <el-form-item label="源科目" prop="srcItemCode">
              <el-select v-model="queryParams.srcItemCode" placeholder="全部" clearable filterable style="width: 180px">
                <el-option v-for="s in srcItems" :key="s.itemCode" :label="`${s.itemCode} ${s.itemName}`" :value="s.itemCode" />
              </el-select>
            </el-form-item>
            <el-form-item label="目标科目" prop="tgtItemCode">
              <el-select v-model="queryParams.tgtItemCode" placeholder="全部" clearable filterable style="width: 180px">
                <el-option v-for="t in tgtItems" :key="t.itemCode" :label="`${t.itemCode} ${t.itemName}`" :value="t.itemCode" />
              </el-select>
            </el-form-item>
            <el-form-item label="目标部门" prop="tgtDeptId">
              <el-select v-model="queryParams.tgtDeptId" placeholder="全部" clearable filterable style="width: 220px" @change="handleQuery">
                <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.fullPath" :value="d.deptId" />
              </el-select>
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
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['budget:gather:add']">新增映射</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()" v-hasPermi="['budget:gather:edit']">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()" v-hasPermi="['budget:gather:remove']">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['budget:gather:export']">导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" border :data="gatherMapList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="源部门" align="left" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            {{ deptNameOf(scope.row.deptId) || scope.row.deptName }}
          </template>
        </el-table-column>
        <el-table-column label="源预算表" align="left" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.srcTemplateCode }}{{ scope.row.srcTemplateName ? ' ' + scope.row.srcTemplateName : '' }}
          </template>
        </el-table-column>
        <el-table-column label="源科目编码" align="center" prop="srcItemCode" width="110" />
        <el-table-column label="源科目名称" align="left" prop="srcItemName" min-width="160" show-overflow-tooltip />
        <el-table-column label="目标预算表" align="left" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.tgtTemplateCode }}{{ scope.row.tgtTemplateName ? ' ' + scope.row.tgtTemplateName : '' }}
          </template>
        </el-table-column>
        <el-table-column label="目标科目编码" align="center" prop="tgtItemCode" width="110" />
        <el-table-column label="目标科目名称" align="left" prop="tgtItemName" min-width="160" show-overflow-tooltip />
        <el-table-column label="目标部门" align="left" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.tgtDeptId ? (deptNameOf(scope.row.tgtDeptId) || scope.row.tgtDeptName || scope.row.tgtDeptId) : '本部' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" fixed="right" width="140" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['budget:gather:edit']">修改</el-button>
            <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['budget:gather:remove']">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>

    <!-- 新增/修改映射对话框 -->
    <el-dialog :title="dialog.title" v-model="dialog.visible" width="620px" append-to-body>
      <el-form ref="gatherFormRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="源部门" prop="deptId">
          <el-select v-model="form.deptId" placeholder="请选择部门（多级用->展示）" filterable style="width: 100%" @change="onDeptChange">
            <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.fullPath" :value="d.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="源科目(17表)" prop="srcItemCode">
          <el-select v-model="form.srcItemCode" placeholder="选择17表明细科目" filterable style="width: 100%" @change="onSrcChange">
            <el-option v-for="s in srcItems" :key="s.itemCode" :label="`${s.itemCode} ${s.itemName}`" :value="s.itemCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标部门">
          <el-select v-model="form.tgtDeptId" placeholder="留空=归并到本部" filterable clearable style="width: 100%" @change="onTgtDeptChange">
            <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.fullPath" :value="d.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标科目(06表)" prop="tgtItemCode">
          <el-select v-model="form.tgtItemCode" placeholder="选择06表目标科目" filterable style="width: 100%" @change="onTgtChange">
            <el-option v-for="t in tgtItems" :key="t.itemCode" :label="`${t.itemCode} ${t.itemName}`" :value="t.itemCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="提示">
          <span class="tip-text">归集口径：将所选部门在17表填报的该科目金额，累加到目标科目（目标部门留空则归并到集团本部06表）。</span>
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

<script setup name="GatherMap" lang="ts">
import { listGatherMap, getGatherMap, delGatherMap, addGatherMap, updateGatherMap } from '@/api/budget/gather';
import { GatherMapVO, GatherMapQuery, GatherMapForm } from '@/api/budget/gather/types';
import { queryTemplateItems } from '@/api/budget/templateItem';
import { listDept } from '@/api/system/dept';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const gatherMapList = ref<GatherMapVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const deptOptions = ref<Array<{ deptId: number; deptName: string; fullPath: string }>>([]);
const srcItems = ref<Array<{ itemCode: string; itemName: string }>>([]);
const tgtItems = ref<Array<{ itemCode: string; itemName: string }>>([]);

const queryFormRef = ref<ElFormInstance>();
const gatherFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: GatherMapForm = {
  id: undefined,
  planId: 0,
  deptId: undefined,
  deptName: undefined,
  srcTemplateCode: '17',
  srcItemCode: undefined,
  srcItemName: undefined,
  tgtTemplateCode: '06',
  tgtDeptId: undefined,
  tgtDeptName: undefined,
  tgtItemCode: undefined,
  tgtItemName: undefined
};

const data = reactive<PageData<GatherMapForm, GatherMapQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    deptId: undefined,
    tgtDeptId: undefined,
    srcItemCode: undefined,
    tgtItemCode: undefined,
    params: {}
  },
  rules: {
    deptId: [{ required: true, message: '请选择源部门', trigger: 'change' }],
    srcItemCode: [{ required: true, message: '请选择源科目', trigger: 'change' }],
    tgtItemCode: [{ required: true, message: '请选择目标科目', trigger: 'change' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 加载部门架构：源/目标部门统一取自部门树。
 *  真实完整路径按 parent_id 逐级向上回溯拼出（不信任可能损坏的 ancestors）；
 *  展示时去掉最前两层(国资委、集团壳)，从一级子公司/本部层开始，多级用 -> 分隔。 */
const loadDepts = async () => {
  if (deptOptions.value.length) return;
  const res: any = await listDept({});
  const list = res.rows || res.data || [];
  const byId = new Map<any, any>();
  list.forEach((d: any) => { if (d.deptId != null) byId.set(d.deptId, d); });
  const buildPath = (d: any) => {
    const names: string[] = [];
    const seen = new Set<number>();
    let cur = d;
    while (cur && cur.deptName) {
      names.push(cur.deptName);
      if (!cur.parentId || cur.parentId === 0) break;
      if (seen.has(cur.parentId)) break;
      seen.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
    names.reverse();
    return names.length > 2 ? names.slice(2).join('->') : names.join('->');
  };
  deptOptions.value = list
    .filter((d: any) => d.status !== '1' && d.status !== '2')
    .map((d: any) => ({
      deptId: d.deptId,
      deptName: d.deptName,
      fullPath: buildPath(d)
    }))
    .sort((a: any, b: any) => String(a.fullPath).localeCompare(String(b.fullPath), 'zh'));
};

/** 选择目标部门：回填完整路径；留空则归并到本部 */
const onTgtDeptChange = (val: any) => {
  if (val == null || val === '') {
    form.value.tgtDeptId = undefined;
    form.value.tgtDeptName = undefined;
  } else {
    const d = deptOptions.value.find(x => x.deptId === val);
    form.value.tgtDeptName = d?.fullPath;
  }
};

/** 加载17表明细(只读明细行) */
const loadSrcItems = async () => {
  const res = await queryTemplateItems({ templateCode: '17', planId: 0 });
  const rows = (res as any).data?.filter ? (res as any).data : ((res as any).rows || []);
  srcItems.value = rows
    .filter((i: any) => Number(i.isSummary) !== 1)
    .map((i: any) => ({ itemCode: i.itemCode, itemName: i.itemName }));
};

/** 加载06表目标科目(取明细+汇总行，由后端已按 is_editable 标注) */
const loadTgtItems = async () => {
  const res = await queryTemplateItems({ templateCode: '06', planId: 0 });
  const rows = (res as any).data?.filter ? (res as any).data : ((res as any).rows || []);
  tgtItems.value = rows.map((i: any) => ({ itemCode: i.itemCode, itemName: i.itemName }));
};

const getList = async () => {
  loading.value = true;
  const res = await listGatherMap(queryParams.value);
  gatherMapList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

const cancel = () => {
  reset();
  dialog.visible = false;
};

const reset = () => {
  form.value = { ...initFormData };
  gatherFormRef.value?.resetFields();
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

const handleSelectionChange = (selection: GatherMapVO[]) => {
  ids.value = selection.map(item => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '新增归集映射';
};

const handleUpdate = async (row?: GatherMapVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getGatherMap(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改归集映射';
};

/** 按部门ID取完整路径(用于表格展示，兼容老数据仅存简名) */
const deptNameOf = (id: any) => {
  if (id == null || id === '') return '';
  const d = deptOptions.value.find(x => x.deptId === id);
  return d?.fullPath || '';
};

const onDeptChange = (val: any) => {
  if (val == null || val === '') {
    form.value.deptId = undefined;
    form.value.deptName = undefined;
  } else {
    const d = deptOptions.value.find(x => x.deptId === val);
    form.value.deptName = d?.fullPath;
  }
};

const onSrcChange = (val: any) => {
  const s = srcItems.value.find(x => x.itemCode === val);
  form.value.srcItemName = s?.itemName;
};

const onTgtChange = (val: any) => {
  const t = tgtItems.value.find(x => x.itemCode === val);
  form.value.tgtItemName = t?.itemName;
};

const submitForm = () => {
  gatherFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return;
    buttonLoading.value = true;
    if (form.value.id) {
      await updateGatherMap(form.value).finally(() => (buttonLoading.value = false));
    } else {
      await addGatherMap(form.value).finally(() => (buttonLoading.value = false));
    }
    proxy?.$modal.msgSuccess('操作成功');
    dialog.visible = false;
    await getList();
  });
};

const handleDelete = async (row?: GatherMapVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除选中的归集映射？');
  await delGatherMap(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const handleExport = () => {
  proxy?.download('budget/gather/export', { ...queryParams.value }, `gather_${new Date().getTime()}.xlsx`);
};

onMounted(() => {
  getList();
  loadDepts();
  loadSrcItems();
  loadTgtItems();
});
</script>

<style lang="scss" scoped>
.tip-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>