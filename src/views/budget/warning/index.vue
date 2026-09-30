<template>
  <div class="app-container">
    <!-- 顶部筛选 -->
    <el-card shadow="never" class="mb-4">
      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="预警清单" name="list" />
        <el-tab-pane label="闭环管理" name="record" />
      </el-tabs>

      <el-form :inline="true" v-if="activeTab === 'list'">
        <el-form-item label="预算方案">
          <el-select v-model="query.planId" placeholder="全部方案" clearable style="width: 220px">
            <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="填报单位">
          <el-select v-model="query.orgId" placeholder="全部单位" clearable style="width: 200px">
            <el-option v-for="d in deptOptions" :key="d.deptId" :label="d.deptName" :value="d.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <template #label><span style="white-space: nowrap">黄色阈值(%)</span></template>
          <el-input-number v-model="query.threshold" :min="1" :max="100" :controls="false" style="width: 90px" />
        </el-form-item>
        <el-form-item label="预警等级">
          <el-select v-model="levelFilter" placeholder="全部" style="width: 110px">
            <el-option label="全部" value="" />
            <el-option label="红色" value="RED" />
            <el-option label="橙色" value="ORANGE" />
            <el-option label="黄色" value="YELLOW" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-form :inline="true" v-else>
        <el-form-item label="预警等级">
          <el-select v-model="recQuery.level" placeholder="全部" style="width: 110px">
            <el-option label="全部" value="" />
            <el-option label="红色" value="RED" />
            <el-option label="橙色" value="ORANGE" />
            <el-option label="黄色" value="YELLOW" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="recQuery.status" placeholder="全部" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="待处置" value="OPEN" />
            <el-option label="处置中" value="PROCESSING" />
            <el-option label="已确认" value="CONFIRMED" />
            <el-option label="已整改" value="RESOLVED" />
            <el-option label="已升级" value="ESCALATED" />
            <el-option label="已解除" value="CLOSED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadRecords">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 预警清单 -->
    <template v-if="activeTab === 'list'">
      <el-row :gutter="16" class="mb-4" v-if="total > 0">
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-card alert-total">预警总数 <b>{{ total }}</b> 条</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-card alert-red">超预算(红) <b>{{ redCount }}</b> 条</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-card alert-orange">进度超前(橙) <b>{{ orangeCount }}</b> 条</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-card alert-yellow">临近阈值(黄) <b>{{ yellowCount }}</b> 条</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" v-loading="loading">
        <el-table :data="showList" border stripe size="small" :row-class-name="rowClassName" style="width: 100%">
          <el-table-column label="预警等级" prop="level" width="78" align="center">
            <template #default="{ row }">
              <el-tag :type="row.level === 'RED' ? 'danger' : 'warning'" effect="dark" size="small">
                {{ levelText(row.level) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="预算方案" prop="planName" min-width="130" show-overflow-tooltip />
          <el-table-column label="填报单位" prop="orgName" min-width="150" show-overflow-tooltip />
          <el-table-column label="预算表" prop="templateName" min-width="130" show-overflow-tooltip />
          <el-table-column label="科目名称" prop="itemName" min-width="150" show-overflow-tooltip />
          <el-table-column label="预算(万元)" width="105" align="right">
            <template #default="{ row }">{{ formatAmt(row.budgetAmount) }}</template>
          </el-table-column>
          <el-table-column label="执行(万元)" width="105" align="right">
            <template #default="{ row }">{{ formatAmt(row.execAmount) }}</template>
          </el-table-column>
          <el-table-column label="执行率" prop="execRate" width="80" align="center">
            <template #default="{ row }">{{ row.execRate }}%</template>
          </el-table-column>
          <el-table-column label="风险分" width="82" align="center">
            <template #default="{ row }">
              <el-tag :type="riskType(row.riskScore)" size="small" effect="plain">{{ row.riskScore != null ? row.riskScore : '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="预警来源" width="130" align="center">
            <template #default="{ row }">
              <el-tag v-for="s in srcList(row.sources)" :key="s" size="small" class="src-tag">{{ srcText(s) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-button v-hasPermi="['budget:warning:manage']" link type="primary" size="small" @click="openCreate(row)">处置</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="total === 0 && !loading" description="暂无预警：当前无超预算或接近阈值的科目" style="padding: 40px 0" />
      </el-card>
    </template>

    <!-- 闭环管理 -->
    <el-card shadow="never" v-else v-loading="recordLoading">
      <el-table :data="records" border stripe size="small" style="width: 100%">
        <el-table-column label="等级" width="72" align="center">
          <template #default="{ row }">
            <el-tag :type="row.level === 'RED' ? 'danger' : 'warning'" effect="dark" size="small">{{ levelText(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="单位/科目" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.orgName }} / {{ row.itemCode }}</template>
        </el-table-column>
        <el-table-column label="来源" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-for="s in srcList(row.sources)" :key="s" size="small" class="src-tag">{{ srcText(s) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险分" width="75" align="center">
          <template #default="{ row }">{{ row.riskScore != null ? row.riskScore : '-' }}</template>
        </el-table-column>
        <el-table-column label="处置人" prop="handlerName" width="100" align="center" />
        <el-table-column label="整改措施" prop="improvePlan" min-width="180" show-overflow-tooltip />
        <el-table-column label="升级" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.escalated" type="warning" size="small">已升级</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="处置时间" width="150" align="center">
          <template #default="{ row }">{{ fmtTime(row.handleTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['budget:warning:manage']" v-if="row.status !== 'CLOSED' && row.status !== 'ESCALATED'" link type="primary" size="small" @click="openHandle(row)">处置</el-button>
            <el-button v-hasPermi="['budget:warning:manage']" v-if="row.status !== 'CLOSED' && !row.escalated" link type="warning" size="small" @click="openEscalate(row)">升级</el-button>
            <el-button v-hasPermi="['budget:warning:manage']" v-if="row.status !== 'CLOSED'" link type="success" size="small" @click="openClose(row)">解除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="records.length === 0 && !recordLoading" description="暂无预警闭环记录" style="padding: 40px 0" />
    </el-card>

    <!-- 处置弹窗 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="560px">
      <el-form :model="form" label-width="92px">
        <el-form-item label="整改措施">
          <el-input v-model="form.improvePlan" type="textarea" :rows="3" placeholder="填写整改或压减措施" />
        </el-form-item>
        <el-form-item label="跟踪结果">
          <el-input v-model="form.trackResult" type="textarea" :rows="2" placeholder="整改后执行跟踪结论" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="选择处置结果" style="width: 200px">
            <el-option label="处置中" value="PROCESSING" />
            <el-option label="已确认" value="CONFIRMED" />
            <el-option label="已整改" value="RESOLVED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitDialog">提交</el-button>
      </template>
    </el-dialog>

    <!-- 升级弹窗 -->
    <el-dialog title="预警升级" v-model="escalateVisible" width="460px">
      <el-form :model="form" label-width="92px">
        <el-form-item label="升级对象">
          <el-select v-model="form.escalateTo" placeholder="选择通知对象" style="width: 100%">
            <el-option label="分管副总" value="分管副总" />
            <el-option label="总经理" value="总经理" />
            <el-option label="集团财务总监" value="集团财务总监" />
          </el-select>
        </el-form-item>
        <el-form-item label="补充说明">
          <el-input v-model="form.improvePlan" type="textarea" :rows="2" placeholder="升级理由" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="escalateVisible = false">取消</el-button>
        <el-button type="warning" :loading="submitting" @click="submitEscalate">确认升级</el-button>
      </template>
    </el-dialog>

    <!-- 解除弹窗 -->
    <el-dialog title="解除预警" v-model="closeVisible" width="460px">
      <el-form :model="form" label-width="92px">
        <el-form-item label="解除说明">
          <el-input v-model="form.trackResult" type="textarea" :rows="3" placeholder="整改到位/风险消除的说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeVisible = false">取消</el-button>
        <el-button type="success" :loading="submitting" @click="submitClose">确认解除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getWarningList,
  getWarningRecordList,
  createWarningRecord,
  handleWarningRecord,
  escalateWarningRecord,
  closeWarningRecord,
  getPlanList,
  getUnitOptions
} from '@/api/budget/warning';

const activeTab = ref('list');
const loading = ref(false);
const recordLoading = ref(false);
const tableData = ref<any[]>([]);
const records = ref<any[]>([]);
const planOptions = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
const levelFilter = ref('');
const query = ref<{ planId?: number; orgId?: number; threshold: number }>({ threshold: 80 });
const recQuery = ref<{ level: string; status: string }>({ level: '', status: '' });

const showList = computed(() => {
  if (!levelFilter.value) return tableData.value;
  return tableData.value.filter((r: any) => r.level === levelFilter.value);
});
const total = computed(() => tableData.value.length);
const redCount = computed(() => tableData.value.filter((r: any) => r.level === 'RED').length);
const orangeCount = computed(() => tableData.value.filter((r: any) => r.level === 'ORANGE').length);
const yellowCount = computed(() => tableData.value.filter((r: any) => r.level === 'YELLOW').length);

const formatAmt = (v: any) => (v == null ? '-' : Number(v).toFixed(2));
const fmtTime = (v: any) => (v ? String(v).replace('T', ' ').substring(0, 19) : '-');
const levelText = (l: any) => (l === 'RED' ? '红色' : l === 'ORANGE' ? '橙色' : '黄色');
const riskType = (s: any) => {
  const n = Number(s);
  if (n >= 90) return 'danger';
  if (n >= 80) return 'warning';
  return 'success';
};
const statusText = (s: any) =>
  ({ OPEN: '待处置', PROCESSING: '处置中', CONFIRMED: '已确认', RESOLVED: '已整改', ESCALATED: '已升级', CLOSED: '已解除' })[s] || s || '-';
const statusType = (s: any) =>
  ({ OPEN: 'info', PROCESSING: 'primary', CONFIRMED: 'warning', RESOLVED: 'success', ESCALATED: 'danger', CLOSED: 'info' })[s] || 'info';
const srcText = (s: any) =>
  ({ EXEC: '执行', ADJUST: '调整', SENSITIVE: '敏感', COMPOSITE: '复合' })[s] || s || '-';
const srcList = (s: any) => (s ? String(s).split(',') : []);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getWarningList({
      planId: query.value.planId || undefined,
      orgId: query.value.orgId || undefined,
      threshold: query.value.threshold
    });
    const list = res.rows || res.data || [];
    tableData.value = Array.isArray(list) ? list : [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const loadRecords = async () => {
  recordLoading.value = true;
  try {
    const res = await getWarningRecordList({
      level: recQuery.value.level || undefined,
      status: recQuery.value.status || undefined
    });
    const list = res.rows || res.data || [];
    records.value = Array.isArray(list) ? list : [];
  } catch (e) {
    console.error(e);
  } finally {
    recordLoading.value = false;
  }
};

const loadPlans = async () => {
  try {
    const res = await getPlanList();
    const list = res.rows || res.data || [];
    planOptions.value = Array.isArray(list) ? list : [];
  } catch (e) {
    planOptions.value = [];
  }
};

const loadUnits = async () => {
  try {
    const res = await getUnitOptions();
    const list = res.rows || res.data || [];
    deptOptions.value = Array.isArray(list) ? list : [];
  } catch (e) {
    deptOptions.value = [];
  }
};

const handleQuery = () => {
  levelFilter.value = '';
  loadData();
};

const handleReset = () => {
  query.value = { threshold: 80 };
  levelFilter.value = '';
  loadData();
};

const rowClassName = ({ row }: { row: any }) => {
  if (row.level === 'RED') return 'alert-row-red';
  if (row.level === 'ORANGE') return 'alert-row-orange';
  if (row.level === 'YELLOW') return 'alert-row-yellow';
  return '';
};

const onTabChange = (name: string) => {
  if (name === 'record') loadRecords();
};

// ===== 处置闭环 =====
const dialogVisible = ref(false);
const escalateVisible = ref(false);
const closeVisible = ref(false);
const submitting = ref(false);
const dialogTitle = ref('处置预警');
const currentRecordId = ref<number | undefined>(undefined);
const form = ref<any>({
  improvePlan: '',
  trackResult: '',
  status: 'PROCESSING',
  escalateTo: ''
});

const openCreate = (row: any) => {
  currentRecordId.value = undefined;
  dialogTitle.value = '处置预警（新建闭环）';
  form.value = {
    improvePlan: '',
    trackResult: '',
    status: 'CONFIRMED'
  };
  tempRow.value = row;
  dialogVisible.value = true;
};
const tempRow = ref<any>(null);

const openHandle = (row: any) => {
  currentRecordId.value = row.recordId;
  dialogTitle.value = '处置预警';
  form.value = {
    improvePlan: row.improvePlan || '',
    trackResult: row.trackResult || '',
    status: row.status === 'OPEN' ? 'PROCESSING' : row.status
  };
  tempRow.value = null;
  dialogVisible.value = true;
};

const submitDialog = async () => {
  if (!form.value.improvePlan && currentRecordId.value == null) {
    ElMessage.warning('请填写整改措施');
    return;
  }
  submitting.value = true;
  try {
    if (currentRecordId.value == null) {
      const r = tempRow.value;
      await createWarningRecord({
        planId: r.planId,
        orgId: r.orgId,
        templateCode: r.templateCode,
        itemCode: r.itemCode,
        level: r.level,
        sources: r.sources,
        riskScore: r.riskScore,
        execRate: r.execRate,
        status: form.value.status,
        improvePlan: form.value.improvePlan,
        trackResult: form.value.trackResult
      });
    } else {
      await handleWarningRecord({
        recordId: currentRecordId.value,
        status: form.value.status,
        improvePlan: form.value.improvePlan,
        trackResult: form.value.trackResult
      });
    }
    ElMessage.success('处置成功');
    dialogVisible.value = false;
    loadRecords();
    loadData();
  } finally {
    submitting.value = false;
  }
};

const openEscalate = (row: any) => {
  currentRecordId.value = row.recordId;
  form.value = { improvePlan: '', escalateTo: '', trackResult: '' };
  escalateVisible.value = true;
};

const submitEscalate = async () => {
  if (!form.value.escalateTo) {
    ElMessage.warning('请选择升级对象');
    return;
  }
  submitting.value = true;
  try {
    await escalateWarningRecord({
      recordId: currentRecordId.value,
      escalateTo: form.value.escalateTo,
      improvePlan: form.value.improvePlan
    });
    ElMessage.success('已升级');
    escalateVisible.value = false;
    loadRecords();
  } finally {
    submitting.value = false;
  }
};

const openClose = (row: any) => {
  currentRecordId.value = row.recordId;
  form.value = { trackResult: '', improvePlan: '', escalateTo: '' };
  closeVisible.value = true;
};

const submitClose = async () => {
  submitting.value = true;
  try {
    await closeWarningRecord({ recordId: currentRecordId.value as number, result: form.value.trackResult });
    ElMessage.success('预警已解除');
    closeVisible.value = false;
    loadRecords();
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadPlans();
  loadUnits();
  loadData();
});
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.src-tag { margin-right: 4px; }
.stat-card { padding: 12px 18px; font-size: 14px; color: #606266; border-radius: 4px; border-left: 4px solid #909399; }
.stat-card b { font-size: 20px; margin-left: 6px; vertical-align: middle; }
.alert-red { border-left-color: #f56c6c; }
.alert-red b { color: #f56c6c; }
.alert-orange { border-left-color: #e6a23c; }
.alert-orange b { color: #e6a23c; }
.alert-yellow { border-left-color: #f4c430; }
.alert-yellow b { color: #c8942a; }
</style>

<style>
.alert-row-red { background-color: #fef0f0 !important; }
.alert-row-orange { background-color: #fdf6ec !important; }
.alert-row-yellow { background-color: #fcf7e8 !important; }
</style>