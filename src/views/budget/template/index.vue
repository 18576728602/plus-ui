<template>
  <div class="app-container">
    <div class="tm-breadcrumb">预算管理 / 模板管理 / 预算模板列表</div>
    <div class="tm-layout">
      <!-- ============ 左侧：预算模板清单（树形导航） ============ -->
      <el-card class="tm-left" shadow="never" v-loading="loading">
        <template #header>
          <div class="tm-left-head">
            <span class="tm-left-title"
              >预算模板<span class="tm-count">{{ list.length }}</span></span
            >
            <div class="tm-left-actions">
              <el-button v-hasPermi="['budget:template:add']" link type="primary" icon="Plus" @click="handleAdd">新增</el-button>
              <el-button
                v-hasPermi="['budget:template:add']"
                link
                type="success"
                icon="CopyDocument"
                :disabled="!selected"
                @click="handleCopy(selected as any)"
                >复制</el-button
              >
              <el-button
                v-hasPermi="['budget:template:remove']"
                link
                type="danger"
                icon="Delete"
                :disabled="!selected"
                @click="handleDelete(selected as any)"
                >删除</el-button
              >
            </div>
          </div>
        </template>

        <el-input v-model.trim="keyword" size="small" placeholder="搜索编码/名称" clearable prefix-icon="Search" class="tm-search" />

        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          :props="{ label: 'label', children: 'children' }"
          :expand-on-click-node="false"
          highlight-current
          :current-node-key="selected?.id"
          :filter-node-method="filterTreeNode"
          class="tm-tree"
          @node-click="onTreeNodeClick"
        >
          <template #default="{ data }">
            <span class="tm-node" :class="{ year: data.isYear }">
              <template v-if="data.isYear">
                <span class="tm-node-year">{{ data.label }}</span>
                <em class="tm-node-num">{{ data.children.length }}</em>
              </template>
              <template v-else>
                <span class="td-code">{{ data.templateCode }}</span>
                <span class="tm-node-name" :title="data.templateName">{{ data.templateName }}</span>
                <el-tag size="small" effect="plain" :type="data.status === '1' ? 'success' : 'info'">{{
                  data.status === '1' ? '启用' : '停用'
                }}</el-tag>
                <el-tag size="small" effect="plain" type="info">{{ typeLabel(data.templateType) }}</el-tag>
                <span class="tm-node-cnt" :title="`已挂 ${data.subjectCount || 0} 项`">{{ data.subjectCount ?? 0 }}</span>
              </template>
            </span>
          </template>
        </el-tree>
        <div v-if="treeData.length === 0" class="tm-empty">暂无预算模板，点击右上角「新增」创建</div>
      </el-card>

      <!-- ============ 右侧：选中模板的科目树 ============ -->
      <el-card class="tm-right" shadow="never">
        <template #header>
          <div class="tm-right-head" v-if="selected">
            <div class="tm-right-title">
              <span class="td-code">{{ selected.templateCode }}</span>
              <span class="td-name">{{ selected.templateName }}</span>
              <el-tag size="small" :type="selected.status === '1' ? 'success' : 'info'">{{ selected.status === '1' ? '启用' : '停用' }}</el-tag>
              <el-tag size="small" type="info">{{ selected.budgetYear }} 年</el-tag>
              <el-tag size="small" type="warning" effect="plain">{{ typeLabel(selected.templateType) }}</el-tag>
            </div>
            <div class="tm-right-actions">
              <el-button v-hasPermi="['budget:template:edit']" type="primary" icon="EditPen" :disabled="!selected" @click="designMode = true"
                >设计器</el-button
              >
              <el-button v-hasPermi="['budget:template:edit']" icon="Edit" plain @click="handleUpdate(selected as any)">改表</el-button>
              <el-button v-if="!designMode" v-hasPermi="['budget:template:add']" type="primary" plain icon="FolderAdd" @click="openMount"
                >挂载科目</el-button
              >
              <el-button
                v-if="!designMode"
                v-hasPermi="['budget:template:edit']"
                type="danger"
                plain
                icon="FolderDelete"
                :disabled="selection.length === 0"
                @click="handleUnmount"
                >解挂({{ selection.length }})</el-button
              >
            </div>
          </div>
          <div v-else class="tm-right-head">预算模板科目明细</div>
        </template>

        <designer v-if="designMode && selected" :template="selected" @back="designMode = false" @changed="onDesignerChanged" />
        <div v-else-if="selected" class="tm-right-body">
          <el-table
            ref="tableRef"
            v-loading="detailLoading"
            :data="tableRows"
            row-key="id"
            :tree-props="{ children: 'children' }"
            default-expand-all
            border
            style="width: 100%"
            size="default"
            @selection-change="onSelectionChange"
          >
            <el-table-column type="selection" width="44" align="center" />
            <el-table-column label="来源" width="72" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain" type="primary">{{ row.subjectType || 'SYS' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="科目编码" prop="itemCode" width="120" align="center">
              <template #default="{ row }"
                ><span class="td-code">{{ row.subjectCode }}</span></template
              >
            </el-table-column>
            <el-table-column label="科目名称" min-width="220">
              <template #default="{ row }">
                <span class="td-caret">{{ caretOf(row) }}</span
                >{{ row.subjectName }}
                <el-tag size="small" :type="rowTypeTag(row)" effect="plain" style="margin-left: 6px">{{ rowTypeLabel(row) }}</el-tag>
                <el-tag v-if="row.validFlag === '0'" size="small" type="danger" effect="plain" style="margin-left: 6px">已停用</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="排序" prop="itemOrder" width="70" align="center" />
            <el-table-column label="挂接" width="80" align="center">
              <template #default><el-tag size="small" effect="plain" type="primary">挂接×1</el-tag></template>
            </el-table-column>
            <el-table-column label="可编辑" width="80" align="center">
              <template #default="{ row }"
                ><span>{{ isEditable(row) ? '是' : '否' }}</span></template
              >
            </el-table-column>
            <el-table-column label="负责部门" prop="responsibleDept" width="110" align="center">
              <template #default="{ row }">{{ row.responsibleDept || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="90" align="center" fixed="right">
              <template #default="{ row }">
                <el-button v-hasPermi="['budget:template:edit']" link type="primary" icon="Edit" @click="openInspector(row)">修改</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="tableRows.length === 0 && !detailLoading" description="该预算模板尚未挂载科目，点击「挂载科目」从科目明细选择" />
          <div class="tm-foot">已挂 {{ allRows.length }} 项 · 用「修改」配置公式/汇总/可编辑/负责部门，或进入「设计器」</div>
        </div>
        <div v-else class="tm-right-none">
          <el-empty description="请先选择左侧预算模板" />
        </div>
      </el-card>
    </div>

    <!-- 新增/修改预算模板抽屉 -->
    <el-drawer v-model="dialog.visible" :title="dialog.title" size="440px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" label-position="left">
        <el-form-item label="预算表编码" prop="templateCode">
          <el-input v-model="form.templateCode" disabled placeholder="自动生成" />
          <div class="td-drawer-tip">编码由系统自动生成，不可手工修改。</div>
        </el-form-item>
        <el-form-item label="预算表名称" prop="templateName"><el-input v-model="form.templateName" /></el-form-item>
        <el-form-item label="预算年度" prop="budgetYear">
          <el-select v-model="form.budgetYear" style="width: 100%">
            <el-option v-for="y in yearOptions" :key="y" :label="`${y} 年`" :value="y" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板类型" prop="templateType">
          <el-radio-group v-model="form.templateType"
            ><el-radio label="BASE">普通</el-radio><el-radio label="SPECIAL">特种</el-radio><el-radio label="TEXT">文本</el-radio></el-radio-group
          >
        </el-form-item>
        <el-form-item label="状态" prop="status"
          ><el-switch v-model="form.status" active-value="1" inactive-value="0" active-text="启用" inactive-text="停用"
        /></el-form-item>
        <el-form-item label="排序号"
          ><el-input-number v-model="form.sortOrder" :min="0" :max="9999" controls-position="right" style="width: 100%"
        /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button type="primary" :loading="submitLoading" @click="submitForm">确 定</el-button
        ><el-button @click="dialog.visible = false">取 消</el-button></template
      >
    </el-drawer>

    <!-- 挂载科目弹窗 -->
    <el-dialog v-model="mountDialog.visible" :title="mountDialog.title" width="640px" top="6vh" append-to-body>
      <div class="md-head">
        <el-input v-model.trim="mountKeyword" size="small" placeholder="搜索编码/名称" clearable prefix-icon="Search" style="width: 200px" />
        <span class="md-count"
          >本表已挂载 <b>{{ mountedCount }}</b> 项</span
        >
      </div>
      <div class="md-tree" v-loading="mountLoading">
        <el-tree
          ref="mountTreeRef"
          :data="mountTree"
          :props="{ label: 'subjectName', children: 'children' }"
          node-key="subjectCode"
          show-checkbox
          default-expand-all
          :filter-node-method="filterMountNode"
        >
          <template #default="{ data }">
            <span class="md-node">
              <span class="td-code">{{ data.subjectCode }}</span>
              <span>{{ data.subjectName }}</span>
              <el-tag v-if="isSum(data)" size="small" type="warning" effect="plain">汇总</el-tag>
            </span>
          </template>
        </el-tree>
      </div>
      <div class="md-note">勾选一级节点会连带选中其下明细；挂载仅写入实际明细科目，一级表头/分组节点本身不进入预算表。</div>
      <template #footer>
        <el-button type="primary" :loading="mountSubmitLoading" @click="submitMount">确认挂载</el-button>
        <el-button @click="mountDialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>

    <!-- 科目行属性修改弹窗 -->
    <el-dialog v-model="itemDialog.visible" :title="itemDialog.title" width="640px" top="6vh" append-to-body>
      <el-form :model="itemEditForm" label-width="96px" label-position="left">
        <el-form-item label="科目编码"
          ><span class="td-code">{{ itemEditForm.itemCode }}</span></el-form-item
        >
        <el-form-item label="科目名称"
          ><span class="td-name-m">{{ itemEditForm.itemName }}</span></el-form-item
        >
        <el-form-item label="行类型">
          <el-radio-group v-model="itemRowType">
            <el-radio-button label="ITEM">明细</el-radio-button>
            <el-radio-button label="SUM">汇总</el-radio-button>
            <el-radio-button label="TEXT">文本</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="itemEditForm.itemOrder" :min="0" :max="9999" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="计算公式">
          <el-select v-model="itemFormulaMode" style="width: 100%" @change="onFormulaModeChange">
            <el-option label="无公式（手工填/只读）" value="none" />
            <el-option label="汇总子级（SUM children）" value="sum" />
            <el-option label="自定义公式" value="custom" />
          </el-select>
          <template v-if="itemFormulaMode === 'custom'">
            <div class="td-bms" style="margin-top: 8px">
              <FormulaConfigurator
                v-model="itemEditForm.formula"
                :subject-options="formulaSubjectOptions"
                :current-code="itemEditForm.itemCode"
                :preview-loading="formulaPreviewLoading"
                :preview-result="formulaPreviewResult"
                :preview-error="formulaPreviewError"
                @preview="onFormulaPreview"
              />
            </div>
          </template>
          <template v-else-if="itemFormulaMode === 'sum'">
            <div class="td-bms" style="margin-top: 8px">按子级求和：<code>SUM(children)</code></div>
          </template>
        </el-form-item>
        <el-form-item label="汇总行">
          <template #default>
            <el-checkbox :model-value="Number(itemEditForm.isSummary) === 1" @change="(v) => (itemEditForm.isSummary = v ? 1 : 0)"
              >作为汇总行（只读，自动求和）</el-checkbox
            >
          </template>
        </el-form-item>
        <el-form-item label="是否可编辑">
          <el-switch v-model="itemEditable" active-text="可编辑" inactive-text="只读" />
        </el-form-item>
        <el-form-item label="负责部门"><el-input v-model="itemEditForm.responsibleDept" placeholder="部门编码" /></el-form-item>
        <el-form-item label="适用范围"><el-input v-model="itemEditForm.orgScope" placeholder="空 = 全部公司" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" :loading="itemEditLoading" @click="submitItemEdit">保 存</el-button>
        <el-button @click="itemDialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { TableInstance } from 'element-plus';
import {
  listBudgetTemplate,
  addBudgetTemplate,
  updateBudgetTemplate,
  delBudgetTemplate,
  copyBudgetTemplate,
  nextBudgetTemplateCode,
  getTemplateItems,
  mountTemplateSubjects,
  unmountTemplateSubjects,
  updateTemplateItem,
  type BudgetTemplateType,
  type BudgetTemplateItemType
} from '@/api/budget/template';
import { listSubjectMasterFlat, listSubjectMasterTree } from '@/api/budget/subjectMaster';
import type { SubjectMasterVO } from '@/api/budget/subjectMaster/types';
import { previewFormula } from '@/api/budget/formula';
import FormulaConfigurator from '../components/FormulaConfigurator.vue';
import Designer from './designer.vue';

const loading = ref(false);
const designMode = ref(false);
const list = ref<BudgetTemplateType[]>([]);
const selected = ref<BudgetTemplateType | null>(null);
const keyword = ref('');
const allRows = ref<SubjectMasterVO[]>([]);
const detailLoading = ref(false);
const treeRef = ref();

/* ---------- 清单：树形导航（年度分组） + 搜索 ---------- */
const typeLabel = (t?: string) => ({ BASE: '普通', SPECIAL: '特种', TEXT: '文本' })[t ?? ''] || t || '基础表';

const treeData = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const pool = list.value.filter((t) => !kw || `${t.templateCode} ${t.templateName}`.toLowerCase().includes(kw));
  const years = Array.from(new Set(pool.map((t) => t.budgetYear ?? 0))).sort((a, b) => b - a);
  return years.map((year) => {
    const items = pool.filter((t) => (t.budgetYear ?? 0) === year).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return {
      id: `year-${year}`,
      isYear: true,
      label: `${year} 年`,
      children: items.map((t) => ({ ...t }))
    };
  });
});
const filterTreeNode = (value: string, data: any) => {
  if (!value) return true;
  if (data.isYear) return true;
  return `${data.templateCode} ${data.templateName}`.toLowerCase().includes(value.toLowerCase());
};
watch(keyword, (v) => treeRef.value?.filter(v));

const onTreeNodeClick = (data: any) => {
  if (data.isYear) return;
  selectTable(data as BudgetTemplateType);
};

const getList = async () => {
  loading.value = true;
  try {
    const res: any = await listBudgetTemplate();
    list.value = (res?.data ?? res) || [];
    if (selected.value?.id && !list.value.find((t) => t.id === selected.value?.id)) {
      selected.value = null;
    }
    if (!selected.value && list.value.length) await selectTable(list.value[0]);
  } finally {
    loading.value = false;
  }
};

const onDesignerChanged = async () => {
  await getList();
  const fresh = list.value.find((t) => t.id === selected.value?.id);
  if (fresh) selected.value = { ...fresh };
};

const selectTable = async (t: BudgetTemplateType) => {
  selected.value = { ...t };
  designMode.value = false;
  await loadDetail(t);
};

/* ---------- 明细加载 ---------- */
const loadDetail = async (t: BudgetTemplateType) => {
  detailLoading.value = true;
  try {
    if (t.id == null) return;
    const res: any = await getTemplateItems(t.id, t.budgetYear);
    const items: BudgetTemplateItemType[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const mRes: any = await listSubjectMasterFlat({ budgetYear: t.budgetYear });
    const masters: SubjectMasterVO[] = Array.isArray(mRes) ? mRes : Array.isArray(mRes?.data) ? mRes.data : [];
    const masterMap = new Map<number, SubjectMasterVO>();
    masters.forEach((m) => m.id != null && masterMap.set(m.id, m));
    allRows.value = items.map((it) => {
      const master = it.refSubjectId != null ? masterMap.get(it.refSubjectId) : null;
      return {
        ...(master ?? {}),
        id: it.id,
        subjectCode: it.itemCode,
        subjectName: it.itemName,
        parentCode: it.parentCode,
        level: it.itemLevel,
        sort: it.itemOrder,
        isSummary: it.isSummary,
        isEditable: it.isEditable,
        refSubjectId: it.refSubjectId,
        responsibleDept: it.responsibleDept,
        orgScope: it.orgScope,
        formula: it.formula,
        itemOrder: it.itemOrder,
        itemCode: it.itemCode,
        itemName: it.itemName,
        children: []
      } as any;
    });
  } finally {
    detailLoading.value = false;
  }
};

/* ---------- 树形表格：按 parentCode 组树 ---------- */
const tableRows = computed(() => {
  const rows = allRows.value as any[];
  const map = new Map<string, any>();
  rows.forEach((r) => {
    const key = r.itemCode ?? r.subjectCode;
    if (!key) return;
    map.set(key, r);
  });
  const roots: any[] = [];
  rows.forEach((r) => {
    const key = r.itemCode ?? r.subjectCode;
    if (!key) return;
    const node = map.get(key);
    if (!node) return;
    const parent = r.parentCode ? map.get(r.parentCode) : null;
    if (parent && parent !== node) {
      if (!Array.isArray(parent.children)) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
});

const typeMap = (t: any) => ({ HEAD: '板块', SUM: '汇总', REF: '上年实际', ITEM: '明细', TEXT: '文本' })[t] || '明细';

const rowTypeOf = (r: any) => {
  const rt = r?.rowType;
  if (rt === 'SUM' || rt === 'HEAD' || rt === 'REF' || rt === 'ITEM' || rt === 'TEXT') return rt;
  if (Number(r?.isSummary) === 1) return 'SUM';
  if (r?.level === 1) return 'HEAD';
  return 'ITEM';
};
const rowTypeLabel = (r: any) => typeMap(rowTypeOf(r));
const rowTypeTag = (r: any) => ({ HEAD: 'primary', SUM: 'warning', REF: 'info', ITEM: 'success', TEXT: 'info' })[rowTypeOf(r)] || 'success';
const caretOf = (r: any) => ({ HEAD: '▼', SUM: '∑', REF: '◔', ITEM: '', TEXT: '' })[rowTypeOf(r)] || '';
const isSum = (r: any) => Number(r?.isSummary) === 1 || r?.rowType === 'SUM';
const isEditable = (r: any) => Number(r?.isEditable ?? 1) === 1;

/* ---------- 挂载 ---------- */
const mountDialog = reactive({ visible: false, title: '' });
const mountTreeRef = ref();
const mountTree = ref<SubjectMasterVO[]>([]);
const mountKeyword = ref('');
const mountLoading = ref(false);
const mountSubmitLoading = ref(false);
const mountedCount = ref(0);
const mountCodeIdMap = new Map<string, number>();
const filterMountNode = (v: string, d: any) => !v || `${d.subjectCode} ${d.subjectName}`.toLowerCase().includes(v.toLowerCase());
watch(mountKeyword, (v) => mountTreeRef.value?.filter(v));

const loadMountTree = async () => {
  mountLoading.value = true;
  try {
    const flatRes: any = await listSubjectMasterFlat({});
    const flat: SubjectMasterVO[] = Array.isArray(flatRes) ? flatRes : Array.isArray(flatRes?.data) ? flatRes.data : [];
    mountCodeIdMap.clear();
    flat.forEach((m) => {
      if (m.subjectCode != null && m.id != null) mountCodeIdMap.set(m.subjectCode, m.id);
    });
    mountTree.value = await listSubjectMasterTree({ keepHead: true });
  } finally {
    mountLoading.value = false;
  }
};
const openMount = async () => {
  if (!selected.value?.id) {
    ElMessage.warning('请先选择预算模板');
    return;
  }
  mountDialog.title = `挂载科目 · ${selected.value.templateCode} ${selected.value.templateName}（${selected.value.budgetYear}年）`;
  mountDialog.visible = true;
  mountKeyword.value = '';
  mountedCount.value = allRows.value.length;
  mountTreeRef.value?.setCheckedKeys([]);
  await loadMountTree();
};
const submitMount = async () => {
  if (!selected.value?.id) {
    ElMessage.warning('预算模板ID缺失');
    return;
  }
  const checked: string[] = mountTreeRef.value?.getCheckedKeys() ?? [];
  const half: string[] = mountTreeRef.value?.getHalfCheckedKeys() ?? [];
  const codes = Array.from(new Set([...checked, ...half]));
  if (!codes.length) {
    ElMessage.warning('请至少勾选一个科目');
    return;
  }
  const ids = codes.map((c) => mountCodeIdMap.get(c)).filter((x): x is number => x != null);
  if (!ids.length) {
    ElMessage.warning('未匹配到有效科目');
    return;
  }
  mountSubmitLoading.value = true;
  try {
    const res: any = await mountTemplateSubjects({ templateId: selected.value.id, subjectIds: ids });
    const added = typeof res === 'number' ? res : (res?.data ?? 0);
    ElMessage.success(`挂载成功${added ? `，新增 ${added} 项` : '（均为已挂载，已跳过）'}`);
    mountDialog.visible = false;
    await loadDetail(selected.value);
  } finally {
    mountSubmitLoading.value = false;
  }
};

/* ---------- 解挂 ---------- */
const tableRef = ref<TableInstance>();
const selection = ref<any[]>([]);
const onSelectionChange = (rows: any[]) => {
  selection.value = rows;
};
const handleUnmount = async () => {
  if (!selected.value?.id) {
    ElMessage.warning('预算模板ID缺失');
    return;
  }
  const rows = selection.value;
  if (!rows.length) {
    ElMessage.warning('请先在表格勾选要解挂的科目');
    return;
  }
  const names =
    rows
      .slice(0, 3)
      .map((r) => r.subjectName)
      .join('、') + (rows.length > 3 ? ` 等 ${rows.length} 项` : '');
  try {
    await ElMessageBox.confirm(
      `确定从「${selected.value.templateName}」解挂以下科目吗？\n${names}\n\n解挂仅移除本表挂载，不影响科目主数据。`,
      '解挂确认',
      { type: 'warning', confirmButtonText: '解挂', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }
  const itemIds = rows.map((r) => r.id).filter((x): x is number => x != null);
  if (!itemIds.length) {
    ElMessage.warning('所选科目缺少挂载ID');
    return;
  }
  const res: any = await unmountTemplateSubjects({ templateId: selected.value.id, itemIds });
  const removed = typeof res === 'number' ? res : (res?.data ?? 0);
  ElMessage.success(`已解挂 ${removed} 项`);
  await loadDetail(selected.value);
};

/* ---------- 科目行属性 ---------- */
const itemDialog = reactive({ visible: false, title: '' });
const itemEditLoading = ref(false);
const itemEditForm = reactive<BudgetTemplateItemType>({
  id: undefined,
  itemCode: '',
  itemName: '',
  itemLevel: undefined,
  itemOrder: 0,
  isSummary: 0,
  isEditable: 1,
  responsibleDept: '',
  formula: '',
  orgScope: '',
  subjectType: 'SYS'
});
const itemRowType = ref<'ITEM' | 'SUM' | 'TEXT'>('ITEM');
const itemEditable = ref(true);
const itemFormulaMode = ref<'none' | 'sum' | 'custom'>('none');
const formulaPreviewLoading = ref(false);
const formulaPreviewResult = ref<number | string | null>(null);
const formulaPreviewError = ref('');

const formulaSubjectOptions = computed(() => allRows.value.map((r) => ({ code: r.itemCode || r.subjectCode, name: r.itemName || r.subjectName })));

const openInspector = (r: any) => {
  if (!r) return;
  itemEditForm.id = r.id;
  itemEditForm.itemCode = r.subjectCode || r.itemCode || '';
  itemEditForm.itemName = r.subjectName || r.itemName || '';
  itemEditForm.itemLevel = r.level ?? r.itemLevel;
  itemEditForm.itemOrder = r.sort ?? r.itemOrder ?? 0;
  itemEditForm.isSummary = Number(r.isSummary ?? 0) === 1 ? 1 : 0;
  itemEditForm.isEditable = Number(r.isEditable ?? 1) === 1 ? 1 : 0;
  itemEditForm.responsibleDept = r.responsibleDept || '';
  itemEditForm.formula = r.formula || '';
  itemEditForm.orgScope = r.orgScope || '';
  itemEditForm.subjectType = r.subjectType || 'SYS';
  const rt = rowTypeOf(r);
  itemRowType.value = (rt === 'SUM' || rt === 'TEXT' ? rt : 'ITEM') as any;
  itemEditable.value = Number(itemEditForm.isEditable) === 1;
  const f = itemEditForm.formula || '';
  itemFormulaMode.value = f ? (f.toUpperCase().includes('CHILDREN') ? 'sum' : 'custom') : 'none';
  itemDialog.title = `修改科目行 · ${itemEditForm.itemCode} ${itemEditForm.itemName}`;
  itemDialog.visible = true;
  formulaPreviewResult.value = null;
  formulaPreviewError.value = '';
};

const onFormulaModeChange = (v: 'none' | 'sum' | 'custom') => {
  if (v === 'none') {
    itemEditForm.formula = '';
    itemEditForm.isSummary = 0;
  } else if (v === 'sum') {
    itemEditForm.formula = 'SUM(children)';
    itemEditForm.isSummary = 1;
    itemEditable.value = false;
    itemEditForm.isEditable = 0;
  } else if (v === 'custom') {
    if (!itemEditForm.formula) itemEditForm.formula = '';
  }
};

const onFormulaPreview = async (formula: string, valueField: string) => {
  if (!formula?.trim()) {
    formulaPreviewError.value = '请输入公式';
    formulaPreviewResult.value = null;
    return;
  }
  formulaPreviewLoading.value = true;
  formulaPreviewError.value = '';
  formulaPreviewResult.value = null;
  try {
    const res = await previewFormula({
      formula,
      templateId: selected.value?.id,
      templateCode: selected.value?.templateCode,
      budgetYear: selected.value?.budgetYear,
      itemCode: itemEditForm.itemCode || '',
      valueField: valueField || 'budgetAmount'
    });
    formulaPreviewResult.value = res.data ?? 0;
  } catch (e: any) {
    formulaPreviewError.value = e?.msg || e?.message || '计算失败';
  } finally {
    formulaPreviewLoading.value = false;
  }
};

const submitItemEdit = async () => {
  if (!itemEditForm.id || !selected.value?.id) {
    ElMessage.warning('请先选择科目行');
    return;
  }
  if (itemRowType.value === 'SUM') {
    itemEditForm.isSummary = 1;
    itemEditForm.isEditable = 0;
    if (!itemEditForm.formula) itemEditForm.formula = 'SUM(children)';
  } else if (itemRowType.value === 'TEXT') {
    itemEditForm.isSummary = 0;
    itemEditForm.isEditable = 0;
    itemEditForm.formula = '';
  } else {
    if (itemFormulaMode.value === 'none') itemEditForm.formula = '';
  }
  itemEditLoading.value = true;
  try {
    await updateTemplateItem({
      id: itemEditForm.id,
      templateId: selected.value.id,
      itemOrder: itemEditForm.itemOrder,
      isSummary: itemEditForm.isSummary,
      isEditable: itemEditForm.isEditable,
      responsibleDept: itemEditForm.responsibleDept,
      formula: itemEditForm.formula,
      orgScope: itemEditForm.orgScope
    });
    ElMessage.success('保存成功');
    itemDialog.visible = false;
    await loadDetail(selected.value);
  } finally {
    itemEditLoading.value = false;
  }
};

/* ---------- 预算模板 CRUD ---------- */
const formRef = ref();
const submitLoading = ref(false);
const dialog = reactive({ visible: false, title: '' });
const form = reactive<BudgetTemplateType & { editing?: boolean }>({
  templateCode: '',
  templateName: '',
  sortOrder: 1,
  status: '1',
  budgetYear: 2027,
  templateType: 'BASE',
  remark: ''
});
const rules = {
  templateName: [{ required: true, message: '预算表名称不能为空', trigger: 'blur' }],
  budgetYear: [{ required: true, message: '预算年度不能为空', trigger: 'blur' }]
};
const yearOptions = computed(() => {
  const cur = new Date().getFullYear();
  const arr: number[] = [];
  for (let y = cur - 5; y <= cur + 2; y++) arr.push(y);
  const v = form.budgetYear || (selected.value?.budgetYear ?? 0);
  if (v && !arr.includes(v)) arr.push(v);
  return arr.sort((a, b) => a - b);
});
const resetForm = () => {
  const defaultYear = list.value.length ? Math.max(...list.value.map((t) => t.budgetYear ?? 2027)) : 2027;
  Object.assign(form, {
    templateCode: '',
    templateName: '',
    sortOrder: 1,
    status: '1',
    budgetYear: defaultYear,
    templateType: 'BASE',
    remark: '',
    editing: false
  });
  formRef.value?.clearValidate();
};
const handleAdd = async () => {
  resetForm();
  try {
    const res: any = await nextBudgetTemplateCode();
    const code = typeof res === 'string' && res ? res : (res?.data ?? res?.msg ?? '');
    form.templateCode = code || '';
  } catch {
    form.templateCode = '';
  }
  dialog.title = '新增预算模板';
  dialog.visible = true;
};
const handleUpdate = (row: BudgetTemplateType) => {
  Object.assign(form, { ...row, editing: true });
  dialog.title = '修改预算模板';
  dialog.visible = true;
};
const handleCopy = async (row: any) => {
  const tp = row?.id ? row : selected.value;
  if (!tp?.id) {
    ElMessage.warning('请先选择要复制的预算模板');
    return;
  }
  const defYear = (tp.budgetYear ?? 2027) + 1;
  try {
    const { value } = await ElMessageBox.prompt(`将「${tp.templateCode} ${tp.templateName}」复制到新年度，请输入目标年度：`, '复制预算模板', {
      confirmButtonText: '复制',
      cancelButtonText: '取消',
      inputValue: String(defYear),
      inputPattern: /^\d{4}$/,
      inputErrorMessage: '请输入4位年度，如 2028'
    });
    const targetYear = Number(value);
    const res: any = await copyBudgetTemplate({ id: tp.id, targetYear });
    const info = typeof res === 'string' ? res : (res?.msg ?? '复制成功');
    ElMessage.success(typeof info === 'string' && info ? info : '复制成功');
    selected.value = null;
    await getList();
    const created = list.value.find((t) => t.templateCode === tp.templateCode && t.budgetYear === targetYear);
    if (created) await selectTable(created);
  } catch (e: any) {
    if (e !== 'cancel' && e?.msg) ElMessage.error(e.msg);
  }
};
const handleDelete = (row: BudgetTemplateType) => {
  if (!row?.id) {
    ElMessage.warning('请先选择预算模板');
    return;
  }
  ElMessageBox.confirm(`确定删除预算模板「${row.templateCode} ${row.templateName}」吗？`, '提示', { type: 'warning' })
    .then(async () => {
      await delBudgetTemplate(row.id!);
      ElMessage.success('删除成功');
      selected.value = null;
      await getList();
    })
    .catch(() => {});
};
const submitForm = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (!valid) return;
    submitLoading.value = true;
    try {
      const payload = { ...form };
      delete (payload as any).editing;
      if (form.editing) await updateBudgetTemplate(payload);
      else await addBudgetTemplate(payload);
      ElMessage.success(form.editing ? '修改成功' : '新增成功');
      dialog.visible = false;
      await getList();
    } finally {
      submitLoading.value = false;
    }
  });
};

onMounted(() => {
  getList();
});
</script>

<style scoped>
.tm-breadcrumb {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}
.tm-layout {
  display: flex;
  gap: 12px;
  min-height: calc(100vh - 130px);
}
.tm-layout > .el-card {
  flex: 1;
  min-width: 0;
}

/* 左列 */
.tm-left {
  width: 380px;
  flex: none !important;
  max-width: 400px;
}
.tm-left-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tm-left-title {
  font-weight: 600;
}
.tm-count {
  margin-left: 6px;
  color: #409eff;
  font-size: 13px;
}
.tm-left-actions {
  display: flex;
  gap: 2px;
}
.tm-search {
  margin-bottom: 10px;
}
.tm-tree {
  max-height: calc(100vh - 300px);
  overflow: auto;
}
.tm-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  min-width: 100%;
}
.tm-node.year {
  color: #909399;
  font-weight: 600;
}
.tm-node-year {
  font-size: 13px;
}
.tm-node-num {
  font-style: normal;
  color: #c0c4cc;
  font-size: 12px;
}
.td-code {
  font-family: Consolas, monospace;
  color: #409eff;
  font-weight: 600;
  font-size: 13px;
}
.tm-node-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tm-node-cnt {
  font-size: 13px;
  color: #f59e0b;
  font-weight: 600;
}
.tm-empty {
  text-align: center;
  color: #909399;
  font-size: 12px;
  padding: 24px 0;
}

/* 右列 */
.tm-right {
  display: flex;
  flex-direction: column;
}
.tm-right-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tm-right-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.td-name {
  font-weight: 600;
  color: #303133;
}
.td-name-m {
  font-weight: 600;
}
.td-caret {
  color: #909399;
  margin-right: 3px;
}
.td-formula {
  font-family: Consolas, monospace;
  color: #67c23a;
  font-size: 12px;
}
.td-drawer-tip {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
  margin-top: 4px;
}
.td-bms {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 10px;
}
.tm-right-body {
  flex: 1;
}
.tm-foot {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
}
.tm-right-none {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

/* 挂载弹窗 */
.md-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.md-count {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}
.md-count b {
  color: #e6a23c;
}
.md-tree {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  max-height: 420px;
  overflow: auto;
  padding: 8px;
}
.md-node {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
}
.md-note {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
</style>
