<template>
  <div class="bt-shell" v-loading="pageLoading">
    <!-- ============ 文件头：仅保留模板切换与核心操作（预览/保存草稿） ============ -->
    <div class="bt-filebar">
      <div class="bt-fb-left">
        <template v-if="currentTemplate">
          <span class="bt-fb-tpl-name" :title="`（${currentTemplate.budgetYear}年）·${currentTemplate.templateName}·${currentTemplate.templateCode}`">
            （{{ currentTemplate.budgetYear }}年）·{{ currentTemplate.templateName }}·{{ currentTemplate.templateCode }}
          </span>
        </template>
        <span v-else class="bt-fb-tpl-name bt-fb-tpl-empty">未选择模板</span>
      </div>

      <div class="bt-spacer"></div>

      <div class="bt-fb-right">
        <template v-if="currentTemplate">
          <el-button text icon="Grid" :disabled="isLocked || isViewMode" @click="showExtraCols = true">附加列</el-button>
          <el-button text icon="View" :disabled="!currentTemplate" @click="onPreview">预览</el-button>
          <el-button text icon="Check" type="success" :loading="saving" :disabled="isLocked || isViewMode" @click="onSaveDraft">保存草稿</el-button>
        </template>
        <template v-else>
          <el-button type="primary" @click="onCreate">+ 新建模板</el-button>
        </template>
      </div>
    </div>

    <!-- ============ 主体：调用公共表格设计器 ============ -->
    <div class="bt-body">
      <TableDesigner
        ref="designerRef"
        v-model="designData"
        :readonly="isLocked || isViewMode"
        :data-source-loader="dataSourceLoader"
        :data-source-keys="['budget_subject']"
        @change="onDesignerChange"
      />
    </div>

    <!-- ============ 填报预览对话框 ============ -->
    <el-dialog v-model="showPreview" title="填报预览" width="90%" top="5vh" destroy-on-close>
      <div class="bt-preview-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>预览模式：设计态配置的只读单元格不可编辑；动态数据源下拉自动加载数据；仅模拟填报效果，不会保存。</span>
      </div>
      <div class="bt-preview-body">
        <TableDesigner
          ref="previewRef"
          v-model="previewData"
          :readonly="false"
          :data-source-loader="dataSourceLoader"
          :data-source-keys="['budget_subject']"
        />
      </div>
      <template #footer>
        <el-button @click="showPreview = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ============ 附加列配置：增减额/增减率列是否展示 + 表头文案（随模板保存生效） ============ -->
    <el-dialog v-model="showExtraCols" title="附加列配置" width="480px" top="20vh">
      <el-alert
        title="增减额/增减率列为自动计算列（增减额 = 本年预算 − 上年实际；增减率 = 增减额 ÷ 上年实际），填报页面只读展示，不参与填报。开启后点击「保存草稿」生效。"
        type="info"
        :closable="false"
        show-icon
        class="mb-3"
      />
      <div class="bt-extra-row">
        <div class="bt-extra-left">
          <el-switch v-model="extraCols.diffAmount.show" />
          <span class="bt-extra-name">增减额列</span>
        </div>
        <el-input v-model="extraCols.diffAmount.label" placeholder="默认：增减额" :disabled="!extraCols.diffAmount.show" size="small" maxlength="20" style="width: 200px" />
      </div>
      <div class="bt-extra-row">
        <div class="bt-extra-left">
          <el-switch v-model="extraCols.diffRate.show" />
          <span class="bt-extra-name">增减率列</span>
        </div>
        <el-input v-model="extraCols.diffRate.label" placeholder="默认：增减率" :disabled="!extraCols.diffRate.show" size="small" maxlength="20" style="width: 200px" />
      </div>
      <template #footer>
        <el-button @click="showExtraCols = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();
const isViewMode = computed(() => route.query.mode === 'view');
import { ElMessage, ElMessageBox } from 'element-plus';
import { InfoFilled } from '@element-plus/icons-vue';
import TableDesigner from '@/components/TableDesigner/index.vue';
import type { TableDesignerExpose } from '@/components/TableDesigner/types';
import { listBudgetTemplate, getBudgetTemplateById, addBudgetTemplate, updateBudgetTemplate, type BudgetTemplateType } from '@/api/budget/template';
import { listSubjectMasterFlat } from '@/api/budget/subjectMaster';

/* ---------- 模板列表与选择 ---------- */
const pageLoading = ref(false);
const templateList = ref<BudgetTemplateType[]>([]);
const selectedTemplateId = ref<number | undefined>(undefined);
const currentTemplate = ref<BudgetTemplateType | null>(null);


/**
 * 业务规则：模板已发布，且被【已发布预算方案】挂载时，画布全部锁定。
 * 后端通过 publishedPlanCount 字段返回该模板被已发布方案挂载的数量。
 */
const isLocked = computed(() => {
  const t = currentTemplate.value;
  if (!t) return false;
  if (t.status !== '1') return false;
  // 被已发布方案挂载时锁定
  return !!t.locked;
});

/* ---------- 设计器数据 ---------- */
const designerRef = ref<TableDesignerExpose | null>(null);
const previewRef = ref<TableDesignerExpose | null>(null);
const designData = ref<any>(null);
const saving = ref(false);
const showPreview = ref(false);
const previewData = ref<any>(null);

/* ---------- 附加列配置（增减额/增减率）：存 design_json 根级 __td_extra_cols__，画布不消费 ---------- */
const showExtraCols = ref(false);
const extraCols = ref<{ diffAmount: { show: boolean; label: string }; diffRate: { show: boolean; label: string } }>({
  diffAmount: { show: false, label: '增减额' },
  diffRate: { show: false, label: '增减率' }
});

/** 从模板 design_json 读取附加列配置（缺失时回退默认：不展示） */
const readExtraCols = (raw: any) => {
  const def = { diffAmount: { show: false, label: '增减额' }, diffRate: { show: false, label: '增减率' } };
  if (!raw) return def;
  let parsed: any = null;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    parsed = null;
  }
  const ex = parsed?.__td_extra_cols__;
  if (!ex) return def;
  return {
    diffAmount: { show: !!ex.diffAmount?.show, label: ex.diffAmount?.label || '增减额' },
    diffRate: { show: !!ex.diffRate?.show, label: ex.diffRate?.label || '增减率' }
  };
};

/** 将当前附加列配置注入画布快照（保存时调用） */
const injectExtraCols = (snapshot: any) => {
  if (!snapshot) return snapshot;
  snapshot.__td_extra_cols__ = {
    diffAmount: { show: extraCols.value.diffAmount.show, label: extraCols.value.diffAmount.label || '增减额' },
    diffRate: { show: extraCols.value.diffRate.show, label: extraCols.value.diffRate.label || '增减率' }
  };
  return snapshot;
};

/* ---------- 动态数据源注入（业务壳职责） ---------- */
const dataSourceLoader = async (key: string) => {
  if (key === 'budget_subject') {
    const res: any = await listSubjectMasterFlat();
    const list = res?.data ?? res ?? [];
    return list.map((s: any) => ({
      label: s.subjectName,
      value: s.subjectCode,
      extra: { subjectCode: s.subjectCode, subjectName: s.subjectName }
    }));
  }
  return [];
};

/* ---------- 模板操作 ---------- */
const loadTemplateList = async () => {
  pageLoading.value = true;
  try {
    const res: any = await listBudgetTemplate({ pageNum: 1, pageSize: 999 });
    templateList.value = (res?.rows ?? res?.data?.rows ?? res?.data ?? res) || [];
  } finally {
    pageLoading.value = false;
  }
};

const onTemplateChange = async () => {
  if (!selectedTemplateId.value) {
    currentTemplate.value = null;
    designData.value = null;
    return;
  }
  const t = templateList.value.find((x) => x.id === selectedTemplateId.value);
  if (t) {
    currentTemplate.value = { ...t };
    // list 接口不返回 designJson 大字段，需单独调 getBudgetTemplateById 获取完整数据
    let fullData: BudgetTemplateType = { ...t };
    try {
      const res: any = await getBudgetTemplateById(t.id!);
      fullData = res?.data ?? res ?? fullData;
      // 同步到 templateList 里当前项，避免下次切换重复请求
      Object.assign(t, fullData);
    } catch {
      // 接口失败则用列表数据（designJson 可能为空）
    }
    const raw = fullData.designJson;
    let parsed: any = null;
    if (raw) {
      try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        parsed = null;
      }
    }
    currentTemplate.value = { ...fullData };
    designData.value = { __templateId: t.id, __snapshot: parsed };
    // 还原附加列配置（增减额/增减率展示开关与文案）
    extraCols.value = readExtraCols(raw);
  }
};

const onCreate = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入模板名称', '新建预算模板', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputValidator: (v) => !!v?.trim() || '模板名称不能为空'
    });
    const year = new Date().getFullYear();
    const newTpl: BudgetTemplateType = {
      templateName: value.trim(),
      budgetYear: year,
      status: '0',
      category: 'BUSINESS'
    };
    await addBudgetTemplate(newTpl);
    ElMessage.success('模板已创建');
    await loadTemplateList();
    const created = templateList.value.find((t) => t.templateName === value.trim());
    if (created?.id) {
      selectedTemplateId.value = created.id;
      onTemplateChange();
    }
  } catch {
    /* cancel */
  }
};

const onSaveDraft = async () => {
  if (!currentTemplate.value) return;
  saving.value = true;
  try {
    // 保存画布 JSON（先提交编辑态值再取快照，后端字段 design_json 为 String 类型）
    const snapshot = (await designerRef.value?.getJSON()) ?? null;
    // 注入附加列配置（增减额/增减率），随模板设计一同持久化
    injectExtraCols(snapshot);
    // 序列化为字符串提交后端（后端 designJson 是 String 字段）
    currentTemplate.value.designJson = snapshot ? JSON.stringify(snapshot) : null;
    await updateBudgetTemplate(currentTemplate.value);
    ElMessage.success('草稿已保存');
    // 刷新模板列表
    await loadTemplateList();
    // 用刚保存的快照手动更新列表里当前项（保持对象形式供后续切换加载）
    const curId = currentTemplate.value.id;
    if (curId) {
      const item = templateList.value.find((t) => t.id === curId);
      if (item) {
        (item as any).designJson = snapshot;
        currentTemplate.value = { ...item, designJson: snapshot };
      }
    }
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || e));
  } finally {
    saving.value = false;
  }
};






const onPreview = async () => {
  // 获取当前画布数据，传入预览实例
  previewData.value = (await designerRef.value?.getJSON()) ?? null;
  showPreview.value = true;
};

const onDesignerChange = (data: any) => {
  designData.value = data;
};

/* ---------- 生命周期 ---------- */
/** 拦截 Ctrl+S，避免触发浏览器"保存网页"弹框 */
const onKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    e.stopPropagation();
  }
};

onMounted(async () => {
  window.addEventListener('keydown', onKeydown, { capture: true });
  await loadTemplateList();
  if (templateList.value.length) {
    const routeId = route.query.templateId;
    if (routeId) {
      const found = templateList.value.find((x) => String(x.id) === String(routeId));
      if (found) {
        selectedTemplateId.value = found.id;
        onTemplateChange();
        return;
      }
    }
    selectedTemplateId.value = templateList.value[0].id;
    onTemplateChange();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, { capture: true });
});
</script>

<style scoped>
.bt-shell {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 84px);
  background: #f5f7fa;
}

.bt-filebar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e5e6eb;
  flex-shrink: 0;
  z-index: 10;
}
.bt-fb-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: nowrap;
  overflow: hidden;
}
.bt-fb-brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-right: 12px;
  margin-right: 4px;
  border-right: 1px solid #e5e6eb;
  color: #303133;
}
.bt-fb-logo {
  font-size: 18px;
  color: #409eff;
}
.bt-fb-brand-text {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}
.bt-fb-tpl-name {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  white-space: nowrap;
  overflow: visible;
}
.bt-fb-tpl-empty {
  color: #909399;
  font-weight: 400;
}
.bt-fb-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.bt-fb-right :deep(.el-button) {
  padding: 6px 10px;
  font-size: 13px;
}
.bt-spacer {
  flex: 1;
}

.bt-body {
  flex: 1;
  min-height: 0;
  padding: 0;
}

.bt-preview-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  font-size: 13px;
  color: #409eff;
}
.bt-preview-body {
  height: 70vh;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}
.bt-extra-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px dashed #ebeef5;
}
.bt-extra-row:last-child {
  border-bottom: none;
}
.bt-extra-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bt-extra-name {
  font-size: 14px;
  color: #303133;
}
</style>
