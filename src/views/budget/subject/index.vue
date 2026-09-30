<template>
  <div class="app-container">
    <!-- 顶部：类型切换 + 搜索 -->
    <el-card shadow="never">
      <div class="sm-row">
        <el-radio-group v-model="queryParams.subjectType" size="small" @change="getTree">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="SYS">集团共享(SYS)</el-radio-button>
          <el-radio-button value="DEPT">公司私有(DEPT)</el-radio-button>
        </el-radio-group>
        <el-input
          v-model="queryParams.keyword"
          placeholder="科目编码 / 名称"
          clearable
          size="small"
          style="width: 200px; margin-left: 12px"
          @keyup.enter="getTree"
          @clear="getTree"
        />
        <el-select
          v-model="queryParams.categoryCode"
          placeholder="业务分类"
          clearable
          size="small"
          style="width: 150px; margin-left: 12px"
          @change="getTree"
        >
          <el-option v-for="c in categoryOptions" :key="c.code" :label="c.name" :value="c.code" />
        </el-select>
        <el-button size="small" type="primary" icon="Search" @click="getTree">搜索</el-button>
        <div class="sm-tools">
          <el-checkbox v-model="queryParams.showDisabled" size="small" style="margin-left: 12px" @change="getTree">显示已停用</el-checkbox>
          <span class="sm-stats">
            <el-tag size="small" effect="plain">SYS 集团共享 {{ stats.sys }}</el-tag>
            <el-tag size="small" effect="plain" type="warning">DEPT 公司私有 {{ stats.dept }}</el-tag>
          </span>
          <el-button size="small" link icon="Expand" @click="expandAll(true)">展开全部</el-button>
          <el-button size="small" link icon="Fold" @click="expandAll(false)">折叠全部</el-button>
          <el-button size="small" type="primary" plain icon="Plus" v-hasPermi="['budget:subject:add']" @click="handleAdd(null)">新建分类</el-button>
        </div>
      </div>
    </el-card>

    <!-- 主体：左侧科目树 + 右侧详情面板 -->
    <div class="subject-layout">
      <!-- 左侧科目树（可折叠） -->
      <el-card class="tree-panel" shadow="never">
        <template #header>
          <span class="panel-title">科目树</span>
        </template>
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
          >
            <template #default="{ data }">
              <div class="sm-node" :class="{ 'is-off': !data._isCategory && data.validFlag === '0' }">
                <template v-if="data._isCategory">
                  <span class="code-text">{{ data.categoryCode || '—' }}</span>
                  <span class="sm-name">{{ data.categoryName }}</span>
                  <span class="sm-cat-cnt">({{ (data.children || []).length }})</span>
                </template>
                <template v-else>
                  <span class="sm-tag">
                    <el-tag :type="data.subjectType === 'SYS' ? 'primary' : 'warning'" size="small" effect="plain">
                      {{ data.subjectType === 'SYS' ? 'SYS' : 'DEPT' }}
                    </el-tag>
                  </span>
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
                  <span v-if="data.subjectType === 'DEPT' && data.orgId" class="sm-org">({{ deptName(data.orgId) || data.orgId }})</span>
                  <span v-if="data.validFlag === '0'" class="sm-off">已停用</span>
                </template>
              </div>
            </template>
          </el-tree>
          <el-empty
            v-if="!loading && treeData.length === 0"
            :description="queryParams.keyword ? '未找到匹配的科目' : '暂无科目主数据，请先执行 T1 迁移脚本或新增科目'"
          />
        </el-scrollbar>
      </el-card>

      <!-- 右侧科目详情面板 -->
      <el-card class="detail-panel" shadow="never">
        <template #header>
          <span class="panel-title">科目详情</span>
        </template>
        <el-empty v-if="!selectedNode" :image-size="80" description="点击左侧科目查看详情" />
        <template v-else-if="selectedNode._isCategory">
          <div class="detail-head">
            <div class="detail-title">
              <span class="detail-name">{{ selectedNode.categoryCode || '未分类' }} {{ selectedNode.categoryName }}</span>
            </div>
          </div>
          <el-descriptions :column="1" border size="small" class="detail-desc">
            <el-descriptions-item label="分类编码">{{ selectedNode.categoryCode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="分类名称">{{ selectedNode.categoryName }}</el-descriptions-item>
            <el-descriptions-item label="明细科目">{{ (selectedNode.children || []).length }} 个</el-descriptions-item>
          </el-descriptions>
          <div class="sm-tip" style="margin-bottom: 14px">分类为业务归并的虚拟分组，用于收纳并平铺该分类下的明细科目。</div>
          <div class="detail-actions">
            <el-button type="primary" size="small" icon="Plus" v-hasPermi="['budget:subject:add']" @click="handleAdd(selectedNode)"
              >新增明细</el-button
            >
            <el-button
              v-if="selectedNode.categoryCode"
              type="warning"
              size="small"
              icon="Edit"
              v-hasPermi="['budget:subject:add']"
              @click="handleCategoryEdit(selectedNode)"
              >编辑分类</el-button
            >
            <el-button
              v-if="selectedNode.categoryCode"
              type="danger"
              size="small"
              icon="Delete"
              v-hasPermi="['budget:subject:add']"
              @click="handleCategoryDelete(selectedNode)"
              >删除分类</el-button
            >
          </div>
        </template>
        <template v-else>
          <div class="detail-head">
            <div class="detail-title">
              <el-tag :type="selectedNode.subjectType === 'SYS' ? 'primary' : 'warning'" size="small" effect="plain">
                {{ selectedNode.subjectType === 'SYS' ? '集团共享' : '公司私有' }}
              </el-tag>
              <span class="detail-name">{{ selectedNode.subjectCode }} {{ selectedNode.subjectName }}</span>
            </div>
            <el-tag :type="selectedNode.validFlag === '0' ? 'danger' : 'success'" size="small">
              {{ selectedNode.validFlag === '0' ? '已停用' : '有效' }}
            </el-tag>
          </div>
          <div class="detail-cols">
            <div class="detail-col">
              <div class="sm-sec">基本信息</div>
              <el-descriptions :column="1" border size="small" class="detail-desc">
                <el-descriptions-item label="科目编码">{{ selectedNode.subjectCode }}</el-descriptions-item>
                <el-descriptions-item label="科目名称">{{ selectedNode.subjectName }}</el-descriptions-item>
                <el-descriptions-item label="行类型">{{ rowTypeText(selectedNode.rowType) }}</el-descriptions-item>
                <el-descriptions-item label="业务分类">{{ selectedNode.categoryCode || '未分类' }}</el-descriptions-item>
                <el-descriptions-item label="科目层级">{{ selectedNode.level ? selectedNode.level + ' 级' : '-' }}</el-descriptions-item>
                <el-descriptions-item label="父级编码">{{ selectedNode.parentCode || '一级科目' }}</el-descriptions-item>
                <el-descriptions-item v-if="selectedNode.subjectType === 'SYS'" label="适用公司范围">
                  {{ scopeText(selectedNode.orgScope) }}
                </el-descriptions-item>
                <el-descriptions-item v-else label="归属公司">
                  {{ deptName(selectedNode.orgId) || selectedNode.orgId || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="挂接引用">{{ selectedNode.refCount || 0 }} 个方案/预算表</el-descriptions-item>
              </el-descriptions>
            </div>
            <div class="detail-col">
              <div class="sm-sec">数据属性</div>
              <el-descriptions :column="1" border size="small" class="detail-desc">
                <el-descriptions-item label="数据类型">{{ dataTypeText(selectedNode.dataType) }}</el-descriptions-item>
                <el-descriptions-item v-if="selectedNode.dataType !== 'TEXT'" label="计量单位">{{ selectedNode.unit || '-' }}</el-descriptions-item>
                <el-descriptions-item v-if="selectedNode.dataType !== 'TEXT'" label="小数位">
                  {{ decimalPlacesText(selectedNode.dataType, selectedNode.decimalPlaces) }}
                </el-descriptions-item>
                <el-descriptions-item v-if="selectedNode.dataType !== 'TEXT'" label="是否参与汇总">
                  {{
                    selectedNode.participateSummary === true || selectedNode.participateSummary === 1
                      ? '参与'
                      : selectedNode.participateSummary === false || selectedNode.participateSummary === 0
                        ? '不参与'
                        : '-'
                  }}
                </el-descriptions-item>
                <el-descriptions-item label="必填项">
                  {{
                    selectedNode.requiredFlag === true || selectedNode.requiredFlag === 1
                      ? '必填'
                      : selectedNode.requiredFlag === false || selectedNode.requiredFlag === 0
                        ? '选填'
                        : '-'
                  }}
                </el-descriptions-item>
                <el-descriptions-item v-if="selectedNode.dataType !== 'TEXT'" label="计算项">
                  {{
                    selectedNode.isFormula === true || selectedNode.isFormula === 1
                      ? '公式计算'
                      : selectedNode.isFormula === false || selectedNode.isFormula === 0
                        ? '手工填报'
                        : '-'
                  }}
                </el-descriptions-item>
                <el-descriptions-item label="编制说明">
                  <span class="detail-remark">{{ selectedNode.remark || '—' }}</span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
          <div class="detail-actions">
            <el-button type="primary" plain size="small" icon="Plus" v-hasPermi="['budget:subject:add']" @click="handleAdd(selectedNode)"
              >新增下级</el-button
            >
            <el-button type="primary" size="small" icon="Edit" v-hasPermi="['budget:subject:edit']" @click="handleUpdate(selectedNode)"
              >编辑</el-button
            >
            <el-button type="warning" size="small" v-hasPermi="['budget:subject:edit']" @click="handleValid(selectedNode)">
              {{ selectedNode.validFlag === '0' ? '启用' : '停用' }}
            </el-button>
            <el-button type="danger" size="small" icon="Delete" v-hasPermi="['budget:subject:remove']" @click="handleDelete(selectedNode)"
              >删除</el-button
            >
          </div>
        </template>
      </el-card>
    </div>

    <!-- 新增/修改：右侧抽屉 -->
    <el-drawer :model-value="dialog.visible" :title="dialog.title" size="440px" direction="rtl" @update:model-value="(v) => (dialog.visible = v)">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <!-- ===== 基本信息 ===== -->
        <div class="sm-sec">基本信息</div>
        <el-form-item v-if="!isTopAdd" label="科目类型" prop="subjectType">
          <el-radio-group v-model="form.subjectType" :disabled="!!form.id" @change="onTypeChange">
            <el-radio-button value="SYS">集团共享(SYS)</el-radio-button>
            <el-radio-button value="DEPT">公司私有(DEPT)</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="isTopAdd ? '分类编码' : '科目编码'" prop="subjectCode">
          <el-input v-model="form.subjectCode" disabled />
          <div class="sm-tip" v-if="isTopAdd">编码由系统按分类顺序自动生成，不可修改</div>
          <div class="sm-tip" v-else>编码由系统自动生成，切换上级后编码将按新父级重新生成</div>
        </el-form-item>
        <el-form-item label="科目名称" prop="subjectName">
          <el-input
            v-model="form.subjectName"
            :placeholder="isTopAdd ? '请输入分类名称（如 营业收入预算类）' : '请输入科目名称（仅限文字/字母/数字）'"
            @input="onNameInput"
          />
        </el-form-item>
        <el-form-item v-if="!isTopAdd" label="业务分类" prop="categoryCode">
          <el-select
            v-model="form.categoryCode"
            clearable
            filterable
            :disabled="categoryLocked"
            placeholder="选择业务分类（如 01=公司基本信息/02=营业收入）"
            style="width: 100%"
            @change="onCategoryChange"
          >
            <el-option v-for="c in categoryOptions" :key="c.code" :label="`${c.code} ${c.name}`" :value="c.code" />
          </el-select>
          <div class="sm-tip" v-if="categoryLocked && lockedCategoryText">
            归属分类【{{ lockedCategoryText }}】，因新增下级而自动带入并锁定，不可跨分类
          </div>
          <div class="sm-tip" v-else>明细移到对应分类分组下，分类下平铺；新增下级会自动带入并锁定所属分类</div>
        </el-form-item>
        <el-form-item v-if="!isTopAdd" label="父级科目" prop="parentCode">
          <el-select
            v-model="form.parentCode"
            filterable
            clearable
            placeholder="选择上一级（留空=顶层）"
            style="width: 100%"
            @change="onParentChange"
          >
            <el-option v-for="o in parentOptions" :key="o.value || '__top__'" :label="o.label" :value="o.value" />
          </el-select>
          <div class="sm-tip">父级仅展示当前业务分类下的科目；需跨分类切换请先在上方「业务分类」中选择新分类</div>
        </el-form-item>
        <el-form-item v-if="form.subjectType === 'DEPT'" label="归属公司" prop="orgId">
          <el-select v-model="orgIdArr" multiple filterable placeholder="选择一个或多个归属公司" :disabled="!!form.id" style="width: 100%">
            <el-option v-for="d in scopeCompanyOptions" :key="String(d.id)" :label="String(d.label).trim().replace(/^\s+/, '')" :value="d.id" />
          </el-select>
          <div class="sm-tip">可归属一个或多个公司，仅归属公司可见</div>
        </el-form-item>
        <el-form-item v-if="!isTopAdd && form.subjectType === 'SYS'" label="适用公司范围" prop="orgScope">
          <div class="scope-block">
            <el-radio-group v-model="restrictScope" @change="onRestrictChange">
              <el-radio :value="false">全部</el-radio>
              <el-radio :value="true">部分公司可见</el-radio>
            </el-radio-group>
            <template v-if="restrictScope">
              <el-select
                v-model="orgScopeArr"
                multiple
                clearable
                filterable
                placeholder="选择可看见此科目的公司"
                style="width: 100%; margin-top: 6px"
              >
                <el-option v-for="d in scopeCompanyOptions" :key="d.id" :label="d.label" :value="String(d.id)" />
              </el-select>
            </template>
            <div v-if="scopeSummary" class="scope-summary">
              <span class="scope-summary-label">适用公司清单：</span>
              {{ scopeSummary }}
            </div>
            <div class="sm-tip" v-if="restrictScope">仅被勾选的公司在填报时能看到此集团共享科目</div>
          </div>
        </el-form-item>

        <!-- ===== 数据属性（当前仅前端界面，落库字段待补） ===== -->
        <div class="sm-sec sm-sec-pad">数据属性</div>
        <el-form-item v-if="!isTopAdd" label="数据类型" prop="dataType">
          <el-radio-group v-model="form.dataType">
            <el-radio-button value="CURRENCY">货币金额</el-radio-button>
            <el-radio-button value="NUMBER">普通数字</el-radio-button>
            <el-radio-button value="PERCENT">百分比</el-radio-button>
            <el-radio-button value="TEXT">文本</el-radio-button>
          </el-radio-group>
          <div class="sm-tip">数据在填报/展示时的格式：货币金额按千分位、百分比按比率、文本原样展示</div>
        </el-form-item>
        <el-form-item v-if="!isTopAdd && form.dataType !== 'TEXT'" label="计量单位" prop="unit">
          <el-select v-model="form.unit" clearable filterable allow-create placeholder="选择或输入单位" style="width: 100%">
            <el-option v-for="u in unitOptions" :key="u" :label="u" :value="u" />
          </el-select>
          <div class="sm-tip">如 金额类常见「万元」，人数类「人/人次」</div>
        </el-form-item>
        <el-form-item v-if="!isTopAdd && form.dataType !== 'TEXT'" label="小数位" prop="decimalPlaces">
          <div v-if="form.dataType === 'NUMBER'" class="sm-sel">
            <el-input :model-value="'0（整数，人数类禁小数）'" disabled size="small" style="width: 200px" />
          </div>
          <el-input-number
            v-else
            v-model="form.decimalPlaces"
            :min="0"
            :max="6"
            :precision="0"
            controls-position="right"
            size="small"
            style="width: 100%"
          />
          <div class="sm-tip">
            {{
              form.dataType === 'NUMBER'
                ? '普通数字（人数/次数等）固定整数，不允许有小数'
                : form.dataType === 'PERCENT'
                  ? '百分比小数位，如 2 表示 12.34%'
                  : '货币金额小数位，如 2 表示 1234.56'
            }}
          </div>
        </el-form-item>
        <el-form-item v-if="!isTopAdd && form.dataType !== 'TEXT'" label="是否参与汇总" prop="participateSummary">
          <div class="sm-sel">
            <el-checkbox :model-value="form.participateSummary === true" @change="form.participateSummary = true">参与</el-checkbox>
            <el-checkbox :model-value="form.participateSummary === false" @change="form.participateSummary = false">不参与</el-checkbox>
          </div>
          <div class="sm-tip">是否纳入上级汇总行/统计取数；选择「不参与」则该科目数据独立、不计入合计</div>
        </el-form-item>
        <el-form-item v-if="!isTopAdd" label="必填项" prop="requiredFlag">
          <div class="sm-sel">
            <el-checkbox :model-value="form.requiredFlag === true" @change="form.requiredFlag = true">必填</el-checkbox>
            <el-checkbox :model-value="form.requiredFlag === false" @change="form.requiredFlag = false">选填</el-checkbox>
          </div>
          <div class="sm-tip">填报完整性校验：选择「必填」则该科目填报时不允许为空</div>
        </el-form-item>
        <el-form-item v-if="!isTopAdd && form.dataType !== 'TEXT'" label="计算项" prop="isFormula">
          <div class="sm-sel">
            <el-checkbox :model-value="form.isFormula === true" @change="form.isFormula = true">公式计算</el-checkbox>
            <el-checkbox :model-value="form.isFormula === false" @change="form.isFormula = false">手工填报</el-checkbox>
          </div>
          <div class="sm-tip">公式科目：取值由公式引擎计算，填报时只读、自动生成</div>
        </el-form-item>
        <el-form-item label="编制说明" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="填写该科目的编制口径、取数规则等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="dialog.visible = false">取 消</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts" name="SubjectMaster">
import { ref, reactive, computed, onMounted, watch, getCurrentInstance } from 'vue';
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
const deptOptions = ref<any[]>([]);
/** 是否限制适用公司范围（勾选=部分公司可见，不勾=全部公司可见） */
const restrictScope = ref(false);
/** DEPT 私有科目的归属公司多选（可归属一个或多个公司） */
const orgIdArr = ref<(string | number)[]>([]);
const selectedNode = ref<SubjectMasterVO | null>(null);
const currentNodeKey = ref<number | null>(null);
const expandedKeys = ref<number[]>([]);
const stats = reactive({ sys: 0, dept: 0 });

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
  ]
});

const deptName = (id: any) => {
  const d = deptOptions.value.find((x: any) => String(x.id) === String(id));
  return d ? d.deptName : '';
};

/** 行类型徽标文案：HEAD=分组表头 / SUM=汇总 / REF=只读基准；ITEM=默认明细不展示 */
const rowTypeTag = (rt?: string) => (rt === 'HEAD' ? '分组' : rt === 'SUM' ? '汇总' : rt === 'REF' ? '基准' : '');

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

/** 是否「新建顶级分类」（无父级、新增态）：切换弹窗内「科目/分类」术语 */
const isTopAdd = computed(() => !form.value.parentCode && !form.value.id);

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
      const allRes = await listSubjectMasterFlat({});
      const all = allRes.data || [];
      flatList.value = all;
      const active = all.filter((m: SubjectMasterVO) => m.validFlag !== '0');
      stats.sys = active.filter((m: SubjectMasterVO) => m.subjectType === 'SYS').length;
      stats.dept = active.filter((m: SubjectMasterVO) => m.subjectType === 'DEPT').length;
    } catch (e: any) {
      console.error('加载科目统计失败', e);
    }
    // 初次加载：展开全部一级根节点；刷新时保留用户已展开状态，不再强制收起
    if (expandedKeys.value.length === 0) {
      expandedKeys.value = treeData.value.map((m: SubjectMasterVO) => m.id);
    } else {
      // 保留已展开的 key，指向当前仍存在节点
      const valid = new Set(treeData.value.map((m: SubjectMasterVO) => m.id));
      expandedKeys.value = expandedKeys.value.filter((k) => valid.has(k));
    }
    // 清空选中，引导用户从树选择
    selectedNode.value = null;
    currentNodeKey.value = null;
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

const handleNodeClick = (data: SubjectMasterVO) => {
  selectedNode.value = data;
  currentNodeKey.value = data.id;
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

const handleAdd = (parent?: SubjectMasterVO | null) => {
  resetForm();
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
    categoryLocked.value = !!cat;
    if (cat) {
      form.value.categoryCode = cat.code;
      lockedCategoryText.value = `${cat.name}(${cat.code})`;
    } else {
      form.value.categoryCode = parent.categoryCode || undefined;
    }
    const inherited = parent.orgScope ? String(parent.orgScope).split(',').filter(Boolean) : parent.orgId != null ? [String(parent.orgId)] : [];
    orgIdArr.value = inherited.map((s) => (/^\d+$/.test(s) ? Number(s) : s));
    form.value.orgScope = inherited.join(',');
    applyNextCode();
  }
  dialog.visible = true;
  dialog.title = !parent
    ? '新建分类'
    : onCategory
      ? `新增【${parent.categoryName || parent.categoryCode}】分类明细`
      : `新增【${parent.subjectCode}】下级科目`;
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

/** 删除分类（校验分类下无有效明细由后端兜底） */
const handleCategoryDelete = async (data: SubjectMasterVO) => {
  if (!data.categoryCode) return;
  try {
    const res: any = await listBudgetCategory({ categoryCode: data.categoryCode });
    const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const real = (list || []).find((c: any) => c.categoryCode === data.categoryCode);
    if (!real || real.id == null) {
      proxy?.$modal.msgWarning('未找到该分类记录');
      return;
    }
  } catch {
    /* 继续走确认 */
  }
  try {
    await proxy?.$modal.confirm(`确认删除分类「${data.categoryCode} ${data.categoryName}」？分类下若有有效明细科目将无法删除。`);
  } catch {
    return;
  }
  try {
    const res: any = await listBudgetCategory({ categoryCode: data.categoryCode });
    const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const real = (list || []).find((c: any) => c.categoryCode === data.categoryCode);
    if (!real || real.id == null) return;
    await delBudgetCategory(real.id);
    proxy?.$modal.msgSuccess('删除成功');
    await getTree();
  } catch (e: any) {
    proxy?.$modal.msgError(e?.msg || '删除失败');
  }
};

/** 编辑时保存原始编码，用于提交前检测编码变更并提示用户 */
const originalCode = ref<string | undefined>(undefined);

const handleUpdate = async (data: SubjectMasterVO) => {
  const res = await getSubjectMaster(data.id);
  Object.assign(form.value, res.data);
  originalCode.value = res.data.subjectCode;
  if (form.value.subjectType === 'DEPT') {
    // DEPT 归属多公司：回填 orgIdArr（主归属 orgId 合并上 orgScope，二者并集展示）
    const base = form.value.orgId != null ? [String(form.value.orgId)] : [];
    const extra = form.value.orgScope ? String(form.value.orgScope).split(',').filter(Boolean) : [];
    orgIdArr.value = [...new Set([...base, ...extra])].map((s) => (/^\d+$/.test(s) ? Number(s) : s));
    restrictScope.value = false;
  } else {
    orgScopeArr.value = (form.value.orgScope ? String(form.value.orgScope) : '').split(',').filter(Boolean);
    restrictScope.value = orgScopeArr.value.length > 0;
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
    // 新建/编辑分类：写入 budget_category（编码只读、名称必填）
    if (isTopAdd.value) {
      const name = (form.value.subjectName || '').trim();
      if (!name) {
        proxy?.$modal.msgWarning('请输入分类名称');
        return;
      }
      if (!form.value.subjectCode || form.value.subjectCode.includes('?')) {
        proxy?.$modal.msgWarning('请等待分类编码生成后再保存');
        applyCategoryNextCode();
        return;
      }
      buttonLoading.value = true;
      (async () => {
        try {
          if (categoryEditId.value) {
            await updateBudgetCategory({ id: categoryEditId.value, categoryCode: form.value.subjectCode, categoryName: name });
            proxy?.$modal.msgSuccess('修改成功');
          } else {
            await addBudgetCategory({ categoryCode: form.value.subjectCode, categoryName: name, sort: 1 });
            proxy?.$modal.msgSuccess('新增成功');
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
      if (restrictScope.value && orgScopeArr.value.length === 0) {
        proxy?.$modal.msgWarning('已选择"部分公司可见"，请至少勾选一家公司');
        return;
      }
      form.value.orgScope = orgScopeArr.value.length ? orgScopeArr.value.join(',') : undefined;
      form.value.orgId = undefined;
    } else {
      // DEPT 私有科目：可归属一个或多个公司 —— orgScope 存全部归属公司(逗号分隔)，orgId 存第一个为主归属
      if (orgIdArr.value.length === 0) {
        proxy?.$modal.msgWarning('请至少选择一个归属公司');
        return;
      }
      form.value.orgScope = orgIdArr.value.join(',');
      form.value.orgId = Number(orgIdArr.value[0]);
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
  // 守卫：仅已停用的科目允许删除；未停用必须先停用才能删除
  if (!data.validFlag || data.validFlag === '1') {
    proxy?.$modal.msgWarning(`科目「${data.subjectCode} ${data.subjectName}」尚未停用，请先停用后再删除`);
    return;
  }
  proxy?.$modal.confirm(`确认删除科目「${data.subjectCode} ${data.subjectName}」？删除仅作用于主数据字典，不影响已挂接引用。`).then(async () => {
    await delSubjectMaster(data.id);
    proxy?.$modal.msgSuccess('删除成功');
    await getTree();
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
.sm-stats {
  display: inline-flex;
  gap: 6px;
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
  flex: 0 0 46%;
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

.sm-node {
  display: flex;
  align-items: center;
  width: 100%;
  font-size: 13px;
  padding-right: 4px;
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
}
.sm-node .sm-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.sm-node.is-off .sm-name,
.sm-node.is-off .code-text {
  color: #c0c4cc;
  text-decoration: line-through;
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
</style>
