<template>
  <div class="app-container">
    <!-- 报告筛选与操作 -->
    <el-card shadow="never" class="mb-14">
      <div class="toolbar">
        <div class="filter-item">
          <span class="label">预算方案</span>
          <el-select v-model="query.planId" placeholder="选择预算方案" filterable style="width: 240px" @change="generate">
            <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="label">单位</span>
          <el-select v-model="query.orgId" placeholder="集团全口径" clearable filterable style="width: 220px" @change="generate">
            <el-option v-for="u in unitOptions" :key="u.deptId" :label="u.deptName" :value="u.deptId" />
          </el-select>
        </div>
        <div class="filter-item">
          <el-button type="primary" :icon="'Refresh'" :loading="loading" @click="generate">重新生成</el-button>
          <el-dropdown @command="handleExport">
            <el-button type="success" plain :icon="'Download'">
              导出报告
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="print">打印 / 另存为 PDF</el-dropdown-item>
                <el-dropdown-item command="word">导出 Word 文档</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-card>

    <!-- 报告正文（打印区域） -->
    <div v-loading="loading" class="report" id="report-area">
      <template v-if="report">
        <!-- 封面 -->
        <div class="r-cover">
          <div class="r-cover-title">{{ report.reportName }}</div>
          <div class="r-cover-sub">{{ report.planName }}</div>
          <div class="r-cover-meta">
            <div>报告期间：{{ report.reportPeriod }}</div>
            <div>统计范围：{{ report.scopeLabel }}</div>
            <div>生成时间：{{ fmtDate(report.generateTime) }}</div>
          </div>
        </div>

        <!-- 一、执行概览 -->
        <section class="r-section">
          <h2 class="r-h2">一、执行概览</h2>
          <el-row :gutter="12">
            <el-col :span="6"><div class="ov"><div class="k">预算总额</div><div class="v">{{ fmt(report.budgetTotal) }}<span class="u">万元</span></div></div></el-col>
            <el-col :span="6"><div class="ov"><div class="k">累计执行</div><div class="v">{{ fmt(report.execTotal) }}<span class="u">万元</span></div></div></el-col>
            <el-col :span="6"><div class="ov"><div class="k">差异额</div><div class="v" :style="{ color: Number(report.diffTotal) >= 0 ? '#16a34a' : '#dc2626' }">{{ fmt(report.diffTotal) }}<span class="u">万元</span></div></div></el-col>
            <el-col :span="6"><div class="ov"><div class="k">整体执行率</div><div class="v">{{ report.execRate }}%</div></div></el-col>
          </el-row>
          <div class="r-range">共 {{ report.orgCount }} 个填报单位 · {{ report.itemCount }} 个预算科目 · 预警 {{ report.warnTotal }} 条（红 {{ report.warnRed }} / 橙 {{ report.warnOrange }} / 黄 {{ report.warnYellow }}）</div>
          <div class="r-conclusion">
            <div class="r-sub">关键结论</div>
            <ul>
              <li v-for="(c, i) in report.conclusions" :key="i">{{ c }}</li>
            </ul>
          </div>
        </section>

        <!-- 二、按表成本费用分析 -->
        <section class="r-section">
          <h2 class="r-h2">二、按表分析</h2>
          <el-table :data="report.tableAnalysis" border size="small" class="r-table">
            <el-table-column label="预算表" prop="templateName" min-width="160" />
            <el-table-column label="预算(万元)" width="120" align="right">
              <template #default="{ row }">{{ fmt(row.budget) }}</template>
            </el-table-column>
            <el-table-column label="执行(万元)" width="120" align="right">
              <template #default="{ row }">{{ fmt(row.exec) }}</template>
            </el-table-column>
            <el-table-column label="差异额(万元)" width="130" align="right">
              <template #default="{ row }">
                <span :style="{ color: Number(row.diff) >= 0 ? '#16a34a' : '#dc2626' }">{{ fmt(row.diff) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="执行率" width="90" align="center">
              <template #default="{ row }">{{ row.execRate }}%</template>
            </el-table-column>
          </el-table>
        </section>

        <!-- 三、季度趋势 -->
        <section class="r-section">
          <h2 class="r-h2">三、季度执行趋势</h2>
          <el-row :gutter="12">
            <el-col :span="6" v-for="q in report.quarterTrend" :key="q.label">
              <div class="q-card"><div class="q-lbl">{{ q.label }}</div><div class="q-val">{{ fmt(q.exec) }}<span class="u">万元</span></div><div class="q-rate">占预算 {{ q.rate }}%</div></div>
            </el-col>
          </el-row>
        </section>

        <!-- 四、预警事项 -->
        <section class="r-section">
          <h2 class="r-h2">四、预警事项</h2>
          <el-table :data="report.warningList" border size="small" class="r-table">
            <el-table-column label="等级" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="tagType(row.level)" effect="dark" size="small">{{ levelText(row.level) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="单位" prop="orgName" min-width="160" />
            <el-table-column label="预算表/科目" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">{{ row.templateName }} / {{ row.itemName }}</template>
            </el-table-column>
            <el-table-column label="预算(万元)" width="110" align="right"><template #default="{ row }">{{ fmt(row.budget) }}</template></el-table-column>
            <el-table-column label="执行(万元)" width="110" align="right"><template #default="{ row }">{{ fmt(row.exec) }}</template></el-table-column>
            <el-table-column label="执行率" width="80" align="center"><template #default="{ row }">{{ row.execRate }}%</template></el-table-column>
          </el-table>
        </section>

        <!-- 五、超预算科目 -->
        <section class="r-section">
          <h2 class="r-h2">五、超预算科目（差异归因 Top）</h2>
          <el-table :data="report.overrunSubjects" border size="small" class="r-table">
            <el-table-column label="单位" prop="orgName" min-width="160" />
            <el-table-column label="预算表/科目" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">{{ row.templateName }} / {{ row.itemName }}</template>
            </el-table-column>
            <el-table-column label="预算(万元)" width="110" align="right"><template #default="{ row }">{{ fmt(row.budget) }}</template></el-table-column>
            <el-table-column label="执行(万元)" width="110" align="right"><template #default="{ row }">{{ fmt(row.exec) }}</template></el-table-column>
            <el-table-column label="差异额(万元)" width="120" align="right">
              <template #default="{ row }"><span style="color:#dc2626">{{ fmt(row.diff) }}</span></template>
            </el-table-column>
            <el-table-column label="执行率" width="80" align="center"><template #default="{ row }">{{ row.execRate }}%</template></el-table-column>
          </el-table>
        </section>

        <!-- 六、下月重点关注 -->
        <section class="r-section">
          <h2 class="r-h2">六、下月重点关注</h2>
          <ol class="r-list">
            <li v-for="(f, i) in report.focusPoints" :key="i">{{ f }}</li>
          </ol>
        </section>

        <!-- 七、管理建议 -->
        <section class="r-section">
          <h2 class="r-h2">七、管理建议</h2>
          <ul class="r-list">
            <li v-for="(s, i) in report.suggestions" :key="i">{{ s }}</li>
          </ul>
        </section>

        <div class="r-footer">本报告由全面预算管理系统自动生成</div>
      </template>
      <el-empty v-else-if="!loading" description="请选择预算方案并生成报告" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { generateReport, exportReport } from '@/api/budget/report';
import { listPlan } from '@/api/budget/plan';
import { getUnitOptions } from '@/api/budget/dashboard';

const loading = ref(false);
const report = ref<any>(null);
const query = reactive<any>({ planId: undefined, orgId: undefined, period: undefined });
const planOptions = ref<any[]>([]);
const unitOptions = ref<any[]>([]);

const fmt = (v: any) => (v === null || v === undefined || v === '' ? '0.00' : Number(v).toFixed(2));
const fmtDate = (v: any) => (v ? String(v).replace('T', ' ').substring(0, 19) : '-');
const tagType = (l: any) => (l === 'RED' ? 'danger' : l === 'ORANGE' ? 'warning' : 'warning');
const levelText = (l: any) => (l === 'RED' ? '红' : l === 'ORANGE' ? '橙' : '黄');

const loadPlans = async () => {
  const res: any = await listPlan({ pageSize: 100 });
  planOptions.value = res.rows || res.data || [];
  if (planOptions.value.length > 0 && !query.planId) {
    query.planId = planOptions.value[0].id;
  }
};

const loadUnits = async () => {
  try {
    const res: any = await getUnitOptions();
    unitOptions.value = res.data || res || [];
  } catch (e) {
    unitOptions.value = [];
  }
};

const generate = async () => {
  if (!query.planId) {
    report.value = null;
    return;
  }
  loading.value = true;
  try {
    const res: any = await generateReport(query);
    report.value = res.data || res;
  } finally {
    loading.value = false;
  }
};

const exportLoading = ref(false);

const handleExport = async (cmd: string) => {
  if (cmd === 'print') {
    window.print();
    return;
  }
  if (cmd !== 'word') return;
  if (!query.planId) {
    ElMessage.warning('请先选择预算方案');
    return;
  }
  exportLoading.value = true;
  try {
    const res: any = await exportReport({
      planId: query.planId,
      orgId: query.orgId || undefined,
      period: query.period || undefined
    });
    const disposition: string = res?.headers?.['content-disposition'] || '';
    const m = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
    let name = '预算执行分析报告.doc';
    if (m) name = decodeURIComponent(m[1]).replace(/["']/g, '');
    const blob = new Blob([res.data], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('Word 报告已导出');
  } catch (e) {
    ElMessage.error('导出失败，请重试');
  } finally {
    exportLoading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadPlans(), loadUnits()]);
  generate();
});
</script>

<style scoped>
.mb-14 { margin-bottom: 14px; }
.toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 20px; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item .label { color: #606266; font-size: 13px; white-space: nowrap; }

.report {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 24px 28px;
}

.r-cover { text-align: center; border-bottom: 2px solid #333; padding: 20px 0 16px; }
.r-cover-title { font-size: 26px; font-weight: 700; color: #1f2d3d; letter-spacing: 2px; }
.r-cover-sub { font-size: 15px; color: #666; margin-top: 6px; }
.r-cover-meta { margin-top: 18px; color: #666; font-size: 13px; display: flex; gap: 28px; justify-content: center; }

.r-section { margin-top: 22px; }
.r-h2 { font-size: 17px; font-weight: 700; color: #1f2d3d; border-left: 4px solid #409eff; padding-left: 10px; margin-bottom: 12px; }

.ov { background: #f5f7fa; border: 1px solid #ebeef5; border-radius: 6px; padding: 12px 14px; }
.ov .k { font-size: 12px; color: #909399; }
.ov .v { font-size: 20px; font-weight: 700; color: #303133; margin-top: 4px; font-variant-numeric: tabular-nums; }
.ov .u { font-size: 12px; color: #909399; font-weight: 400; margin-left: 2px; }

.r-range { margin-top: 12px; font-size: 13px; color: #606266; }
.r-conclusion { margin-top: 12px; background: #f9fafb; border-radius: 6px; padding: 10px 16px; }
.r-sub { font-weight: 600; color: #1f2d3d; margin-bottom: 6px; }
.r-conclusion ul, .r-list { margin: 0; padding-left: 20px; }
.r-conclusion li, .r-list li { font-size: 13px; color: #303133; line-height: 1.9; }

.r-table { margin-top: 4px; }
.q-card { background: #f5f7fa; border: 1px solid #ebeef5; border-radius: 6px; padding: 12px 14px; text-align: center; }
.q-lbl { font-size: 12px; color: #909399; }
.q-val { font-size: 18px; font-weight: 700; color: #303133; margin-top: 4px; }
.q-rate { font-size: 12px; color: #909399; margin-top: 2px; }

.r-footer { margin-top: 28px; text-align: center; color: #c0c4cc; font-size: 12px; border-top: 1px dashed #e4e7ed; padding-top: 12px; }

@media print {
  .app-container :deep(.el-card) { display: none !important; }
  .report { border: none; padding: 0; }
}
</style>