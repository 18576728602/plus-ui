<template>
  <div class="app-container">
    <!-- 顶部筛选 -->
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="预算方案">
          <el-select v-model="queryParams.planId" placeholder="全部方案" clearable filterable style="width: 200px" @keyup.enter="handleQuery">
            <el-option v-for="item in planOptions" :key="item.id" :label="item.planName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用单位">
          <el-select v-model="queryParams.orgId" placeholder="全部单位" clearable filterable style="width: 200px" @keyup.enter="handleQuery">
            <el-option v-for="item in companyOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="预算表">
          <el-select v-model="queryParams.templateCode" placeholder="全部预算表" clearable style="width: 200px" @keyup.enter="handleQuery">
            <el-option v-for="item in templateOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="控制强度">
          <el-select v-model="queryParams.controlStrength" placeholder="全部" clearable style="width: 130px" @keyup.enter="handleQuery">
            <el-option label="刚性控制" value="RIGID" />
            <el-option label="柔性控制" value="FLEXIBLE" />
            <el-option label="预警控制" value="WARN" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.enabled" placeholder="全部" clearable style="width: 110px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 规则列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="flex-between">
          <div>
            <span class="font-bold">预算控制规则</span>
            <span class="header-desc">设置控制强度、提示/控制阈值，在执行录入时按规则进行事前拦截或警示</span>
          </div>
          <div>
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['budget:control:add']">新增规则</el-button>
            <el-button type="danger" plain icon="Delete" :disabled="ids.length === 0" @click="handleDelete()" v-hasPermi="['budget:control:remove']">删除</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="ruleList" border>
        <el-table-column type="selection" width="45" align="center" />
        <el-table-column label="适用范围" min-width="220">
          <template #default="{ row }">
            <div class="scope-cell">
              <span class="scope-tag" v-if="row.planId" :title="'预算方案'">{{ planName(row.planId) }}</span>
              <span class="scope-tag" v-else>全部方案</span>
              <span class="scope-tag" v-if="row.orgId" :title="'适用单位'">{{ companyName(row.orgId) }}</span>
              <span class="scope-tag" v-else>全部单位</span>
              <span class="scope-tag" v-if="row.templateCode" :title="'预算表'">{{ templateName(row.templateCode) }}</span>
              <span class="scope-tag" v-else>全部预算表</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="控制强度" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="strengthTagType(row.controlStrength)" effect="light" size="small">
              {{ strengthText(row.controlStrength) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="控制口径" width="100" align="center">
          <template #default="{ row }">{{ scopeText(row.controlScope) }}</template>
        </el-table-column>
        <el-table-column label="阈值配置(提示/控制)" width="220" align="center">
          <template #default="{ row }">
            <div class="threshold-cell">
              <div class="threshold-bar">
                <el-tooltip :content="'提示阈值 ' + Number(row.warnPercent ?? 0).toFixed(0) + '%'" placement="top">
                  <div class="warn-seg" :style="{ width: Math.min(Number(row.warnPercent ?? 0), 100) + '%' }"></div>
                </el-tooltip>
                <el-tooltip :content="'控制阈值 ' + Number(row.blockPercent ?? 0).toFixed(0) + '%'" placement="top">
                  <div class="block-seg" :style="{ left: Math.min(Number(row.warnPercent ?? 0), 100) + '%', width: Math.max(Number(row.blockPercent ?? 0) - Number(row.warnPercent ?? 0), 0) + '%' }"></div>
                </el-tooltip>
                <div class="threshold-marker" :style="{ left: Math.min(Number(row.blockPercent ?? 0), 100) + '%' }"></div>
              </div>
              <span class="threshold-text">
                <span class="warn-c">{{ Number(row.warnPercent ?? 0).toFixed(0) }}%</span>
                /
                <span class="block-c">{{ Number(row.blockPercent ?? 0).toFixed(0) }}%</span>
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80" align="center" prop="sortOrder" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              :disabled="!row.enabled && disabledToggleLoading === row.id"
              @change="(val: boolean) => handleToggle(row, val)"
              v-hasPermi="['budget:control:edit']"
            />
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(row)" v-hasPermi="['budget:control:edit']">编辑</el-button>
            <el-button link type="danger" icon="Delete" @click="handleDelete([row.id])" v-hasPermi="['budget:control:remove']">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>

    <!-- 新增/编辑规则弹窗 -->
    <el-dialog :title="dialog.title" v-model="dialog.visible" width="680px" append-to-body>
      <el-form ref="ruleFormRef" :model="form" :rules="rules" label-width="110px">
        <el-divider content-position="left">适用范围</el-divider>
        <el-form-item label="预算方案" prop="planId">
          <el-select v-model="form.planId" placeholder="留空=全部方案" clearable filterable style="width: 100%">
            <el-option v-for="item in planOptions" :key="item.id" :label="item.planName" :value="item.id" />
          </el-select>
          <div class="form-tip">勾选方案后，规则仅对该方案生效</div>
        </el-form-item>
        <el-form-item label="适用单位" prop="orgId">
          <el-select v-model="form.orgId" placeholder="留空=全部单位" clearable filterable style="width: 100%">
            <el-option v-for="item in companyOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
          </el-select>
          <div class="form-tip">留空表示该规则对全部填报单位生效</div>
        </el-form-item>
        <el-form-item label="预算表" prop="templateCode">
          <el-select v-model="form.templateCode" placeholder="留空=全部预算表" clearable style="width: 100%">
            <el-option v-for="item in templateOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">控制策略</el-divider>
        <el-form-item label="控制强度" prop="controlStrength">
          <el-radio-group v-model="form.controlStrength">
            <el-radio-button value="RIGID">刚性控制</el-radio-button>
            <el-radio-button value="FLEXIBLE">柔性控制</el-radio-button>
            <el-radio-button value="WARN">预警控制</el-radio-button>
          </el-radio-group>
          <div class="form-tip">{{ strengthDesc(form.controlStrength) }}</div>
        </el-form-item>
        <el-form-item label="控制口径" prop="controlScope">
          <el-radio-group v-model="form.controlScope">
            <el-radio-button value="ACCUM">累计口径</el-radio-button>
            <el-radio-button value="CURRENT">当期口径</el-radio-button>
          </el-radio-group>
          <div class="form-tip">{{ form.controlScope === 'CURRENT' ? '按最大单季度执行与季度预算(年/4)比较' : '按年度累计执行与全年预算比较' }}</div>
        </el-form-item>
        <el-form-item label="提示阈值" prop="warnPercent">
          <el-slider v-model="form.warnPercent" :min="0" :max="100" :step="5" show-input class="threshold-slider" />
          <div class="form-tip">执行率达到该比例时黄灯提示</div>
        </el-form-item>
        <el-form-item label="控制阈值" prop="blockPercent">
          <el-slider v-model="form.blockPercent" :min="0" :max="200" :step="5" show-input class="threshold-slider" />
          <div class="form-tip">执行率达到该比例时红灯；刚性控制将阻止提交</div>
        </el-form-item>
        <el-form-item label="优先级" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" controls-position="right" style="width: 160px" />
          <div class="form-tip">值越小越优先匹配；适用范围更精确的规则优先于优先级</div>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="规则说明" />
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

<script setup lang="ts" name="BudgetControl">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import {
  listBudgetControlRule,
  addBudgetControlRule,
  updateBudgetControlRule,
  toggleBudgetControlRule,
  delBudgetControlRule,
  listControlCompanies
} from '@/api/budget/control';
import type { BudgetControlRuleVO, BudgetControlRuleForm, BudgetControlRuleQuery } from '@/api/budget/control/types';
import { listPlan } from '@/api/budget/fill';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const ruleList = ref<BudgetControlRuleVO[]>([]);
const planOptions = ref<any[]>([]);
const companyOptions = ref<any[]>([]);
const loading = ref(true);
const buttonLoading = ref(false);
const total = ref(0);
const ids = ref<Array<string | number>>([]);
const disabledToggleLoading = ref<number | null>(null);

const queryFormRef = ref<FormInstance>();
const ruleFormRef = ref<FormInstance>();

const dialog = reactive({ visible: false, title: '' });

const templateOptions = [
  { value: '01', label: '01-公司基本信息' },
  { value: '02', label: '02-营业收入预算表' },
  { value: '03', label: '03-营业成本预算表' },
  { value: '04', label: '04-税金及附加预算表' },
  { value: '05', label: '05-人工成本预算表' },
  { value: '06', label: '06-管理费用预算表' },
  { value: '07', label: '07-财务费用预算表' },
  { value: '08', label: '08-固定资产折旧预算表' },
  { value: '09', label: '09-固定资产投资预算表' },
  { value: '10', label: '10-融资预算表' },
  { value: '11', label: '11-现金流量预算表' },
  { value: '12', label: '12-预计利润表' },
  { value: '13', label: '13-预计资产负债表' },
  { value: '16', label: '16-三公经费预算表' }
];

const initFormData: BudgetControlRuleForm = {
  id: undefined,
  planId: undefined,
  orgId: undefined,
  templateCode: undefined,
  controlStrength: 'WARN',
  warnPercent: 80,
  blockPercent: 100,
  controlScope: 'ACCUM',
  sortOrder: 0,
  enabled: true,
  remark: undefined
};

const data = reactive({
  form: { ...initFormData } as BudgetControlRuleForm,
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    planId: undefined,
    orgId: undefined,
    templateCode: undefined,
    controlStrength: undefined,
    enabled: undefined,
    params: {}
  } as BudgetControlRuleQuery,
  rules: {
    controlStrength: [{ required: true, message: '请选择控制强度', trigger: 'change' }],
    controlScope: [{ required: true, message: '请选择控制口径', trigger: 'change' }],
    warnPercent: [{ required: true, message: '请设置提示阈值', trigger: 'change' }],
    blockPercent: [{ required: true, message: '请设置控制阈值', trigger: 'change' }],
    sortOrder: [{ required: true, message: '请设置优先级', trigger: 'change' }]
  }
});
const { form, queryParams, rules } = toRefs(data);

const strengthText = (s: string) => ({ RIGID: '刚性', FLEXIBLE: '柔性', WARN: '预警' } as Record<string, string>)[s] || s;
const strengthTagType = (s: string) => ({ RIGID: 'danger', FLEXIBLE: 'warning', WARN: 'info' } as Record<string, any>)[s] || 'info';
const scopeText = (s: string) => s === 'CURRENT' ? '当期' : '累计';
const strengthDesc = (s: string) =>
  ({
    RIGID: '达到控制阈值时阻断录入，需先调整预算或特批',
    FLEXIBLE: '达到控制阈值时放行但强提示，需关注预算调整',
    WARN: '仅提示警示，不阻断录入'
  } as Record<string, string>)[s] || '';

const planName = (id?: number) => planOptions.value.find(p => p.id === id)?.planName || `方案${id}`;
const companyName = (id?: number) => companyOptions.value.find(c => c.deptId === id)?.deptName || `单位${id}`;
const templateName = (code?: string) => templateOptions.find(t => t.value === code)?.label || code;

const getList = async () => {
  loading.value = true;
  try {
    const res = await listBudgetControlRule(queryParams.value);
    ruleList.value = res.rows || res.data || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => { queryParams.value.pageNum = 1; getList(); };
const resetQuery = () => { queryFormRef.value?.resetFields(); handleQuery(); };

const handleSelectionChange = (selection: BudgetControlRuleVO[]) => {
  ids.value = selection.map(item => item.id as number);
};

const reset = () => { form.value = { ...initFormData }; ruleFormRef.value?.resetFields(); };

const handleAdd = () => { reset(); dialog.title = '新增控制规则'; dialog.visible = true; };

const handleUpdate = (row: BudgetControlRuleVO) => {
  reset();
  form.value = {
    id: row.id,
    planId: row.planId,
    orgId: row.orgId,
    templateCode: row.templateCode,
    controlStrength: row.controlStrength,
    warnPercent: Number(row.warnPercent ?? 80),
    blockPercent: Number(row.blockPercent ?? 100),
    controlScope: row.controlScope,
    sortOrder: row.sortOrder ?? 0,
    enabled: row.enabled ?? true,
    remark: row.remark
  };
  dialog.title = '编辑控制规则';
  dialog.visible = true;
};

const submitForm = () => {
  ruleFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return;
    if ((form.value.blockPercent ?? 0) < (form.value.warnPercent ?? 0)) {
      ElMessage.warning('控制阈值不能小于提示阈值');
      return;
    }
    buttonLoading.value = true;
    try {
      if (form.value.id) {
        await updateBudgetControlRule(form.value);
      } else {
        await addBudgetControlRule(form.value);
      }
      proxy?.$modal.msgSuccess('操作成功');
      dialog.visible = false;
      await getList();
    } finally {
      buttonLoading.value = false;
    }
  });
};

const handleToggle = async (row: BudgetControlRuleVO, val: boolean) => {
  if (!val && row.enabled) {
    // 从启用->停用需确认
    try {
      await ElMessageBox.confirm(`确认停用该控制规则？停用后执行录入将不再受其约束。`, '停用确认', {
        type: 'warning', confirmButtonText: '确定停用', cancelButtonText: '取消'
      });
    } catch {
      getList();
      return;
    }
  }
  disabledToggleLoading.value = row.id as number;
  try {
    await toggleBudgetControlRule(row.id as number, val);
    proxy?.$modal.msgSuccess(val ? '已启用' : '已停用');
    await getList();
  } finally {
    disabledToggleLoading.value = null;
  }
};

const handleDelete = async (rowIds?: Array<string | number>) => {
  const _ids = rowIds || ids.value;
  if (!_ids.length) return;
  await proxy?.$modal.confirm('是否确认删除选中的控制规则？删除后不可恢复。').catch(() => {});
  await delBudgetControlRule(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const cancel = () => { reset(); dialog.visible = false; };

const loadPlans = async () => {
  try {
    const res = await listPlan();
    planOptions.value = res.rows || res.data || [];
  } catch { /* ignore */ }
};

const loadCompanies = async () => {
  try {
    const res = await listControlCompanies();
    companyOptions.value = Array.isArray(res.data) ? res.data : (res.rows || []);
  } catch { /* ignore */ }
};

onMounted(() => {
  getList();
  loadPlans();
  loadCompanies();
});
</script>

<style scoped>
.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-desc {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.scope-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.scope-tag {
  display: inline-block;
  padding: 0 8px;
  height: 20px;
  line-height: 20px;
  border-radius: 3px;
  background: #f4f4f5;
  color: #606266;
  font-size: 12px;
  white-space: nowrap;
}

.threshold-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.threshold-bar {
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: #ebeef5;
  overflow: hidden;
}

.warn-seg {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: #e6a23c;
}

.block-seg {
  position: absolute;
  top: 0;
  height: 100%;
  background: #f56c6c;
}

.threshold-marker {
  position: absolute;
  top: -2px;
  width: 2px;
  height: 12px;
  background: #303133;
}

.threshold-text {
  font-size: 12px;
  color: #909399;
}

.threshold-text .warn-c { color: #e6a23c; font-weight: bold; }
.threshold-text .block-c { color: #f56c6c; font-weight: bold; }

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  width: 100%;
  margin-top: 2px;
}

.threshold-slider {
  width: 90%;
}
</style>