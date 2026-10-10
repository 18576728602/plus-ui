<template>
  <div class="app-container template-item-page">
    <!-- ============ 顶部工具栏 ============ -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar-row">
        <div class="filter-section">
          <el-select v-model="queryParams.planId" placeholder="选择预算方案" clearable size="small" style="width:220px" @change="reloadAll">
            <el-option v-for="p in planOptions" :key="p.id" :label="p.planName" :value="p.id">
              <span>{{ p.planName }}</span>
              <el-tag v-if="p.id === 0" size="small" type="info" effect="plain" style="margin-left:6px">系统基础</el-tag>
            </el-option>
          </el-select>
          <el-select v-model="queryParams.templateCode" placeholder="预算表(留空=全部)" clearable size="small" style="width:220px" @change="reloadAll">
            <el-option v-for="t in templateOptions" :key="t.templateCode" :label="`${t.templateCode} - ${t.templateName}`" :value="t.templateCode" />
          </el-select>
          <el-input v-model="keyword" placeholder="编码/名称 搜索" clearable size="small" style="width:180px" @keyup.enter="applyKeyword" @clear="applyKeyword" @change="applyKeyword">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button size="small" type="primary" icon="Refresh" @click="reloadAll">刷新</el-button>
        </div>
        <div class="action-section">
          <el-checkbox v-model="queryParams.showDisabled" size="small" @change="reloadAll">显示已停用</el-checkbox>
          <el-divider direction="vertical" />
          <el-button size="small" type="primary" plain icon="Plus" v-hasPermi="['budget:templateItem:add']" :disabled="!hasActivePlan" @click="handleAddRoot()">新增顶层</el-button>
          <el-button size="small" type="success" plain icon="Upload" v-hasPermi="['budget:templateItem:add']" :disabled="!hasActivePlan" @click="importDialog.visible = true">从主数据导入</el-button>
          <el-button size="small" type="warning" plain icon="Download" v-hasPermi="['budget:templateItem:export']" @click="handleExport">导出</el-button>
          <el-button size="small" type="danger" plain icon="RefreshLeft" v-hasPermi="['budget:templateItem:edit']" :disabled="!hasActivePlan" @click="disabledDialog.visible = true">已停用还原</el-button>
        </div>
      </div>
    </el-card>

    <!-- ============ 主体：左分组 + 右树表 ============ -->
    <el-card shadow="never" v-loading="loading">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">模板科目明细</span>
          <div>
            <el-tag size="small" effect="plain">共 {{ treeGroups.length }} 张预算表</el-tag>
            <el-tag size="small" effect="plain" type="warning" style="margin-left:6px">停用 {{ disabledCount }} 条</el-tag>
          </div>
        </div>
      </template>

      <div v-if="!hasActivePlan" style="padding:40px;text-align:center"><el-empty description="请先选择一个预算方案"><el-button type="primary" @click="queryParams.planId=0;reloadAll()">查看系统基础模板</el-button></el-empty></div>
      <div v-else-if="!treeGroups.length" style="padding:40px;text-align:center"><el-empty description="暂无科目数据"><el-button type="primary" @click="importDialog.visible=true">从主数据导入</el-button> <el-button type="primary" plain @click="handleAddRoot()">手动新增</el-button></el-empty></div>

      <div v-else>
        <el-row :gutter="16">
          <el-col :span="7">
            <div style="font-size:13px;color:#606266;margin-bottom:8px;font-weight:600">预算表清单</div>
            <el-scrollbar height="calc(100vh - 320px)">
              <div>
                <div v-for="g in treeGroups" :key="g.templateCode"
                     :style="{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 6, border: '1px solid ' + (activeGroup === g.templateCode ? '#409EFF' : '#ebeef5'), background: activeGroup === g.templateCode ? '#ecf5ff' : '#fff', display: 'flex', alignItems: 'center', gap: 10 }"
                     @click="activeGroup = g.templateCode"
                     @dblclick="handleAddToGroup(g)">
                  <el-icon :size="18" :color="activeGroup === g.templateCode ? '#409EFF' : '#909399'"><Document /></el-icon>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:13px;color:#303133">{{ g.templateCode }} · {{ g.templateName }}</div>
                    <div style="font-size:11px;color:#909399;margin-top:2px">启用 {{ countActive(g) }} · 停用 {{ countDisabled(g) }}</div>
                  </div>
                  <el-tag size="small" effect="plain" :type="countActive(g) ? 'success' : 'info'">{{ g.nodes.length }}</el-tag>
                </div>
              </div>
            </el-scrollbar>
          </el-col>
          <el-col :span="17">
            <el-table :data="currentGroupNodes" row-key="__rk" :tree-props="{ children: '__children' }" default-expand-all border stripe height="calc(100vh - 320px)" @row-contextmenu="onRowCtx">
              <el-table-column label="编码" width="170">
                <template #default="{ row }">
                  <span :style="{ fontFamily: 'Consolas, Menlo, monospace', color: row.delFlag === '0' ? '#c0c4cc' : '#303133', textDecoration: row.delFlag === '0' ? 'line-through' : 'none' }">{{ row.itemCode }}</span>
                </template>
              </el-table-column>
              <el-table-column label="名称" min-width="200">
                <template #default="{ row }">
                  <span style="color: row.delFlag === '0' ? '#c0c4cc' : '#303133'" @dblclick="!row.__children?.length && inlineRenameStart(row)">{{ row.itemName }}</span>
                  <el-tag v-if="row.isSummary === 1" size="small" type="warning" effect="plain" style="margin-left:4px">汇总</el-tag>
                  <el-tag v-if="row.isEditable === 0 && row.isSummary !== 1" size="small" type="info" effect="plain" style="margin-left:4px">只读</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="层级" width="60" align="center">
                <template #default="{ row }">L{{ row.itemLevel }}</template>
              </el-table-column>
              <el-table-column label="部门" width="110" align="center" prop="responsibleDept" />
              <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.delFlag === '0'" size="small" type="info" effect="light">已停用</el-tag>
                  <el-tag v-else size="small" type="success" effect="light">启用</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" v-hasPermi="['budget:templateItem:add']" @click="handleAddChild(row)">子级</el-button>
                  <el-button link type="primary" size="small" v-hasPermi="['budget:templateItem:edit']" @click="handleEdit(row)">编辑</el-button>
                  <el-button v-if="row.delFlag !== '0'" link type="danger" size="small" v-hasPermi="['budget:templateItem:remove']" @click="handleDisable(row)">停用</el-button>
                  <el-button v-else link type="success" size="small" v-hasPermi="['budget:templateItem:edit']" @click="handleRestoreOne(row)">启用</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- ============ 右键菜单 ============ -->
    <teleport to="body">
      <ul v-show="ctx.visible" :style="{ position: 'fixed', left: ctx.x + 'px', top: ctx.y + 'px', zIndex: 99999, background: '#fff', border: '1px solid #dcdfe6', borderRadius: 6, boxShadow: '0 2px 12px rgba(0,0,0,.1)', padding: '4px 0', listStyle: 'none', margin: 0 }">
        <li style="padding:6px 14px;cursor:pointer;font-size:13px" @click="handleAddChild(ctx.row)"><el-icon style="margin-right:6px;vertical-align:-2px"><Plus /></el-icon>新增子级</li>
        <li style="padding:6px 14px;cursor:pointer;font-size:13px" @click="handleEdit(ctx.row)"><el-icon style="margin-right:6px;vertical-align:-2px"><Edit /></el-icon>编辑</li>
        <li style="padding:6px 14px;cursor:pointer;font-size:13px" @click="inlineRenameStart(ctx.row)"><el-icon style="margin-right:6px;vertical-align:-2px"><EditPen /></el-icon>改名</li>
        <li style="border-top:1px solid #ebeef5;margin:4px 0"></li>
        <li v-if="ctx.row?.delFlag !== '0'" style="padding:6px 14px;cursor:pointer;font-size:13px;color:#f56c6c" @click="handleDisable(ctx.row)"><el-icon style="margin-right:6px;vertical-align:-2px"><CircleClose /></el-icon>停用</li>
        <li v-else style="padding:6px 14px;cursor:pointer;font-size:13px;color:#67c23a" @click="handleRestoreOne(ctx.row)"><el-icon style="margin-right:6px;vertical-align:-2px"><CircleCheck /></el-icon>启用</li>
      </ul>
    </teleport>

    <!-- ============ 新增/编辑 对话框 ============ -->
    <el-dialog :title="dialog.title" v-model="dialog.visible" width="640px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="预算表" prop="templateCode">
              <el-select v-model="form.templateCode" placeholder="选择预算表" :disabled="!!form.id" filterable style="width:100%">
                <el-option v-for="t in templateOptions" :key="t.templateCode" :label="`${t.templateCode} - ${t.templateName}`" :value="t.templateCode" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上级科目">
              <el-select v-model="form.parentCode" placeholder="无(顶层)" clearable filterable style="width:100%">
                <el-option v-for="c in currentTemplateCodes" :key="c.itemCode" :label="`${c.itemCode}  ${c.itemName}`" :value="c.itemCode" :disabled="c.itemCode === form.itemCode" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="科目编码" prop="itemCode">
              <el-input v-model="form.itemCode" :placeholder="form.id ? '修改编码请谨慎' : '自动生成，可调整'" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="层级">
              <el-input-number v-model="form.itemLevel" :min="1" :max="8" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="科目名称" prop="itemName">
              <el-input v-model="form.itemName" placeholder="请输入科目名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序号">
              <el-input-number v-model="form.itemOrder" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="汇总行">
              <el-switch v-model="form.isSummary" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="可编辑">
              <el-switch v-model="form.isEditable" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责部门">
              <el-input v-model="form.responsibleDept" placeholder="如 DEPT_01" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="适用公司">
              <el-input v-model="form.orgScope" placeholder="逗号分隔，空=全部" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="计算公式">
              <el-input v-model="form.formula" placeholder="例如：SUM(children) 或 SUM(0201, 0202)" />
              <div style="font-size:12px;color:#909399;margin-top:4px">支持 SUM(children) 递归子级、SUM(code1, code2) 按编码求和、四则运算</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button :loading="buttonLoading" type="primary" @click="submitForm">保存</el-button>
        <el-button @click="dialog.visible=false">取消</el-button>
      </template>
    </el-dialog>

    <!-- ============ 从主数据导入 ============ -->
    <el-dialog title="从科目主数据导入" v-model="importDialog.visible" width="720px" append-to-body @open="openImportDialog">
      <div v-if="!hasActivePlan" style="padding:20px;text-align:center"><el-empty description="请先选择预算方案" /></div>
      <div v-else>
        <div style="font-size:13px;color:#606266;margin-bottom:10px">目标方案：<el-tag>{{ currentPlanName }}</el-tag> 选中的科目及其祖先链将一并导入，已存在的自动跳过。</div>
        <el-input v-model="importKeyword" placeholder="搜索主数据编码/名称" clearable style="margin-bottom:10px" @keyup.enter="loadMasterData" />
        <el-table :data="masterData" height="360" border ref="masterTable" row-key="id" @selection-change="(s:any[]) => importDialog.selected = s">
          <el-table-column type="selection" width="40" />
          <el-table-column label="编码" prop="subjectCode" width="140" />
          <el-table-column label="名称" prop="subjectName" min-width="160" />
          <el-table-column label="模板" prop="templateCode" width="80" />
          <el-table-column label="层级" prop="level" width="60" align="center" />
        </el-table>
        <div style="margin-top:8px;font-size:12px;color:#909399">已选 {{ importDialog.selected?.length || 0 }} 条</div>
      </div>
      <template #footer>
        <el-button :disabled="!importDialog.selected?.length" type="primary" :loading="importDialog.loading" @click="confirmImport">确认导入</el-button>
        <el-button @click="importDialog.visible=false">取消</el-button>
      </template>
    </el-dialog>

    <!-- ============ 已停用 还原对话框 ============ -->
    <el-dialog title="已停用科目（可还原）" v-model="disabledDialog.visible" width="820px" append-to-body @open="getDisabledList">
      <el-form :inline="true" :model="disabledQuery">
        <el-form-item label="预算表"><el-input v-model="disabledQuery.templateCode" placeholder="01-16" clearable style="width:120px" /></el-form-item>
        <el-form-item label="关键字"><el-input v-model="disabledQuery.itemCode" placeholder="编码/名称" clearable style="width:160px" /></el-form-item>
        <el-form-item><el-button type="primary" icon="Search" @click="getDisabledList">搜索</el-button></el-form-item>
      </el-form>
      <el-table v-loading="disabledLoading" :data="disabledList" height="380" border row-key="id" @selection-change="handleSelDisabled">
        <el-table-column type="selection" width="40" />
        <el-table-column label="预算表" width="140"><template #default="{r}">{{ r.templateCode }} · {{ r.templateName }}</template></el-table-column>
        <el-table-column label="科目编码" prop="itemCode" width="140" />
        <el-table-column label="科目名称" prop="itemName" min-width="160" />
        <el-table-column label="父级" prop="parentCode" width="110" />
        <el-table-column label="操作" width="100"><template #default="{r}"><el-button link type="success" size="small" @click="handleRestoreOne(r)">还原</el-button></template></el-table-column>
      </el-table>
      <pagination v-show="disabledTotal>0" :total="disabledTotal" v-model:page="disabledQuery.pageNum" v-model:limit="disabledQuery.pageSize" @pagination="getDisabledList" />
      <template #footer>
        <el-button :disabled="!disabledSel.length" type="success" :loading="disabledBatchLoading" @click="handleRestoreBatch">批量还原 {{ disabledSel.length }} 条</el-button>
        <el-button @click="disabledDialog.visible=false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, getCurrentInstance, nextTick } from 'vue';
import type { FormInstance } from 'element-plus';
import { listTemplateItem, listDisabledTemplateItem, restoreTemplateItem, addTemplateItem, updateTemplateItem, delTemplateItem, importFromMaster } from '@/api/budget/templateItem';
import { TemplateItemVO, TemplateItemQuery, TemplateItemForm } from '@/api/budget/templateItem/types';
import { listPlan } from '@/api/budget/plan';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';

const { proxy } = getCurrentInstance() as any;

const loading = ref(false);
const buttonLoading = ref(false);
const keyword = ref('');
const planOptions = ref<any[]>([]);
const templateOptions = ref<any[]>([]);
const allRows = ref<TemplateItemVO[]>([]);
const disabledCount = ref(0);
const activeGroup = ref('');
const ctx = reactive({ visible: false, x: 0, y: 0, row: null as any });

const queryParams = reactive<any>({ pageNum: 1, pageSize: 9999, planId: 0, templateCode: undefined, itemCode: undefined, itemName: undefined });
const hasActivePlan = computed(() => queryParams.planId !== undefined && queryParams.planId !== null);
const currentPlanName = computed(() => planOptions.value.find((p: any) => p.id === queryParams.planId)?.planName || '-');

/* ---------- 树形分组 ---------- */
interface GroupNode { __rk: string; __children?: GroupNode[]; [k: string]: any }
const treeGroups = ref<{ templateCode: string; templateName: string; nodes: GroupNode[] }[]>([]);

function buildGroups(rows: TemplateItemVO[]): { templateCode: string; templateName: string; nodes: GroupNode[] }[] {
  const tplMap = new Map<string, GroupNode[]>();
  const nodeByCode = new Map<string, GroupNode>();
  for (const r of rows) {
    const n: GroupNode = { ...r, __rk: String(r.id) };
    nodeByCode.set(r.itemCode, n);
  }
  const groups: Record<string, GroupNode[]> = {};
  for (const r of rows) {
    const n = nodeByCode.get(r.itemCode)!;
    const parent = r.parentCode ? nodeByCode.get(r.parentCode) : null;
    if (parent) {
      if (!parent.__children) parent.__children = [];
      parent.__children.push(n);
    } else {
      const key = r.templateCode || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    }
  }
  for (const key of Object.keys(groups)) {
    const tpl = groups[key];
    const sortTree = (arr: GroupNode[]) => {
      arr.sort((a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0) || String(a.itemCode).localeCompare(String(b.itemCode)));
      arr.forEach(x => x.__children && sortTree(x.__children));
    };
    sortTree(tpl);
  }
  // 构造分组列表
  const result: { templateCode: string; templateName: string; nodes: GroupNode[] }[] = [];
  const tplNames: Record<string, string> = {};
  templateOptions.value.forEach(t => { tplNames[t.templateCode] = t.templateName; });
  Object.keys(groups).sort().forEach(key => {
    result.push({ templateCode: key, templateName: tplNames[key] || rows.find(r => r.templateCode === key)?.templateName || '', nodes: groups[key] });
  });
  return result;
}

function countActive(g: { nodes: GroupNode[] }): number {
  let c = 0;
  const walk = (ns: GroupNode[]) => { for (const n of ns) { if ((n as any).delFlag !== '0') c++; if (n.__children) walk(n.__children); } };
  walk(g.nodes); return c;
}
function countDisabled(g: { nodes: GroupNode[] }): number {
  let c = 0;
  const walk = (ns: GroupNode[]) => { for (const n of ns) { if ((n as any).delFlag === '0') c++; if (n.__children) walk(n.__children); } };
  walk(g.nodes); return c;
}
function hasChildren(row: any): boolean { return !!(row as any).__children?.length; }

const currentGroupNodes = computed<GroupNode[]>(() => {
  if (!activeGroup.value && treeGroups.value.length) activeGroup.value = treeGroups.value[0].templateCode;
  const g = treeGroups.value.find(x => x.templateCode === activeGroup.value);
  if (!g) return [];
  // 关键字前端过滤
  if (!keyword.value) return g.nodes;
  const kw = keyword.value.toLowerCase();
  const filterTree = (ns: GroupNode[]): GroupNode[] => ns.filter(n => {
    const hit = String(n.itemCode).toLowerCase().includes(kw) || String(n.itemName).toLowerCase().includes(kw);
    const kids = n.__children ? filterTree(n.__children) : [];
    if (hit || kids.length) {
      return { ...n, __children: kids.length ? kids : undefined };
    }
    return false;
  });
  return filterTree(g.nodes);
});

const currentTemplateCodes = computed(() => {
  return allRows.value.filter(r => r.templateCode === (form.templateCode || queryParams.templateCode));
});

/* ---------- 数据加载 ---------- */
async function loadPlans() {
  const res: any = await listPlan();
  planOptions.value = [{ id: 0, planName: '基础模板（系统）' }, ...(res.rows || [])];
}
async function loadTemplates() {
  try {
    const res: any = await request({ url: '/budget/template/list', method: 'get', params: { pageNum: 1, pageSize: 999 } });
    templateOptions.value = res.rows || [];
  } catch { templateOptions.value = []; }
}

async function reloadAll() {
  if (!hasActivePlan.value) { treeGroups.value = []; allRows.value = []; return; }
  loading.value = true;
  try {
    const res: any = await listTemplateItem({ ...queryParams, pageNum: 1, pageSize: 9999 });
    const enabled: TemplateItemVO[] = res.rows || [];
    allRows.value = [...enabled];
    if (queryParams.showDisabled) {
      try {
        const dr: any = await listDisabledTemplateItem({ ...queryParams, pageNum: 1, pageSize: 9999 });
        disabledCount.value = dr.total || 0;
        allRows.value = [...enabled, ...(dr.rows || [])];
      } catch { disabledCount.value = 0; }
    } else {
      // 不显示停用模式，单独计数
      try {
        const dr: any = await listDisabledTemplateItem({ ...queryParams, pageNum: 1, pageSize: 1 });
        disabledCount.value = dr.total || 0;
      } catch { disabledCount.value = 0; }
    }
    treeGroups.value = buildGroups(allRows.value);
    if (!activeGroup.value && treeGroups.value.length) activeGroup.value = treeGroups.value[0].templateCode;
    // 若选择的模板无数据，自动切到第一个有数据的
    if (activeGroup.value && !currentGroupNodes.value.length) {
      if (treeGroups.value[0]) activeGroup.value = treeGroups.value[0].templateCode;
    }
  } finally { loading.value = false; }
}

function applyKeyword() { /* computed 里已自动过滤，这里只需触发 */ }

/* ---------- 生命周期 ---------- */
onMounted(async () => {
  await Promise.all([loadPlans(), loadTemplates()]);
  await reloadAll();
  document.addEventListener('click', closeCtx);
});
onBeforeUnmount(() => document.removeEventListener('click', closeCtx));

function onRowCtx(e: MouseEvent, row: any) {
  ctx.row = row; ctx.x = e.clientX; ctx.y = e.clientY; ctx.visible = true;
  e.preventDefault();
}
function closeCtx() { ctx.visible = false; }

/* ---------- 表单 ---------- */
const form = reactive<Partial<TemplateItemForm>>({});
const rules = {
  templateCode: [{ required: true, message: '请选择预算表', trigger: 'change' }],
  itemCode: [{ required: true, message: '请输入科目编码', trigger: 'blur' }],
  itemName: [{ required: true, message: '请输入科目名称', trigger: 'blur' }]
};
const formRef = ref<FormInstance>();
const dialog = reactive({ visible: false, title: '', loading: false });

function genCode(parentCode: string | undefined, siblings: any[]): string {
  const prefix = parentCode ? parentCode + '.' : '';
  const nums = siblings.map(s => {
    const code = String(s.itemCode || '').replace(prefix, '');
    const m = code.match(/^(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }).filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return prefix + String(next).padStart(2, '0');
}

function handleAddRoot() {
  if (!queryParams.templateCode) {
    ElMessage.warning('请先在顶部选择目标预算表');
    return;
  }
  const siblings = allRows.value.filter(r => !r.parentCode && r.templateCode === queryParams.templateCode);
  Object.assign(form, {
    id: undefined, planId: queryParams.planId, templateCode: queryParams.templateCode,
    parentCode: '', itemCode: genCode(undefined, siblings),
    itemName: '', itemLevel: 1, itemOrder: siblings.length + 1,
    isSummary: 0, isEditable: 1, responsibleDept: '', formula: '', orgScope: ''
  });
  dialog.title = '新增顶层科目'; dialog.visible = true;
}

function handleAddChild(row: any) {
  if (!row.templateCode) return;
  const siblings = allRows.value.filter(r => r.parentCode === row.itemCode && r.templateCode === row.templateCode);
  Object.assign(form, {
    id: undefined, planId: row.planId, templateCode: row.templateCode,
    parentCode: row.itemCode, itemCode: genCode(row.itemCode, siblings),
    itemName: '', itemLevel: (row.itemLevel || 1) + 1, itemOrder: siblings.length + 1,
    isSummary: row.isSummary ?? 0, isEditable: row.isEditable ?? 1, responsibleDept: row.responsibleDept, formula: '', orgScope: row.orgScope || ''
  });
  dialog.title = '新增子级'; dialog.visible = true;
}

function handleAddToGroup(g: any) {
  const siblings = allRows.value.filter(r => !r.parentCode && r.templateCode === g.templateCode);
  Object.assign(form, {
    id: undefined, planId: queryParams.planId, templateCode: g.templateCode,
    parentCode: '', itemCode: genCode(undefined, siblings),
    itemName: '', itemLevel: 1, itemOrder: siblings.length + 1,
    isSummary: 0, isEditable: 1, responsibleDept: '', formula: '', orgScope: ''
  });
  dialog.title = `新增【${g.templateCode}】顶层科目`; dialog.visible = true;
}

function handleEdit(row: any) {
  Object.assign(form, { ...row, parentCode: row.parentCode || '' } as any);
  dialog.title = '编辑科目'; dialog.visible = true;
}

async function submitForm() {
  try {
    await formRef.value?.validate();
  } catch { return; }
  buttonLoading.value = true;
  try {
    if (form.id) {
      await updateTemplateItem(form as TemplateItemForm);
      ElMessage.success('更新成功');
    } else {
      await addTemplateItem({ ...form, planId: queryParams.planId } as TemplateItemForm);
      ElMessage.success('新增成功');
    }
    dialog.visible = false;
    await reloadAll();
  } finally { buttonLoading.value = false; }
}

/* ---------- 停用 / 启用 ---------- */
async function handleDisable(row: any) {
  try {
    await ElMessageBox.confirm(`确定停用？停用后该科目及其子级不再参与计算，但数据保留。`, '停用确认', { type: 'warning' });
  } catch { return; }
  try {
    await delTemplateItem(row.id);
    ElMessage.success('已停用');
    await reloadAll();
  } catch (e: any) { ElMessage.error(e?.message || '操作失败'); }
}
async function handleRestoreOne(row: any) {
  try {
    await restoreTemplateItem(row.id);
    ElMessage.success('已启用');
    await reloadAll();
  } catch (e: any) { ElMessage.error(e?.message || '操作失败'); }
}

/* ---------- 改名（双击编辑） ---------- */
async function inlineRenameStart(row: any) {
  try {
    const { value } = await proxy?.$prompt?.('新名称', '改名', { inputValue: row.itemName } as any);
    if (!value || value === row.itemName) return;
    const payload: TemplateItemForm = { ...row, itemName: value };
    await updateTemplateItem(payload);
    ElMessage.success('已改名');
    await reloadAll();
  } catch {}
}

/* ---------- 导出 ---------- */
async function handleExport() {
  try {
    await proxy?.download?.(
      '/budget/templateItem/export',
      { ...queryParams },
      `templateItem_${Date.now()}.xlsx`
    );
  } catch (e: any) { ElMessage.error(e?.message || '导出失败'); }
}

/* ---------- 主数据导入 ---------- */
const importDialog = reactive({ visible: false, selected: [] as any[], loading: false });
const importKeyword = ref('');
const masterData = ref<any[]>([]);

async function openImportDialog() {
  await loadMasterData();
}
async function loadMasterData() {
  try {
    const kw = importKeyword.value || '';
    const res: any = await request({ url: '/budget/subjectMaster/list', method: 'get', params: { pageNum: 1, pageSize: 9999, keyword: kw, delFlag: '1' } });
    masterData.value = res.rows || [];
  } catch { masterData.value = []; }
}
async function confirmImport() {
  if (!importDialog.selected?.length) return;
  importDialog.loading = true;
  try {
    const cnt = await importFromMaster({ planId: queryParams.planId!, subjectIds: importDialog.selected.map((s: any) => s.id) });
    ElMessage.success(`导入完成，本次新增 ${cnt} 条`);
    importDialog.visible = false;
    await reloadAll();
  } catch (e: any) { ElMessage.error(e?.message || '导入失败'); }
  finally { importDialog.loading = false; }
}

/* ---------- 已停用还原对话框 ---------- */
const disabledDialog = reactive({ visible: false });
const disabledLoading = ref(false);
const disabledList = ref<TemplateItemVO[]>([]);
const disabledTotal = ref(0);
const disabledQuery = reactive<TemplateItemQuery>({ pageNum: 1, pageSize: 20, planId: 0, templateCode: undefined, itemCode: undefined, itemName: undefined });
const disabledSel = ref<any[]>([]);
const disabledBatchLoading = ref(false);

async function getDisabledList() {
  if (!queryParams.planId && queryParams.planId !== 0) return;
  disabledLoading.value = true;
  disabledQuery.planId = queryParams.planId;
  try {
    const res: any = await listDisabledTemplateItem(disabledQuery);
    disabledList.value = res.rows || [];
    disabledTotal.value = res.total || 0;
  } finally { disabledLoading.value = false; }
}
function handleSelDisabled(s: any[]) { disabledSel.value = s; }
async function handleRestoreBatch() {
  if (!disabledSel.value.length) return;
  disabledBatchLoading.value = true;
  try {
    const ids = disabledSel.value.map(r => r.id);
    await restoreTemplateItem(ids);
    ElMessage.success(`已批量还原 ${ids.length} 条`);
    await Promise.all([getDisabledList(), reloadAll()]);
  } finally { disabledBatchLoading.value = false; }
}
</script>

<style scoped>
.template-item-page .toolbar-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.template-item-page .filter-section { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.template-item-page .action-section { display: flex; align-items: center; gap: 8px; }
</style>
