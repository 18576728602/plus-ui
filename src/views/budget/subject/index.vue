<template>
  <div class="app-container">
    <!-- 主体：左侧科目树 + 右侧详情面板 -->
    <div class="subject-layout">
      <!-- 左侧科目树（可折叠） -->
      <el-card class="tree-panel" shadow="never">
        <template #header>
          <div class="tree-header">
            <span class="panel-title">科目树</span>
            <span class="tree-stats">
              <span class="stat-pill" :class="{ active: queryParams.subjectType === '' }" @click="onFilter('')">全部 {{ stats.total }}</span>
              <span class="stat-pill stat-sys" :class="{ active: queryParams.subjectType === 'SYS' }" @click="onFilter('SYS')">共享科目 {{ stats.sys }}</span>
              <span class="stat-pill stat-dept" :class="{ active: queryParams.subjectType === 'DEPT' }" @click="onFilter('DEPT')">私有科目 {{ stats.dept }}</span>
            </span>
          </div>
        </template>
        <div class="tree-search">
          <el-input
            v-model="queryParams.keyword"
            placeholder="搜索科目编码 / 名称"
            clearable
            size="small"
            class="tree-search-input"
            @keyup.enter="getTree"
            @clear="getTree"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button size="small" type="primary" plain icon="Plus" v-hasPermi="['budget:subject:add']" @click="handleAddCategory">新建分类</el-button>
        </div>
        <el-scrollbar class="tree-scroll">
          <el-tree
            ref="treeRef"
            v-loading="loading"
            :data="treeData"
            :props="{ label: 'subjectName', children: 'children' }"
            node-key="id"
            :expanded-keys="expandedKeys"
            :expand-on-click-node="false"
            @node-expand="(d: any) => onExpand(d.id, true)"
            @node-collapse="(d: any) => onExpand(d.id, false)"
            highlight-current
            :current-node-key="currentNodeKey"
            @node-click="handleNodeClick"
            @node-dblclick="onNodeDblclick"
          >
            <template #default="{ data }">
              <div class="sm-node" :class="{ 'is-off': !data._isCategory && data.validFlag === '0' }">
                <el-icon v-if="data._isCategory || data.rowType === 'HEAD'" class="node-icon icon-cat"><Folder /></el-icon>
                <el-icon v-else-if="data.subjectType === 'SYS'" class="node-icon icon-sys"><Aim /></el-icon>
                <el-icon v-else class="node-icon icon-dept"><Location /></el-icon>
                <template v-if="data._isCategory">
                  <span class="code-text">{{ data.categoryCode || '—' }}</span>
                  <el-input
                    v-if="editingId === data.id"
                    ref="editInputRef"
                    v-model="editName"
                    size="small"
                    class="inline-edit-input"
                    @keyup.enter="saveInlineEdit(data)"
                    @keyup.esc="cancelInlineEdit"
                    @blur="saveInlineEdit(data)"
                  />
                  <span v-else class="sm-name" @dblclick.stop="startInlineEdit(data)">{{ data.categoryName }}</span>
                  <span class="sm-cat-cnt">({{ (data.children || []).length }})</span>
                </template>
                <template v-else-if="data.rowType === 'HEAD'">
                  <span class="code-text">{{ data.subjectCode }}</span>
                  <el-input
                    v-if="editingId === data.id"
                    ref="editInputRef"
                    v-model="editName"
                    size="small"
                    class="inline-edit-input"
                    @keyup.enter="saveInlineEdit(data)"
                    @keyup.esc="cancelInlineEdit"
                    @blur="saveInlineEdit(data)"
                  />
                  <span v-else class="sm-name" @dblclick.stop="startInlineEdit(data)">{{ data.subjectName }}</span>
                </template>
                <template v-else>
                  <span class="code-text">{{ data.subjectCode }}</span>
                  <span class="sm-name">{{ data.subjectName }}</span>
                  <el-tag
                    v-if="rowTypeTag(data.rowType)"
                    class="sm-rt"
                    :type="data.rowType === 'SUM' ? 'success' : data.rowType === 'REF' ? 'warning' : 'info'"
                    size="small"
                    effect="plain"
                    >{{ rowTypeTag(data.rowType) }}</el-tag
                  >
                  <span v-if="data.refCount && data.refCount > 0" class="sm-ref" :title="`已被 ${data.refCount} 个方案/预算表挂接引用`">
                    挂接×{{ data.refCount }}
                  </span>

                  <span v-if="data.validFlag === '0'" class="sm-off">已停用</span>
                </template>
                <el-icon
                  class="sm-del"
                  title="删除"
                  @click.stop="data._isCategory ? handleCategoryDelete(data) : handleDelete(data)"
                ><Delete /></el-icon>
              </div>
            </template>
          </el-tree>
          <el-empty
            v-if="!loading && treeData.length === 0"
            :description="queryParams.keyword ? '未找到匹配的科目' : '暂无科目主数据，请先执行 T1 迁移脚本或新增科目'"
          />
        </el-scrollbar>
      </el-card>

      <!-- 右侧科目明细表格 -->
      <el-card class="detail-panel" shadow="never">
        <template #header>
          <div class="detail-head-right">
            <span class="panel-title">科目明细（{{ detailRows.length }}）</span>
            <el-button
              v-if="selectedNode"
              type="primary"
              size="small"
              icon="Plus"
              v-hasPermi="['budget:subject:add']"
              @click="handleAdd(selectedNode)"
            >新增明细</el-button>
          </div>
        </template>
        <el-empty v-if="!selectedNode" :image-size="80" description="请在左侧选择科目分类或明细" />
        <el-table v-else v-loading="loading" :data="detailRows" border stripe size="small" style="width: 100%">
          <el-table-column prop="subjectCode" label="科目编码" width="120" />
          <el-table-column prop="subjectName" label="科目名称" min-width="160" show-overflow-tooltip />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.validFlag === '0' ? 'danger' : 'success'" size="small">
                {{ row.validFlag === '0' ? '已停用' : '有效' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="行类型" width="90">
            <template #default="{ row }">
              <el-tag
                v-if="rowTypeTag(row.rowType)"
                :type="row.rowType === 'SUM' ? 'success' : row.rowType === 'REF' ? 'warning' : 'info'"
                size="small"
                effect="plain"
              >{{ rowTypeTag(row.rowType) }}</el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="数据类型" width="90">
            <template #default="{ row }">{{ dataTypeText(row.dataType) }}</template>
          </el-table-column>
          <el-table-column label="上级" min-width="150">
            <template #default="{ row }">
              <span :title="parentLabel(row)">{{ parentLabel(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="编制说明" min-width="180" class-name="cell-wrap" />
          <el-table-column label="创建人" width="100">
            <template #default="{ row }">{{ row.createByName || row.createBy }}</template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="160" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button size="small" link type="primary" v-hasPermi="['budget:subject:edit']" @click="handleUpdate(row)">编辑</el-button>
              <el-button size="small" link type="warning" v-hasPermi="['budget:subject:edit']" @click="handleValid(row)">
                {{ row.validFlag === '0' ? '启用' : '停用' }}
              </el-button>
              <el-button size="small" link type="danger" v-hasPermi="['budget:subject:remove']" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 新增/修改：居中弹窗 -->
    <el-dialog
      :model-value="dialog.visible"
      :width="dialogWidth"
      align-center
      destroy-on-close
      :close-on-click-modal="false"
      @update:model-value="(v) => (dialog.visible = v)"
    >
      <template #header>
        <div class="dialog-title-row">
          <span class="dialog-title-text">{{ dialog.title }}</span>
          <el-tooltip
            v-if="isTopAdd"
            content="分类为集团共享，对所有子公司可见；分类下允许子公司新增本公司私有明细。"
            placement="top"
            :show-after="200"
          >
            <el-icon class="cat-q-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <!-- ===== 分类模式：新建/编辑分类 ===== -->
        <template v-if="isTopAdd">
          <el-form-item prop="subjectCode">
            <template #label>
              <span class="req-star">*</span>
              <span>分类编码</span>
            </template>
            <el-input v-model="form.subjectCode" disabled />
            <div class="sm-tip">编码由系统按分类顺序自动生成，不可修改</div>
          </el-form-item>
          <el-form-item label="分类名称" prop="subjectName">
            <el-input v-model="form.subjectName" placeholder="请输入分类名称（如 研发费用预算类）" @input="onNameInput" />
          </el-form-item>
          <el-form-item label="父级分类" prop="parentCode">
            <el-cascader
              v-model="form.parentCode"
              :options="headCascaderOptions"
              :props="{ checkStrictly: true, emitPath: false }"
              clearable
              filterable
              :disabled="catParentLocked"
              placeholder="选择父级分类（留空 = 一级分类）"
              style="width: 100%"
              @change="onParentCategoryChange"
            />
            <div class="sm-tip">选择父级分类后，编码将基于父级自动生成；留空则创建为一级分类</div>
          </el-form-item>
        </template>

        <!-- ===== 明细模式：新增/编辑明细 ===== -->
        <template v-else>
          <div class="type-label">归属类型</div>
          <el-radio-group v-model="form.subjectType" :disabled="!!form.id" @change="onTypeChange" class="type-cards">
            <el-radio-button value="SYS" class="type-card">
              <div class="card-row">
                <el-icon class="cd-sys"><Aim /></el-icon>
                <div class="cd-txt">
                  <div class="cd-title">集团共享</div>
                  <div class="cd-desc">所有子公司可见、可填报；仅集团可新增/修改/停用</div>
                </div>
              </div>
            </el-radio-button>
            <el-radio-button value="DEPT" class="type-card">
              <div class="card-row">
                <el-icon class="cd-dept"><Location /></el-icon>
                <div class="cd-txt">
                  <div class="cd-title">公司私有</div>
                  <div class="cd-desc">仅归属子公司可见、可填报；集团汇总时归入父级科目</div>
                </div>
              </div>
            </el-radio-button>
          </el-radio-group>

          <div class="modal-grid">
            <el-form-item label="归属公司" prop="orgId" class="grid-cell">
              <el-input v-if="form.subjectType === 'SYS'" value="全部" disabled />
              <el-select v-else v-model="form.orgId" filterable clearable placeholder="请选择归属公司" style="width: 100%">
                <el-option v-for="d in scopeCompanyOptions" :key="String(d.id)" :label="String(d.label).trim().replace(/^\s+/, '')" :value="d.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="上级" prop="parentCode" class="grid-cell">
              <el-select
                v-model="form.parentCode"
                filterable
                :clearable="form.subjectType !== 'DEPT'"
                :disabled="categoryLocked"
                :placeholder="form.subjectType === 'DEPT' ? '请选择上级（私有科目必填，可选分类或明细）' : '选择上级（可选分类或明细，留空=顶层）'"
                style="width: 100%"
                @change="onParentChange"
              >
                <el-option v-for="o in parentOptions" :key="o.value || '__top__'" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="科目编码" prop="subjectCode" class="grid-cell">
              <el-input v-model="form.subjectCode" disabled />
            </el-form-item>
            <el-form-item label="科目名称" prop="subjectName" class="grid-cell">
              <el-input v-model="form.subjectName" placeholder="请输入科目名称" @input="onNameInput" />
            </el-form-item>
            <el-form-item label="行类型" prop="rowType" class="grid-cell">
              <el-select v-model="form.rowType" style="width: 100%">
                <el-option value="ITEM" label="明细" />
                <el-option value="SUM" label="汇总" />
                <el-option value="REF" label="基准" />
              </el-select>
            </el-form-item>
            <el-form-item label="数据类型" prop="dataType" class="grid-cell">
              <el-select v-model="form.dataType" style="width: 100%">
                <el-option value="CURRENCY" label="货币金额" />
                <el-option value="NUMBER" label="数值" />
                <el-option value="PERCENT" label="百分比" />
                <el-option value="TEXT" label="文本" />
              </el-select>
            </el-form-item>
            <el-form-item label="编制说明" prop="remark" class="grid-cell-span">
              <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="口径说明、填报要求等" />
            </el-form-item>
          </div>
          <div class="cat-tip rules-tip">
            <b>编码规则：</b>同父级下共享编码与私有编码各自唯一（允许跨归属重码）；层级：最多 4 级；汇总：私有明细自动并入父级的集团合计。
          </div>
        </template>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="dialog.visible = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="SubjectMaster">
import { ref, reactive, computed, onMounted, watch, getCurrentInstance, nextTick } from 'vue';
import {
  listSubjectMasterTree,
  listSubjectMasterFlat,
  getSubjectMaster,
  getSubjectMasterNextCode,
  addSubjectMaster,
  updateSubjectMaster,
  delSubjectMaster,
  changeSubjectMasterValid,
  getSubjectMasterRefCount
} from '@/api/budget/subjectMaster';
import type { SubjectMasterVO, SubjectMasterForm } from '@/api/budget/subjectMaster/types';
import { listBudgetCategory, getBudgetCategoryNextCode, addBudgetCategory, updateBudgetCategory, delBudgetCategory } from '@/api/budget/category';

const { proxy } = getCurrentInstance() as any;

const loading = ref(false);
const treeRef = ref();
const treeData = ref<SubjectMasterVO[]>([]);
/** 行内重命名：当前编辑节点 id */
const editingId = ref<number | null>(null);
const editName = ref('');
const editInputRef = ref();
const deptOptions = ref<any[]>([]);
/** 是否限制适用公司范围（勾选=部分公司可见，不勾=全部公司可见） */
const restrictScope = ref(false);
/** DEPT 私有科目的归属公司多选（可归属一个或多个公司） */
const orgIdArr = ref<(string | number)[]>([]);
const selectedNode = ref<SubjectMasterVO | null>(null);
const currentNodeKey = ref<number | null>(null);
const expandedKeys = ref<number[]>([]);
const stats = reactive({ sys: 0, dept: 0, total: 0 });

const queryParams = reactive<{ subjectType: string; keyword?: string; categoryCode?: string; showDisabled: boolean }>({
  subjectType: '',
  keyword: undefined,
  categoryCode: undefined,
  showDisabled: false
});

/** 业务分类选项：取自 budget_category 分类字典，供顶部筛选下拉 */
const categoryOptions = ref<{ code: string; name: string }[]>([]);

/** 全量有效科目主数据(扁平)：用于构建「父级科目」可选候选项(可作为父级的 HEAD/父级科目) */
const flatList = ref<SubjectMasterVO[]>([]);

const dialog = reactive({ visible: false, title: '' });
/** 分类弹窗灰色说明是否展开 */
const catHint = ref(false);
/** 新建分类时父级是否锁定（选中左侧分类节点后自动带入并锁定） */
const catParentLocked = ref(false);
/** 弹窗模式：category=新建/编辑分类(SubjectMaster HEAD汇总行)，detail=新增/编辑明细 */
const dialogMode = ref<'category' | 'detail'>('detail');
/** 弹窗宽度：分类窄窗(560px)，明细宽窗(760px) */
const dialogWidth = computed(() => (isTopAdd.value ? '560px' : '760px'));
const buttonLoading = ref(false);
const formRef = ref();
const form = ref<SubjectMasterForm>({});
const orgScopeArr = ref<(string | number)[]>([]);
const rules = reactive({
  subjectName: [{ required: true, message: '请输入科目名称', trigger: 'blur' }],
  subjectType: [{ required: true, message: '请选择科目类型', trigger: 'change' }],
  orgId: [
    {
      validator: (_r: any, value: any, cb: any) => {
        if (form.value.subjectType === 'DEPT' && (value === undefined || value === null || value === '')) {
          cb(new Error('公司私有科目必须指定归属公司'));
        } else {
          cb();
        }
      },
      trigger: 'change'
    }
  ],
  parentCode: [
    {
      validator: (_r: any, value: any, cb: any) => {
        if (form.value.subjectType === 'DEPT' && (value === undefined || value === null || value === '')) {
          cb(new Error('公司私有科目必须选择上级分类，以便汇总时并入父级集团合计'));
        } else {
          cb();
        }
      },
      trigger: 'change'
    }
  ]
});

const deptName = (id: any) => {
  const d = deptOptions.value.find((x: any) => String(x.id) === String(id));
  return d ? d.deptName : '';
};

/** 行类型徽标文案：HEAD=分组表头 / SUM=汇总 / REF=只读基准；ITEM=默认明细不展示 */
/** 上级列展示：优先编码+名称（从完整科目树递归查找，含 HEAD 分组），否则仅编码 */
const findParentName = (code?: string): string | undefined => {
  if (!code) return undefined;
  const stack = (treeData.value as SubjectMasterVO[]).slice();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.subjectCode === code && cur.subjectName) {
      return code + ' ' + cur.subjectName;
    }
    (cur.children || []).forEach((c) => stack.push(c));
  }
  return undefined;
};
const parentLabel = (row: any) => (row.parentCode ? findParentName(row.parentCode) || row.parentCode : '—');

const rowTypeTag = (rt?: string) => (rt === 'HEAD' ? '分组' : rt === 'ITEM' ? '明细' : rt === 'SUM' ? '汇总' : rt === 'REF' ? '基准' : '');

/** 行类型完整文案：用于详情面板展示（含默认明细/未知） */
const rowTypeText = (rt?: string) =>
  rt === 'HEAD'
    ? '分组表头（系统推导）'
    : rt === 'SUM'
      ? '汇总（子级自动累加）'
      : rt === 'REF'
        ? '只读基准（上一年实际等）'
        : rt === 'ITEM'
          ? '明细（可填报）'
          : '—';

/** 数据类型文案：用于详情面板展示 */
const dataTypeText = (dt?: string) => (dt === 'NUMBER' ? '普通数字' : dt === 'PERCENT' ? '百分比' : dt === 'TEXT' ? '文本' : '货币金额');

/** 小数位文案：NUMBER(人数类)固定整数，货币/百分比展示配置值 */
const decimalPlacesText = (dt?: string, dp?: number) => {
  if (!dt || dt === 'TEXT') return '-';
  if (dt === 'NUMBER') return '0（整数）';
  return dp == null ? '2（默认）' : `${dp} 位`;
};

/** 计量单位下拉：随数据类型联动展示不同选项 */
const unitOptions = computed(() => {
  switch (form.value.dataType) {
    case 'CURRENCY':
      return ['元', '万元'];
    case 'PERCENT':
      return ['%'];
    case 'NUMBER':
      return ['人', '人次', '天'];
    default:
      return [];
  }
});

/** 切换为文本时清空计量单位；文本不适用小数位，普通数字固定整数(0) */
watch(
  () => form.value.dataType,
  (dt) => {
    if (dt === 'TEXT') {
      form.value.unit = undefined;
      form.value.decimalPlaces = undefined;
    } else if (dt === 'NUMBER') {
      form.value.decimalPlaces = 0;
    } else if (form.value.decimalPlaces == null) {
      form.value.decimalPlaces = 2;
    }
  }
);

/** 全部可选公司：直接取自业务公司接口返回的扁平清单 */
const scopeCompanyOptions = computed(() => {
  return (deptOptions.value || []).map((d: any) => ({ id: d.id, label: d.deptName, isOrg: true }));
});

/** 已选公司清单展示文本 */
const scopeSummary = computed(() => {
  if (!restrictScope.value) return '';
  const opts = scopeCompanyOptions.value;
  const names = orgScopeArr.value.map((id) => opts.find((o) => String(o.id) === String(id))?.label.trim() || deptName(id) || id).filter(Boolean);
  return names.length ? names.join('、') : '';
});

/** 适用范围字符串 -> 公司名文本 */
const scopeText = (orgScope?: string) => {
  if (!orgScope) return '全部公司可见';
  const names = String(orgScope)
    .split(',')
    .filter(Boolean)
    .map((id) => deptName(id) || id);
  return names.length ? names.join('、') : '全部公司可见';
};

/** 名称允许中文字符/字母/数字/常见全角标点及空格，过滤其他特殊字符 */
const onNameInput = (val: string) => {
  form.value.subjectName = val.replace(/[^\u4e00-\u9fa5A-Za-z0-9（）(),，、。；;：:％%．./\-·—\s]/g, '');
};

/** 是否分类模式：新建/编辑分类(SubjectMaster HEAD汇总行) */
const isTopAdd = computed(() => dialogMode.value === 'category');

/** 父级分类级联选项：取 SubjectMaster HEAD 汇总行，按 parentCode 组装为多级树 */
/** 父级分类级联选项：从 treeData 中提取 HEAD 汇总行（保持树层级结构） */
const headCascaderOptions = computed(() => {
  const opts: any[] = [];
  const walk = (nodes: SubjectMasterVO[]): any[] => {
    const result: any[] = [];
    nodes.forEach((n) => {
      if (n.rowType === 'HEAD' && n.validFlag !== '0') {
        const children = (n.children || []).length ? walk(n.children || []) : undefined;
        // 仅保留 HEAD 子节点作为级联选项，明细子节点不纳入父级选择
        const headChildren = children?.filter((c: any) => c !== null) || undefined;
        result.push({ value: n.subjectCode, label: `${n.subjectCode} ${n.subjectName}`, children: headChildren });
      } else {
        // 非 HEAD 节点：继续向下找 HEAD 子节点
        const sub = (n.children || []).length ? walk(n.children || []) : [];
        result.push(...sub);
      }
    });
    return result;
  };
  return walk(treeData.value);
});

/** 切换父级分类时重新生成编码 */
const onParentCategoryChange = () => {
  applyNextCode();
};

/** 「父级科目」可选候选项：顶层 + 当前业务分类 + 当前分类下的所有有效科目
 *  规则：父级必须在同一业务分类内，不能跨分类选父级；
 *  切换分类请通过「业务分类」下拉操作，父级会自动联动到新分类。 */
const parentOptions = computed(() => {
  const opts: { value: string; label: string }[] = [{ value: '', label: '顶层（无父级）' }];
  const selfCat = form.value.categoryCode;
  const selfId = form.value.id;
  // 当前分类作为一个父级选项（分类下平铺模式）
  if (selfCat) {
    const cat = categoryOptions.value.find((c) => c.code === selfCat);
    if (cat) {
      opts.push({ value: cat.code, label: `${cat.code} ${cat.name}（分类）` });
    }
    // 同分类下的所有有效科目（排除自身）
    const catCodes = new Set(categoryOptions.value.map((c) => c.code));
    flatList.value.forEach((m) => {
      if (m.validFlag === '0') return;
      if (selfId != null && m.id === selfId) return;
      if (m.categoryCode !== selfCat) return;
      // 分类编码已在顶部列出，跳过与之编码重复的科目行
      if (catCodes.has(m.subjectCode)) return;
      opts.push({ value: m.subjectCode, label: `${m.subjectCode} ${m.subjectName}` });
    });
  }
  const curParent = form.value.parentCode;
  if (curParent && !opts.some((o) => o.value === curParent)) {
    const findIn = (nodes, code) => {
      let found;
      const stack = nodes || [];
      stack.some((nd) => {
        if (nd.subjectCode === code || nd.categoryCode === code) { found = nd; return true; }
        const sub = findIn(nd.children, code);
        if (sub) { found = sub; return true; }
        return false;
      });
      return found;
    };
    const full = flatList.value.find((m) => m.subjectCode === curParent) || findIn(treeData.value, curParent);
    const name = full ? (full.subjectName || full.categoryName || curParent) : curParent;
    opts.push({ value: curParent, label: full ? `${(full.subjectCode || full.categoryCode)} ${name}` : curParent });
  }
  return opts;
});

/** 选择父级时联动业务分类 + 重新生成编码：
 *  父级=分类则归类该分类；父级=科目则继承其分类；顶层则清空分类。
 *  无论新增/编辑，切换上级后编码都按新父级重新生成（后端保证唯一、不复用停用编号）。 */
const onParentChange = (code: string) => {
  if (!code) {
    form.value.categoryCode = undefined;
    applyNextCode();
    return;
  }
  const cat = categoryOptions.value.find((c) => c.code === code);
  if (cat) {
    form.value.categoryCode = cat.code;
    applyNextCode();
    return;
  }
  const node = flatList.value.find((m) => m.subjectCode === code);
  if (node) form.value.categoryCode = node.categoryCode || undefined;
  applyNextCode();
};

/** 切换业务分类时联动父级科目：
 *  父级必须在同一分类下，切换分类后父级自动重置为新分类（平铺模式），
 *  编码也按新父级重新生成。 */
const onCategoryChange = (catCode: string | undefined) => {
  if (!catCode) {
    form.value.parentCode = undefined;
  } else {
    form.value.parentCode = catCode;
  }
  applyNextCode();
};

/** 新增下级时的业务分类锁定状态：true=自动带入顶级分类且禁用选择 */
const categoryLocked = ref(false);
/** 新增下级时锁定的分类展示文本（如：营业收入预算类(02)） */
const lockedCategoryText = ref('');
/** 分类编辑态：真实分类记录 ID(来自 budget_category)，由 handleCategoryEdit 预填 */
const categoryEditId = ref<number | undefined>(undefined);

/** 解析节点所属的分类分组信息（分类节点返回自身；科目节点返回其 categoryCode 对应的分类） */
const resolveCategory = (node: SubjectMasterVO | null | undefined): { code: string; name: string } | null => {
  if (!node) return null;
  if (node._isCategory) return { code: node.categoryCode || '', name: node.categoryName || '未分类' };
  if (node.categoryCode) {
    const c = categoryOptions.value.find((x) => x.code === node.categoryCode);
    return { code: node.categoryCode, name: c ? c.name : node.categoryCode };
  }
  return null;
};

/** 右侧明细表格数据：选中分类则列该分类下全部明细；选明细则列其所属分类全部明细 */
const detailRows = computed(() => {
  if (!selectedNode.value) return [];
  const node = selectedNode.value;
  // 选中的是明细科目：仅展示自身
  if (node.rowType !== 'HEAD' && !node._isCategory) {
    return [node];
  }
  // 选中的是分类节点：递归收集所有非分类的明细后代
  const result: SubjectMasterVO[] = [];
  const walk = (n: SubjectMasterVO) => {
    if (n.rowType !== 'HEAD' && !n._isCategory) {
      result.push(n);
    }
    (n.children || []).forEach(walk);
  };
  (node.children || []).forEach(walk);
  return result;
});

const getTree = async () => {
  loading.value = true;
  try {
    // 分类字典接口单独容错：失败不阻断科目树，仅分类分组/下拉退化为空
    let cats: { code: string; name: string }[] = [];
    try {
      const catRes: any = await listBudgetCategory();
      const catList = Array.isArray(catRes) ? catRes : Array.isArray(catRes?.data) ? catRes.data : [];
      cats = (catList || [])
        .map((c: any) => ({ code: c.categoryCode, name: c.categoryName }))
        .filter((c: any) => !!c.code)
        .sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)));
    } catch (e: any) {
      console.error('加载业务分类失败', e);
    }
    categoryOptions.value = cats;
    // 科目树 + 统计：单点失败不拖垮整页，仅提示
    treeData.value = await listSubjectMasterTree({ ...queryParams, keepHead: true, groupByCategory: true });
    try {
      // 明细数据源从源头排除 HEAD 分类行(ITEM/SUM/REF 为实际科目明细)
      const allRes = await listSubjectMasterFlat({ rowType: 'ITEM,SUM,REF' });
      const all = allRes.data || [];
      flatList.value = all;
      const active = all.filter((m: SubjectMasterVO) => m.validFlag !== '0');
      stats.sys = active.filter((m: SubjectMasterVO) => m.subjectType === 'SYS').length;
      stats.dept = active.filter((m: SubjectMasterVO) => m.subjectType === 'DEPT').length;
      stats.total = active.length;
    } catch (e: any) {
      console.error('加载科目统计失败', e);
    }
    // 递归收集树中所有节点 ID，用于保留嵌套节点的展开状态
    const collectIds = (arr: SubjectMasterVO[], set: Set<number>) => {
      (arr || []).forEach((m) => {
        if (m.id != null) set.add(m.id);
        if (m.children && m.children.length) collectIds(m.children, set);
      });
    };
    const allIds = new Set<number>();
    collectIds(treeData.value, allIds);
    // 初次加载：展开全部一级根节点；刷新时保留用户已展开状态（含嵌套节点），不再强制收起
    if (expandedKeys.value.length === 0) {
      expandedKeys.value = treeData.value.map((m: SubjectMasterVO) => m.id);
    } else {
      expandedKeys.value = expandedKeys.value.filter((k) => allIds.has(k));
    }
    // 刷新后尝试保持原选中节点：在新树中按 ID 查找并重新选中，避免树折叠/选中丢失
    const prevId = currentNodeKey.value;
    if (prevId != null) {
      const findNode = (arr: SubjectMasterVO[]): SubjectMasterVO | null => {
        for (const m of arr || []) {
          if (m.id === prevId) return m;
          if (m.children && m.children.length) {
            const r = findNode(m.children);
            if (r) return r;
          }
        }
        return null;
      };
      const found = findNode(treeData.value);
      if (found) {
        selectedNode.value = found;
        currentNodeKey.value = prevId;
      } else {
        selectedNode.value = null;
        currentNodeKey.value = null;
      }
    } else {
      selectedNode.value = null;
      currentNodeKey.value = null;
    }
    // el-tree 在 data 替换后会重置内部节点状态，需在 nextTick 强制恢复展开键与选中节点
    await nextTick();
    try {
      if (treeRef.value) {
        const keySet = new Set(expandedKeys.value);
        const allNodes: any[] = treeRef.value.store?._getAllNodes?.() || [];
        allNodes.forEach((nd: any) => {
          if (nd.data && nd.data.id != null && keySet.has(nd.data.id)) {
            nd.expanded = true;
          }
        });
        if (currentNodeKey.value != null) {
          treeRef.value.setCurrentKey(currentNodeKey.value);
        }
      }
    } catch (treeErr) {
      console.warn('恢复树展开/选中状态失败', treeErr);
    }
  } catch (e: any) {
    console.error('科目树加载失败', e);
    proxy?.$modal.msgError(e?.msg || '科目树加载失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

/** 展开/折叠联动：把节点 key 加入或移出 expandedKeys（受控展开状态） */
const onExpand = (id: number, expanded: boolean) => {
  const arr = expandedKeys.value;
  expandedKeys.value = expanded ? Array.from(new Set([...arr, id])) : arr.filter((k) => k !== id);
};

const loadDepts = async () => {
  try {
    const { listTemplateItemCompanies } = await import('@/api/budget/templateItem');
    const deptRes: any = await listTemplateItemCompanies();
    // 后端返回 [{deptId, deptName}]，映射成 deptOptions 的 {id, deptName} 扁平结构
    const rows = Array.isArray(deptRes?.data) ? deptRes.data : [];
    deptOptions.value = rows.map((c: any) => ({ id: c.deptId, deptName: c.deptName }));
  } catch {
    deptOptions.value = [];
  }
};

/** 勾选"仅部分公司可见"切换：取消勾选清空范围=全部可见 */
const onRestrictChange = (val: boolean) => {
  if (!val) {
    orgScopeArr.value = [];
  }
};

const onFilter = (type: string) => {
  queryParams.subjectType = type;
  getTree();
};

const handleNodeClick = (data: SubjectMasterVO) => {
  selectedNode.value = data;
  currentNodeKey.value = data.id;
};

/** 双击分类节点编辑名称：HEAD 汇总行走 SubjectMaster 更新接口；预算分类分组走原分类编辑 */
const onNodeDblclick = async (data: SubjectMasterVO) => {
  // 双击分类节点 → 行内重命名（明细节点不处理）
  if (data.rowType !== 'HEAD' && !data._isCategory) return;
  await startInlineEdit(data);
};

/** 开始行内编辑分类名称 */
const startInlineEdit = async (data: SubjectMasterVO) => {
  editingId.value = data.id;
  editName.value = data._isCategory ? (data.categoryName || '') : (data.subjectName || '');
  await nextTick();
  const input = editInputRef.value;
  if (input) {
    const el = (input as any).input || (input as any).$el?.querySelector('input') || input;
    el?.focus?.();
    el?.select?.();
  }
};

/** 保存行内编辑 */
const saveInlineEdit = async (data: SubjectMasterVO) => {
  if (editingId.value === null) return;
  const name = editName.value.trim();
  const oldName = data._isCategory ? data.categoryName : data.subjectName;
  editingId.value = null;
  if (!name || name === oldName) return;
  try {
    if (data._isCategory) {
      // BudgetCategory 分组：按 categoryCode 定位真实记录后更新
      const res: any = await listBudgetCategory({ categoryCode: data.categoryCode });
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      const real = (list || []).find((c: any) => c.categoryCode === data.categoryCode);
      if (!real) { proxy?.$modal.msgWarning('未找到该分类记录'); return; }
      await updateBudgetCategory({ ...real, categoryName: name });
    } else {
      // SubjectMaster HEAD 汇总行
      await updateSubjectMaster({ id: data.id, subjectName: name, subjectCode: data.subjectCode, rowType: 'HEAD' } as any);
    }
    proxy?.$modal.msgSuccess('分类名称已更新');
    await getTree();
  } catch (e: any) {
    proxy?.$modal.msgError(e?.msg || '保存失败');
  }
};

/** 取消行内编辑 */
const cancelInlineEdit = () => {
  editingId.value = null;
};

// 展开/折叠全部节点
const expandAll = (expand: boolean) => {
  const nodes: any[] = treeRef.value?.store?._getAllNodes?.() || [];
  nodes.forEach((n) => {
    n.expanded = expand;
  });
};

const resetForm = () => {
  form.value = {
    id: undefined,
    subjectCode: undefined,
    subjectName: undefined,
    parentCode: undefined,
    subjectType: 'SYS',
    orgId: undefined,
    orgScope: undefined,
    rowType: 'ITEM',
    categoryCode: undefined,
    dataType: 'CURRENCY',
    unit: undefined,
    decimalPlaces: 2,
    participateSummary: true,
    requiredFlag: false,
    isFormula: false,
    remark: undefined
  };
  categoryEditId.value = undefined;
  originalCode.value = undefined;
  orgScopeArr.value = [];
  orgIdArr.value = [];
  restrictScope.value = false;
  categoryLocked.value = false;
  lockedCategoryText.value = '';
  catHint.value = false;
  catParentLocked.value = false;
  dialogMode.value = 'detail';
  formRef.value?.clearValidate();
};

const applyNextCode = async () => {
  // 先填占位（有父级=父编码+?），避免打开弹框编码框为空
  form.value.subjectCode = form.value.parentCode ? form.value.parentCode + '?' : '';
  try {
    const res: any = await getSubjectMasterNextCode(String(form.value.parentCode ?? ''), form.value.subjectType, form.value.templateCode);
    // 拦截器成功分支返回 res.data；兼容多种形态：
    //  res 为字符串 / res.data 为字符串 / 后端把编码放在 msg(res.msg) 而 data 为 null
    const code = typeof res === 'string' && res ? res : (res?.data ?? res?.msg ?? null);
    if (code) {
      form.value.subjectCode = code; // 后端保证返回未被任何现存科目(含停用)占用的全新编码，绝不复用停用编号
    }
  } catch (e: any) {
    // 后端生成失败：编码框置空标记，避免提交撞上停用编号(如 1700031 已停用却拿它重复新增)
    form.value.subjectCode = '';
    console.error('编码获取失败:', e);
  }
};

const onTypeChange = () => {
  if (!form.value.id) {
    applyNextCode();
  }
};

/** 分类编码自动生成（新建分类弹框打开时） */
const applyCategoryNextCode = async () => {
  form.value.subjectCode = '?';
  try {
    const res: any = await getBudgetCategoryNextCode();
    const code = typeof res === 'string' && res ? res : (res?.data ?? res?.msg ?? null);
    if (code) form.value.subjectCode = code;
  } catch {
    form.value.subjectCode = '';
  }
};

/** 新建分类：创建 SubjectMaster HEAD 汇总行，按 parentCode 实现多级分类 */
const handleAddCategory = () => {
  resetForm();
  dialogMode.value = 'category';
  form.value.rowType = 'HEAD';
  form.value.isSummary = 1;
  form.value.subjectType = 'SYS';
  form.value.validFlag = '1';
  // 选中分类节点则在其下创建子分类，否则创建一级分类
  const sel = selectedNode.value;
  if (sel && (sel.rowType === 'HEAD' || sel._isCategory)) {
    form.value.parentCode = sel.subjectCode;
    form.value.categoryCode = sel.categoryCode;
    catParentLocked.value = true;
  } else {
    form.value.parentCode = undefined;
    catParentLocked.value = false;
  }
  applyNextCode();
  dialog.visible = true;
  dialog.title = form.value.parentCode ? '新增子分类' : '新建分类';
};

const handleAdd = (parent?: SubjectMasterVO | null) => {
  resetForm();
  dialogMode.value = 'detail';
  const onCategory = parent?._isCategory === true;
  if (!parent) {
    // 新建分类：仅需分类编码+分类名称（挂入 budget_category）
    form.value.subjectType = 'SYS';
    applyCategoryNextCode();
  } else if (onCategory) {
    // 分类下新增明细：平铺挂在分类编码下（parentCode=分类code，level=2）
    form.value.parentCode = parent.categoryCode;
    form.value.subjectType = 'SYS';
    form.value.orgId = undefined;
    form.value.categoryCode = parent.categoryCode;
    categoryLocked.value = !!parent.categoryCode;
    lockedCategoryText.value = parent.categoryName;
    applyNextCode();
  } else {
    // 明细下新增下级：继承父级分类、模板、归属
    form.value.parentCode = parent.subjectCode;
    form.value.subjectType = parent.subjectType === 'DEPT' ? 'DEPT' : 'SYS';
    form.value.orgId = parent.orgId;
    form.value.templateId = parent.templateId;
    form.value.templateCode = parent.templateCode || form.value.templateCode;
    const cat = resolveCategory(parent);
    categoryLocked.value = true;
    if (cat) {
      form.value.categoryCode = cat.code;
      lockedCategoryText.value = `${cat.name}(${cat.code})`;
    } else {
      form.value.categoryCode = parent.categoryCode || undefined;
    }
    const inherited = parent.orgScope ? String(parent.orgScope).split(',').filter(Boolean) : parent.orgId != null ? [String(parent.orgId)] : [];
    if (inherited.length) {
      const first = inherited[0];
      form.value.orgId = /^\d+$/.test(first) ? Number(first) : first;
      form.value.orgScope = inherited.join(',');
    }
    applyNextCode();
  }
  dialog.visible = true;
  dialog.title = !parent
    ? '新建分类'
    : onCategory
      ? `新增【${parent.categoryName || parent.categoryCode}】分类明细`
      : `新增【${parent.subjectCode} ${parent.subjectName || ''}】下级科目`;
};

/** 编辑分类（按 categoryCode 定位真实记录预填弹框） */
const handleCategoryEdit = async (data: SubjectMasterVO) => {
  if (!data.categoryCode) return;
  resetForm();
  try {
    const res: any = await listBudgetCategory({ categoryCode: data.categoryCode });
    const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const real = (list || []).find((c: any) => c.categoryCode === data.categoryCode);
    if (!real || real.id == null) {
      proxy?.$modal.msgWarning('未找到该分类记录');
      return;
    }
    categoryEditId.value = real.id;
    form.value.subjectCode = real.categoryCode;
    form.value.subjectName = real.categoryName;
    dialog.visible = true;
    dialog.title = `编辑分类：${data.categoryCode} ${data.categoryName}`;
  } catch {
    proxy?.$modal.msgWarning('读取分类失败');
  }
};

/** 删除分类：图片规则——分组不需要停用，但 flatList 中 categoryCode 匹配且未停用 → 拦截 */
const handleCategoryDelete = async (data: SubjectMasterVO) => {
  if (!data.categoryCode) return;
  const activeSub = flatList.value.filter((m: SubjectMasterVO) => m.categoryCode === data.categoryCode && m.validFlag !== '0');
  if (activeSub.length > 0) {
    proxy?.$modal.msgWarning(`分类「${data.categoryCode}」下尚有 ${activeSub.length} 条未停用明细科目，请先停用后再删除。`);
    return;
  }
  let realId: any = null;
  try {
    const res: any = await listBudgetCategory({ categoryCode: data.categoryCode });
    const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const real = (list || []).find((cc: any) => cc.categoryCode === data.categoryCode);
    if (real && real.id != null) realId = real.id;
  } catch { /* 忽略 */ }
  if (realId == null) { proxy?.$modal.msgWarning('未找到该分类记录'); return; }
  try { await proxy?.$modal.confirm(`确认删除分类「${data.categoryCode} ${data.categoryName}」？`); } catch { return; }
  try {
    await delBudgetCategory(realId);
    proxy?.$modal.msgSuccess('删除成功');
    await getTree();
  } catch (e: any) { proxy?.$modal.msgError(e?.msg || '删除失败'); }
};


/** 编辑时保存原始编码，用于提交前检测编码变更并提示用户 */
const originalCode = ref<string | undefined>(undefined);

const handleUpdate = async (data: SubjectMasterVO) => {
  const res = await getSubjectMaster(data.id);
  Object.assign(form.value, res.data);
  // 数据类型为历史遗留展示属性，后端不再存储；未回显时按默认(货币金额)兜底，避免编辑时为空
  if (!form.value.dataType) form.value.dataType = 'CURRENCY';
  originalCode.value = res.data.subjectCode;
  if (form.value.subjectType === 'DEPT') {
    const base = form.value.orgId != null ? [String(form.value.orgId)] : [];
    const extra = form.value.orgScope ? String(form.value.orgScope).split(',').filter(Boolean) : [];
    const first = [...new Set([...base, ...extra])][0];
    form.value.orgId = first ? (/^\d+$/.test(first) ? Number(first) : first) : undefined;
  } else {
    const scopeList = (form.value.orgScope ? String(form.value.orgScope) : '').split(',').filter(Boolean);
    form.value.orgId = scopeList[0] ? (/^\d+$/.test(scopeList[0]) ? Number(scopeList[0]) : scopeList[0]) : undefined;
  }
  dialog.visible = true;
  dialog.title = `修改科目：${data.subjectCode}`;
};

/** 扁平化树（递归收集子级），用于同名查重 */
const flattenSubjects = (nodes: SubjectMasterVO[]): SubjectMasterVO[] =>
  (nodes || []).reduce<SubjectMasterVO[]>((acc, n) => {
    acc.push(n);
    if (n.children?.length) acc.push(...flattenSubjects(n.children));
    return acc;
  }, []);

/** 校验同一父级下是否已存在同名科目（排除自身）；返回重复项或 null */
const checkDuplicateName = (): SubjectMasterVO | null => {
  const name = (form.value.subjectName || '').trim();
  if (!name || form.value.parentCode === undefined) return null;
  const parentCode = String(form.value.parentCode ?? '');
  return (
    flattenSubjects(treeData.value).find((m) => {
      const sameParent = String(m.parentCode ?? '') === parentCode;
      return m.id !== form.value.id && sameParent && String(m.subjectName ?? '').trim() === name;
    }) ?? null
  );
};

const submitForm = () => {
  formRef.value.validate((valid: boolean) => {
    if (!valid) return;
    // 新建/编辑分类：写入 SubjectMaster（rowType=HEAD 汇总行，parentCode 实现多级分类）
    if (isTopAdd.value) {
      const name = (form.value.subjectName || '').trim();
      if (!name) {
        proxy?.$modal.msgWarning('请输入分类名称');
        return;
      }
      if (!form.value.subjectCode || form.value.subjectCode.includes('?')) {
        proxy?.$modal.msgWarning('请等待分类编码生成后再保存');
        applyNextCode();
        return;
      }
      buttonLoading.value = true;
      (async () => {
        try {
          const payload = {
            ...form.value,
            subjectName: name,
            rowType: 'HEAD',
            isSummary: 1,
            subjectType: 'SYS',
            validFlag: form.value.validFlag || '1'
          };
          if (form.value.id) {
            await updateSubjectMaster(payload);
            proxy?.$modal.msgSuccess('分类修改成功');
          } else {
            await addSubjectMaster(payload);
            proxy?.$modal.msgSuccess('分类新增成功');
          }
          dialog.visible = false;
          await getTree();
        } finally {
          buttonLoading.value = false;
        }
      })();
      return;
    }
    // 同一父级科目下禁止重名的明细科目
    const dup = checkDuplicateName();
    if (dup) {
      proxy?.$modal.msgWarning(`同一父级下已存在科目「${dup.subjectName}」，请勿重复新增`);
      return;
    }
    // 科目编码必须已由后端生成（不复用停用编号）；空或含 ? 占位则阻断并重取
    if (!form.value.id && (!form.value.subjectCode || form.value.subjectCode.includes('?'))) {
      proxy?.$modal.msgWarning('请等待科目编码生成后再保存');
      applyNextCode();
      return;
    }
    if (form.value.subjectType === 'SYS') {
      // 集团共享：指定公司则仅该公司可见，留空则全部公司可见
      form.value.orgScope = form.value.orgId ? String(form.value.orgId) : undefined;
      form.value.orgId = undefined;
    } else {
      // 公司私有：必须指定归属公司
      if (!form.value.orgId) {
        proxy?.$modal.msgWarning('请选择归属公司');
        return;
      }
      form.value.orgScope = String(form.value.orgId);
    }
    buttonLoading.value = true;
    (async () => {
      try {
        if (form.value.id) {
          // 编辑时检测编码是否变更：编码变更会级联更新子级和挂接快照，需用户二次确认
          const codeChanged = originalCode.value && form.value.subjectCode && originalCode.value !== form.value.subjectCode;
          if (codeChanged) {
            // 检查是否有子级科目（编码变更会影响子级 parentCode）
            const hasChildren = flattenSubjects(treeData.value).some((m) => String(m.parentCode ?? '') === String(originalCode.value));
            const childHint = hasChildren
              ? `\n\n⚠ 该科目有下级子科目，编码变更后子科目的父级编码将自动级联更新为「${form.value.subjectCode}」。`
              : '';
            try {
              await proxy?.$modal.confirm(`编码将从「${originalCode.value}」变更为「${form.value.subjectCode}」，确认提交？${childHint}`);
            } catch {
              return;
            }
          }
          await updateSubjectMaster(form.value);
          proxy?.$modal.msgSuccess('修改成功');
        } else {
          await addSubjectMaster(form.value);
          proxy?.$modal.msgSuccess('新增成功');
        }
        dialog.visible = false;
        await getTree();
      } finally {
        buttonLoading.value = false;
      }
    })();
  });
};

const handleValid = async (data: SubjectMasterVO) => {
  const isOff = data.validFlag === '0';
  const target = isOff ? '启用' : '停用';
  const nextFlag: string = isOff ? '1' : '0';

  if (!isOff) {
    // 存在挂接引用时阻断停用，需先解除挂接，与后端拦截口径一致
    try {
      const cnt = ((await getSubjectMasterRefCount(data.id)) as any)?.data ?? 0;
      if (cnt && cnt > 0) {
        proxy?.$modal.msgWarning(`该科目当前被 ${cnt} 个方案/预算表挂接引用，请先解除挂接后再停用。`);
        return;
      }
    } catch {
      /* 提示失败不阻断 */
    }
    try {
      await proxy?.$modal.confirm(`确认停用科目「${data.subjectCode} ${data.subjectName}」？`);
    } catch {
      return;
    }
    try {
      await proxy?.$modal.confirm('二次确认：停用后该科目在填报中不再展示，且不可回滚为草稿，是否继续？');
    } catch {
      return;
    }
  } else {
    try {
      await proxy?.$modal.confirm(`确认启用科目「${data.subjectCode} ${data.subjectName}」？`);
    } catch {
      return;
    }
  }

  await changeSubjectMasterValid(data.id, nextFlag);
  proxy?.$modal.msgSuccess(`${target}成功`);
  // 停用操作后自动开启「显示已停用」，让刚停用的科目带标记立即可见、可随时恢复，避免"停用即消失"的困惑
  if (nextFlag === '0') {
    queryParams.showDisabled = true;
    await getTree();
  } else {
    await getTree();
  }
};

const handleDelete = (data: SubjectMasterVO) => {
  const isCat = data._isCategory || data.rowType === 'HEAD';
  // 分类(HEAD)直接删除；明细科目必须先停用
  if (!isCat && data.validFlag !== '0') {
    proxy?.$modal.msgWarning(`科目「${data.subjectCode} ${data.subjectName}」尚未停用，请先停用后再删除`);
    return;
  }
  const label = isCat ? (data._isCategory ? data.categoryName : data.subjectName) : `${data.subjectCode} ${data.subjectName}`;
  proxy?.$modal.confirm(`确认删除${isCat ? '分类' : '科目'}「${label}」？`).then(async () => {
    await delSubjectMaster(data.id); proxy?.$modal.msgSuccess('删除成功'); await getTree();
  });
};

onMounted(() => {
  getTree();
  loadDepts();
});
</script>

<style scoped>
.sm-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.sm-tools {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.subject-layout {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  height: calc(100vh - 210px);
  min-height: 420px;
}
.tree-panel {
  flex: 0 0 20%;
  display: flex;
  flex-direction: column;
}
.tree-panel :deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  padding: 8px;
}
.tree-scroll {
  height: 100%;
}
.detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.detail-panel :deep(.el-card__body) {
  flex: 1;
  overflow: auto;
}

/* 编制说明列文字换行 */
.detail-panel :deep(.el-table .cell-wrap) {
  white-space: pre-line;
  word-break: break-all;
  line-height: 1.5;
}

.tree-panel :deep(.el-tree-node__content) {
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  height: auto !important;
  line-height: 1.5 !important;
}
.tree-panel :deep(.el-tree-node__label) {
  display: block !important;
  width: 100% !important;
  overflow: hidden !important;
}
.sm-node {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  padding-right: 4px;
  white-space: nowrap;
  flex-wrap: nowrap;
  overflow: hidden;
}
.sm-node .sm-tag {
  display: inline-flex;
  margin-right: 6px;
}
.sm-node .code-text {
  font-family: 'JetBrains Mono', Consolas, monospace;
  color: var(--el-color-primary);
  font-weight: 600;
  margin-right: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.sm-node .sm-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  max-width: 220px;
}
.sm-node .sm-rt {
  margin-left: 6px;
  flex-shrink: 0;
}
.sm-node .sm-cat {
  margin-left: 6px;
  flex-shrink: 0;
}
.sm-node .sm-org {
  margin-left: 6px;
  color: #909399;
  font-size: 12px;
  flex-shrink: 0;
}
.sm-node .sm-ref {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  padding: 0 5px;
  border-radius: 3px;
  cursor: help;
  line-height: 1.5;
  flex-shrink: 0;
}
.sm-node .sm-scope {
  margin-left: 6px;
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 0 4px;
  border-radius: 3px;
  cursor: help;
  flex-shrink: 0;
}
.sm-node .sm-off {
  margin-left: 6px;
  font-size: 12px;
  color: #f56c6c;
  flex-shrink: 0;
}
.sm-node .inline-edit-input {
  width: 160px;
  margin-right: 6px;
  flex-shrink: 0;
}
.sm-node .sm-del {
  margin-left: 8px;
  padding: 2px 4px;
  color: #c0c4cc;
  font-size: 18px;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
  flex-shrink: 0;
}
.sm-node:hover .sm-del {
  opacity: 1;
}
.sm-node .sm-del:hover {
  color: #f56c6c;
}
.sm-node.is-off .sm-name,
.sm-node.is-off .code-text {
  color: #c0c4cc;
  text-decoration: line-through;
}

.detail-head-right {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.detail-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.detail-desc {
  margin-bottom: 16px;
}
.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.detail-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;
}
.detail-col .sm-sec {
  margin-top: 0;
}
.detail-remark {
  white-space: pre-wrap;
  word-break: break-all;
  color: #303133;
}
.sm-tip {
  line-height: 1.4;
  font-size: 12px;
  color: #909399;
}
.sm-sec {
  margin: 2px 0 10px;
  padding: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}
.sm-sec-pad {
  padding-top: 10px;
}
.sm-sel {
  display: inline-flex;
  gap: 22px;
}

.scope-block {
  width: 100%;
}
.scope-summary {
  margin-top: 8px;
  padding: 6px 10px;
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular, #606266);
}
.scope-summary-label {
  color: var(--el-text-color-secondary, #909399);
}
.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.tree-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tree-search {
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tree-search .tree-search-input {
  flex: 1;
  min-width: 0;
}
.tree-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.stat-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
  font-weight: 500;
  cursor: pointer;
  background: #fff;
  color: #606266;
  border: 1px solid #d9d9d9;
  transition: opacity 0.2s, box-shadow 0.2s;
}
.stat-pill:hover {
  opacity: 0.85;
}
.stat-pill.active {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.4);
}
.stat-sys {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}
.stat-dept {
  background: #fffbe6;
  color: #d4b106;
  border: 1px solid #ffe58f;
}
.node-icon {
  flex-shrink: 0;
  margin-right: 6px;
  font-size: 15px;
  line-height: 1;
}
.icon-cat {
  color: #e6a23c;
}
.icon-sys {
  color: #1890ff;
}
.icon-dept {
  color: #52c41a;
}
.type-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.type-cards {
  display: flex;
  gap: 12px;
  width: 100%;
}
.type-cards :deep(.el-radio-button) {
  flex: 1;
  padding: 0;
}
.type-cards :deep(.el-radio-button__inner) {
  width: 100%;
  height: auto;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
  box-shadow: none;
  text-align: left;
  line-height: 1.4;
}
.type-cards :deep(.el-radio-button.is-active .el-radio-button__inner) {
  border-color: #1890ff;
  background: #ecf5ff;
  color: #303133;
}
.card-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.card-row .el-icon {
  font-size: 20px;
}
.cd-sys {
  color: #1890ff;
}
.cd-dept {
  color: #52c41a;
}
.cd-txt {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cd-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.cd-desc {
  font-size: 12px;
  color: #909399;
}
.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 18px;
  margin-top: 14px;
}
.modal-grid .el-form-item {
  margin-bottom: 8px;
}
.modal-grid :deep(.el-input__wrapper) {
  height: 32px;
  line-height: 32px;
  padding: 0 11px;
}
.grid-cell-span {
  grid-column: span 2;
}
.cat-tip {
  margin-top: 6px;
  padding: 10px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}
.cat-tip b {
  color: #303133;
  font-weight: 600;
}
.rules-tip {
  margin-top: 14px;
  margin-left: 100px;
  font-size: 12px;
}
.dialog-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dialog-title-text {
  font-size: 16px;
  font-weight: 600;
}
.cat-q-icon {
  font-size: 16px;
  color: #909399;
  cursor: help;
}
.req-star {
  color: #f56c6c;
  margin-right: 4px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>