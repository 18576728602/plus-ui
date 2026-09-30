<template>
  <div class="app-container">
    <!-- 顶部筛选 -->
    <el-card class="mb-4 filter-card" shadow="never">
      <el-form :inline="true" size="small">
        <el-form-item label="预算方案">
          <el-select v-model="planId" placeholder="请选择预算方案" style="width: 260px" @change="handlePlanChange">
            <el-option v-for="item in planOptions" :key="item.id"
              :label="item.planName + (item.status === 'ARCHIVED' ? '（已归档）' : '')" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="loadCompanies">查询</el-button>
        </el-form-item>
        <el-form-item style="margin-bottom: 0">
          <span class="text-gray-400">集团预算管理员向下属公司下达预算目标基准线（一下）</span>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="!planId" shadow="never">
      <el-empty description="请选择预算方案" />
    </el-card>

    <el-card v-else shadow="never">
      <el-table v-loading="loading" :data="companies" size="small" border>
        <el-table-column prop="deptName" label="目标公司" min-width="180" />
        <el-table-column label="目标状态" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'PUBLISHED'" type="success" size="small">已下达</el-tag>
            <el-tag v-else-if="row.status === 'DRAFT'" type="warning" size="small">草稿</el-tag>
            <el-tag v-else type="info" size="small">未编制</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="versionNo" label="版本" width="80">
          <template #default="{ row }">{{ row.versionNo ? 'V' + row.versionNo : '-' }}</template>
        </el-table-column>
        <el-table-column prop="itemCount" label="科目数" width="90" />
        <el-table-column label="目标合计(万元)" width="140">
          <template #default="{ row }">{{ fmt(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openEdit(row)">编制/编辑</el-button>
            <el-button size="small" type="info" link @click="openView(row)">查看</el-button>
            <el-button size="small" type="success" link :disabled="row.status !== 'DRAFT'" @click="doPublish(row)">下达</el-button>
            <el-button size="small" type="warning" link @click="openHistory(row)">历史</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编制/编辑目标 -->
    <el-dialog v-model="editDialog" :title="`编制目标 - ${currentCompany?.deptName || ''}`" width="880px" top="4vh">
      <div class="mb-2 text-gray-500">
        <span v-if="currentCompany.status">当前为{{ currentCompany.status === 'PUBLISHED' ? '已下达' : '草稿' }}状态，版本 V{{ currentCompany.versionNo || '-' }}</span>
        <span v-if="currentCompany.status === 'PUBLISHED'" class="ml-2">（再次编辑将开启新版本 V{{ (currentCompany.versionNo || 0) + 1 }}）</span>
      </div>
      <el-scrollbar max-height="520px">
        <el-table :data="editItems" size="small" border :show-summary="false">
          <el-table-column prop="templateCode" label="预算表" width="70" />
          <el-table-column prop="itemCode" label="科目编码" width="90" />
          <el-table-column prop="itemName" label="科目名称" min-width="160" />
          <el-table-column label="目标金额(万元)">
            <template #default="{ row }">
              <el-input-number v-model="row.targetAmount" :controls="false" :precision="2" size="small" style="width: 120px" />
            </template>
          </el-table-column>
          <el-table-column label="下限偏差(%负)">
            <template #default="{ row }">
              <el-input-number v-model="row.toleranceMin" :controls="false" :precision="2" size="small" style="width: 90px" :step="0.01" />
            </template>
          </el-table-column>
          <el-table-column label="上限偏差(%正)">
            <template #default="{ row }">
              <el-input-number v-model="row.toleranceMax" :controls="false" :precision="2" size="small" style="width: 90px" :step="0.01" />
            </template>
          </el-table-column>
        </el-table>
      </el-scrollbar>
      <template #footer>
        <span class="float-left text-gray-400">目标合计：{{ fmt(editTotal) }} 万元</span>
        <el-button size="small" @click="editDialog = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saveLoading" @click="doSaveDraft">保存草稿</el-button>
        <el-button size="small" type="success" :loading="publishLoading" @click="doSaveAndPublish">保存并下达</el-button>
      </template>
    </el-dialog>

    <!-- 查看目标（含填报对比，二下） -->
    <el-dialog v-model="viewDialog" :title="`目标与填报对比 - ${currentCompany?.deptName || ''}`" width="860px" top="5vh">
      <div v-if="!hasTargetState" class="mb-2"><el-alert type="info" :closable="false" title="该公司尚未下达目标" /></div>
      <el-alert v-else type="warning" :closable="false" show-icon class="mb-2" title="偏差率超出目标弹性区间的高亮显示（正报红=超上限，负报黄=低于下限）" />
      <el-table v-loading="viewLoading" :data="viewRows" size="small" border max-height="460">
        <el-table-column prop="templateCode" label="表" width="55" />
        <el-table-column prop="itemCode" label="科目编码" width="85" />
        <el-table-column prop="itemName" label="科目名称" min-width="150" />
        <el-table-column label="目标金额(万元)" width="115">
          <template #default="{ row }">{{ fmt(row.targetAmount) }}</template>
        </el-table-column>
        <el-table-column label="填报金额(万元)" width="115">
          <template #default="{ row }">{{ fmt(row.fillAmount) }}</template>
        </el-table-column>
        <el-table-column label="偏差(万元)" width="105">
          <template #default="{ row }">{{ diffNum(row.fillAmount, row.targetAmount) }}</template>
        </el-table-column>
        <el-table-column label="偏差率" width="95">
          <template #default="{ row }"><span :class="rateClass(row)">{{ fmtRate2(row.diffRate) }}</span></template>
        </el-table-column>
        <el-table-column label="区间判断" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.level === 'ABOVE'" type="danger" size="small">超上限</el-tag>
            <el-tag v-else-if="row.level === 'BELOW'" type="warning" size="small">低于下限</el-tag>
            <el-tag v-else type="success" size="small">区间内</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="弹性区间" width="130">
          <template #default="{ row }">{{ fmtRate(row.toleranceMin) }} ~ {{ fmtRate(row.toleranceMax) }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button size="small" @click="viewDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 版本历史 -->
    <el-dialog v-model="historyDialog" :title="`目标版本历史 - ${currentCompany?.deptName || ''}`" width="720px">
      <el-table :data="history" size="small" border>
        <el-table-column prop="versionNo" label="版本" width="80">
          <template #default="{ row }">V{{ row.versionNo }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'PUBLISHED'" type="success" size="small">已下达</el-tag>
            <el-tag v-else type="warning" size="small">草稿</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="itemCount" label="科目数" width="90" />
        <el-table-column label="目标合计(万元)" width="140">
          <template #default="{ row }">{{ fmt(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="viewVersion(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="BudgetTarget">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { listPlan } from '@/api/budget/plan';
import {
  listTargetCompanies, getTargetBuildItems,
  saveTargetDraft, publishTarget, listTargetHistory, compareTargetFill
} from '@/api/budget/target';

const planId = ref<number>();
const planOptions = ref<any[]>([]);
const loading = ref(false);
const companies = ref<any[]>([]);

const editDialog = ref(false);
const editItems = ref<any[]>([]);
const saveLoading = ref(false);
const publishLoading = ref(false);
const currentCompany = ref<any>({});

const viewDialog = ref(false);
const viewLoading = ref(false);
const viewRows = ref<any[]>([]);
const hasTargetState = ref(true);

const historyDialog = ref(false);
const history = ref<any[]>([]);

const fmt = (v: any) => (v === null || v === undefined || v === '' ? '-' : Number(v).toFixed(2));
const fmtRate = (v: any) => (v === null || v === undefined ? '-' : (Number(v) * 100).toFixed(1) + '%');
const fmtRate2 = (v: any) => (v === null || v === undefined ? '-' : (Number(v) * 100).toFixed(1) + '%');
const diffNum = (fill: any, target: any) => {
  if (fill === null || fill === undefined || target === null || target === undefined) return '-';
  return (Number(fill) - Number(target)).toFixed(2);
};
const rateClass = (row: any) => {
  if (row.level === 'ABOVE') return 'rate-over';
  if (row.level === 'BELOW') return 'rate-under';
  return '';
};

const editTotal = computed(() => editItems.value.reduce((s, r) => s + (Number(r.targetAmount) || 0), 0));

onMounted(async () => {
  const res = await listPlan();
  planOptions.value = (res.data || []).filter(d => d.status === 'PUBLISHED' || d.status === 'ARCHIVED');
});

const handlePlanChange = async () => {
  await loadCompanies();
};

const loadCompanies = async () => {
  if (!planId.value) return;
  loading.value = true;
  try {
    const res = await listTargetCompanies(planId.value!);
    companies.value = res.data || [];
  } finally {
    loading.value = false;
  }
};

const openEdit = async (row: any) => {
  currentCompany.value = row;
  editDialog.value = true;
  const res = await getTargetBuildItems({ planId: planId.value, deptId: row.deptId });
  editItems.value = (res.data || []).map(it => ({
    templateCode: it.templateCode,
    itemCode: it.itemCode,
    itemName: it.itemName,
    itemOrder: it.itemOrder,
    targetAmount: it.targetAmount,
    toleranceMin: it.toleranceMin,
    toleranceMax: it.toleranceMax
  }));
};

const doSaveDraft = async () => {
  saveLoading.value = true;
  try {
    await saveTargetDraft({
      planId: planId.value,
      deptId: currentCompany.value.deptId,
      items: editItems.value
    });
    ElMessage.success('目标草稿已保存');
    await loadCompanies();
  } catch (error) {
    console.error(error);
    ElMessage.error('保存失败');
  } finally {
    saveLoading.value = false;
  }
};

const doPublish = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确认将 ${row.deptName} 的目标下达？下达后子公司可见且不可修改。`, '确认下达', { type: 'warning' });
  } catch { return; }
  await doPublishInner(row.deptId);
};

const doSaveAndPublish = async () => {
  try {
    await ElMessageBox.confirm('确认保存并下达目标？（下达后子公司可见且不可修改）', '确认下达', { type: 'warning' });
  } catch { return; }
  publishLoading.value = true;
  try {
    await saveTargetDraft({
      planId: planId.value,
      deptId: currentCompany.value.deptId,
      items: editItems.value
    });
    await doPublishInner(currentCompany.value.deptId);
  } finally {
    publishLoading.value = false;
  }
};

const doPublishInner = async (deptId: number) => {
  try {
    await publishTarget(planId.value!, deptId);
    ElMessage.success('目标已下达');
    editDialog.value = false;
    await loadCompanies();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.msg || '下达失败');
  }
};

const openView = async (row: any) => {
  currentCompany.value = row;
  viewDialog.value = true;
  viewLoading.value = true;
  try {
    const res = await compareTargetFill({ planId: planId.value, deptId: row.deptId });
    viewRows.value = (res.data?.rows) || [];
    hasTargetState.value = res.data?.hasTarget !== false;
  } finally {
    viewLoading.value = false;
  }
};

const openHistory = async (row: any) => {
  currentCompany.value = row;
  historyDialog.value = true;
  const res = await listTargetHistory(planId.value!, row.deptId);
  history.value = res.data || [];
};

const viewVersion = async (rowVS: any) => {
  const res = await compareTargetFill({ planId: planId.value, deptId: currentCompany.value.deptId, templateCode: '' });
  viewRows.value = (res.data?.rows) || [];
  hasTargetState.value = res.data?.hasTarget !== false;
  viewDialog.value = true;
};
</script>

<style scoped>
.rate-over { color: #f56c6c; font-weight: bold; }
.rate-under { color: #e6a23c; font-weight: bold; }
</style>