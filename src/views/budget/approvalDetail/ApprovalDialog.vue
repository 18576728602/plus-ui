<template>
  <el-dialog v-model="visible" title="预算审批" width="840px" top="5vh" append-to-body
    :close-on-click-modal="false" destroy-on-close class="approval-dlg">
    <div v-loading="loading" class="ad-body">
      <template v-if="planId">
        <!-- 方案信息（字段:值 横排双列） -->
        <div class="ad-card">
          <div class="ad-card-title ad-title-flex">
            <span class="ad-title-text">方案信息</span>
            <span class="ad-plan-status" :style="planStatusStyle">
              <i class="ad-status-dot"></i>{{ planStatusText }}
            </span>
          </div>
          <div class="ad-detail" v-if="schemeFields.length">
            <div class="ad-row" v-for="f in schemeFields" :key="f.label">
              <span class="ad-key">{{ f.label }}</span>
              <span class="ad-val" :class="{ 'ad-val-amount': f.label === '预算金额' }">{{ f.value }}</span>
            </div>
            <div v-if="submitAttachmentList.length" class="ad-row">
              <span class="ad-key">审批附件</span>
              <span class="ad-val">
                <a
                  v-for="f in submitAttachmentList"
                  :key="f.url"
                  :href="f.url"
                  target="_blank"
                  class="ad-cm-file"
                  :title="f.name"
                >
                  <el-icon><Paperclip /></el-icon><span>{{ f.name }}</span>
                </a>
              </span>
            </div>
          </div>
          <el-empty v-else description="暂无方案信息" :image-size="40" />
        </div>

        <!-- 科目明细信息 -->
        <div class="ad-card">
          <div class="ad-card-title ad-title-flex">
            <span class="ad-title-text">科目明细信息</span>
            <span class="ad-item-count">共 {{ itemRows.length }} 条</span>
          </div>
          <el-table :data="itemRows" size="small" border :max-height="360" class="ad-item-table">
            <el-table-column :label="subjectLabel" min-width="220">
              <template #default="{ row }">
                <div class="ad-item-cell" :style="{ paddingLeft: (row.itemLevel && row.itemLevel > 1 ? (row.itemLevel - 1) * 16 : 0) + 'px' }">
                  <span class="ad-item-name" :style="{ fontWeight: row.isSummary === 1 ? 'bold' : 'normal' }">{{ row.itemName || '-' }}</span>
                  <span class="ad-item-code">{{ row.itemCode || '' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="actualLabel" align="right" width="160">
              <template #default="{ row }">
                <span v-if="row.inputType === 'TEXT' || row.inputType === 'SELECT'" class="ad-money">{{ row.lastActualText || row.remark || '-' }}</span>
                <span v-else class="ad-money">{{ formatAmount(row.lastActual) }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="budgetLabel" align="right" width="180">
              <template #default="{ row }">
                <span v-if="row.inputType === 'TEXT' || row.inputType === 'SELECT'" class="ad-money">{{ row.remark || '-' }}</span>
                <span v-else class="ad-money ad-money-bold">{{ formatAmount(row.budgetAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column v-if="showDiff" :label="diffLabel || '增减额'" align="right" width="140">
              <template #default="{ row }">
                <span v-if="row.inputType !== 'TEXT' && row.inputType !== 'SELECT'" :class="diffClass(row)">{{ formatDiff(row) }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="140">
              <template #default="{ row }"><span class="ad-remark">{{ row.remark || '-' }}</span></template>
            </el-table-column>
            <template #empty><el-empty description="暂无科目明细" :image-size="60" /></template>
          </el-table>
        </div>

        <!-- 两上两下 + 沟通留痕 -->
        <div class="ad-card">
          <div class="ad-card-title">两上两下 · 沟通留痕</div>
          <el-steps :active="stepActive" finish-status="success" align-center simple class="ad-steps">
            <el-step v-for="s in roundSteps" :key="s.title" :title="s.title" />
          </el-steps>

          <!-- 沟通时间线（来回询问留痕） -->
          <div v-loading="commentLoading" class="ad-cm-wrap mt-2">
            <el-empty v-if="comments.length === 0" description="暂无沟通记录" :image-size="50" />
            <el-timeline class="ad-cm-timeline">
              <el-timeline-item v-for="c in timelineComments" :key="c.id" :type="cmType(c.commentType)"
                :hollow="!c.replyContent" :timestamp="formatTime(c.createTime)" placement="top">
                <div class="ad-cm-card">
                  <div class="ad-cm-head">
                    <el-tag v-if="c.stageLabel" size="small" effect="dark" class="mr-2 ad-cm-stage">{{ c.stageLabel }}</el-tag>
                    <span class="ad-cm-role">{{ c.commenterName || c.userName || '审批人' }}</span>
                    <el-tag size="small" :type="cmTagType(c.commentType)" effect="light" class="ml-2">{{ c.commentTypeLabel || '批注' }}</el-tag>
                    <el-tag v-if="c.itemName" size="small" type="info" effect="plain" class="ml-2">科目：{{ c.itemName }}</el-tag>
                  </div>
                  <div class="ad-cm-content">{{ c.content || '-' }}</div>
                  <div v-if="c.replyContent" class="ad-cm-reply">
                    <span class="ad-cm-reply-label">填报回复：</span>{{ c.replyContent }}
                    <span class="ad-cm-reply-meta">（{{ c.replierName || '' }} · {{ formatTime(c.replyTime) }}）</span>
                  </div>
                  <div v-if="c.attachmentList && c.attachmentList.length" class="ad-cm-files">
                    <a
                      v-for="f in c.attachmentList"
                      :key="f.url"
                      :href="f.url"
                      target="_blank"
                      class="ad-cm-file"
                      :title="f.name"
                    >
                      <el-icon><Paperclip /></el-icon><span>{{ f.name }}</span>
                    </a>
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>

          <!-- 新增询问（审批人发起来回询问，填报员可回复；支持上传附件） -->
          <div class="ad-cm-form mt-2">
            <el-input v-model="commentForm.content" type="textarea" :rows="2"
              placeholder="请输入询问/批注内容，填报员可回复" maxlength="300" show-word-limit />
            <div class="ad-cm-form-foot">
              <el-upload :http-request="uploadCommentFile" :show-file-list="false" multiple class="mr-2">
                <el-button size="small" plain icon="Upload">附件</el-button>
              </el-upload>
              <el-select v-model="commentForm.commentType" size="small" style="width: 130px">
                <el-option label="疑问" value="QUESTION" />
                <el-option label="建议修改" value="SUGGESTION" />
                <el-option label="警告" value="WARNING" />
              </el-select>
              <el-button type="primary" size="small" :disabled="!commentForm.content" :loading="commentLoading" @click="submitComment">发送</el-button>
            </div>
            <div v-if="commentFiles.length" class="ad-cm-uploads">
              <el-tag
                v-for="f in commentFiles"
                :key="f.url"
                size="small"
                closable
                class="mr-1"
                @close="removeCommentFile(f.url)"
              >{{ f.name }}</el-tag>
            </div>
          </div>
        </div>

        <!-- 审批流程（横向节点链） -->
        <div class="ad-card">
          <div class="ad-card-title">审批流程</div>
          <div v-loading="traceLoading">
            <el-steps :active="traceFlowActive" finish-status="success" align-center class="ad-trace-flow">
              <el-step v-for="f in traceFlow" :key="f.name" :title="f.name"
                :description="(f.operatorName ? f.operatorName + ' · ' : '') + formatTime(f.time)">
                <template #icon>
                  <el-icon v-if="f.done"><CircleCheckFilled /></el-icon>
                  <el-icon v-else-if="f.current"><Loading /></el-icon>
                  <el-icon v-else><Lock /></el-icon>
                </template>
              </el-step>
            </el-steps>
            <el-empty v-if="traceList.length === 0" description="暂无审批轨迹" :image-size="50" />
          </div>
        </div>

        <!-- 审批轨迹（历史记录） -->
        <div class="ad-card">
          <div class="ad-card-title">审批轨迹</div>
          <el-timeline v-loading="traceLoading">
            <el-timeline-item v-for="(n, i) in traceList" :key="i" :type="traceType(n.actionType)"
              :timestamp="formatTime(n.time)" size="small">
              <b>{{ n.label }}</b> · 审批人：{{ n.operatorName || '-' }}
              <div v-if="n.remark" class="ad-trace-remark">意见：{{ n.remark }}</div>
            </el-timeline-item>
            <el-empty v-if="traceList.length === 0" description="暂无审批轨迹" :image-size="50" />
          </el-timeline>
        </div>
      </template>
      <el-empty v-else description="未获取到有效审批任务参数" />
    </div>

    <!-- 底部审批操作 -->
    <template #footer v-if="isApproval && !alreadyDone">
      <div class="ad-footer">
        <el-input v-model="approvalMessage" type="textarea" :rows="2"
          :placeholder="'请输入审批意见（当前阶段：' + (currentStepName || '审批') + '）'"
          maxlength="200" show-word-limit />
        <div class="ad-footer-actions">
          <el-button type="warning" plain icon="RefreshLeft" :loading="approvalLoading" @click="handleBack">退回修改</el-button>
          <el-button type="primary" icon="Check" :loading="approvalLoading" @click="handleApprove">批复通过</el-button>
          <el-button type="danger" icon="Close" :loading="approvalLoading" @click="handleReject">驳回</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, ComponentInternalInstance, getCurrentInstance, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Close, RefreshLeft, Upload, Paperclip } from '@element-plus/icons-vue';
import request from '@/utils/request';
import { getAllFillData, listPlan, listDept } from '@/api/budget/fill';
import { getPlan } from '@/api/budget/plan';
import { listApprovalComments, addApprovalComment } from '@/api/budget/approvalComment';
import { listPendingApprovals } from '@/api/budget/approval';
import { flowHisTaskList } from '@/api/workflow/instance';
import { completeTask, backProcess } from '@/api/workflow/task';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

// ===== props =====
const props = defineProps<{
  modelValue: boolean;
  businessId: string;
  taskId: string;
  type?: string; // approval / view
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
});
const isApproval = computed(() => props.type === 'approval');

// ===== 基础状态 =====
const loading = ref(false);
const planId = ref<string | number>('');
const deptId = ref<number>();
const planName = ref('');
const planCode = ref('');
const deptName = ref('');
const planBudgetYear = ref<number>();
const planCycle = ref('');
const planDescription = ref('');
const submitReason = ref('');
const submitAttachment = ref('');
const submitAttachmentList = computed(() => parseFileList(submitAttachment.value));
const allFillData = ref<any[]>([]);
const currentRound = ref<number>();
const applicantName = ref('');
const submitTime = ref('');
const alreadyDone = ref(false);

// ===== 审批操作 =====
const approvalLoading = ref(false);
const approvalMessage = ref('');

const sectionConfig: Record<string, string> = {
  '01': '公司基本信息表', '02': '营业收入预算表', '03': '营业成本预算表', '04': '税金及附加预算表',
  '05': '销售费用预算表', '06': '管理费用预算表', '07': '财务费用预算表', '08': '人工成本预算表',
  '09': '固定资产投资预算表', '10': '融资预算表', '11': '现金流量预算表', '12': '预计利润表',
  '13': '预计资产负债表', '14': '预算执行情况表', '15': '预算调整审批表', '16': '三公经费预算表'
};
interface Section { code: string; name: string; rows: any[]; totalBudget: number; }
const sections = ref<Section[]>([]);

// ===== 工具 =====
const formatAmount = (val: number | undefined) => {
  if (val == null) return '0.00';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const formatTime = (val: any) => {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
// 仅返回日期（YYYY-MM-DD），去掉时分秒
const fmtDate = (val: any) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val).slice(0, 10);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ===== 分组填报数据 =====
const buildSections = () => {
  const groupMap = new Map<string, any[]>();
  for (const item of allFillData.value) {
    const code = item.templateCode || '';
    if (code === '14' || code === '15') continue;
    if (!groupMap.has(code)) groupMap.set(code, []);
    groupMap.get(code)!.push(item);
  }
  const result: Section[] = [];
  for (const [code, rows] of Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    rows.sort((a, b) => (a.itemCode || '').localeCompare(b.itemCode || ''));
    const totalBudget = rows.filter(r => r.budgetAmount != null).reduce((s, r) => s + Number(r.budgetAmount), 0);
    result.push({ code, name: sectionConfig[code] || rows[0]?.templateName || `预算表${code}`, rows, totalBudget });
  }
  sections.value = result;
};

const summary = computed(() => {
  const rows = sections.value.flatMap(s => s.rows);
  const editable = rows.filter(r => r.isEditable === 1);
  const totalBudget = rows.filter(r => r.budgetAmount != null).reduce((s, r) => s + Number(r.budgetAmount), 0);
  return { itemCount: editable.length, totalBudget };
});

// ===== 科目明细信息 =====
const itemRows = computed(() => sections.value.flatMap(s => s.rows));
// 模板表头（与填报模板保持一致，取首个板块的表头配置）
const firstSection = computed(() => sections.value[0] || {});
const subjectLabel = computed(() => (firstSection.value as any).subjectLabel || '预算项目');
const actualLabel = computed(() => (firstSection.value as any).actualLabel || '上一年实际完成值');
const budgetLabel = computed(() => (firstSection.value as any).budgetLabel || '本年预算(万元)');
const showDiff = computed(() => !!(firstSection.value as any).showDiff);
const diffLabel = computed(() => (firstSection.value as any).diffLabel || '增减额');
const formatDiff = (row: any) => {
  const last = Number(row.lastActual || 0);
  const budget = Number(row.budgetAmount || 0);
  const diff = budget - last;
  const sign = diff > 0 ? '+' : '';
  return diff === 0 ? '0' : `${sign}${formatAmount(diff)}`;
};
const diffClass = (row: any) => {
  const last = Number(row.lastActual || 0);
  const budget = Number(row.budgetAmount || 0);
  const diff = budget - last;
  if (diff > 0) return 'ad-diff-up';
  if (diff < 0) return 'ad-diff-down';
  return 'ad-diff-flat';
};

// ===== 方案信息展示（字段:值 横排） =====
const schemeFields = computed(() => [
  { label: '方案编码', value: planCode.value || '-' },
  { label: '方案名称', value: planName.value || '-' },
  { label: '预算年度', value: planBudgetYear.value ? `${planBudgetYear.value} 年` : '-' },
  { label: '填报周期', value: planCycle.value || '-' },
  { label: '预算金额', value: summary.value.totalBudget != null ? `¥${formatAmount(summary.value.totalBudget)} 万元` : '-' },
  { label: '填报单位', value: deptName.value || '-' },
  { label: '提交说明', value: submitReason.value || '-' }
]);

// ===== 状态 =====
const statusLabel = computed(() => (alreadyDone.value ? '已完成' : isApproval.value ? '审批中' : '查看'));
const statusTagType = computed(() => 'warning');

// ===== 两上两下 =====
const roundSteps = [
  { title: '一上·下级提交' }, { title: '一下·上级反馈' },
  { title: '二上·下级修订' }, { title: '二下·上级批复' }
];
const stepActive = computed(() => Math.min(Math.max((currentRound.value || 1) - 1, 0), 3));
const currentStepName = computed(() => roundSteps[stepActive.value]?.title || '');

// ===== 方案状态（带颜色显示，基于真实填报/审批状态） =====
const planStatusText = computed(() => {
  const rows = allFillData.value || [];
  if (rows.length) {
    if (rows.some((d: any) => d.status === 'REJECTED')) return '已退回';
    if (rows.every((d: any) => d.status === 'APPROVED')) return '已批复';
    if (rows.some((d: any) => d.status === 'SUBMITTED')) return '待反馈';
    if (rows.some((d: any) => d.status === 'DRAFT')) {
      const hasRejectRemark = rows.some((d: any) => d.status === 'DRAFT' && d.remark && /【驳回】|退回修改|驳回/.test(String(d.remark)));
      return (hasRejectRemark || traceReturned.value) ? '已退回' : '填报中';
    }
  }
  if (alreadyDone.value) return '已完结';
  return '审批中';
});
const planStatusStyle = computed(() => {
  const t = planStatusText.value;
  if (t === '已批复' || t === '已完结') return { background: 'rgba(103,194,58,.12)', color: '#67c23a', borderColor: '#67c23a' };
  if (t === '已退回') return { background: 'rgba(245,108,108,.12)', color: '#f56c6c', borderColor: '#f56c6c' };
  if (t === '待反馈') return { background: 'rgba(230,162,60,.12)', color: '#e6a23c', borderColor: '#e6a23c' };
  if (t === '填报中') return { background: 'rgba(144,147,153,.12)', color: '#909399', borderColor: '#909399' };
  return { background: 'rgba(64,158,255,.12)', color: '#409eff', borderColor: '#409eff' };
});

// ===== 审批轨迹 =====
const traceList = ref<any[]>([]);
const traceLoading = ref(false);
// 是否发生过退回/驳回动作（用于判定「已退回」状态，避免被退回后的草稿误判为「填报中」）
const traceReturned = ref(false);
const loadTrace = async () => {
  traceLoading.value = true;
  try {
    const res = await flowHisTaskList(props.businessId);
    const data = res.data || {};
    if (data.list && data.list.length > 0) {
      const list = data.list as any[];
      traceReturned.value = list.some((t: any) => t.skipType === 'REJECT' || t.flowStatus === 'back' || (t.message && /退回|驳回/.test(String(t.message))));
      traceList.value = list.map((item: any, idx: number) => {
        const isReject = item.skipType === 'REJECT';
        return {
          actionType: isReject ? 'REJECT' : (idx === list.length - 1 ? 'CURRENT' : (item.flowStatus === 'finish' ? 'APPROVE' : 'SUBMIT')),
          label: (item.nodeName || '审批节点') + (isReject ? '·退回修改' : ''),
          operatorName: item.approveName || item.collaborator || '-',
          time: item.updateTime || item.createTime,
          remark: item.message
        };
      });
      if (list[0]?.approveName) applicantName.value = list[0].approveName;
    }
  } catch (error) { console.error('加载审批轨迹失败', error); }
  finally { traceLoading.value = false; }
};
const traceType = (t: string) => (t === 'APPROVE' ? 'success' : t === 'REJECT' ? 'danger' : t === 'SUBMIT' ? 'primary' : 'info');

// 审批流程横向节点链：按轨迹生成（已完成/当前/待办）
const traceFlow = computed(() => {
  const nodes: { name: string; operatorName: string; time: string; done: boolean; current: boolean }[] = [];
  for (const n of traceList.value) {
    const name = (n.label || '').replace('·退回修改', '').replace('·驳回', '');
    const last = nodes[nodes.length - 1];
    if (last && last.name === name) {
      last.operatorName = n.operatorName || last.operatorName;
      last.time = n.time || last.time;
      continue;
    }
    nodes.push({ name, operatorName: n.operatorName || '', time: n.time || '', done: n.actionType !== 'CURRENT', current: n.actionType === 'CURRENT' });
  }
  if (nodes.length) nodes[nodes.length - 1].current = true;
  return nodes;
});
const traceFlowActive = computed(() => {
  const idx = traceFlow.value.findIndex((f) => f.current);
  return idx === -1 ? traceFlow.value.length : idx;
});

// ===== 沟通留痕（两上两下·来回询问） =====
const comments = ref<any[]>([]);
const commentLoading = ref(false);
// 时间线：按时间正序展示全部沟通记录（附件拆分为列表）
const parseFileList = (attachment?: string) => {
  if (!attachment) return [];
  return String(attachment).split(',').filter(Boolean).map((url: string) => {
    const clean = url.split('?')[0];
    const name = decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1)) || '附件';
    return { url, name };
  });
};
const timelineComments = computed(() => {
  const list = [...comments.value];
  list.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
  const stageNames = ['一上', '一下', '二上', '二下'];
  const nodes = list.map((c) => {
    const round = Number(c.submitRound) || 0;
    return { ...c, attachmentList: parseFileList(c.attachment), stageLabel: stageNames[Math.min(Math.max(round - 1, 0), 3)] };
  });
  // 前置一条"填报员提交说明"节点（含提交附件），作为一上提交留痕
  if (submitReason.value) {
    const submitNode: any = {
      id: 'submit-' + (submitTime.value || Date.now()),
      commentType: 'SUBMIT',
      commentTypeLabel: '填报提交',
      commenterName: '填报员',
      content: submitReason.value,
      createTime: submitTime.value || new Date().toISOString(),
      attachment: submitAttachment.value,
      attachmentList: parseFileList(submitAttachment.value),
      stageLabel: '一上'
    };
    nodes.unshift(submitNode);
  }
  return nodes;
});
// 时间线节点颜色：QUESTION=蓝(询问) SUGGESTION=橙(建议) WARNING=红(警告) 其它=灰
const cmType = (t: string) => {
  if (t === 'QUESTION') return 'primary';
  if (t === 'SUGGESTION') return 'warning';
  if (t === 'WARNING') return 'danger';
  return 'info';
};
// 标签类型
const cmTagType = (t: string) => {
  if (t === 'QUESTION') return 'primary';
  if (t === 'SUGGESTION') return 'warning';
  if (t === 'WARNING') return 'danger';
  return 'info';
};
// 新增询问表单（支持上传附件）
const commentForm = reactive({ commentType: 'QUESTION', content: '', attachment: '' });
// 本次待发送的附件（上传成功暂存，发送后清空）
const commentFiles = ref<{ url: string; name: string }[]>([]);
// 附件上传：POST /common/upload，成功后暂存并拼入 commentForm.attachment
const uploadCommentFile = (options: any) => {
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
      if (!url) { ElMessage.error('上传失败'); options.onError(); return; }
      commentFiles.value.push({ url, name: options.file.name });
      commentForm.attachment = commentForm.attachment ? `${commentForm.attachment},${url}` : url;
      options.onSuccess({ response: r, url });
    } catch { options.onError(); }
  };
  xhr.onerror = () => { ElMessage.error('上传失败'); options.onError(); };
  xhr.send(fd);
};
// 移除本次已上传附件
const removeCommentFile = (url: string) => {
  commentFiles.value = commentFiles.value.filter(f => f.url !== url);
  commentForm.attachment = (commentForm.attachment || '').split(',').filter(u => u && u !== url).join(',');
};
const submitComment = async () => {
  if (!commentForm.content.trim()) {
    ElMessage.warning('请输入询问/批注内容');
    return;
  }
  commentLoading.value = true;
  try {
    await addApprovalComment({
      targetType: 'FILL',
      planId: planId.value,
      deptId: deptId.value,
      commentType: commentForm.commentType,
      content: commentForm.content,
      attachment: commentForm.attachment
    });
    ElMessage.success('询问已发送');
    commentForm.content = '';
    commentForm.attachment = '';
    commentFiles.value = [];
    await loadComments();
  } catch (e: any) { ElMessage.error(e?.msg || '发送失败'); }
  finally { commentLoading.value = false; }
};
const loadComments = async () => {
  commentLoading.value = true;
  try {
    const res = await listApprovalComments({ targetType: 'FILL', planId: planId.value, deptId: deptId.value });
    comments.value = res.data || [];
  } catch (error) { console.error('加载沟通留痕失败', error); }
  finally { commentLoading.value = false; }
};

// ===== 审批办理 =====
const handleApprove = async () => {
  try {
    await ElMessageBox.confirm('确认批复通过？', '审批确认', { type: 'success' });
    approvalLoading.value = true;
    await completeTask({ taskId: props.taskId, message: approvalMessage.value || '批复通过', variables: {} });
    ElMessage.success('批复通过！');
    visible.value = false;
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e?.msg || '审批失败'); }
  finally { approvalLoading.value = false; }
};
const handleReject = async () => {
  try {
    await ElMessageBox.confirm('确认驳回？驳回后数据将回到草稿状态。', '驳回确认', { type: 'warning' });
    approvalLoading.value = true;
    await backProcess({ taskId: props.taskId, message: approvalMessage.value || '驳回', variables: {} });
    ElMessage.success('已驳回！');
    visible.value = false;
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e?.msg || '驳回失败'); }
  finally { approvalLoading.value = false; }
};
const handleBack = async () => {
  try {
    await ElMessageBox.confirm('确认退回修改？填报员修订后可重新提交。', '退回确认', { type: 'warning' });
    approvalLoading.value = true;
    await backProcess({ taskId: props.taskId, message: approvalMessage.value || '退回修改', variables: {} });
    ElMessage.success('已退回修改！');
    visible.value = false;
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e?.msg || '退回失败'); }
  finally { approvalLoading.value = false; }
};

// ===== 初始化 =====
watch(() => props.businessId, (val) => {
  if (val) loadAll();
});
const loadAll = async () => {
  loading.value = true;
  sections.value = [];
  traceList.value = [];
  comments.value = [];
  const deepId = String(props.businessId || '');
  planId.value = '';
  if (deepId) {
    const parts = deepId.split('_');
    if (parts.length >= 2) {
      planId.value = parts[0];
      const dId = parts[1] ? Number(parts[1]) : NaN;
      if (!isNaN(dId)) deptId.value = dId;
    }
  }
  if (!planId.value) { loading.value = false; return; }
  try {
    // 方案信息用 getPlan 精确查询（避免 listPlan 分页截断导致取不到/取错）
    const [planRes, deptRes] = await Promise.allSettled([getPlan(planId.value), listDept()]);
    if (planRes.status === 'fulfilled') {
      const p = (planRes.value as any).data || (planRes.value as any) || {};
      planName.value = p?.planName || '';
      planCode.value = p?.planCode || '';
      planBudgetYear.value = p?.budgetYear;
      planDescription.value = p?.description || '';
      if (p?.startDate || p?.endDate) {
        planCycle.value = `${fmtDate(p?.startDate)} ~ ${fmtDate(p?.endDate)}`;
      }
    } else {
      // getPlan 失败时回退 listPlan 兜底
      const res = await listPlan();
      const plans = res?.data || res?.rows || [];
      const p = plans.find((x: any) => String(x.id || x.planId) === String(planId.value));
      planName.value = p?.planName || '';
      planCode.value = p?.planCode || '';
      planBudgetYear.value = p?.budgetYear;
      planDescription.value = p?.description || '';
      if (p?.startDate || p?.endDate) {
        planCycle.value = `${fmtDate(p?.startDate)} ~ ${fmtDate(p?.endDate)}`;
      }
    }
    if (deptRes.status === 'fulfilled') {
      const depts = (deptRes.value as any).data || (deptRes.value as any).rows || [];
      const d = depts.find((x: any) => Number(x.deptId) === Number(deptId.value) || Number(x.id) === Number(deptId.value));
      deptName.value = d?.deptName || '';
    }
    const fillRes = await getAllFillData({ planId: planId.value, deptId: deptId.value });
    allFillData.value = (fillRes as any).data || (fillRes as any).rows || [];
    buildSections();
    // 填报单位兜底：从填报数据行取值
    if (!deptName.value && allFillData.value[0]?.deptName) {
      deptName.value = allFillData.value[0].deptName;
    }
    if (allFillData.value[0]?.submitRound) currentRound.value = allFillData.value[0].submitRound;
    const submitRow = allFillData.value.find((r: any) => r.createTime);
    if (submitRow?.createTime) submitTime.value = formatTime(submitRow.createTime);
    // 提交说明：从审批记录中取当前轮次提交备注（填报员提交时可填）
    try {
      const apRes = await listPendingApprovals({ type: 'FILL', planId: planId.value, orgId: deptId.value });
      const apRows = (apRes as any)?.data?.rows || (apRes as any)?.rows || [];
      if (apRows.length) submitReason.value = apRows[0].submitReason || '';
      if (apRows.length) submitAttachment.value = apRows[0].attachment || '';
    } catch { /* 无审批列表权限时忽略 */ }
    await Promise.all([loadTrace(), loadComments()]);
  } catch (error) { console.error('审批详情加载失败', error); }
  finally { loading.value = false; }
};
onMounted(() => { if (props.businessId) loadAll(); });
</script>

<style scoped>
.ad-body { padding: 0 4px; max-height: 58vh; overflow-y: auto; }
.ad-card { border: 1px solid #ebeef5; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; }
.ad-card-title { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 10px; padding-left: 8px; border-left: 3px solid #409eff; }
.ad-title-flex { display: flex; align-items: center; justify-content: space-between; }
.ad-title-text { }
.ad-plan-status { display: inline-flex; align-items: center; gap: 5px; padding: 1px 10px; font-size: 12px; font-weight: 600; border-radius: 12px; border: 1px solid; line-height: 20px; }
.ad-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; display: inline-block; }
/* 方案信息横排布局：字段:值 同行，2列 */
.ad-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; }
.ad-row { display: flex; align-items: baseline; font-size: 13px; }
.ad-row .ad-key { width: 72px; flex-shrink: 0; color: #909399; margin-right: 8px; }
.ad-row .ad-val { flex: 1; color: #303133; font-weight: 500; word-break: break-all; }
.ad-val-amount { color: #409eff; font-weight: 700; }
/* 科目明细表格 */
.ad-item-count { font-size: 12px; font-weight: 500; color: #909399; }
.ad-item-table { margin-top: 4px; }
.ad-item-cell { display: flex; flex-direction: column; line-height: 1.5; }
.ad-item-name { font-size: 13px; color: #303133; font-weight: 500; }
.ad-item-code { font-size: 12px; color: #909399; }
.ad-money { font-family: 'DIN', 'Arial', sans-serif; font-variant-numeric: tabular-nums; }
.ad-money-bold { font-weight: 700; color: #303133; }
.ad-diff-up { color: #f56c6c; font-weight: 600; }
.ad-diff-down { color: #67c23a; font-weight: 600; }
.ad-diff-flat { color: #909399; }
.ad-remark { color: #606266; font-size: 12px; word-break: break-all; }
.ad-steps :deep(.el-step__title) { font-size: 12px; }
/* 沟通时间线（两上两下·来回询问） */
.ad-cm-timeline { padding-left: 4px; }
.ad-cm-card { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 10px 12px; }
.ad-cm-head { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.ad-cm-stage { font-weight: 600; }
.ad-cm-role { font-weight: 600; color: #303133; font-size: 13px; }
.ad-cm-content { color: #606266; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
.ad-cm-reply { margin-top: 8px; background: #f0f9eb; border-left: 3px solid #67c23a; border-radius: 4px; padding: 6px 10px; font-size: 13px; color: #303133; }
.ad-cm-reply-label { color: #67c23a; font-weight: 600; }
.ad-cm-reply-meta { color: #909399; font-size: 12px; margin-left: 4px; }
/* 新增询问 */
.ad-cm-form { background: #f5f7fa; border-radius: 8px; padding: 10px; }
.ad-cm-form-foot { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 8px; }
/* 沟通留痕附件 */
.ad-cm-files { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.ad-cm-file { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #f0f2f5; border: 1px solid #e4e7ed; border-radius: 4px; color: #409eff; font-size: 12px; text-decoration: none; max-width: 220px; }
.ad-cm-file:hover { border-color: #409eff; background: #ecf5ff; }
.ad-cm-file .el-icon { font-size: 13px; }
.ad-cm-file span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ad-cm-uploads { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ad-c-info { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; color: #303133; }
.ad-c-meta { font-size: 12px; color: #909399; font-weight: 400; }
.ad-c-reply { margin-top: 4px; font-size: 12px; color: #67c23a; }
.ad-trace-remark { font-size: 12px; color: #606266; background: #f5f7fa; padding: 4px 8px; border-radius: 4px; margin-top: 4px; }
.ad-footer :deep(.el-textarea) { margin-bottom: 10px; }
.ad-footer-actions { display: flex; justify-content: flex-end; gap: 10px; }
@media (max-width: 720px) {
  .ad-detail { grid-template-columns: 1fr; }
}
</style>