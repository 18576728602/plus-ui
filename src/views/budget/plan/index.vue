<template>
  <div class="app-container">
    <!-- ===================== 列表视图 ===================== -->
    <template v-if="viewMode === 'list'">
      <!-- 搜索栏 -->
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
        <el-form-item label="方案名称" prop="planName">
          <el-input v-model="queryParams.planName" placeholder="请输入方案名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="预算年度" prop="budgetYear">
          <el-input v-model="queryParams.budgetYear" placeholder="如 2027" clearable style="width: 120px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="已发布" value="PUBLISHED" />
            <el-option label="已归档" value="ARCHIVED" />
            <el-option label="已作废" value="CLOSED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 操作按钮 -->
      <el-row :gutter="10" class="mb8">
        <el-col :span="1.5">
          <el-button v-hasPermi="['budget:plan:add']" type="primary" plain icon="Plus" @click="handleAdd">新增方案</el-button>
        </el-col>
        <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="planList" border style="width: 100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column label="方案编码" prop="planCode" width="150" align="center" />
        <el-table-column label="方案名称" prop="planName" min-width="150" show-overflow-tooltip />
        <el-table-column label="预算年度" prop="budgetYear" width="90" align="center" />
        <el-table-column label="填报周期" width="320" align="center">
          <template #default="{ row }">
            <span v-if="row.startDate && row.endDate">
              {{ row.startDate }} ~ {{ row.endDate }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="填报公司" min-width="150" align="center">
          <template #default="{ row }">
            <span v-if="fillCompanyText(row.orgScope)">{{ fillCompanyText(row.orgScope) }}</span>
            <el-tag v-else type="info" size="small" effect="plain">全部公司</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" prop="status" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'">{{ statusMap[row.status]?.label || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="方案说明" prop="description" min-width="180">
          <template #default="{ row }">
            <div style="white-space: pre-wrap; word-break: break-all; line-height: 1.5">{{ row.description || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <div style="white-space: nowrap">
              <template v-if="row.status === 'DRAFT'">
                <el-button v-hasPermi="['budget:plan:edit']" link type="primary" icon="Edit" @click="handleUpdate(row)">修改</el-button>
                <el-button v-hasPermi="['budget:plan:edit']" link type="success" icon="Promotion" @click="handleStatus(row, 'PUBLISHED')">发布</el-button>
                <el-button v-hasPermi="['budget:plan:remove']" link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
              </template>
              <template v-else-if="row.status === 'PUBLISHED'">
                <el-button v-hasPermi="['budget:plan:edit']" link type="warning" icon="FolderOpened" @click="handleStatus(row, 'ARCHIVED')">归档</el-button>
                <el-button v-hasPermi="['budget:plan:edit']" link type="danger" icon="CircleClose" @click="handleVoid(row)">作废</el-button>
                <el-button link type="primary" icon="View" @click="handleView(row)">查看</el-button>
              </template>
              <template v-else-if="row.status === 'ARCHIVED'">
                <el-button v-hasPermi="['budget:plan:edit']" link type="danger" icon="CircleClose" @click="handleVoid(row)">作废</el-button>
                <el-button link type="primary" icon="View" @click="handleView(row)">查看</el-button>
              </template>
              <template v-else>
                <el-button link type="primary" icon="View" @click="handleView(row)">查看</el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </template>

    <!-- ===================== 独立整页表单（新增/修改/查看） ===================== -->
    <template v-else>
      <div class="plan-page">
        <div class="plan-page-head">
          <div class="plan-page-title">
            <el-icon v-if="!readonly" class="plan-page-icon"><EditPen /></el-icon>
            <el-icon v-else class="plan-page-icon"><View /></el-icon>
            {{ pageTitle }}
            <el-tag v-if="form.status" size="small" :type="statusMap[form.status]?.type || 'info'" style="margin-left: 8px">{{ statusMap[form.status]?.label || form.status }}</el-tag>
          </div>
          <div class="plan-page-actions">
            <el-button icon="Back" @click="backToList">返回列表</el-button>
          </div>
        </div>

        <el-card shadow="never" class="plan-page-card">
          <div class="plan-section" ref="basicSectionRef">
            <div class="plan-section-title"><span class="plan-step">1</span>基本信息</div>
            <el-form ref="planRef" :model="form" :rules="rules" label-width="110px" class="plan-base-form">
              <el-row :gutter="24">
                <el-col :xs="24" :sm="12">
                  <el-form-item label="方案编码" prop="planCode">
                    <el-input v-model="form.planCode" placeholder="如 PLAN-2027-001" :disabled="readonly || !!form.id" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                  <el-form-item label="方案名称" prop="planName">
                    <el-input v-model="form.planName" placeholder="如 2027年度预算方案" :disabled="readonly" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                  <el-form-item label="预算年度" prop="budgetYear">
                    <el-input-number v-model="form.budgetYear" :min="2024" :max="2030" controls-position="right" :disabled="readonly" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                  <el-form-item label="填报开始" prop="startDate">
                    <el-date-picker v-model="form.startDate" type="datetime" placeholder="如 2026-09-01 09:00:00" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" :default-time="defaultStartTime" :disabled="readonly" @change="onDateChange('endDate')" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                  <el-form-item label="填报截止" prop="endDate">
                    <el-date-picker v-model="form.endDate" type="datetime" placeholder="如 2026-09-30 18:00:00" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" :default-time="defaultEndTime" :disabled="readonly" @change="onDateChange('startDate')" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="方案说明" prop="description" label-width="110px">
                <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入方案说明" :disabled="readonly" />
              </el-form-item>
            </el-form>
          </div>

          <div class="plan-conn"><el-icon><ArrowDown /></el-icon></div>

          <div class="plan-section">
            <div class="plan-section-title"><span class="plan-step">2</span>填报公司</div>
            <div class="orgs-tip">
              <el-icon><InfoFilled /></el-icon>
              <span>选择参与本方案填报的公司。留空（右侧为空）表示全部公司均可填报。</span>
            </div>
            <div v-if="readonly" class="orgs-readonly">
              <el-tag v-for="id in fillOrgIds" :key="id" type="info" :disable-transitions="true" style="margin: 0 6px 6px 0">{{ companyLabel(id) }}</el-tag>
              <el-tag v-if="!fillOrgIds.length" type="info" :disable-transitions="true">全部公司</el-tag>
            </div>
            <el-transfer
              v-else
              v-model="fillOrgIds"
              :data="companyData"
              :titles="['可选公司', '方案填报公司']"
              :button-texts="['', '']"
              :props="{ key: 'key', label: 'label' }"
              filterable
              :filter-method="orgFilter"
              class="orgs-transfer"
            >
              <template #default="{ option }">
                <span>{{ option.label }}</span>
              </template>
            </el-transfer>
          </div>

          <div class="plan-conn"><el-icon><ArrowDown /></el-icon></div>

          <!-- 3. 挂载模板 -->
          <div class="plan-section">
            <div class="plan-section-title"><span class="plan-step">3</span>挂载模板</div>
            <div class="plan-section-desc">选择本方案需要填报的预算模板，填报内容与科目明细由所挂载的模板决定。</div>
            <div v-if="!form.id" class="tpl-lock">
              <el-icon class="tpl-lock-icon"><InfoFilled /></el-icon>
              <span>保存基本信息生成方案后，即可为本方案挂载预算模板。</span>
            </div>
            <el-transfer
              v-else
              v-model="mountedTemplateKeys"
              :data="availableTemplateData"
              :titles="['可选模板', '已挂载模板']"
              :button-texts="['', '']"
              :props="{ key: 'id', label: 'label' }"
              filterable
              :filter-method="tplFilter"
              class="tpl-transfer"
              @change="handleTemplateChange"
            >
              <template #default="{ option }">
                <span>{{ option.label }}</span>
                <span style="color:#909399;margin-left:8px;font-size:12px;">{{ option.category }}</span>
              </template>
            </el-transfer>
          </div>


          <!-- 页脚操作 -->
          <div class="plan-page-footer">
            <template v-if="readonly">
              <el-button type="primary" @click="backToList">关 闭</el-button>
            </template>
            <template v-else>
              <el-button type="primary" :loading="buttonLoading" @click="submitForm">保 存</el-button>
              <el-button @click="backToList">取 消</el-button>
            </template>
          </div>
        </el-card>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts" name="BudgetPlan">
import { ref, reactive, nextTick, onMounted, getCurrentInstance } from 'vue';
import { Search, Back, EditPen, View, Plus, Edit, Delete, InfoFilled, ArrowDown, RefreshLeft } from '@element-plus/icons-vue';
import { listPlan, getPlan, addPlan, updatePlan, delPlan, changePlanStatus, listPlanCompanies, listMountedTemplates, listAvailableTemplates, mountPlanTemplates, unmountPlanTemplates, unarchivePlan, unvoidPlan, restorePlan } from '@/api/budget/plan';
import type { BudgetCompany } from '@/api/budget/plan';

const { proxy } = getCurrentInstance() as any;

const defaultStartTime = new Date(2000, 0, 1, 9, 0, 0);
const defaultEndTime = new Date(2000, 0, 1, 18, 0, 0);

const planList = ref<any[]>([]);
const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);
const readonly = ref(false);

// ---- 整页表单状态 ----
const viewMode = ref<'list' | 'form'>('list');
const pageTitle = ref('');
const buttonLoading = ref(false);

const basicSectionRef = ref<any>(null);

// ---- 填报公司（transfer）----
const companyOptions = ref<BudgetCompany[]>([]);
const companyData = ref<any[]>([]);
const fillOrgIds = ref<Array<string | number>>([]);


const statusMap: Record<string, { type: string; label: string }> = {
  DRAFT: { type: 'info', label: '草稿' },
  PUBLISHED: { type: 'success', label: '已发布' },
  ARCHIVED: { type: 'warning', label: '已归档' },
  CLOSED: { type: 'danger', label: '已作废' }
};

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  planName: undefined,
  budgetYear: undefined,
  status: undefined
});

const form = ref<any>({});
const rules = reactive({
  planCode: [{ required: true, message: '请输入方案编码', trigger: 'blur' }],
  planName: [{ required: true, message: '请输入方案名称', trigger: 'blur' }],
  budgetYear: [{ required: true, message: '请输入预算年度', trigger: 'blur' }],
  startDate: [
    { required: true, message: '请选择填报开始时间', trigger: 'change' },
    {
      validator: (rule: any, value: any, callback: any) => {
        if (value && form.value.endDate && value >= form.value.endDate) {
          callback(new Error('开始时间必须早于截止时间'));
        } else {
          callback();
        }
      },
      trigger: 'change'
    }
  ],
  endDate: [
    { required: true, message: '请选择填报截止时间', trigger: 'change' },
    {
      validator: (rule: any, value: any, callback: any) => {
        if (value && form.value.startDate && value <= form.value.startDate) {
          callback(new Error('截止时间必须晚于开始时间'));
        } else {
          callback();
        }
      },
      trigger: 'change'
    }
  ],
  description: [{ required: true, message: '请输入方案说明', trigger: 'blur' }]
});

const getList = async () => {
  loading.value = true;
  try {
    const res = await listPlan(queryParams);
    planList.value = res.rows || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryParams.planName = undefined;
  queryParams.budgetYear = undefined;
  queryParams.status = undefined;
  handleQuery();
};

const onDateChange = (field: string) => {
  proxy.$refs?.['planRef']?.validateField(field);
};

// ================= 公司 =================
const ensureCompanies = async () => {
  if (companyOptions.value.length) return;
  const res = await listPlanCompanies();
  companyOptions.value = res.data || [];
  companyData.value = companyOptions.value.map(c => ({ key: Number(c.deptId), label: c.deptName }));
};

const companyLabel = (id: string | number) => {
  const c = companyOptions.value.find(x => String(x.deptId) === String(id));
  return c ? c.deptName : String(id);
};

/** 列表里方案填报公司的文本 */
const fillCompanyText = (orgScope?: string) => {
  if (!orgScope) return '';
  const ids = String(orgScope).split(',').map(s => Number(s)).filter(n => !Number.isNaN(n));
  if (!ids.length) return '';
  if (!companyOptions.value.length) return ids.join('、');
  const names = ids.map(id => companyOptions.value.find(c => Number(c.deptId) === id)?.deptName).filter(Boolean);
  return names.join('、');
};

const parseOrgScope = (orgScope?: string): Array<string | number> => {
  if (!orgScope) return [];
  return String(orgScope).split(',').map(s => Number(s)).filter(n => !Number.isNaN(n));
};

const orgFilter = (query: string, option: any) => {
  return String(option.label).toLowerCase().includes(String(query).toLowerCase());
};

// ---- 挂载模板（transfer）----
const mountedTemplateKeys = ref<number[]>([]);
const availableTemplateData = ref<any[]>([]);

const tplFilter = (query: string, option: any) => {
  return String(option.label).toLowerCase().includes(String(query).toLowerCase());
};

/** 加载方案已挂载的模板和可选模板 */
const loadTemplates = async () => {
  if (!form.value.id) {
    mountedTemplateKeys.value = [];
    availableTemplateData.value = [];
    return;
  }
  const [mountedRes, availRes] = await Promise.all([
    listMountedTemplates(form.value.id),
    listAvailableTemplates(form.value.id)
  ]);
  const mounted = mountedRes.data || [];
  const available = availRes.data || [];
  mountedTemplateKeys.value = mounted.map((t: any) => t.id);
  // 合并可选 + 已挂载，供 transfer 展示
  const all = [...available, ...mounted];
  const catMap: Record<string, string> = { BUSINESS: '经营预算', CAPITAL: '资本预算', SPECIAL: '专项预算' };
  availableTemplateData.value = all.map((t: any) => ({
    id: t.id,
    label: `[${t.templateCode}] ${t.templateName}`,
    category: catMap[t.category] || t.category
  }));
};

/** transfer 变化时保存挂载关系 */
const handleTemplateChange = async (value: number[]) => {
  if (!form.value.id) return;
  const currentSet = new Set(mountedTemplateKeys.value);
  const newSet = new Set(value);
  const toMount = value.filter(id => !currentSet.has(id));
  const toUnmount = mountedTemplateKeys.value.filter(id => !newSet.has(id));
  try {
    if (toMount.length) await mountPlanTemplates(form.value.id, toMount);
    if (toUnmount.length) await unmountPlanTemplates(form.value.id, toUnmount);
    proxy.$modal.msgSuccess('模板挂载已更新');
  } catch (e) {
    // 回滚
    await loadTemplates();
  }
};

// ================= 页面切换 ================="
const openForm = async () => {
  viewMode.value = 'form';
  await ensureCompanies();
};

const handleAdd = async () => {
  readonly.value = false;
  pageTitle.value = '新增预算方案';
  form.value = { budgetYear: new Date().getFullYear() + 1, status: 'DRAFT' };
  fillOrgIds.value = [];
  mountedTemplateKeys.value = [];
  availableTemplateData.value = [];
  await openForm();
  await nextTick(() => proxy.$refs['planRef']?.clearValidate?.());
};

const loadPlanForm = async (row: any) => {
  const res = await getPlan(row.id);
  form.value = res.data;
  fillOrgIds.value = parseOrgScope(form.value.orgScope);
  await loadTemplates();
};

const handleUpdate = async (row: any) => {
  readonly.value = false;
  pageTitle.value = '修改预算方案';
  await openForm();
  await loadPlanForm(row);
};

const handleView = async (row: any) => {
  readonly.value = true;
  pageTitle.value = '查看预算方案';
  await openForm();
  await loadPlanForm(row);
};

const backToList = () => {
  viewMode.value = 'list';
  readonly.value = false;
  getList();
};

const submitForm = () => {
  proxy.$refs['planRef'].validate(async (valid: boolean) => {
    if (!valid) return;
    buttonLoading.value = true;
    try {
      const payload = { ...form.value, orgScope: fillOrgIds.value.join(','), templateIds: mountedTemplateKeys.value };
      if (form.value.id) {
        await updatePlan(payload);
        proxy.$modal.msgSuccess('保存成功');
        backToList();
      } else {
        const res = await addPlan(payload);
        form.value.id = res?.data ?? payload.id;
        proxy.$modal.msgSuccess('新增成功，可继续配置填报公司');
        await loadTemplates();
      }
    } finally {
      buttonLoading.value = false;
    }
  });
};

const handleStatus = (row: any, status: string) => {
  const text = status === 'PUBLISHED'
    ? '发布后该方案进入执行中，操作不可逆，确认发布？'
    : '归档后该方案仅供查看，操作不可逆，确认归档？';
  proxy.$modal.confirm(text).then(async () => {
    await changePlanStatus(row.id, status);
    proxy.$modal.msgSuccess('操作成功');
    getList();
  });
};

const handleVoid = (row: any) => {
  proxy.$modal
    .confirm('该方案将被作废，作废后不可恢复，确定继续？', '作废确认')
    .then(() => proxy.$modal.confirm('请再次确认：作废后该方案废弃下线、仅供查看且不可逆，确认作废？', '最终确认'))
    .then(async () => {
      await changePlanStatus(row.id, 'CLOSED');
      proxy.$modal.msgSuccess('作废成功');
      getList();
    });
};

const handleDelete = (row: any) => {
  proxy.$modal.confirm('确认删除该方案?').then(async () => {
    await delPlan(row.id);
    proxy.$modal.msgSuccess('删除成功');
    getList();
  });
};


onMounted(async () => {
  await ensureCompanies();
  getList();
});
</script>

<style lang="scss" scoped>
/* ---------- 整页表单 ---------- */
.plan-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plan-page-title {
  font-size: 16px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  color: var(--el-text-color-primary);
}

.plan-page-icon {
  margin-right: 6px;
  color: var(--el-color-primary);
}

.plan-page-card :deep(.el-card__body) {
  padding-top: 8px;
}

.plan-section {
  padding: 14px 2px 20px;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.plan-section:last-of-type {
  border-bottom: none;
  padding-bottom: 6px;
}

.plan-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
}

.plan-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.plan-step.is-locked {
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color);
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.plan-conn {
  display: flex;
  justify-content: center;
  padding: 4px 0;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}


.plan-base-form {
  max-width: 780px;
}

.plan-page-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 8px;
}

/* ---------- 填报公司 ---------- */
.orgs-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 16px;
}

.orgs-readonly {
  min-height: 120px;
  padding: 8px;
}

.orgs-transfer {
  width: 100%;
}

.orgs-transfer :deep(.el-transfer-panel) {
  width: 46%;
}

/* ---------- 挂载模板 ---------- */
.plan-section-desc {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 16px;
}

.tpl-lock {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  padding: 24px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.tpl-lock-icon {
  color: var(--el-color-primary);
  font-size: 16px;
}

.tpl-transfer {
  width: 100%;
}

.tpl-transfer :deep(.el-transfer-panel) {
  width: 46%;
}
</style>
