<template>
  <div class="app-container">
    <!-- 顶部横幅 -->
    <el-card shadow="never" class="header-banner">
      <div class="banner-content">
        <div class="banner-icon">
          <el-icon size="48" color="#409eff"><Reading /></el-icon>
        </div>
        <div class="banner-text">
          <h2>全面预算管理系统 — 填报说明</h2>
          <p>请仔细阅读以下说明，了解预算编制流程、各表填报规则及注意事项</p>
        </div>
      </div>
    </el-card>

    <!-- 左侧目录 + 右侧内容 -->
    <el-row :gutter="16">
      <el-col :span="4">
        <el-card shadow="never" class="toc-card">
          <div class="toc-title">目录</div>
          <div
            v-for="section in sections"
            :key="section.id"
            class="toc-item"
            :class="{ active: activeSection === section.id }"
            @click="scrollTo(section.id)"
          >
            {{ section.title }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="20">
        <!-- 1. 系统概述 -->
        <el-card id="overview" shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <el-icon color="#409eff" size="20"><InfoFilled /></el-icon>
              <span>一、系统概述</span>
            </div>
          </template>
          <p class="section-text">
            全面预算管理系统用于企业年度预算的编制、审批、调整、执行跟踪和分析。系统覆盖各下属单位的预算填报，支持多预算表、多级科目的精细化预算管理。
          </p>
          <el-row :gutter="12" class="mt-4">
            <el-col :span="6" v-for="mod in systemModules" :key="mod.name">
              <div class="module-card">
                <el-icon :color="mod.color" size="24"><component :is="mod.icon" /></el-icon>
                <div class="module-name">{{ mod.name }}</div>
                <div class="module-desc">{{ mod.desc }}</div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 2. 业务流程 -->
        <el-card id="workflow" shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <el-icon color="#67c23a" size="20"><Sort /></el-icon>
              <span>二、预算业务流程</span>
            </div>
          </template>
          <div class="workflow-steps">
            <div v-for="(step, idx) in workflowSteps" :key="idx" class="workflow-step">
              <div class="step-num">{{ idx + 1 }}</div>
              <div class="step-content">
                <div class="step-title">{{ step.title }}</div>
                <div class="step-desc">{{ step.desc }}</div>
              </div>
              <el-icon v-if="idx < workflowSteps.length - 1" color="#c0c4cc" class="step-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </el-card>

        <!-- 3. 填报操作指南 -->
        <el-card id="guide" shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <el-icon color="#e6a23c" size="20"><EditPen /></el-icon>
              <span>三、填报操作指南</span>
            </div>
          </template>
          <el-alert type="info" :closable="false" class="mb-4">
            <template #title>
              <span>进入路径：菜单「预算管理」→「预算填报」，选择预算方案和填报单位后即可开始填报</span>
            </template>
          </el-alert>
          <el-table :data="fillGuideSteps" border style="width: 100%">
            <el-table-column label="步骤" prop="step" width="70" align="center" />
            <el-table-column label="操作" prop="action" width="180" />
            <el-table-column label="说明" prop="desc" min-width="300">
              <template #default="{ row }">
                <span v-html="row.desc"></span>
              </template>
            </el-table-column>
            <el-table-column label="注意" prop="tip" width="200">
              <template #default="{ row }">
                <span v-if="row.tip" style="color: #e6a23c">{{ row.tip }}</span>
                <span v-else style="color: #c0c4cc">—</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 4. 预算表说明 -->
        <el-card id="tables" shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <el-icon color="#f56c6c" size="20"><Document /></el-icon>
              <span>四、预算表说明</span>
            </div>
          </template>
          <p class="section-text">系统包含以下预算表，各表科目编码规则为「表号+科目编码」，例如 060101 表示06表的0101科目。</p>
          <el-table :data="budgetTables" border style="width: 100%" class="mt-4">
            <el-table-column label="表号" prop="code" width="80" align="center" />
            <el-table-column label="预算表名称" prop="name" width="220" />
            <el-table-column label="填报内容" prop="content" min-width="280" />
            <el-table-column label="主要科目" prop="items" min-width="250">
              <template #default="{ row }">
                <el-tag v-for="item in row.items" :key="item" size="small" class="mr-1 mb-1">{{ item }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 5. 字段说明 -->
        <el-card id="fields" shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <el-icon color="#909399" size="20"><Tickets /></el-icon>
              <span>五、字段说明</span>
            </div>
          </template>
          <el-table :data="fieldDescriptions" border style="width: 100%">
            <el-table-column label="字段名称" prop="name" width="140" />
            <el-table-column label="类型" prop="type" width="100" align="center" />
            <el-table-column label="说明" prop="desc" min-width="300" />
            <el-table-column label="是否必填" prop="required" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.required === '是' ? 'danger' : 'info'" size="small">{{ row.required }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 6. 状态说明 -->
        <el-card id="status" shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <el-icon color="#409eff" size="20"><CircleCheck /></el-icon>
              <span>六、数据状态说明</span>
            </div>
          </template>
          <el-row :gutter="16">
            <el-col :span="6" v-for="st in statusList" :key="st.code">
              <div class="status-card" :style="{ borderLeftColor: st.color }">
                <el-tag :type="st.tagType" effect="dark" size="small">{{ st.code }}</el-tag>
                <span class="status-name">{{ st.name }}</span>
                <p class="status-desc">{{ st.desc }}</p>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 7. 预算执行情况口径 -->
        <el-card id="execution" shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <el-icon color="#409eff" size="20"><TrendCharts /></el-icon>
              <span>七、预算执行情况口径</span>
            </div>
          </template>
          <el-alert type="info" :closable="false" class="mb-4">
            <template #title>
              <span>预算执行按季度（Q1~Q4）录入执行金额，查看入口在「预算执行情况（各单位）」，用于对比各单位执行进度</span>
            </template>
          </el-alert>

          <el-descriptions :column="1" border size="small" class="mb-4">
            <el-descriptions-item label="执行金额">按季度（Q1~Q4）在「预算执行」录入的实际金额，单位：万元，保留 2 位小数。</el-descriptions-item>
            <el-descriptions-item label="累计执行">全年口径等于 Q1+Q2+Q3+Q4 之和；选择某季度时等于该季度执行金额。</el-descriptions-item>
            <el-descriptions-item label="执行率">
              执行金额 ÷ 预算金额 × 100%。年度视图 = 该季执行 ÷ 全年预算；累计视图 = 累计执行 ÷ 全年预算（随季度只增不减）。
            </el-descriptions-item>
            <el-descriptions-item label="差异">执行金额 − 预算金额；正数（超支）红色、负数（节约）绿色。</el-descriptions-item>
            <el-descriptions-item label="预算金额">科目全年预算总额，作为全年参考基准（虚线），不按季度拆分虚构。</el-descriptions-item>
          </el-descriptions>

          <div class="section-sub-title">预算执行情况（各单位）视图</div>
          <p class="section-text">行=预算科目（层级缩进，汇总行加粗），列=各单位，最右列为合计。单元格展示执行率、进度条及预算/执行金额。</p>
          <el-table :data="execColorRules" border size="small" style="width: 100%" class="mt-4">
            <el-table-column label="执行率区间" prop="range" width="150" align="center" />
            <el-table-column label="配色" prop="color" width="100" align="center">
              <template #default="{ row }">
                <span class="color-dot" :style="{ background: row.hex }"></span>
              </template>
            </el-table-column>
            <el-table-column label="说明" prop="note" min-width="300" />
          </el-table>
          <p class="section-text" style="margin-top: 10px">
            顶部按「方案 + 季度 + 预算表」筛选；季度可切换全年合计 / Q1 / Q2 / Q3 / Q4。底部有各单位执行合计行；汇总行由子项自动递归汇总，参考行（上年实际等）保留原值不参与汇总。
          </p>
        </el-card>

        <!-- 8. 预算调整说明 -->
        <el-card id="adjustment" shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <el-icon color="#e6a23c" size="20"><Switch /></el-icon>
              <span>七、预算调整说明</span>
            </div>
          </template>
          <el-alert type="warning" :closable="false" class="mb-4">
            <template #title>
              <span>预算调整需在预算审批通过后方可进行，调整金额会自动更新预算数据</span>
            </template>
          </el-alert>
          <div class="adjustment-flow">
            <div class="adj-step" v-for="(s, i) in adjustmentFlow" :key="i">
              <div class="adj-circle" :style="{ background: s.color }">{{ i + 1 }}</div>
              <div>
                <div class="adj-title">{{ s.title }}</div>
                <div class="adj-desc">{{ s.desc }}</div>
              </div>
            </div>
          </div>
          <el-divider />
          <div class="formula-box">
            <div class="formula-title">计算公式</div>
            <div class="formula-item">调整后金额 = 原预算金额 + 调整金额</div>
            <div class="formula-item">调整金额为正数表示调增，负数表示调减</div>
          </div>
        </el-card>

        <!-- 8. 常见问题 -->
        <el-card id="faq" shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <el-icon color="#f56c6c" size="20"><QuestionFilled /></el-icon>
              <span>八、常见问题</span>
            </div>
          </template>
          <el-collapse v-model="activeNames">
            <el-collapse-item v-for="(faq, idx) in faqList" :key="idx" :name="idx">
              <template #title>
                <span class="faq-q">Q：{{ faq.q }}</span>
              </template>
              <p class="faq-a">A：{{ faq.a }}</p>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts" name="BudgetInstruction">
import { ref } from 'vue';

const activeSection = ref('overview');
const activeNames = ref<number[]>(0);

const sections = [
  { id: 'overview', title: '一、系统概述' },
  { id: 'workflow', title: '二、业务流程' },
  { id: 'guide', title: '三、填报指南' },
  { id: 'tables', title: '四、预算表说明' },
  { id: 'fields', title: '五、字段说明' },
  { id: 'status', title: '六、状态说明' },
  { id: 'execution', title: '七、执行情况口径' },
  { id: 'adjustment', title: '八、预算调整' },
  { id: 'faq', title: '九、常见问题' }
];

const systemModules = [
  { name: '工作台', desc: '首页数据看板', icon: 'Odometer', color: '#409eff' },
  { name: '预算方案', desc: '管理年度预算方案', icon: 'Calendar', color: '#67c23a' },
  { name: '预算填报', desc: '各单位填报预算数据', icon: 'EditPen', color: '#e6a23c' },
  { name: '审批中心', desc: '统一审批入口', icon: 'CircleCheck', color: '#f56c6c' },
  { name: '预算汇总', desc: '汇总各表预算数据', icon: 'DataAnalysis', color: '#909399' },
  { name: '预算执行', desc: '录入执行数、跟踪执行率', icon: 'TrendCharts', color: '#67c23a' },
  { name: '预算主表', desc: '各单位预算矩阵视图', icon: 'Grid', color: '#409eff' },
  { name: '执行情况', desc: '各单位执行率对比', icon: 'Chart', color: '#e6a23c' },
  { name: '内部交易', desc: '内部交易登记', icon: 'Money', color: '#f56c6c' },
  { name: '合并三表', desc: '内部分析抵消合并', icon: 'Files', color: '#909399' }
];

const workflowSteps = [
  { title: '创建预算方案', desc: '管理员创建年度预算方案，设定方案名称、年度、状态' },
  { title: '配置科目映射', desc: '为各下属单位分配预算板块（dept_budget_module）' },
  { title: '单位填报', desc: '各单位在「预算填报」页面录入各科目预算金额' },
  { title: '提交审批', desc: '填报完成后点击「提交」，数据状态变为 SUBMITTED' },
  { title: '审批处理', desc: '审批人在「审批中心」逐条或批量审批' },
  { title: '预算汇总', desc: '审批通过后，在「预算汇总」查看各表汇总数据' },
  { title: '预算调整', desc: '如需调整，在「预算调整记录」提交调整申请' },
  { title: '执行跟踪', desc: '在「预算执行」录入实际数，对比预算偏差' }
];

const fillGuideSteps = [
  {
    step: 1, action: '选择预算方案', desc: '在页面顶部下拉框中选择已发布（PUBLISHED）的预算方案',
    tip: '只有已发布状态的方案可选'
  },
  {
    step: 2, action: '选择填报单位', desc: '选择当前用户所属的填报单位（公司/部门）',
    tip: '只显示有权限的单位'
  },
  {
    step: 3, action: '切换预算表', desc: '通过Tab切换不同预算表（如06-管理费用预算），查看对应科目',
    tip: ''
  },
  {
    step: 4, action: '录入预算金额', desc: '在明细科目的「本年预算」输入框中填写金额，支持小数',
    tip: '汇总行不可编辑'
  },
  {
    step: 5, action: '录入上年实际', desc: '填写上年度实际发生金额，系统自动计算增减额和增减率',
    tip: '增减额 = 本年预算 - 上年实际'
  },
  {
    step: 6, action: '保存草稿', desc: '点击「保存草稿」暂存数据，状态为 DRAFT，可多次修改',
    tip: '草稿不会进入审批'
  },
  {
    step: 7, action: '提交审批', desc: '确认无误后点击「提交」，数据状态变为 SUBMITTED，等待审批',
    tip: '提交后不可修改'
  }
];

const budgetTables = [
  {
    code: '06', name: '管理费用预算', content: '管理人员工资、福利费、社保、办公费、差旅费等',
    items: ['管理人员工资', '职工福利费', '住房公积金', '办公费', '差旅费', '咨询费']
  },
  {
    code: '07', name: '销售费用预算', content: '销售人员工资、运输费、广告费、展览费等',
    items: ['销售人员工资', '运输费', '广告费', '装卸费']
  },
  {
    code: '08', name: '财务费用预算', content: '利息支出、汇兑损益、手续费等',
    items: ['利息支出', '手续费', '汇兑损益']
  },
  {
    code: '01', name: '营业收入预算', content: '主营业务收入、其他业务收入等',
    items: ['主营业务收入', '其他业务收入']
  },
  {
    code: '02', name: '营业成本预算', content: '直接材料、直接人工、制造费用等',
    items: ['直接材料', '直接人工', '制造费用']
  },
  {
    code: '03', name: '税金及附加预算', content: '消费税、城建税、教育费附加等',
    items: ['消费税', '城建税', '教育费附加']
  }
];

const fieldDescriptions = [
  { name: '科目编码', type: '文本', desc: '如 060101，由系统预设，不可修改', required: '是' },
  { name: '科目名称', type: '文本', desc: '如「管理人员工资」，由系统预设', required: '是' },
  { name: '上年实际', type: '数值', desc: '上年度实际发生金额，单位：万元，支持小数', required: '否' },
  { name: '本年预算', type: '数值', desc: '本年度预算金额，单位：万元，支持小数', required: '是' },
  { name: '增减额', type: '自动', desc: '系统计算 = 本年预算 - 上年实际', required: '—' },
  { name: '增减率', type: '自动', desc: '系统计算 = 增减额 / 上年实际 × 100%', required: '—' },
  { name: '备注', type: '文本', desc: '填写说明或特殊事项', required: '否' },
  { name: '执行金额', type: '数值', desc: '预算执行阶段录入的实际执行金额', required: '否' }
];

const statusList = [
  { code: 'DRAFT', name: '草稿', desc: '已保存但未提交，可继续编辑', color: '#909399', tagType: 'info' },
  { code: 'SUBMITTED', name: '已提交', desc: '已提交审批，等待审批人处理', color: '#409eff', tagType: 'primary' },
  { code: 'APPROVED', name: '已审批', desc: '审批通过，数据已确认', color: '#67c23a', tagType: 'success' },
  { code: 'REJECTED', name: '已驳回', desc: '审批未通过，可修改后重新提交', color: '#f56c6c', tagType: 'danger' }
];

const execColorRules = [
  { range: '≥ 90%', hex: '#67c23a', note: '执行完成度高' },
  { range: '50% ~ 90%', hex: '#409eff', note: '执行进度正常' },
  { range: '> 0%', hex: '#e6a23c', note: '已开始执行，进度偏低' },
  { range: '0%', hex: '#c0c4cc', note: '尚未产生执行，或该科目无执行数据' }
];

const adjustmentFlow = [
  { title: '发起调整', desc: '在「预算调整记录」页面点击「新增调整申请」', color: '#409eff' },
  { title: '选择科目', desc: '选择预算表和科目编码，系统自动填充原预算金额', color: '#67c23a' },
  { title: '填写调整金额', desc: '输入调整金额（正数调增，负数调减），系统自动计算调整后金额', color: '#e6a23c' },
  { title: '提交审批', desc: '提交后状态为 PENDING，进入审批中心', color: '#909399' },
  { title: '审批生效', desc: '审批通过后自动更新 budget_data 表的预算金额', color: '#f56c6c' }
];

const faqList = [
  {
    q: '为什么下拉框里看不到预算方案？',
    a: '预算方案需要处于「已发布（PUBLISHED）」状态才会显示在下拉框中。请联系管理员将方案状态改为 PUBLISHED。'
  },
  {
    q: '填报单位下拉框为空怎么办？',
    a: '需要先在「部门-预算板块映射（dept_budget_module）」表中为当前单位配置对应的预算板块，且 dept_id 必须与 sys_dept 表中的真实部门ID一致。'
  },
  {
    q: '为什么某些科目行是只读的？',
    a: '汇总行（isSummary=1）为系统自动汇总，不可编辑。另外如果该单位没有对应板块的映射配置，相关科目也会显示为只读。'
  },
  {
    q: '提交后发现数据填错了怎么办？',
    a: '如果还在「SUBMITTED」状态，联系审批人驳回即可修改；如果已审批通过，需要通过「预算调整」功能进行修正。'
  },
  {
    q: '预算调整金额可以填小数吗？',
    a: '可以。系统金额字段使用 BigDecimal 类型，支持精确到小数点后两位。'
  },
  {
    q: '执行率和偏差是如何计算的？',
    a: '执行率 = 执行金额 / 预算金额 × 100%；偏差 = 执行金额 - 预算金额（正数表示超支，负数表示节约）。'
  },
  {
    q: '多租户环境下数据看不到？',
    a: '系统启用多租户拦截器，自动按 tenant_id 过滤数据。请确保数据的 tenant_id 与当前登录用户的 tenant_id 一致。'
  },
  {
    q: '内部交易和合并三表如何使用？',
    a: '需先在「内部交易登记」录入交易并生成抵销分录，再在「合并三表」中选择模板查看合并结果（内部分析抵消口径）。'
  }
];

const scrollTo = (id: string) => {
  activeSection.value = id;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
</script>

<style scoped>
.header-banner {
  margin-bottom: 16px;
}
.banner-content {
  display: flex;
  align-items: center;
  gap: 20px;
}
.banner-icon {
  flex-shrink: 0;
}
.banner-text h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #303133;
}
.banner-text p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.toc-card {
  position: sticky;
  top: 80px;
}
.toc-title {
  font-weight: bold;
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.toc-item {
  padding: 8px 12px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}
.toc-item:hover {
  background: #f5f7fa;
  color: #409eff;
}
.toc-item.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}

.section-card {
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}
.section-text {
  color: #606266;
  line-height: 1.8;
  font-size: 14px;
}

.section-sub-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 4px 0 8px;
}

.color-dot {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  vertical-align: middle;
}

.module-card {
  text-align: center;
  padding: 16px 8px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  transition: box-shadow 0.2s;
}
.module-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.module-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-top: 8px;
}
.module-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.workflow-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}
.workflow-step {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 220px;
  padding: 12px;
}
.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-content {
  flex: 1;
}
.step-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.step-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
.step-arrow {
  flex-shrink: 0;
}

.status-card {
  border-left: 4px solid #409eff;
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 4px;
  min-height: 100px;
}
.status-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-left: 8px;
}
.status-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  line-height: 1.6;
}

.adjustment-flow {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.adj-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.adj-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.adj-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.adj-desc {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

.formula-box {
  background: #f5f7fa;
  padding: 16px 20px;
  border-radius: 8px;
}
.formula-title {
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}
.formula-item {
  font-size: 14px;
  color: #606266;
  line-height: 2;
  font-family: 'Courier New', monospace;
}

.faq-q {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.faq-a {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  padding: 8px 0;
}

.mb-4 {
  margin-bottom: 16px;
}
.mt-4 {
  margin-top: 16px;
}
.mr-1 {
  margin-right: 4px;
}
.mb-1 {
  margin-bottom: 4px;
}
</style>
