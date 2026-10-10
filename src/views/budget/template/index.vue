<template>
  <div class="app-container tpl-page">
    <!-- 面包屑 -->
    <div class="tpl-breadcrumb">预算管理 / 预算模板列表</div>

    <!-- ============ 顶部筛选工具栏 ============ -->
    <el-card shadow="never" class="tpl-toolbar">
      <div class="tpl-toolbar-row">
        <el-form ref="queryRef" :model="query" :inline="true" class="tpl-query-form" label-width="110px" size="default" @submit.prevent>
          <el-form-item label="编码或模板名称">
            <el-input v-model="query.keyword" placeholder="请输入编码或模板名称" clearable size="default" style="width: 220px" @keyup.enter="handleSearch" @clear="handleSearch" />
          </el-form-item>
          <el-form-item label="预算年度">
            <el-select v-model="query.budgetYear" placeholder="请选择" clearable size="default" style="width: 120px" @change="handleSearch">
              <el-option v-for="y in yearOptions" :key="y" :label="y + '年'" :value="y" />
            </el-select>
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="query.category" placeholder="请选择" clearable size="default" style="width: 130px" @change="handleSearch">
              <el-option label="经营预算" value="BUSINESS" />
              <el-option label="资本预算" value="CAPITAL" />
              <el-option label="专项预算" value="SPECIAL" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" placeholder="请选择" clearable size="default" style="width: 120px" @change="handleSearch">
              <el-option label="草稿" value="0" />
              <el-option label="已发布" value="1" />
              <el-option label="已归档" value="2" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
            <el-button icon="Refresh" @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
        <div class="tpl-actions">
          <el-button type="primary" icon="Plus" v-hasPermi="['budget:template:add']" @click="openAddDialog">新建模板</el-button>
        </div>
      </div>
    </el-card>

    <!-- ============ 模板列表 ============ -->
    <el-card shadow="never" class="tpl-table-card" style="margin-top: 12px">
      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
        style="width: 100%"
        :default-sort="{ prop: 'budgetYear', order: 'descending' }"
        @sort-change="handleSortChange"
      >
        <el-table-column type="index" label="序号" width="70" align="center" :index="indexMethod" />
        <el-table-column prop="templateCode" label="模板编码" min-width="130" sortable="custom" show-overflow-tooltip />
        <el-table-column prop="templateName" label="模板名称" min-width="200" sortable="custom" show-overflow-tooltip />
        <el-table-column prop="budgetYear" label="预算年度" width="110" sortable="custom">
          <template #default="{ row }">{{ row.budgetYear }}年</template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120" sortable="custom">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="categoryTagType(row.category)">{{ categoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110" sortable="custom">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row)">{{ statusLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ownerName" label="创建人" min-width="130" sortable="custom">
          <template #default="{ row }">{{ row.ownerName || row.createBy || '—' }}</template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="170" sortable="custom">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" v-hasPermi="['budget:template:list']" @click="goDesign(row, 'view')">查看</el-button>
            <el-button v-if="canEdit(row)" size="small" link type="primary" v-hasPermi="['budget:template:edit']" @click="openEditDialog(row)">编辑</el-button>
            <el-button v-if="canArchive(row)" size="small" link type="warning" v-hasPermi="['budget:template:edit']" @click="handleArchive(row)">归档</el-button>
            <el-button v-if="canPublish(row)" size="small" link type="success" v-hasPermi="['budget:template:edit']" @click="handlePublish(row)">发布</el-button>
            <el-button v-if="canCopy(row)" size="small" link type="success" v-hasPermi="['budget:template:add']" @click="handleCopy(row)">复制</el-button>
            <el-button v-if="canDelete(row)" size="small" link type="danger" v-hasPermi="['budget:template:remove']" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty v-if="!loading" description="暂无模板，点击右上角新建">
            <el-button type="primary" v-hasPermi="['budget:template:add']" @click="openAddDialog">新建模板</el-button>
          </el-empty>
        </template>
      </el-table>
    </el-card>

    <!-- ============ 分页 ============ -->
    <div class="tpl-pagination" v-if="total > 0">
      <span class="tpl-page-info">共 {{ total }} 条 · 每页 {{ query.pageSize }} 条</span>
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="getList"
        @size-change="getList"
      />
    </div>

    <!-- ============ 新建模板弹窗 ============ -->
    <el-dialog v-model="addDialog.visible" :title="addDialog.editMode ? '编辑模板' : '新建模板'" width="520px" append-to-body>
      <el-form ref="addFormRef" :model="addForm" :rules="addRules" label-width="100px">
        <el-form-item label="模板编码" prop="templateCode">
          <el-input v-model="addForm.templateCode" placeholder="自动生成，可修改" :disabled="addDialog.editMode" />
        </el-form-item>
        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="addForm.templateName" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="预算年度" prop="budgetYear">
          <el-input-number v-model="addForm.budgetYear" :min="2020" :max="2099" style="width: 100%" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="addForm.category" style="width: 100%">
            <el-option label="经营预算" value="BUSINESS" />
            <el-option label="资本预算" value="CAPITAL" />
            <el-option label="专项预算" value="SPECIAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="addForm.status">
            <el-radio value="0">草稿</el-radio>
            <el-radio value="1">已发布</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="addForm.remark" type="textarea" :rows="2" placeholder="模板说明/用途" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialog.visible = false">取 消</el-button>
        <el-button type="primary" :loading="addDialog.loading" @click="submitAdd">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import {
  listBudgetTemplate,
  nextBudgetTemplateCode,
  addBudgetTemplate,
  updateBudgetTemplate,
  delBudgetTemplate,
  copyBudgetTemplate,
  type BudgetTemplateType,
  type TemplateQuery
} from '@/api/budget/template';

const router = useRouter();

/* ============ 状态 ============ */
const loading = ref(false);
const list = ref<BudgetTemplateType[]>([]);
const total = ref(0);

const query = reactive<TemplateQuery>({
  keyword: '',
  category: undefined,
  status: undefined,
  budgetYear: undefined,
  orderByColumn: 'budgetYear',
  isAsc: 'descending',
  pageNum: 1,
  pageSize: 10
});

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + 1 - i);

/* ============ 展示映射 ============ */
const statusLabel = (item: BudgetTemplateType): string => {
  if (item.locked && item.status === '1') return '已锁定';
  const map: Record<string, string> = { '0': '草稿', '1': '已发布', '2': '已归档' };
  return map[item.status ?? '0'] ?? '草稿';
};
const statusTagType = (item: BudgetTemplateType): any => {
  if (item.locked && item.status === '1') return 'warning';
  const map: Record<string, string> = { '0': 'info', '1': 'success', '2': 'danger' };
  return map[item.status ?? '0'] ?? 'info';
};
const categoryLabel = (c?: string): string => {
  const map: Record<string, string> = { BUSINESS: '经营预算', CAPITAL: '资本预算', SPECIAL: '专项预算' };
  return map[c ?? ''] ?? '未分类';
};
const categoryTagType = (c?: string): any => {
  const map: Record<string, string> = { BUSINESS: 'primary', CAPITAL: 'success', SPECIAL: 'warning' };
  return map[c ?? ''] ?? 'info';
};
const formatTime = (t?: string): string => {
  if (!t) return '—';
  return String(t).substring(0, 16).replace('T', ' ');
};

/* ============ 操作列可见性（按模板状态） ============ */
const isLocked = (row: BudgetTemplateType) => !!(row.locked && row.status === '1');
const canPublish = (row: BudgetTemplateType) => !isLocked(row) && row.status === '0';
const canEdit = (row: BudgetTemplateType) => !isLocked(row) && (row.status === '0' || row.status === '1');
const canArchive = (row: BudgetTemplateType) => !isLocked(row) && row.status === '1';
const canCopy = (row: BudgetTemplateType) => !isLocked(row);
const canDelete = (row: BudgetTemplateType) => !isLocked(row) && row.status === '0';

/* ============ 排序 ============ */
const handleSortChange = ({ prop, order }: any) => {
  query.orderByColumn = order ? prop : 'budgetYear';
  query.isAsc = order || 'descending';
  query.pageNum = 1;
  getList();
};

/* ============ 数据加载 ============ */
const getList = async () => {
  loading.value = true;
  try {
    const res: any = await listBudgetTemplate(query);
    list.value = res?.rows ?? res?.data?.rows ?? res?.data ?? [];
    total.value = res?.total ?? res?.data?.total ?? 0;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

// 序号：跨页连续编号（当前页计算基数）
const indexMethod = (index: number) => (query.pageNum! - 1) * query.pageSize! + index + 1;

const handleSearch = () => {
  query.pageNum = 1;
  getList();
};

const handleReset = () => {
  query.keyword = '';
  query.category = undefined;
  query.status = undefined;
  query.budgetYear = undefined;
  query.orderByColumn = 'budgetYear';
  query.isAsc = 'descending';
  query.pageNum = 1;
  getList();
};

/* ============ 操作 ============ */
const goDesign = (item: BudgetTemplateType, mode: 'design' | 'view' = 'design') => {
  router.push({ path: '/budget/budgetBasic/templateDesigner', query: { templateId: item.id, mode } });
};

const handlePublish = async (item: BudgetTemplateType) => {
  try {
    await ElMessageBox.confirm(`确认发布模板「${item.templateName}」？发布后该模板将进入已发布状态。`, '发布确认', { type: 'success' });
    await updateBudgetTemplate({ id: item.id, templateCode: item.templateCode, templateName: item.templateName, status: '1' } as any);
    ElMessage.success('发布成功');
    getList();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.msg || '发布失败');
  }
};

const handleArchive = async (item: BudgetTemplateType) => {
  try {
    await ElMessageBox.confirm(`确认归档模板「${item.templateName}」？归档后不可编辑。`, '归档确认', { type: 'warning' });
    await updateBudgetTemplate({ id: item.id, templateCode: item.templateCode, templateName: item.templateName, status: '2' } as any);
    ElMessage.success('归档成功');
    getList();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.msg || '归档失败');
  }
};

const handleCopy = async (item: BudgetTemplateType) => {
  const targetYear = (item.budgetYear ?? 2027) + 1;
  try {
    await ElMessageBox.confirm(
      `将复制模板「${item.templateName}」到 ${targetYear} 年度，是否继续？`,
      '复制确认',
      { type: 'info' }
    );
    await copyBudgetTemplate({ id: item.id!, targetYear });
    ElMessage.success('复制成功');
    getList();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.msg || '复制失败');
  }
};

const handleDelete = async (item: BudgetTemplateType) => {
  try {
    await ElMessageBox.confirm(
      `确认删除模板「${item.templateName}」？将级联删除其挂载科目和填报数据（逻辑删除，可恢复）。`,
      '删除确认',
      { type: 'warning' }
    );
    await delBudgetTemplate(item.id!);
    ElMessage.success('删除成功');
    getList();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.msg || '删除失败');
  }
};

/* ============ 新建模板 ============ */
const addDialog = reactive({ visible: false, loading: false, editMode: false, editingId: null as number | null });
const addFormRef = ref<FormInstance>();
const addForm = reactive<BudgetTemplateType>({
  templateCode: '',
  templateName: '',
  budgetYear: 2027,
  category: 'BUSINESS',
  status: '0',
  remark: ''
});
const addRules: FormRules = {
  templateName: [{ required: true, message: '模板名称不能为空', trigger: 'blur' }],
  budgetYear: [{ required: true, message: '请选择年度', trigger: 'change' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
};

const openAddDialog = async () => {
  addDialog.editMode = false;
  addDialog.editingId = null;
  addForm.templateCode = '';
  addForm.templateName = '';
  addForm.budgetYear = 2027;
  addForm.category = 'BUSINESS';
  addForm.status = '0';
  addForm.remark = '';
  // 自动生成编码
  try {
    const res: any = await nextBudgetTemplateCode();
    const code = res?.data || res?.msg;
    addForm.templateCode = typeof code === 'string' && code ? code : '';
  } catch {}
  addDialog.visible = true;
};

const submitAdd = async () => {
  if (!addFormRef.value) return;
  await addFormRef.value.validate(async (valid) => {
    if (!valid) return;
    addDialog.loading = true;
    try {
      if (addDialog.editMode) {
        await updateBudgetTemplate({ ...addForm, id: addDialog.editingId } as any);
        ElMessage.success('保存成功');
      } else {
        await addBudgetTemplate(addForm);
        ElMessage.success('创建成功');
      }
      addDialog.visible = false;
      getList();
    } catch (e: any) {
      ElMessage.error(e?.msg || (addDialog.editMode ? '保存失败' : '创建失败'));
    } finally {
      addDialog.loading = false;
    }
  });
};

const openEditDialog = (item: BudgetTemplateType) => {
  addDialog.editMode = true;
  addDialog.editingId = item.id;
  addForm.templateCode = item.templateCode || '';
  addForm.templateName = item.templateName || '';
  addForm.budgetYear = item.budgetYear ?? 2027;
  addForm.category = item.category || 'BUSINESS';
  addForm.status = item.status || '0';
  addForm.remark = item.remark || '';
  addDialog.visible = true;
};

/* ============ 生命周期 ============ */
onMounted(() => {
  getList();
});
</script>

<style scoped>
.tpl-page { padding: 0; }
.tpl-breadcrumb { font-size: 13px; color: #909399; margin-bottom: 12px; padding: 0 4px; }
.tpl-toolbar-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
.tpl-query-form { flex: 1; min-width: 0; white-space: nowrap; }
.tpl-query-form :deep(.el-form-item) { margin-bottom: 0; margin-right: 16px; white-space: nowrap; }
.tpl-query-form :deep(.el-form-item:last-child) { margin-right: 0; }
.tpl-query-form :deep(.el-form-item__label) { color: #606266; font-weight: 400; }
.tpl-actions { display: flex; align-items: flex-end; }

.tpl-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 0 4px; }
.tpl-page-info { font-size: 13px; color: #909399; }
</style>