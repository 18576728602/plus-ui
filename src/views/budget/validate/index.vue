<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- Tab 1: 校验结果（原有功能） -->
      <el-tab-pane label="校验结果" name="result">
        <el-card shadow="never" class="mb-14">
          <div class="toolbar">
            <div class="filter-item">
              <span class="label">预算方案</span>
              <el-select v-model="query.planId" placeholder="选择方案" filterable size="small" style="width: 220px" @change="validate">
                <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id" />
              </el-select>
            </div>
            <div class="filter-item">
              <span class="label">填报单位</span>
              <el-select v-model="query.orgId" placeholder="选择单位" filterable size="small" style="width: 220px" @change="validate">
                <el-option v-for="u in unitOptions" :key="u.deptId" :label="u.deptName" :value="u.deptId" />
              </el-select>
            </div>
            <div class="filter-item">
              <span class="label">报表类型</span>
              <el-input v-model="query.templateCode" placeholder="空=全部表" clearable size="small" style="width: 120px" @change="validate" />
            </div>
            <div class="filter-item">
              <span class="label">校验类型</span>
              <el-select v-model="query.type" clearable placeholder="全部" size="small" style="width: 140px" @change="filterItems">
                <el-option label="逻辑校验" value="LOGIC" />
                <el-option label="合理性校验" value="REASON" />
                <el-option label="完整性校验" value="COMPLETE" />
              </el-select>
            </div>
            <div class="filter-item">
              <el-button type="primary" :icon="'Select'" :loading="loading" size="small" @click="validate">开始校验</el-button>
              <el-button :icon="'Download'" size="small" @click="exportReport" :disabled="!result">导出校验报告</el-button>
            </div>
          </div>
        </el-card>

        <template v-if="result">
          <el-row :gutter="12" class="mb-14">
            <el-col :span="6"><div class="st" :style="stl(result.status)"><div class="k">校验状态</div><div class="v">{{ statusText(result.status) }}</div><div class="t">{{ result.submittable ? '可通过提交校验' : '存在错误，不可提交' }}</div></div></el-col>
            <el-col :span="6"><div class="st"><div class="k">错误数（不可提交）</div><div class="v" style="color:#dc2626">{{ result.errorCount }}</div></div></el-col>
            <el-col :span="6"><div class="st"><div class="k">警告数（需说明原因）</div><div class="v" style="color:#e6a23c">{{ result.warnCount }}</div></div></el-col>
            <el-col :span="6"><div class="st"><div class="k">校验规则数</div><div class="v">{{ filteredItems.length }}</div><div class="t">实时校验 + 提交校验</div></div></el-col>
          </el-row>

          <el-card shadow="never" v-loading="loading">
            <template #header><span>校验报告清单</span></template>
            <el-table :data="filteredItems" border stripe size="small" style="width: 100%">
              <el-table-column label="类型" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.type === 'LOGIC' ? '' : (row.type === 'REASON' ? 'warning' : 'info')" size="small" effect="light">{{ typeText(row.type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="级别" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.level === 'ERROR' ? 'danger' : 'warning'" size="small" effect="dark">{{ levelText(row.level) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="预算表/科目" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">
                  <span v-if="row.templateName">{{ row.templateName }} / {{ row.itemName }}</span>
                  <span v-else>{{ row.itemName || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="校验规则" prop="rule" min-width="150" show-overflow-tooltip />
              <el-table-column label="说明" prop="message" min-width="320" show-overflow-tooltip />
              <el-table-column label="数值/期望" width="150" align="right">
                <template #default="{ row }">
                  <span v-if="row.value != null">{{ row.value }} / {{ row.expect }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="filteredItems.length === 0" :description="noDataText" style="padding: 30px 0" />
          </el-card>
        </template>
        <el-empty v-else description="请选择方案与单位后执行填报校验" style="padding: 60px 0" />
      </el-tab-pane>

      <!-- Tab 2: 规则配置（仅超级管理员可见） -->
      <el-tab-pane v-if="hasValidateListPerm" label="规则配置" name="rules">
        <el-card shadow="never" v-loading="ruleLoading">
          <template #header>
            <div class="rule-header">
              <span>校验规则配置</span>
              <el-button type="primary" size="small" :icon="'Plus'" @click="openDialog()">新增规则</el-button>
            </div>
          </template>
          <el-table :data="ruleList" border stripe size="small" style="width: 100%">
            <el-table-column label="校验类型" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="ruleTypeTag(row.ruleType)" size="small" effect="light">{{ ruleTypeText(row.ruleType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="规则名称" prop="ruleName" min-width="150" show-overflow-tooltip />
            <el-table-column label="级别" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.ruleLevel === 'ERROR' ? 'danger' : 'warning'" size="small" effect="dark">{{ levelText(row.ruleLevel) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="阈值" width="100" align="right">
              <template #default="{ row }">
                <span v-if="row.thresholdValue != null">{{ row.thresholdValue }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="排序" prop="sortOrder" width="70" align="center" />
            <el-table-column label="说明" min-width="280" show-overflow-tooltip>
              <template #default="{ row }">
                {{ renderDescription(row) }}
              </template>
            </el-table-column>
            <el-table-column label="启用" width="80" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" :active-value="1" :inactive-value="0" @change="toggleEnabled(row)" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" align="center">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 规则编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" size="small">
        <el-form-item label="校验类型" prop="ruleType">
          <el-select v-model="form.ruleType" placeholder="选择类型" style="width: 100%">
            <el-option label="逻辑校验" value="LOGIC" />
            <el-option label="合理性校验" value="REASON" />
            <el-option label="完整性校验" value="COMPLETE" />
          </el-select>
        </el-form-item>
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="form.ruleName" placeholder="如：汇总行=明细合计" />
        </el-form-item>
        <el-form-item label="级别" prop="ruleLevel">
          <el-radio-group v-model="form.ruleLevel">
            <el-radio value="ERROR">错误（阻断提交）</el-radio>
            <el-radio value="WARN">警告（需填说明）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="阈值">
          <el-input-number v-model="form.thresholdValue" :precision="2" :step="0.01" :min="0" placeholder="如30表示30%" style="width: 100%" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="99" style="width: 100%" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="规则说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="dialog.loading" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { validateFill } from '@/api/budget/validate';
import { listPlan } from '@/api/budget/plan';
import { getUnitOptions } from '@/api/budget/dashboard';
import { useUserStore } from '@/store/modules/user';
import {
  listValidateRules,
  addValidateRule,
  updateValidateRule,
  delValidateRule,
  toggleValidateRuleEnabled,
  type ValidateRule
} from '@/api/budget/validateRule';

// ========== Tab 控制 ==========
const activeTab = ref('result');
const userStore = useUserStore();

// 权限控制：仅超级管理员（拥有budget:validate:list权限或*:*:*）可见规则配置Tab
const hasValidateListPerm = computed(() => {
  const perms: string[] = userStore.permissions || [];
  return perms.includes('*:*:*') || perms.includes('budget:validate:list');
});

// ========== 校验结果 Tab ==========

// 说明文字中 [阈值] 占位符替换为实际阈值
const renderDescription = (row: ValidateRule) => {
  if (!row.description) return '';
  if (row.thresholdValue != null) {
    return row.description.replace(/\[阈值\]/g, String(row.thresholdValue));
  }
  return row.description.replace(/超过\[阈值\]%/g, '超过设定阈值');
};

const loading = ref(false);
const result = ref<any>(null);
const query = reactive<any>({ planId: undefined, orgId: undefined, templateCode: undefined, type: undefined });
const planOptions = ref<any[]>([]);
const unitOptions = ref<any[]>([]);

const filteredItems = computed(() => {
  if (!result.value) return [];
  if (!query.type) return result.value.items || [];
  return (result.value.items || []).filter((i: any) => i.type === query.type);
});

const noDataText = computed(() => {
  if (!result.value) return '';
  return result.value.errorCount + result.value.warnCount === 0
    ? '所有校验均通过，无错误无警告'
    : '当前类型下无校验项';
});

const statusText = (s: any) => (s === 'BLOCK' ? '不可提交' : s === 'WARN' ? '有警告' : '通过');
const stl = (s: any) => ({ borderLeftColor: s === 'BLOCK' ? '#dc2626' : s === 'WARN' ? '#e6a23c' : '#16a34a' });
const typeText = (t: any) => (t === 'LOGIC' ? '逻辑校验' : t === 'REASON' ? '合理性' : '完整性');
const levelText = (l: any) => (l === 'ERROR' ? '错误' : '警告');
const ruleTypeText = (t: any) => (t === 'LOGIC' ? '逻辑校验' : t === 'REASON' ? '合理性校验' : '完整性校验');
const ruleTypeTag = (t: any) => (t === 'LOGIC' ? '' : t === 'REASON' ? 'warning' : 'info');

const loadPlans = async () => {
  const res: any = await listPlan({ pageSize: 100 });
  planOptions.value = res.rows || res.data || [];
  if (planOptions.value.length > 0 && !query.planId) query.planId = planOptions.value[0].id;
};

const loadUnits = async () => {
  try {
    const res: any = await getUnitOptions();
    unitOptions.value = res.data || res || [];
    if (unitOptions.value.length > 0 && !query.orgId) query.orgId = unitOptions.value[0].deptId;
  } catch (e) {
    unitOptions.value = [];
  }
};

const validate = async () => {
  if (!query.planId || !query.orgId) {
    ElMessage.warning('请选择预算方案与填报单位');
    return;
  }
  loading.value = true;
  try {
    const res: any = await validateFill(query);
    result.value = res.data || res;
  } finally {
    loading.value = false;
  }
};

const filterItems = () => {};

const exportReport = () => {
  if (!result.value) return;
  const head = ['类型', '级别', '预算表', '科目', '校验规则', '说明', '数值', '期望'];
  const lines = result.value.items.map((i: any) => [
    typeText(i.type), levelText(i.level), i.templateName || '', i.itemName || '',
    i.rule || '', i.message || '', i.value != null ? i.value : '', i.expect != null ? i.expect : ''
  ]);
  const esc = (s: any) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = [head, ...lines].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `填报校验报告_${query.planId}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ========== 规则配置 Tab ==========
const ruleLoading = ref(false);
const ruleList = ref<ValidateRule[]>([]);
const formRef = ref<FormInstance>();
const dialog = reactive({ visible: false, title: '', loading: false });
const form = reactive<ValidateRule>({
  ruleType: '',
  ruleName: '',
  ruleLevel: 'ERROR',
  enabled: 1,
  thresholdValue: undefined,
  sortOrder: 0,
  description: ''
});
const rules = {
  ruleType: [{ required: true, message: '请选择校验类型', trigger: 'change' }],
  ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  ruleLevel: [{ required: true, message: '请选择级别', trigger: 'change' }]
};

const loadRules = async () => {
  ruleLoading.value = true;
  try {
    const res: any = await listValidateRules();
    ruleList.value = res.data || res || [];
  } finally {
    ruleLoading.value = false;
  }
};

const openDialog = (row?: ValidateRule) => {
  dialog.title = row ? '编辑规则' : '新增规则';
  Object.assign(form, {
    id: undefined, ruleType: '', ruleName: '', ruleLevel: 'ERROR',
    enabled: 1, thresholdValue: undefined, sortOrder: 0, description: ''
  });
  if (row) Object.assign(form, row);
  dialog.visible = true;
};

const submitForm = async () => {
  await formRef.value?.validate();
  dialog.loading = true;
  try {
    if (form.id) {
      await updateValidateRule(form);
      ElMessage.success('修改成功');
    } else {
      await addValidateRule(form);
      ElMessage.success('新增成功');
    }
    dialog.visible = false;
    loadRules();
  } finally {
    dialog.loading = false;
  }
};

const handleDelete = (row: ValidateRule) => {
  ElMessageBox.confirm(`确认删除规则「${row.ruleName}」？`, '提示', { type: 'warning' })
    .then(async () => {
      await delValidateRule(row.id!);
      ElMessage.success('删除成功');
      loadRules();
    })
    .catch(() => {});
};

const toggleEnabled = async (row: ValidateRule) => {
  try {
    await toggleValidateRuleEnabled(row.id!, row.enabled);
    ElMessage.success(row.enabled === 1 ? '已启用' : '已停用');
  } catch {
    row.enabled = row.enabled === 1 ? 0 : 1;
  }
};

// ========== 初始化 ==========
onMounted(async () => {
  await Promise.all([loadPlans(), loadUnits()]);
  validate();
  loadRules();
});
</script>

<style scoped>
.mb-14 { margin-bottom: 14px; }
.toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 18px; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item .label { color: #606266; font-size: 13px; white-space: nowrap; }
.st { background: #fff; border: 1px solid #e4e7ed; border-left: 4px solid #409eff; border-radius: 6px; padding: 12px 16px; }
.st .k { font-size: 12px; color: #909399; }
.st .v { font-size: 22px; font-weight: 700; color: #303133; margin-top: 4px; }
.st .t { font-size: 12px; color: #909399; margin-top: 2px; }
.rule-header { display: flex; justify-content: space-between; align-items: center; }
</style>
