<template>
  <div class="table-designer">
    <!-- 主体：画布 + 配置面板（无内置工具栏，操作由业务外壳通过 expose 调用） -->
    <div class="td-body">
      <div class="td-canvas-wrap">
        <div ref="containerRef" class="td-canvas"></div>
      </div>
      <div class="td-panel-wrap" v-show="showPanel">
        <CellPropertyPanel
          :meta="activeCellMeta"
          :position="activeCellPosition"
          :available-data-sources="availableDataSourceKeys"
          :readonly="readonly"
          @update:meta="onMetaUpdate"
          @clear="onMetaClear"
        />
      </div>
      <el-button
        class="td-panel-toggle"
        :icon="showPanel ? ArrowRight : ArrowLeft"
        circle
        size="small"
        @click="showPanel = !showPanel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, ref, toRef, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import CellPropertyPanel from './CellPropertyPanel.vue';
import { useTableDesigner } from './useTableDesigner';
import type { CellMeta, TableDesignerProps, TableDesignerExpose } from './types';

const props = withDefaults(defineProps<TableDesignerProps>(), {
  modelValue: undefined,
  readonly: false,
  dataSourceLoader: undefined,
  validators: () => []
});

const emit = defineEmits<{
  (e: 'update:modelValue', data: any): void;
  (e: 'save', data: any): void;
  (e: 'preview', data: any): void;
  (e: 'change', data: any): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const showPanel = ref(true);

const { ready, activeCellMeta, activeCellPosition, init, getJSON, loadJSON, reset, setCellMeta } =
  useTableDesigner(containerRef, { dataSourceLoader: props.dataSourceLoader, readonly: toRef(props, 'readonly') });

const availableDataSourceKeys = computed<string[]>(() => {
  return (props as any).dataSourceKeys ?? [];
});

/* ---------- 对外方法 ---------- */
const expose: TableDesignerExpose = {
  getJSON,
  loadJSON,
  reset,
  refresh: () => {
    // 类型占位：不再主动操作 Univer 画布 DOM
  },
  setPreview: () => {
    console.log('[TableDesigner] setPreview');
  }
};
defineExpose(expose);

/* ---------- 事件处理 ---------- */
// 记录上一次通过 emit('change') 传给父组件的画布快照引用。
// 父组件会把它原样写回 v-model，触发 watch；此时用引用比较判断是否为"自身回写"，
// 是则跳过重载（避免丢失未保存输入），否则（如切换模板）才真正 loadJSON。
const lastEmittedSnapshot = ref<any>(null);

const onMetaUpdate = async (meta: CellMeta) => {
  setCellMeta(meta);
  const snap = await getJSON();
  lastEmittedSnapshot.value = snap;
  emit('change', snap);
};

const onMetaClear = async () => {
  setCellMeta({
    cellRange: '',
    cellType: 'text',
    valueDomainType: 'none',
    readOnly: false,
    dataFormat: '',
    required: false
  });
  const snap = await getJSON();
  lastEmittedSnapshot.value = snap;
  emit('change', snap);
};

/* ---------- 初始化 ---------- */
onMounted(async () => {
  await nextTick();
  init();
  if (props.modelValue) {
    const snapshot = unwrapSnapshot(props.modelValue);
    if (snapshot) loadJSON(snapshot);
  }
});

// keep-alive 回到页面时：如果实例被 deactivated 销毁了，重新初始化
onActivated(async () => {
  if (!ready.value) {
    await nextTick();
    init();
    if (props.modelValue) {
      const snapshot = unwrapSnapshot(props.modelValue);
      if (snapshot) loadJSON(snapshot);
    }
  }
});

/**
 * 业务壳可能把 JSON 包装成 { __templateId, __snapshot } 以确保 watch 触发；
 * 也可能直接传裸 JSON 对象。统一解包。
 */
function unwrapSnapshot(val: any): any {
  if (val && typeof val === 'object' && '__snapshot' in val) {
    return val.__snapshot;
  }
  return val;
}

watch(
  () => props.modelValue,
  (val) => {
    // 引用相同且非 null → 是组件自身 emit 后父组件回写的数据，不重载画布
    if (val != null && val === lastEmittedSnapshot.value) {
      return;
    }
    if (!ready.value) return;
    const snapshot = unwrapSnapshot(val);
    if (snapshot) {
      loadJSON(snapshot);
    } else {
      // 切到无保存数据的模板 → 重置为空白工作簿
      reset();
    }
  }
);
</script>

<style scoped>
.table-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.td-body {
  flex: 1;
  min-height: 0;
  display: flex;
  position: relative;
}
.td-canvas-wrap {
  flex: 1;
  min-width: 0;
  height: 100%;
}
.td-canvas {
  width: 100%;
  height: 100%;
  min-height: 420px;
  background: #fff;
  overflow: hidden;
}
.td-panel-wrap {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid #ebeef5;
  background: #fff;
}
.td-panel-toggle {
  position: absolute;
  top: 12px;
  right: 300px;
  z-index: 5;
  transition: right 0.2s;
}
.td-body:not(:has(.td-panel-wrap[style*='display: none'])) .td-panel-toggle {
  right: 300px;
}
.td-body:has(.td-panel-wrap[style*='display: none']) .td-panel-toggle {
  right: 0;
}
</style>
