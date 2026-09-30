<template>
  <div class="app-container">
    <!-- ===================== 列表视图 ===================== -->
    <template v-if="viewMode === 'list'">
      <!-- 概览统计卡片 -->
      <el-row :gutter="16" class="plan-stats">
        <el-col :xs="12" :sm="6">
          <div class="stat-card stat-primary">
            <div class="stat-lbl">方案总数</div>
            <div class="stat-val">{{ planStats.total }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-lbl">编辑中</div>
            <div class="stat-val stat-draft">{{ planStats.draft }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-lbl">已发布</div>
            <div class="stat-val stat-ok">{{ planStats.published }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-lbl">已作废</div>
            <div class="stat-val stat-off">{{ planStats.closed }}</div>
          </div>
        </el-col>
      </el-row>
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

            <!-- ③ 科目明细（勾选树） -->
            <div class="plan-section">
              <div class="plan-section-title">
                <span class="plan-step" :class="{ 'is-locked': step3Locked }">
                  <el-icon v-if="step3Locked"><Lock /></el-icon>
                  <template v-else>3</template>
                </span>科目明细
              </div>
              <template v-if="form.id">
              <div class="items-toolbar">
                <div class="items-toolbar-left">
                  <el-checkbox v-model="cascadeOn" :disabled="readonly" @change="onCascadeChange">父子联动</el-checkbox>
                  <el-tooltip content="展开全部" placement="top">
                    <el-button size="small" circle text icon="Expand" @click="expandAllItems" />
                  </el-tooltip>
                  <el-tooltip content="收起全部" placement="top">
                    <el-button size="small" circle text icon="Fold" @click="collapseAllItems" />
                  </el-tooltip>
                  <el-divider direction="vertical" />
                  <el-button size="small" type="primary" plain :disabled="readonly" @click="itemsCheckAll">全选</el-button>
                  <el-button size="small" type="warning" plain :disabled="readonly" @click="itemsUncheckAll">全不选</el-button>
                  <el-tooltip content="全选=将已停用科目还原纳入；全不选=停用方案全部科目" placement="top">
                    <el-icon class="items-hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="items-toolbar-right">
                  <el-button v-if="!readonly" type="success" size="small" plain icon="FolderAdd" :disabled="!form.id" @click="openMasterImport" v-hasPermi="['budget:templateItem:add']">从科目库导入</el-button>
                  <el-button v-if="!readonly" type="primary" size="small" icon="Plus" :disabled="!canAddChild" @click="handleAddChildItem" v-hasPermi="['budget:templateItem:add']">新增子科目</el-button>
                  <el-button v-if="!readonly" type="warning" size="small" plain icon="RefreshLeft" :badge="disabledTotal" @click="openItemsDisabled">已停用</el-button>
                  <el-button size="small" icon="Search" @click="reloadItems">刷新</el-button>
                </div>
              </div>
              <div class="items-search">
                <el-input v-model="itemsTreeFilter" placeholder="搜索科目编码/名称" clearable size="small" :prefix-icon="Search" />
              </div>
              <div class="items-tree-wrap" v-loading="itemsLoading">
                <el-tree
                  ref="itemsTreeRef"
                  :data="itemsTreeData"
                  node-key="id"
                  :props="{ children: 'children', label: 'itemName' }"
                  :filter-node-method="filterItemsNode"
                  :expand-on-click-node="false"
                  :check-strictly="!cascadeOn"
                  :default-checked-keys="defaultCheckedItems"
                  show-checkbox
                  highlight-current
                  class="items-tree-body"
                  @node-click="onItemsNodeClick"
                >
                  <template #default="{ data }">
                    <span class="items-tree-node">
                      <span v-if="data.isTemplate" class="items-tree-tpl">{{ data.templateCode }}·{{ data.itemName }}</span>
                      <span v-else-if="data.isAll" class="items-tree-tpl">全部科目</span>
                      <span v-else>{{ data.itemCode ? data.itemCode + ' ' : '' }}{{ data.itemName }}</span>
                      <el-tag v-if="data.isTemplate" size="small" type="primary" effect="plain" class="items-node-tag">基础</el-tag>
                      <span v-if="!data.isAll && !data.isTemplate && !readonly" class="items-node-ops">
                        <el-button link type="primary" size="small" icon="Plus" @click.stop="handleAddChildItemBy(data)">子科目</el-button>
                        <el-button link type="info" size="small" icon="Edit" @click.stop="handleUpdateItem(data)">编辑</el-button>
                        <el-button link type="danger" size="small" icon="Delete" @click.stop="handleStopItem(data)">停用</el-button>
                      </span>
                    </span>
                  </template>
                </el-tree>
              </div>
              </template>
              <div v-else-if="!readonly" class="items-lock">
                <div class="items-lock-icon"><el-icon :size="28"><Lock /></el-icon></div>
                <div class="items-lock-text">保存基本信息生成方案后，即可为本方案配置科目明细</div>
                <el-button type="primary" icon="Top" @click="scrollToBasic">去保存基本信息</el-button>
              </div>
              <div v-else class="items-empty">
                <el-icon :size="20" color="#c0c4cc"><Document /></el-icon>
                <span style="color: var(--el-text-color-secondary); font-size: 13px">暂无科目明细</span>
              </div>
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

    <!-- 已停用科目还原弹窗 -->
    <el-dialog title="已停用科目（可还原）" v-model="itemsDisabledDialog" width="760px" append-to-body>
      <el-form :inline="true" :model="itemsDisabledQuery">
        <el-form-item label="模板编号">
          <el-input v-model="itemsDisabledQuery.templateCode" placeholder="01-16" clearable @keyup.enter="loadDisabledItems" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="loadDisabledItems">搜索</el-button>
        </el-form-item>
      </el-form>
      <el-table v-loading="itemsDisabledLoading" border :data="disabledItemsList" height="380">
        <el-table-column label="模板编号" align="center" prop="templateCode" width="90" />
        <el-table-column label="科目编码" align="center" prop="itemCode" width="120" />
        <el-table-column label="科目名称" align="center" prop="itemName" />
        <el-table-column label="层级" align="center" prop="itemLevel" width="60" />
        <el-table-column label="操作" align="center" width="100">
          <template #default="scope">
            <el-button link type="primary" icon="RefreshLeft" @click="doRestoreItem(scope.row)">还原</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="disabledItemsTotal > 0" :total="disabledItemsTotal" v-model:page="itemsDisabledQuery.pageNum" v-model:limit="itemsDisabledQuery.pageSize" @pagination="loadDisabledItems" />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="itemsDisabledDialog = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 新增/修改科目弹窗 -->
    <el-dialog :title="itemDialog.title" v-model="itemDialog.visible" width="580px" append-to-body>
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="80px">
        <el-form-item label="预算表编号" prop="templateCode">
          <el-input v-model="itemForm.templateCode" placeholder="如 01" />
        </el-form-item>
        <el-form-item label="科目编码" prop="itemCode">
          <el-input v-model="itemForm.itemCode" placeholder="如 0101" />
        </el-form-item>
        <el-form-item label="科目名称" prop="itemName">
          <el-input v-model="itemForm.itemName" placeholder="科目名称" />
        </el-form-item>
        <el-form-item label="上级科目编码" prop="parentCode">
          <el-input v-model="itemForm.parentCode" placeholder="留空=一级科目" />
        </el-form-item>
        <el-form-item label="层级" prop="itemLevel">
          <el-input-number v-model="itemForm.itemLevel" :min="1" :max="5" />
        </el-form-item>
        <el-form-item label="排序号" prop="itemOrder">
          <el-input-number v-model="itemForm.itemOrder" :min="1" />
        </el-form-item>
        <el-form-item label="是否汇总行" prop="isSummary">
          <el-select v-model="itemForm.isSummary">
            <el-option label="否" :value="0" />
            <el-option label="是" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否可编辑" prop="isEditable">
          <el-select v-model="itemForm.isEditable">
            <el-option label="否" :value="0" />
            <el-option label="是" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用公司">
          <el-select v-model="itemForm.orgScopeArr" multiple clearable filterable collapse-tags collapse-tags-tooltip placeholder="留空=全部公司" style="width: 100%">
            <el-option v-for="c in companyOptions" :key="c.deptId" :label="c.deptName" :value="c.deptId" />
          </el-select>
          <div class="el-form-item__help" style="color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.4;">留空表示适用于全部公司；勾选后仅这些公司可见/填报该科目。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :loading="buttonLoading" type="primary" @click="submitItemForm">确 定</el-button>
        <el-button @click="itemDialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>

    <!-- 从科目库导入弹窗（勾选主数据科目 → 复制挂接到本方案） -->
    <el-dialog title="从科目库导入科目" v-model="masterImportDialog.visible" width="620px" append-to-body>
      <div class="items-search">
        <el-input v-model="masterTreeFilter" placeholder="搜索科目编码/名称" clearable size="small" :prefix-icon="Search" />
      </div>
      <div class="items-tree-wrap master-import-tree" v-loading="masterImportLoading">
        <el-tree
          ref="masterTreeRef"
          :data="masterTreeData"
          node-key="id"
          :props="{ children: 'children', label: 'itemName' }"
          :filter-node-method="filterMasterNode"
          :expand-on-click-node="false"
          show-checkbox
          highlight-current
          class="items-tree-body"
        >
          <template #default="{ data }">
            <span class="items-tree-node">
              <span v-if="data.isTpl" class="items-tree-tpl">{{ data.itemName }}</span>
              <span v-else-if="data.isAll" class="items-tree-tpl">全部科目</span>
              <span v-else>{{ data.subjectCode ? data.subjectCode + ' ' : '' }}{{ data.subjectName }}</span>
            </span>
          </template>
        </el-tree>
      </div>
      <template #footer>
        <el-button :loading="masterImportLoading" type="primary" @click="doMasterImport">导入勾选科目</el-button>
        <el-button @click="masterImportDialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="BudgetPlan">
import { ref, reactive, computed, watch, nextTick, onMounted, getCurrentInstance } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Search, Expand, Fold, Back, EditPen, View, Plus, Edit, Delete, RefreshLeft, InfoFilled, QuestionFilled, Lock, ArrowDown, Document, Top } from '@element-plus/icons-vue';
import { listPlan, getPlan, addPlan, updatePlan, delPlan, changePlanStatus } from '@/api/budget/plan';
import { listTemplateItem, listDisabledTemplateItem, restoreTemplateItem, getTemplateItem, addTemplateItem, updateTemplateItem, delTemplateItem, listTemplateItemCompanies, importFromMaster } from '@/api/budget/templateItem';
import type { TemplateItemVO, BudgetCompany } from '@/api/budget/templateItem/types';
import { querySubjectAll } from '@/api/budget/subject';
import { listBudgetTemplate } from '@/api/budget/template';

const { proxy } = getCurrentInstance() as any;

const defaultStartTime = new Date(2000, 0, 1, 9, 0, 0);
const defaultEndTime = new Date(2000, 0, 1, 18, 0, 0);

const planList = ref<any[]>([]);
const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);
const readonly = ref(false);

// ---- 概览统计（不依赖搜索条件，单独全量统计）----
const planStats = reactive({ total: 0, draft: 0, published: 0, closed: 0 });
const getStats = async () => {
  try {
    const res = await listPlan({ pageNum: 1, pageSize: 9999 });
    const rows = res.rows || [];
    planStats.total = rows.length;
    planStats.draft = rows.filter((r: any) => r.status === 'DRAFT').length;
    planStats.published = rows.filter((r: any) => r.status === 'PUBLISHED').length;
    planStats.closed = rows.filter((r: any) => r.status === 'CLOSED').length;
  } catch {
    /* 统计失败不影响列表 */
  }
};

// ---- 整页表单状态 ----
const viewMode = ref<'list' | 'form'>('list');
const pageTitle = ref('');
const buttonLoading = ref(false);

const basicSectionRef = ref<any>(null);
const step3Locked = computed(() => !form.value.id);
const scrollToBasic = () => {
  basicSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ---- 填报公司（transfer）----
const companyOptions = ref<BudgetCompany[]>([]);
const companyData = ref<any[]>([]);
const fillOrgIds = ref<Array<string | number>>([]);

// ---- 科目明细（勾选树）----
const activeTab = ref<'base' | 'orgs' | 'items'>('base');
const itemsLoading = ref(false);
const itemsQuery = reactive({ planId: 0 });
const itemsTreeData = ref<any[]>([]);
const itemsTreeRef = ref<any>(null);
const itemsTreeFilter = ref('');
const defaultCheckedItems = ref<any[]>([]);
const cascadeOn = ref(true);
const selectedItemsNode = ref<any>(null);
const canAddChild = computed(() => !!selectedItemsNode.value && !selectedItemsNode.value.isAll && !selectedItemsNode.value.isTemplate);
const disabledTotal = computed(() => (disabledItemsTotal.value > 0 ? disabledItemsTotal.value : ''));
const itemDialog = reactive({ visible: false, title: '' });
const itemFormRef = ref<any>(null);
const itemForm = ref<any>({});
const itemRules = {
  templateCode: [{ required: true, message: '预算表编号不能为空', trigger: 'blur' }],
  itemCode: [{ required: true, message: '科目编码不能为空', trigger: 'blur' }],
  itemName: [{ required: true, message: '科目名称不能为空', trigger: 'blur' }]
};
const itemsDisabledDialog = ref(false);
const itemsDisabledLoading = ref(false);
const disabledItemsList = ref<TemplateItemVO[]>([]);
const disabledItemsTotal = ref(0);
const itemsDisabledQuery = reactive({ planId: 0, pageNum: 1, pageSize: 10, templateCode: undefined as string | undefined, params: {} });

// ---- 从科目库导入 ----
const masterImportDialog = reactive({ visible: false });
const masterImportLoading = ref(false);
const masterTreeData = ref<any[]>([]);
const masterTreeRef = ref<any>(null);
const masterTreeFilter = ref('');

const buildMasterTree = (rows: any[], tplNames?: Map<string, string>): any[] => {
  const nodeMap = new Map<string, any>();
  rows.forEach(r => nodeMap.set(String(r.subjectCode), { ...r, children: [] }));
  const sortRec = (nodes: any[]) => {
    nodes.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.subjectCode || a.templateCode || '').localeCompare(String(b.subjectCode || b.templateCode || '')));
    nodes.forEach(n => sortRec(n.children || []));
  };
  const groups = new Map<string, any>();
  rows.forEach(r => {
    const node = nodeMap.get(String(r.subjectCode));
    const parent = r.parentCode && nodeMap.has(String(r.parentCode)) ? nodeMap.get(String(r.parentCode)) : null;
    if (parent) {
      parent.children.push(node);
      return;
    }
    const tpl = String(r.templateCode || 'ALL');
    if (!groups.has(tpl)) {
      const name = tplNames?.get(tpl);
      groups.set(tpl, { id: 'mt-' + tpl, isTpl: true, templateCode: r.templateCode, itemName: tpl === 'ALL' ? '未分配预算表' : (name ? `${tpl} - ${name}` : '预算表 ' + tpl), children: [] });
    }
    groups.get(tpl).children.push(node);
  });
  const list = [...groups.values()].sort((a, b) => a.itemName.localeCompare(b.itemName));
  list.forEach(g => sortRec(g.children as any[]));
  return [{ id: 'm-all', isAll: true, itemName: '全部科目', children: list }];
};

const filterMasterNode = (value: string, data: any) => {
  if (!value) return true;
  if (data.isAll || data.isTpl) return true;
  const hay = [data.subjectCode, data.subjectName, data.templateCode].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(String(value).toLowerCase());
};

watch(masterTreeFilter, v => masterTreeRef.value?.filter(v));

const openMasterImport = async () => {
  if (!form.value.id) return;
  masterImportDialog.visible = true;
  masterImportLoading.value = true;
  masterTreeFilter.value = '';
  try {
    const [subjectRes, tplRes] = await Promise.all([querySubjectAll({ params: {} }), listBudgetTemplate()]);
    const tplNames = new Map<string, string>();
    (tplRes?.data ?? []).forEach((t: any) => t && t.templateCode && tplNames.set(String(t.templateCode), String(t.templateName || '')));
    masterTreeData.value = buildMasterTree((subjectRes as any).data || [], tplNames);
    await nextTick(() => masterTreeRef.value?.setCheckedKeys([]));
  } finally {
    masterImportLoading.value = false;
  }
};

const doMasterImport = async () => {
  if (!form.value.id) return;
  const checked: any[] = (masterTreeRef.value?.getCheckedKeys() || []).concat(masterTreeRef.value?.getHalfCheckedKeys() || []);
  const ids = checked.filter(k => Number.isFinite(Number(k))).map(Number);
  if (!ids.length) {
    proxy.$modal.msgInfo('请先勾选要导入的科目');
    return;
  }
  masterImportLoading.value = true;
  try {
    const res = await importFromMaster({ planId: form.value.id, subjectIds: ids });
    const n = (res as any)?.data ?? ids.length;
    proxy.$modal.msgSuccess(`已导入 ${n} 个科目到本方案`);
    masterImportDialog.visible = false;
    await reloadItems();
  } finally {
    masterImportLoading.value = false;
  }
};

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
  getStats();
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
  const res = await listTemplateItemCompanies();
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

// ================= 页面切换 =================
const openForm = async () => {
  viewMode.value = 'form';
  activeTab.value = 'base';
  await ensureCompanies();
};

const handleAdd = async () => {
  readonly.value = false;
  pageTitle.value = '新增预算方案';
  form.value = { budgetYear: new Date().getFullYear() + 1, status: 'DRAFT' };
  fillOrgIds.value = [];
  defaultCheckedItems.value = [];
  itemsTreeData.value = [];
  selectedItemsNode.value = null;
  await openForm();
  await nextTick(() => proxy.$refs['planRef']?.clearValidate?.());
};

const loadPlanForm = async (row: any) => {
  const res = await getPlan(row.id);
  form.value = res.data;
  fillOrgIds.value = parseOrgScope(form.value.orgScope);
  defaultCheckedItems.value = [];
  itemsTreeData.value = [];
  selectedItemsNode.value = null;
};

const handleUpdate = async (row: any) => {
  readonly.value = false;
  pageTitle.value = '修改预算方案';
  await openForm();
  await loadPlanForm(row);
  if (form.value.id) await reloadItems();
};

const handleView = async (row: any) => {
  readonly.value = true;
  pageTitle.value = '查看预算方案';
  await openForm();
  await loadPlanForm(row);
  if (form.value.id) await reloadItems();
};

const backToList = () => {
  viewMode.value = 'list';
  activeTab.value = 'base';
  readonly.value = false;
  itemsTreeData.value = [];
  itemsTreeFilter.value = '';
  selectedItemsNode.value = null;
  defaultCheckedItems.value = [];
  getList();
};

const submitForm = () => {
  proxy.$refs['planRef'].validate(async (valid: boolean) => {
    if (!valid) return;
    buttonLoading.value = true;
    try {
      const payload = { ...form.value, orgScope: fillOrgIds.value.join(',') };
      if (form.value.id) {
        await updatePlan(payload);
        proxy.$modal.msgSuccess('已保存，正在同步科目选择…');
      } else {
        const res = await addPlan(payload);
        form.value.id = res?.data ?? payload.id;
        proxy.$modal.msgSuccess('新增成功，可继续配置填报公司/科目明细');
      }
      activeTab.value = 'orgs';
      await saveSubjectSelection();
      if (form.value.id) await reloadItems();
      getList();
    } finally {
      buttonLoading.value = false;
    }
  });
};

const handleStatus = (row: any, status: string) => {
  if (status === 'PUBLISHED') {
    const blocker = planList.value.find(p => p.budgetYear === row.budgetYear && p.status === 'PUBLISHED' && p.id !== row.id);
    if (blocker) {
      ElMessageBox.alert(
        `该预算年度 ${row.budgetYear} 已存在执行中的方案「${blocker.planName}」。` +
        `请先将它归档或作废，再发布当前方案「${row.planName}」。`,
        '无法发布',
        { type: 'warning', confirmButtonText: '知道了', closeOnClickModal: true }
      );
      return;
    }
  }
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

// ================= 科目明细 =================
const buildFullTree = (rows: TemplateItemVO[]): any[] => {
  const rootKey = (t: string, c: string) => t + '|' + c;
  const nodeByCode = new Map<string, any>();
  for (const r of rows) {
    nodeByCode.set(rootKey(r.templateCode, r.itemCode), { ...r, children: [] });
  }
  const tplMap = new Map<string, any>();
  for (const r of rows) {
    const node = nodeByCode.get(rootKey(r.templateCode, r.itemCode));
    const parent = r.parentCode ? nodeByCode.get(rootKey(r.templateCode, r.parentCode)) : undefined;
    node._fullPath = parent ? `${parent._fullPath}/${r.itemName}` : r.itemName;
    if (parent) {
      parent.children.push(node);
    } else {
      const tplKey = r.templateCode || '';
      let tpl = tplMap.get(tplKey);
      if (!tpl) {
        tpl = { id: 'tpl-' + tplKey, isTemplate: true, templateCode: tplKey, itemName: r.templateName || tplKey, children: [] };
        tplMap.set(tplKey, tpl);
      }
      tpl.children.push(node);
    }
  }
  const tpls = [...tplMap.values()].sort((a, b) => String(a.templateCode).localeCompare(String(b.templateCode)));
  const sort = (nodes: any[]) => {
    nodes.sort((a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0) || String(a.itemCode || '').localeCompare(String(b.itemCode || '')));
    nodes.forEach(n => n.children?.length && sort(n.children));
  };
  tpls.forEach(t => sort(t.children as any[]));
  return [{ id: 'all', isAll: true, itemName: '全部科目', children: tpls }];
};

const collectSubjectIds = (nodes: any[], acc: any[] = []): any[] => {
  for (const n of nodes) {
    if (n.isAll || n.isTemplate) {
      collectSubjectIds(n.children || [], acc);
    } else {
      acc.push(n.id);
    }
  }
  return acc;
};

const filterItemsNode = (value: string, data: any) => {
  if (!value) return true;
  if (data.isAll) return true;
  const hay = [data.templateCode, data.itemCode, data.itemName].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(String(value).toLowerCase());
};

watch(itemsTreeFilter, v => itemsTreeRef.value?.filter(v));

const onCascadeChange = () => {
  if (!itemsTreeRef.value) return;
  itemsTreeRef.value.setCheckedKeys(collectSubjectIds(itemsTreeData.value));
  expandAllItems();
};

const onItemsNodeClick = (data: any) => {
  selectedItemsNode.value = data.isAll ? null : data;
};

const syncingItems = ref(false);

/** 收集某节点子树下的全部真实科目 id */
const subjectIdsIn = (node: any, acc: any[] = []): any[] => {
  if (!node.isAll && !node.isTemplate) acc.push(node.id);
  (node.children || []).forEach(c => subjectIdsIn(c, acc));
  return acc;
};

const hasCheckedDesc = (node: any, tree: any): boolean => {
  return (node.children || []).some(c => {
    const st = tree.getNode(c.id);
    return st && st.checked;
  });
};

/** 保存时应停用的科目 id 集合（当前未勾选，且按其勾选差异停用） */
const collectUncheckToStop = (nodes: any[], tree: any, out: Set<any> = new Set()): any[] => {
  for (const n of nodes) {
    if (n.isAll || n.isTemplate) {
      collectUncheckToStop(n.children || [], tree, out);
      continue;
    }
    const st = tree?.getNode ? tree.getNode(n.id) : undefined;
    if (!st) {
      collectUncheckToStop(n.children || [], tree, out);
      continue;
    }
    if (!st.checked) {
      if (hasCheckedDesc(n, tree)) {
        // 部分子分支仍勾选（严格模式）：仅停用其下未勾选部分
        collectUncheckToStop(n.children || [], tree, out);
      } else {
        // 整棵子树未勾选：整棵停用
        subjectIdsIn(n).forEach(id => out.add(id));
      }
    } else {
      collectUncheckToStop(n.children || [], tree, out);
    }
  }
  return [...out];
};

/** 保存时按勾选差异停用未勾选科目（与权限树"勾选确定后生效"一致） */
const saveSubjectSelection = async () => {
  if (readonly.value || !form.value.id) return;
  if (!itemsTreeRef.value || !itemsTreeData.value.length) return;
  const toStop = collectUncheckToStop(itemsTreeData.value, itemsTreeRef.value);
  if (!toStop.length) return;
  await proxy.$modal.confirm(`有 ${toStop.length} 个科目未勾选，保存后将停用这些科目，确认继续？`, '科目选择确认');
  syncingItems.value = true;
  try {
    await delTemplateItem(toStop);
  } finally {
    syncingItems.value = false;
  }
};

const expandAllItems = () => itemsTreeData.value.forEach(n => itemsTreeRef.value?.store.setExpanded(n, true));
const collapseAllItems = () => itemsTreeData.value.forEach(n => itemsTreeRef.value?.store.setExpanded(n, false));

/** 全不选 = 停用方案全部科目 */
const itemsUncheckAll = () => {
  proxy.$modal.confirm('确定停用本方案的全部科目？', '全不选确认').then(async () => {
    const ids = collectSubjectIds(itemsTreeData.value);
    syncingItems.value = true;
    try {
      for (const id of ids) {
        await delTemplateItem(id);
      }
      proxy.$modal.msgSuccess('已停用全部科目');
    } finally {
      syncingItems.value = false;
      await reloadItems();
    }
  });
};

/** 全选 = 还原本方案全部已停用科目 */
const itemsCheckAll = async () => {
  const res = await listDisabledTemplateItem({ planId: form.value.id, pageNum: 1, pageSize: 9999 });
  const ids = (res.rows || []).map((r: any) => r.id);
  if (!ids.length) {
    proxy.$modal.msgInfo('暂无已停用科目');
    return;
  }
  syncingItems.value = true;
  try {
    await restoreTemplateItem(ids);
    proxy.$modal.msgSuccess('已还原全部科目');
  } finally {
    syncingItems.value = false;
    await reloadItems();
  }
};

const reloadItems = async () => {
  if (!form.value.id) return;
  itemsLoading.value = true;
  itemsQuery.planId = form.value.id;
  const res = await listTemplateItem({ ...itemsQuery, pageNum: 1, pageSize: 9999 });
  itemsTreeData.value = buildFullTree(res.rows || []);
  const keep = selectedItemsNode.value;
  if (keep && keep.id !== 'all') {
    const again = findAnyNode(itemsTreeData.value, keep.id);
    selectedItemsNode.value = again || null;
  }
  defaultCheckedItems.value = collectSubjectIds(itemsTreeData.value);
  itemsLoading.value = false;
  await nextTick(() => {
    itemsTreeRef.value?.setCheckedKeys(defaultCheckedItems.value);
  });
};

const findAnyNode = (nodes: any[], id: any): any => {
  for (const n of nodes) {
    if (String(n.id) === String(id)) return n;
    const hit = findAnyNode(n.children || [], id);
    if (hit) return hit;
  }
  return undefined;
};

const onTabChange = (name: string | number) => {
  if (name === 'items' && form.value.id) {
    reloadItems();
  }
};

// ---- 子科目编辑（新增/停用/还原复用原逻辑） ----
const handleAddChildItem = () => handleAddChildItemBy(selectedItemsNode.value);
const handleAddChildItemBy = (node: any) => {
  if (!node || node.isAll) return;
  let templateCode: string | undefined;
  let templateName: string | undefined;
  let parentCode: string | undefined;
  let itemLevel = 1;
  if (node.isTemplate) {
    templateCode = node.templateCode;
    templateName = node.itemName;
    parentCode = undefined;
    itemLevel = 1;
  } else {
    templateCode = node.templateCode;
    templateName = node.templateName;
    parentCode = node.itemCode;
    itemLevel = (node.itemLevel ?? 0) + 1;
  }
  itemForm.value = {
    planId: form.value.id,
    templateCode,
    templateName,
    parentCode,
    itemCode: undefined,
    itemName: undefined,
    itemLevel,
    itemOrder: 1,
    isSummary: 0,
    isEditable: 1,
    responsibleDept: undefined,
    formula: undefined
  };
  itemDialog.visible = true;
  itemDialog.title = '新增子科目';
};

const openItemsDisabled = () => {
  itemsDisabledQuery.planId = form.value.id;
  itemsDisabledQuery.pageNum = 1;
  itemsDisabledDialog.value = true;
  loadDisabledItems();
};

const loadDisabledItems = async () => {
  itemsDisabledLoading.value = true;
  const res = await listDisabledTemplateItem(itemsDisabledQuery);
  disabledItemsList.value = res.rows || [];
  disabledItemsTotal.value = res.total || 0;
  itemsDisabledLoading.value = false;
};

const doRestoreItem = async (row: TemplateItemVO) => {
  await proxy.$modal.confirm(`确认还原科目"${row.itemName}"？还原后将重新生效。`);
  await restoreTemplateItem([row.id]);
  proxy.$modal.msgSuccess('还原成功');
  await loadDisabledItems();
  await reloadItems();
};

const handleUpdateItem = async (row: TemplateItemVO) => {
  const res = await getTemplateItem(row.id);
  itemForm.value = { ...res.data, planId: form.value.id };
  itemDialog.visible = true;
  itemDialog.title = '修改科目';
};

const handleStopItem = async (row: TemplateItemVO) => {
  await proxy.$modal.confirm(`是否停用科目"${row.itemName}"？停用后可在"已停用"中还原。`);
  await delTemplateItem(row.id);
  proxy.$modal.msgSuccess('停用成功');
  await reloadItems();
};

const submitItemForm = () => {
  itemFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return;
    itemForm.value.planId = form.value.id;
    buttonLoading.value = true;
    try {
      if (itemForm.value.id) {
        await updateTemplateItem(itemForm.value);
      } else {
        await addTemplateItem(itemForm.value);
      }
      proxy.$modal.msgSuccess('保存成功');
      itemDialog.visible = false;
      await reloadItems();
    } finally {
      buttonLoading.value = false;
    }
  });
};

onMounted(async () => {
  await ensureCompanies();
  getList();
});
</script>

<style lang="scss" scoped>
/* ---------- 概览统计卡片 ---------- */
.plan-stats {
  margin-bottom: 16px;
}
.stat-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
  .stat-lbl {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    opacity: 0.85;
  }
  .stat-val {
    font-size: 22px;
    font-weight: 700;
    margin-top: 4px;
    color: var(--el-text-color-primary);
  }
}
.stat-card.stat-primary {
  background: linear-gradient(135deg, #6c5ce7, #7a6ff0);
  border-color: transparent;
  .stat-lbl {
    color: #fff;
    opacity: 0.85;
  }
  .stat-val {
    color: #fff;
  }
}
.stat-card .stat-val.stat-draft {
  color: var(--el-color-warning);
}
.stat-card .stat-val.stat-ok {
  color: var(--el-color-success);
}
.stat-card .stat-val.stat-off {
  color: var(--el-color-danger);
}

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

.items-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 16px;
  text-align: center;
  background: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
  border-radius: var(--el-border-radius-base);
}

.items-lock-icon {
  color: var(--el-text-color-placeholder);
}

.items-lock-text {
  font-size: 14px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}

.items-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  text-align: center;
  background: var(--el-fill-color-lighter);
  border-radius: var(--el-border-radius-base);
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

/* ---------- 科目明细（勾选树） ---------- */
.items-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.items-toolbar-left,
.items-toolbar-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.items-hint-icon {
  color: var(--el-text-color-placeholder);
  cursor: help;
}

.items-search {
  margin-bottom: 8px;
}

.items-tree-wrap {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  height: calc(100vh - 330px);
  min-height: 380px;
  overflow: auto;
  padding: 8px;
}

.items-tree-body {
  width: 100%;
}

.items-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.items-tree-tpl {
  color: var(--el-text-color-secondary);
}

.items-node-tag {
  font-size: 11px;
  line-height: 1;
}

.items-node-ops {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.items-tree-body :deep(.el-tree-node__content:hover) .items-node-ops {
  opacity: 1;
}
</style>