<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <el-card class="mb-4" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="预算方案">
          <el-select v-model="queryParams.planId" placeholder="全部" clearable style="width: 200px">
            <el-option v-for="item in planOptions" :key="item.id" :label="item.planName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请单位">
          <el-select v-model="queryParams.orgId" placeholder="全部" clearable filterable style="width: 200px">
            <el-option v-for="item in deptOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="待审批" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已驳回" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 + 列表 -->
    <el-card shadow="never">
      <div class="mb-4">
        <el-tooltip :disabled="planOptions.length > 0" content="当前没有执行中的预算方案，无法发起预算调整" placement="top">
          <span>
            <el-button type="primary" icon="Plus" :disabled="!planOptions.length" @click="handleAdd" v-hasPermi="['budget:adjustment:add']">新增调整申请</el-button>
          </span>
        </el-tooltip>
      </div>

      <el-table :data="tableData" border size="small" v-loading="loading" style="width: 100%">
        <el-table-column label="预算方案" min-width="170">
          <template #default="{ row }">{{ row.planName || (planOptions.length ? getPlanName(row.planId) : (row.planId || '-')) }}</template>
        </el-table-column>
        <el-table-column label="申请单位" min-width="150">
          <template #default="{ row }">{{ getDeptName(row.orgId) }}</template>
        </el-table-column>
        <el-table-column label="预算表" width="160" align="center">
          <template #default="{ row }">{{ getTemplateName(row.templateCode) }}</template>
        </el-table-column>
        <el-table-column label="科目" min-width="200">
          <template #default="{ row }">{{ row.itemCode }} - {{ getItemName(row.itemCode) }}</template>
        </el-table-column>
        <el-table-column label="原预算(万元)" prop="originalAmount" width="120" align="right">
          <template #default="{ row }">{{ formatAmount(row.originalAmount) }}</template>
        </el-table-column>
        <el-table-column label="调整额(万元)" prop="adjustAmount" width="120" align="right">
          <template #default="{ row }">
            <span :class="row.adjustAmount >= 0 ? 'text-green' : 'text-red'">
              {{ row.adjustAmount >= 0 ? '+' : '' }}{{ formatAmount(row.adjustAmount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="调整后(万元)" width="120" align="right">
          <template #default="{ row }">{{ formatAmount((Number(row.originalAmount) || 0) + (Number(row.adjustAmount) || 0)) }}</template>
        </el-table-column>
        <el-table-column label="调整原因" min-width="220">
          <template #default="{ row }">
            <span style="white-space: normal; word-break: break-all; line-height: 1.4">{{ row.reason }}</span>
          </template>
        </el-table-column>
        <el-table-column label="申请人" prop="applicantName" width="100" align="center" />
        <el-table-column label="状态" prop="status" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'PENDING'" type="success" size="small" link @click="handleApprove(row)" v-hasPermi="['budget:adjustment:approve']">审批</el-button>
            <el-button v-else type="primary" size="small" link @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleQuery"
          @current-change="handleQuery"
        />
      </div>
    </el-card>

    <!-- 新增弹窗 -->
    <el-dialog v-model="dialogVisible" title="新增调整申请" width="700px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="预算方案" prop="planId">
          <el-select v-model="form.planId" placeholder="请选择" style="width: 100%" @change="loadApprovedTemplates">
            <el-option v-for="item in planOptions" :key="item.id" :label="item.planName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请单位" prop="orgId">
          <el-select v-model="form.orgId" placeholder="请选择" filterable style="width: 100%" :disabled="singleUnitForm" @change="loadApprovedTemplates">
            <el-option v-for="item in deptOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="预算表" prop="templateCode">
          <el-select v-model="form.templateCode" placeholder="请选择" style="width: 100%" @change="onTemplateChange">
            <el-option v-for="item in templateOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="科目" prop="itemCode">
          <el-select v-model="form.itemCode" placeholder="请选择科目" filterable style="width: 100%" @change="onItemChange">
            <el-option
              v-for="item in itemOptions"
              :key="item.itemCode"
              :label="`${item.itemCode} - ${item.itemName}`"
              :value="item.itemCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="原预算金额" prop="originalAmount">
          <el-input-number v-model="form.originalAmount" :precision="2" :controls="false" style="width: 200px" :disabled="true" />
          <span class="ml-2 text-gray-400">万元（只读，取自已审批预算）</span>
        </el-form-item>
        <el-form-item label="调整金额" prop="adjustAmount">
          <el-input-number v-model="form.adjustAmount" :precision="2" :controls="false" style="width: 200px" :disabled="!canAdjust" />
          <span class="ml-2 text-gray-400">万元（正数增加，负数减少）</span>
        </el-form-item>
        <el-form-item label="调整后金额">
          <span class="font-bold">{{ formatAmount(computedAdjusted) }} 万元</span>
        </el-form-item>
        <el-form-item label="调整原因" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="请输入调整原因" />
        </el-form-item>
        <el-form-item label="附件">
          <el-upload
            :http-request="uploadAttachment"
            :limit="5"
            multiple
            :on-remove="handleUploadRemove"
            :on-error="handleUploadError"
          >
            <el-button size="small" type="primary" plain icon="Upload">上传附件</el-button>
            <template #tip>
              <div class="el-upload__tip">非必填，最多5个，仅上传佐证材料</div>
            </template>
          </el-upload>
        </el-form-item>

        <!-- 调整影响分析（选科目+填调整额后实时计算） -->
        <el-divider content-position="left">调整影响分析</el-divider>
        <div v-loading="impactLoading" class="impact-panel">
          <template v-if="impact">
            <div class="impact-block">
              <div class="impact-block-title">本公司影响</div>
              <div class="impact-grid">
                <div class="impact-item"><span class="lbl">科目</span><span class="val">{{ impact.itemName || impact.itemCode }}</span></div>
                <div class="impact-item"><span class="lbl">调整前预算</span><span class="val">{{ formatAmount(impact.ownOriginal) }} 万元</span></div>
                <div class="impact-item"><span class="lbl">调整后预算</span><span class="val font-bold">{{ formatAmount(impact.ownAdjusted) }} 万元</span></div>
                <div class="impact-item"><span class="lbl">调整幅度</span><span class="val" :class="Number(impact.adjustAmount) > 0 ? 'text-red' : 'text-green'">
                  {{ Number(impact.adjustAmount) > 0 ? '+' : '' }}{{ formatAmount(impact.adjustAmount) }} 万元 ({{ formatRate(impact.ownChangeRate) }})</span></div>
                <div class="impact-item"><span class="lbl">本表调整前合计</span><span class="val">{{ formatAmount(impact.tableTotalBefore) }} 万元</span></div>
                <div class="impact-item"><span class="lbl">本表调整后合计</span><span class="val font-bold">{{ formatAmount(impact.tableTotalAfter) }} 万元</span></div>
                <div class="impact-item"><span class="lbl">本表变动率</span><span class="val">{{ formatRate(impact.tableChangeRate) }}</span></div>
                <div class="impact-item"><span class="lbl">调整后占本表</span><span class="val">{{ formatRate(impact.ownShareAfter) }}</span></div>
              </div>
            </div>
            <div class="impact-block">
              <div class="impact-block-title">集团影响（同科目跨单位）</div>
              <div class="impact-grid">
                <div class="impact-item"><span class="lbl">集团调整前总额</span><span class="val">{{ formatAmount(impact.groupTotalBefore) }} 万元</span></div>
                <div class="impact-item"><span class="lbl">集团调整后总额</span><span class="val font-bold">{{ formatAmount(impact.groupTotalAfter) }} 万元</span></div>
                <div class="impact-item"><span class="lbl">集团变动率</span><span class="val">{{ formatRate(impact.groupChangeRate) }}</span></div>
                <div class="impact-item"><span class="lbl">涉及公司数</span><span class="val">{{ impact.companyCount }} 家</span></div>
                <div class="impact-item"><span class="lbl">本公司占比(调整后)</span><span class="val">{{ formatRate(impact.groupShareAfter) }}</span></div>
              </div>
            </div>
            <div class="impact-block impact-history">
              <div class="impact-block-title">科目调整历史</div>
              <div class="impact-grid">
                <div class="impact-item"><span class="lbl">历史调整次数</span><span class="val">{{ impact.historyCount }} 次 (通过 {{ impact.historyApprovedCount }} 次)</span></div>
                <div class="impact-item"><span class="lbl">历史累计调整金额</span><span class="val">{{ formatAmount(impact.historyTotalAmount) }} 万元</span></div>
                <div class="impact-item"><span class="lbl">最近调整时间</span><span class="val">{{ impact.lastAdjustDate || '-' }}</span></div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="impact-empty">请选择科目并填写调整金额后，自动预估影响</div>
          </template>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :disabled="!canAdjust">确定</el-button>
      </template>
    </el-dialog>

    <!-- 审批弹窗 -->
    <el-dialog v-model="approveVisible" title="预算调整审批" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="申请单位">{{ getDeptName(currentRow.orgId) }}</el-descriptions-item>
        <el-descriptions-item label="预算表">{{ currentRow.templateCode }} - {{ getTemplateName(currentRow.templateCode) }}</el-descriptions-item>
        <el-descriptions-item label="科目编码">{{ currentRow.itemCode }}</el-descriptions-item>
        <el-descriptions-item label="原预算">{{ formatAmount(currentRow.originalAmount) }} 万元</el-descriptions-item>
        <el-descriptions-item label="调整额">
          <span :class="currentRow.adjustAmount >= 0 ? 'text-green' : 'text-red'">
            {{ currentRow.adjustAmount >= 0 ? '+' : '' }}{{ formatAmount(currentRow.adjustAmount) }} 万元
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="调整后">{{ formatAmount((Number(currentRow.originalAmount) || 0) + (Number(currentRow.adjustAmount) || 0)) }} 万元</el-descriptions-item>
        <el-descriptions-item label="调整原因">{{ currentRow.reason }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentRow.applicantName }}</el-descriptions-item>
      </el-descriptions>
      <el-form class="mt-4" label-width="80px">
        <el-form-item label="审批结果">
          <el-radio-group v-model="approveForm.approveResult">
            <el-radio value="APPROVED">通过</el-radio>
            <el-radio value="REJECTED">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input v-model="approveForm.approveRemark" type="textarea" :rows="3" placeholder="请输入审批意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApprove">确认审批</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="调整详情" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="申请单位">{{ getDeptName(currentRow.orgId) }}</el-descriptions-item>
        <el-descriptions-item label="预算表">{{ currentRow.templateCode }} - {{ getTemplateName(currentRow.templateCode) }}</el-descriptions-item>
        <el-descriptions-item label="科目编码">{{ currentRow.itemCode }}</el-descriptions-item>
        <el-descriptions-item label="原预算">{{ formatAmount(currentRow.originalAmount) }} 万元</el-descriptions-item>
        <el-descriptions-item label="调整额">{{ formatAmount(currentRow.adjustAmount) }} 万元</el-descriptions-item>
        <el-descriptions-item label="调整后">{{ formatAmount((Number(currentRow.originalAmount) || 0) + (Number(currentRow.adjustAmount) || 0)) }} 万元</el-descriptions-item>
        <el-descriptions-item label="调整原因">{{ currentRow.reason }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentRow.applicantName }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentRow.status)" size="small">{{ getStatusLabel(currentRow.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审批人">{{ currentRow.approverName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审批时间">{{ currentRow.approveTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审批意见">{{ currentRow.approveRemark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="BudgetAdjustment">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import {
  listAdjustment,
  addAdjustment,
  approveAdjustment,
  listPlan,
  listTemplateItems,
  listAllTemplateItems,
  getBudgetData,
  listApprovedTemplates,
  analyzeAdjustmentImpact
} from '@/api/budget/adjustment';
import { getUnitOptions } from '@/api/budget/dashboard';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const singleUnitForm = ref(false);
const planOptions = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
const itemOptions = ref<any[]>([]);
const allItemOptions = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  planId: undefined as number | undefined,
  orgId: undefined as number | undefined,
  status: undefined as string | undefined
});

const templateOptions = ref<any[]>([]);

const formatAmount = (val: any) => {
  if (val == null || val === '' || Number.isNaN(Number(val))) return '0.00';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };
  return map[status] || 'info';
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = { PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回' };
  return map[status] || status;
};

const getDeptName = (deptId: number) => {
  const dept = deptOptions.value.find(d => d.deptId === deptId);
  return dept ? dept.deptName : deptId || '-';
};

const getPlanName = (planId: number) => {
  const plan = planOptions.value.find(p => p.id === planId);
  return plan ? plan.planName : (planId || '-');
};

const getTemplateName = (code: string) => {
  const item = templateOptions.value.find(t => t.value === code);
  return item ? item.label : code || '-';
};

const getItemName = (code: string) => {
  const item = allItemOptions.value.find(i => i.itemCode === code);
  if (item) return item.itemName;
  return '';
};

const handleQuery = async () => {
  loading.value = true;
  try {
    const res = await listAdjustment(queryParams);
    tableData.value = res.rows || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  queryParams.planId = undefined;
  queryParams.orgId = undefined;
  queryParams.status = undefined;
  queryParams.pageNum = 1;
  handleQuery();
};

// ===== 新增弹窗 =====
const dialogVisible = ref(false);
// 是否允许发起调整：所选科目存在已审批通过的预算金额>0 才能发起
const canAdjust = ref(false);
const formRef = ref();
// 调整日期默认取创建当天（本地日期 yyyy-MM-dd）
const todayStr = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const form = reactive({
  id: undefined as number | undefined,
  planId: undefined as number | undefined,
  orgId: undefined as number | undefined,
  templateCode: undefined as string | undefined,
  itemCode: '',
  originalAmount: undefined as number | undefined,
  adjustAmount: undefined as number | undefined,
  adjustDate: todayStr(),
  reason: '',
  attachment: ''
});

const computedAdjusted = computed(() => {
  if (form.originalAmount != null && form.adjustAmount != null) {
    return (Number(form.originalAmount) || 0) + (Number(form.adjustAmount) || 0);
  }
  return 0;
});

// ===== 调整影响分析 =====
const impact = ref<any>(null);
const impactLoading = ref(false);
let impactTimer: any = null;

const formatRate = (v: any) => {
  if (v == null || v === '' || Number.isNaN(Number(v))) return '0.00%';
  return Number(v).toFixed(2) + '%';
};

const loadImpact = async () => {
  if (!form.planId || !form.orgId || !form.templateCode || !form.itemCode || form.adjustAmount == null) {
    impact.value = null;
    return;
  }
  impactLoading.value = true;
  try {
    const res = await analyzeAdjustmentImpact({
      planId: form.planId,
      orgId: form.orgId,
      templateCode: form.templateCode,
      itemCode: form.itemCode,
      originalAmount: form.originalAmount,
      adjustAmount: form.adjustAmount || 0
    });
    impact.value = res.data || res;
  } catch (e) {
    impact.value = null;
  } finally {
    impactLoading.value = false;
  }
};

// 调整金额变化后防抖刷新影响分析
watch(
  () => [form.templateCode, form.itemCode, form.adjustAmount, form.orgId],
  () => {
    clearTimeout(impactTimer);
    if (!form.itemCode || form.adjustAmount == null) {
      impact.value = null;
      return;
    }
    impactTimer = setTimeout(loadImpact, 500);
  },
  { immediate: false }
);

const rules = {
  planId: [{ required: true, message: '请选择预算方案', trigger: 'change' }],
  orgId: [{ required: true, message: '请选择申请单位', trigger: 'change' }],
  templateCode: [{ required: true, message: '请选择预算表', trigger: 'change' }],
  itemCode: [{ required: true, message: '请选择科目', trigger: 'change' }],
  adjustAmount: [{ required: true, message: '请输入调整金额', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入调整原因', trigger: 'blur' }]
};

const handleAdd = () => {
  if (!planOptions.value.length) {
    ElMessage.warning('当前没有执行中的预算方案，无法发起预算调整');
    return;
  }
  Object.assign(form, {
    id: undefined, planId: undefined,
    orgId: deptOptions.value.length ? deptOptions.value[0].deptId : undefined,
    templateCode: undefined, itemCode: '', originalAmount: undefined,
    adjustAmount: undefined, adjustDate: todayStr(), reason: '', attachment: ''
  });
  itemOptions.value = [];
  canAdjust.value = false;
  impact.value = null;
  dialogVisible.value = true;
  loadApprovedTemplates();
};

// 预算表下拉：仅加载当前单位+方案下已审批通过的预算表（子公司账号看不到集团本部等未配置/未审批的表）
const getTemplateNameOf = (code: string) => {
  const it = allItemOptions.value.find((i: any) => i.templateCode === code);
  return it ? (it.templateName || code) : code;
};
const loadApprovedTemplates = async () => {
  form.templateCode = undefined;
  form.itemCode = '';
  form.originalAmount = undefined;
  itemOptions.value = [];
  canAdjust.value = false;
  if (!form.planId || !form.orgId) return;
  try {
    const res = await listApprovedTemplates(form.planId, form.orgId);
    const codesArr = Array.isArray(res) ? res : (res.data || res.rows || []);
    const codes = Array.from(new Set((codesArr || []).filter(Boolean)));
    templateOptions.value = codes
      .filter((code: string) => code !== '01')
      .map((code: string) => ({ value: code, label: `${code}-${getTemplateNameOf(code)}` }));
  } catch (error) {
    console.error(error);
  }
};

// 选预算表后加载科目列表
const onTemplateChange = async (code: string) => {
  form.itemCode = '';
  form.originalAmount = undefined;
  itemOptions.value = [];
  if (!code) return;
  try {
    const res = await listTemplateItems(code);
    const list = res.data || res.rows || [];
    // 只显示可编辑的明细行（非汇总行）
    itemOptions.value = list.filter((item: any) => item.isEditable === 1 && item.itemLevel === 2);
  } catch (error) {
    console.error(error);
  }
};

// 选科目后自动查已有填报数据，带出原预算金额（只读），并按预算表审批状态校验能否调整
const onItemChange = async (itemCode: string) => {
  form.originalAmount = 0;
  canAdjust.value = false;
  form.adjustAmount = undefined;
  if (!itemCode || !form.planId || !form.orgId) {
    return;
  }
  try {
    const res = await getBudgetData({
      planId: form.planId,
      deptId: form.orgId,
      templateCode: form.templateCode!
    });
    // getFillData 返回 R<List>，request 已解包为数组；金额为万元 BigDecimal，不截断
    const list = Array.isArray(res) ? res : (res.rows || res.data || []);
    const rows = Array.isArray(list) ? list : [];
    // 统一口径：以“该预算表整体是否已审批通过(APPROVED)”为准，而非单科目金额>0
    const tableApproved = rows.some((x: any) => x.status === 'APPROVED');
    const row = rows.find((x: any) => String(x.itemCode) === String(itemCode));
    form.originalAmount = row ? Number(row.budgetAmount) || 0 : 0;
    if (!tableApproved) {
      ElMessage.warning('该单位该预算表未审批通过，无法发起调整申请');
    } else {
      // 表已审批通过，即使该科目原预算为0（当初未填）也可从0调增
      canAdjust.value = true;
    }
  } catch (error) {
    console.error(error);
    ElMessage.warning('获取原预算金额失败，无法发起调整申请');
  }
};

// 附件上传（非必填）：普通POST到系统 /common/upload，成功后把url追加到 form.attachment
const uploadAttachment = (options: any) => {
  const xhr = new XMLHttpRequest();
  const fd = new FormData();
  fd.append('file', options.file);
  const base = (request as any).defaults?.baseURL || '';
  const token = localStorage.getItem('Admin-Token');
  xhr.open('POST', `${base}/common/upload`);
  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.upload.onprogress = (e: ProgressEvent) => {
    if (e.total && options.onProgress) options.onProgress({ percent: Math.round((e.loaded / e.total) * 100) });
  };
  xhr.onload = () => {
    try {
      const r = JSON.parse(xhr.responseText || '{}');
      const url = r?.data?.url || r?.url || '';
      if (!url) {
        ElMessage.error('上传失败');
        options.onError();
        return;
      }
      const arr = (form.attachment || '').split(',').filter(Boolean);
      arr.push(url);
      form.attachment = arr.join(',');
      options.onSuccess({ response: r, url });
    } catch (e) {
      options.onError();
    }
  };
  xhr.onerror = () => {
    ElMessage.error('上传失败');
    options.onError();
  };
  xhr.send(fd);
};

const handleUploadRemove = (file: any) => {
  const removedUrl = file?.response?.data?.url || file?.url || '';
  if (removedUrl) {
    form.attachment = (form.attachment || '').split(',').filter(u => u && u !== removedUrl).join(',');
  }
};

const handleUploadError = () => {
  ElMessage.error('附件上传失败');
};

const submitForm = async () => {
  await formRef.value.validate();
  // 兜底：只有已审批通过的预算且金额>0 才能发起调整
  if (!canAdjust.value) {
    ElMessage.warning('该科目不存在已审批的预算金额，无法发起调整申请');
    return;
  }
  // 前端拦截：同一 方案+单位+预算表+科目 已有待审批调整
  const dup = tableData.value.find(
    (r: any) => r.status === 'PENDING'
      && Number(r.planId) === Number(form.planId)
      && Number(r.orgId) === Number(form.orgId)
      && r.templateCode === form.templateCode
      && r.itemCode === form.itemCode
  );
  if (dup) {
    ElMessage.warning('该单位该预算科目已存在待审批的调整申请，不能重复发起');
    return;
  }
  await ElMessageBox.confirm('提交后进入审批流程，确认提交该调整申请？', '提示', { type: 'warning', confirmButtonText: '确认提交' });
  try {
    await addAdjustment({
      ...form,
      status: 'PENDING',
      adjustedAmount: computedAdjusted.value
    });
    ElMessage.success('提交成功');
    dialogVisible.value = false;
    handleQuery();
  } catch (error) {
    console.error(error);
  }
};

// ===== 审批 =====
const approveVisible = ref(false);
const currentRow = ref<any>({});
const approveForm = reactive({ id: 0, approveResult: 'APPROVED', approveRemark: '' });

const handleApprove = (row: any) => {
  currentRow.value = row;
  approveForm.id = row.id;
  approveForm.approveResult = 'APPROVED';
  approveForm.approveRemark = '';
  approveVisible.value = true;
};

const submitApprove = async () => {
  if (!approveForm.approveRemark || !approveForm.approveRemark.trim()) {
    ElMessage.warning('请填写审批意见');
    return;
  }
  await ElMessageBox.confirm(
    `确认${approveForm.approveResult === 'APPROVED' ? '通过' : '驳回'}该调整申请？操作不可撤销。`,
    '提示',
    { type: 'warning', confirmButtonText: '确认提交' }
  );
  try {
    await approveAdjustment(approveForm);
    ElMessage.success('审批成功');
    approveVisible.value = false;
    handleQuery();
  } catch (error) {
    console.error(error);
  }
};

// ===== 详情 =====
const detailVisible = ref(false);
const handleDetail = (row: any) => {
  currentRow.value = row;
  detailVisible.value = true;
};

// ===== 初始化 =====
const loadOptions = async () => {
  try {
    const [planRes, unitRes, allItemRes] = await Promise.all([listPlan(), getUnitOptions(), listAllTemplateItems()]);
    const planList = planRes.rows || planRes.data || [];
    // 只有【执行中】方案可发起调整；归档(ARCHIVED)/草稿/关闭 方案不可新增调整
    planOptions.value = planList.filter((p: any) => p.status === 'PUBLISHED');
    // 申请单位：受限账号（填报员）后端只返回本单位 => 自动锁定本单位；集团账号返回全部可填单位
    const unitList = Array.isArray(unitRes) ? unitRes : (unitRes.data || unitRes.rows || []);
    deptOptions.value = Array.isArray(unitList) ? unitList : [];
    singleUnitForm.value = deptOptions.value.length <= 1;
    if (deptOptions.value.length >= 1) {
      form.orgId = deptOptions.value[0].deptId;
    }
    const items = allItemRes.data || allItemRes.rows || [];
    allItemOptions.value = items;
    // 预算表下拉由 loadApprovedTemplates 按本单位已审批通过的预算表动态加载（子公司看不到集团本部等表）
    await loadApprovedTemplates();
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  loadOptions();
  handleQuery();
});
</script>

<style scoped>
.text-green { color: #16a34a; }
.text-red { color: #dc2626; }

/* 调整影响分析 */
.impact-panel {
  width: 100%;
  min-height: 60px;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
}

.impact-empty {
  color: #909399;
  font-size: 13px;
  text-align: center;
  padding: 16px 0;
}

.impact-block {
  margin-bottom: 14px;
}

.impact-block:last-child {
  margin-bottom: 0;
}

.impact-block-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.impact-history .impact-block-title {
  border-left-color: #e6a23c;
}

.impact-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 24px;
}

.impact-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px dashed #ebeef5;
}

.impact-item .lbl {
  color: #606266;
  margin-right: 12px;
  white-space: nowrap;
}

.impact-item .val {
  color: #303133;
  text-align: right;
  font-weight: 500;
}
</style>
