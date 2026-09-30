<template>
  <div class="formula-configurator">
    <!-- 简易模式：可视化选择 -->
    <div v-if="!advancedMode" class="visual-row">
      <el-select v-model="func" class="func-select" @change="emitChange">
        <el-option v-for="f in funcOptions" :key="f.value" :label="f.label" :value="f.value" />
      </el-select>
      <span class="sep">(</span>
      <el-radio-group v-model="rangeType" size="small" class="range-type" @change="onRangeTypeChange">
        <el-radio-button value="children">所有子级</el-radio-button>
        <el-radio-button value="selected">指定科目</el-radio-button>
      </el-radio-group>
      <el-select
        v-if="rangeType === 'selected'"
        v-model="selectedCodes"
        multiple
        filterable
        collapse-tags
        collapse-tags-tooltip
        placeholder="选择科目"
        class="subjects-select"
        @change="emitChange"
      >
        <el-option
          v-for="s in subjectOptions"
          :key="s.code"
          :label="`${s.code} ${s.name}`"
          :value="s.code"
          :disabled="s.code === currentCode"
        />
      </el-select>
      <span class="sep">)</span>
      <span class="field-label">取</span>
      <el-select v-model="valueField" class="field-select">
        <el-option v-for="f in fieldOptions" :key="f.value" :label="f.label" :value="f.value" />
      </el-select>
    </div>

    <!-- 公式文本展示 + 模式切换 -->
    <div class="formula-text-row">
      <span class="formula-text">{{ displayFormula }}</span>
      <el-button link type="primary" size="small" @click="toggleMode">
        {{ advancedMode ? '简易模式' : '高级模式' }}
      </el-button>
    </div>

    <!-- 高级模式：纯文本输入 + 预览 -->
    <div v-if="advancedMode" class="advanced-row">
      <el-input v-model="advancedFormula" placeholder="如: SUM(children) * 1.1">
        <template #append>
          <el-button :loading="previewLoading" @click="onPreview">预览</el-button>
        </template>
      </el-input>
    </div>

    <!-- 简易模式下的预览按钮 -->
    <div v-else class="simple-preview-row">
      <el-button type="primary" plain size="small" :loading="previewLoading" @click="onPreview">
        预览计算结果
      </el-button>
      <span v-if="previewResult !== null" class="preview-result ok">
        结果：<b>{{ previewResult }}</b>
      </span>
      <span v-if="previewError" class="preview-result err">
        {{ previewError }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface FormulaSubjectOption {
  code: string;
  name: string;
}

const props = withDefaults(defineProps<{
  modelValue: string;
  subjectOptions?: FormulaSubjectOption[];
  currentCode?: string;
  previewLoading?: boolean;
  previewResult?: number | string | null;
  previewError?: string;
}>(), {
  subjectOptions: () => [],
  currentCode: '',
  previewLoading: false,
  previewResult: null,
  previewError: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'preview', formula: string, valueField: string): void;
}>();

const funcOptions = [
  { label: '求和', value: 'SUM' },
  { label: '求平均', value: 'AVG' },
  { label: '最大值', value: 'MAX' },
  { label: '最小值', value: 'MIN' },
  { label: '计数', value: 'COUNT' },
];

const fieldOptions = [
  { label: '本期预算', value: 'budgetAmount' },
  { label: '上年实际', value: 'lastActual' },
  { label: '本期执行', value: 'executionAmount' },
];

const advancedMode = ref(false);
const func = ref('SUM');
const rangeType = ref<'children' | 'selected'>('children');
const selectedCodes = ref<string[]>([]);
const valueField = ref('budgetAmount');
const advancedFormula = ref('');

/** 解析已有公式，尝试反推出可视化选项 */
const parseFormula = (formula: string) => {
  if (!formula) {
    func.value = 'SUM';
    rangeType.value = 'children';
    selectedCodes.value = [];
    advancedMode.value = false;
    return;
  }
  const upper = formula.trim().toUpperCase();
  const m = upper.match(/^(SUM|AVG|MAX|MIN|COUNT)\((.+)\)$/);
  if (m) {
    func.value = m[1];
    const args = m[2].trim();
    if (args === 'CHILDREN') {
      rangeType.value = 'children';
      selectedCodes.value = [];
    } else {
      rangeType.value = 'selected';
      selectedCodes.value = args.split(',').map((s) => s.trim()).filter(Boolean);
    }
    advancedMode.value = false;
  } else {
    advancedMode.value = true;
  }
};

/** 可视化模式下的公式 */
const visualFormula = computed(() => {
  if (rangeType.value === 'children') {
    return `${func.value}(children)`;
  }
  return `${func.value}(${selectedCodes.value.join(', ')})`;
});

/** 当前展示的公式文本 */
const displayFormula = computed(() => {
  return advancedMode.value ? advancedFormula.value : visualFormula.value;
});

// 由外部 modelValue 反推可视化状态（放在 visualFormula/parseFormula 声明之后，避免 TDZ）
watch(
  () => props.modelValue,
  (val) => {
    const cur = advancedMode.value ? advancedFormula.value : visualFormula.value;
    if (val === cur) return;
    advancedFormula.value = val || '';
    parseFormula(val || '');
  },
  { immediate: true }
);

const onRangeTypeChange = () => {
  if (rangeType.value === 'selected') {
    selectedCodes.value = [];
  }
  emitChange();
};

const toggleMode = () => {
  if (advancedMode.value) {
    // 切回简易：尝试解析
    parseFormula(advancedFormula.value);
  } else {
    // 切到高级：把可视化的公式同步过去
    advancedFormula.value = visualFormula.value;
  }
  advancedMode.value = !advancedMode.value;
  emitChange();
};

const emitChange = () => {
  const f = advancedMode.value ? advancedFormula.value : visualFormula.value;
  emit('update:modelValue', f);
};

const onPreview = () => {
  const f = advancedMode.value ? advancedFormula.value : visualFormula.value;
  emit('preview', f, valueField.value);
};
</script>

<style scoped>
.formula-configurator {
  width: 100%;
}
.visual-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}
.func-select {
  width: 100px;
}
.sep {
  color: #606266;
  font-weight: 600;
  font-size: 14px;
}
.range-type {
  margin: 0 2px;
}
.subjects-select {
  flex: 1;
  min-width: 180px;
}
.field-label {
  color: #909399;
  font-size: 12px;
  margin-left: 2px;
}
.field-select {
  width: 110px;
}
.formula-text-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding: 6px 10px;
  background: #ecf5ff;
  border-radius: 4px;
  border: 1px dashed #b3d8ff;
}
.formula-text {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #409eff;
  font-weight: 500;
}
.advanced-row {
  margin-top: 8px;
}
.simple-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.preview-result {
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
}
.preview-result.ok {
  color: #67c23a;
}
.preview-result.err {
  color: #f56c6c;
}
</style>
