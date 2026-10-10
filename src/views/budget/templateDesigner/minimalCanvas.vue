<template>
  <div class="mc-shell">
    <div class="mc-tip">
      <span>第 2 步 · JSON 加载/导出验证</span>
      <div class="mc-actions">
        <el-button size="small" type="primary" @click="onLoadPreset">加载预设 JSON</el-button>
        <el-button size="small" @click="onExport">导出 JSON</el-button>
      </div>
    </div>
    <div ref="containerRef" class="mc-canvas"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createUniver, LocaleType, mergeLocales, type FUniver } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import { UniverVue3AdapterPlugin } from '@univerjs/ui-adapter-vue3';
import UniverSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN';
import { SHEETS_FEATURE_PLUGINS, SHEETS_FEATURE_LOCALES } from '@/components/TableDesigner/sheetsFeaturePlugins';

const containerRef = ref<HTMLElement | null>(null);
let ro: ResizeObserver | null = null;
let univerAPI: FUniver | null = null;

/** 预设工作簿：双 sheet、含文字/加粗/背景色/边框，用于验证 JSON 加载渲染 */
const PRESET_WORKBOOK = {
  id: 'preset-demo',
  name: '预设预算表',
  appVersion: '1.0.0',
  locale: 'zh-CN',
  sheetOrder: ['sheet-budget', 'sheet-note'],
  sheets: {
    'sheet-budget': {
      id: 'sheet-budget',
      name: '预算表',
      rowCount: 20,
      columnCount: 8,
      cellData: {
        0: {
          0: { v: '项目', s: { bl: 1, bg: { rgb: '#409EFF' }, cl: { rgb: '#FFFFFF' }, ht: 1, vt: 1, bd: { b: { s: 1, cl: { rgb: '#000000' } } } } },
          1: { v: 'Q1', s: { bl: 1, bg: { rgb: '#409EFF' }, cl: { rgb: '#FFFFFF' }, ht: 1, vt: 1 } },
          2: { v: 'Q2', s: { bl: 1, bg: { rgb: '#409EFF' }, cl: { rgb: '#FFFFFF' }, ht: 1, vt: 1 } },
          3: { v: 'Q3', s: { bl: 1, bg: { rgb: '#409EFF' }, cl: { rgb: '#FFFFFF' }, ht: 1, vt: 1 } },
          4: { v: 'Q4', s: { bl: 1, bg: { rgb: '#409EFF' }, cl: { rgb: '#FFFFFF' }, ht: 1, vt: 1 } },
          5: { v: '合计', s: { bl: 1, bg: { rgb: '#409EFF' }, cl: { rgb: '#FFFFFF' }, ht: 1, vt: 1 } }
        },
        1: { 0: { v: '人员经费' }, 1: { v: 100000, s: { n: '#,##0' } }, 2: { v: 120000, s: { n: '#,##0' } }, 3: { v: 110000, s: { n: '#,##0' } }, 4: { v: 130000, s: { n: '#,##0' } }, 5: { v: 460000, s: { bl: 1, n: '#,##0' } } },
        2: { 0: { v: '办公经费' }, 1: { v: 30000, s: { n: '#,##0' } }, 2: { v: 35000, s: { n: '#,##0' } }, 3: { v: 32000, s: { n: '#,##0' } }, 4: { v: 40000, s: { n: '#,##0' } }, 5: { v: 137000, s: { bl: 1, n: '#,##0' } } },
        3: { 0: { v: '差旅费' }, 1: { v: 20000, s: { n: '#,##0' } }, 2: { v: 25000, s: { n: '#,##0' } }, 3: { v: 22000, s: { n: '#,##0' } }, 4: { v: 28000, s: { n: '#,##0' } }, 5: { v: 95000, s: { bl: 1, n: '#,##0' } } }
      }
    },
    'sheet-note': {
      id: 'sheet-note',
      name: '填表说明',
      rowCount: 10,
      columnCount: 4,
      cellData: {
        0: { 0: { v: '填表说明', s: { bl: 1, fs: 14 } } },
        1: { 0: { v: '1. 所有金额单位为元。' } },
        2: { 0: { v: '2. 合计列由公式自动计算，请勿手动填写。' } },
        3: { 0: { v: '3. 如有疑问请联系预算管理员。' } }
      }
    }
  }
};

const syncCanvas = () => {
  const host = containerRef.value;
  if (!host) return;
  const h = host.clientHeight;
  if (!h) return;
  const root = host.querySelector<HTMLElement>('.univer-relative');
  if (root && root.offsetHeight < h) root.style.height = `${h}px`;
};

const onLoadPreset = () => {
  if (!univerAPI) return;
  try {
    // 销毁现有工作簿再创建
    univerAPI.createWorkbook(PRESET_WORKBOOK as any);
    // 重新同步画布高度
    for (let i = 1; i <= 8; i++) setTimeout(syncCanvas, i * 120);
    ElMessage.success('预设 JSON 已加载');
  } catch (e) {
    console.error('[minimalCanvas] load failed', e);
    ElMessage.error('加载失败：' + (e as Error).message);
  }
};

const onExport = () => {
  if (!univerAPI) return;
  try {
    const json = univerAPI.getActiveWorkbook()?.save();
    const text = JSON.stringify(json, null, 2);
    console.log('[minimalCanvas] exported JSON:', json);
    ElMessage.success('JSON 已导出到控制台（F12 查看）');
    // 复制到剪贴板
    navigator.clipboard?.writeText(text).then(() => {
      ElMessage.success('JSON 已复制到剪贴板');
    }).catch(() => {});
  } catch (e) {
    console.error('[minimalCanvas] export failed', e);
    ElMessage.error('导出失败');
  }
};

onMounted(() => {
  const container = containerRef.value;
  if (!container) return;
  try {
    const { univerAPI: api } = createUniver({
      locale: LocaleType.ZH_CN,
      locales: { [LocaleType.ZH_CN]: mergeLocales(UniverSheetsCoreZhCN, SHEETS_FEATURE_LOCALES[LocaleType.ZH_CN]) },
      presets: [
        UniverSheetsCorePreset({
          container,
          header: true,
          toolbar: true,
          formulaBar: true,
          footer: {}
        })
      ],
      plugins: [[UniverVue3AdapterPlugin, {}], ...SHEETS_FEATURE_PLUGINS]
    });
    univerAPI = api;

    api.createWorkbook({
      id: `min-${Date.now()}`,
      name: '最小画布',
      appVersion: '1.0.0',
      locale: LocaleType.ZH_CN,
      sheetOrder: ['sheet-01'],
      sheets: {
        'sheet-01': {
          id: 'sheet-01',
          name: 'Sheet1',
          rowCount: 20,
          columnCount: 12,
          cellData: {}
        }
      }
    });

    for (let i = 1; i <= 10; i++) setTimeout(syncCanvas, i * 120);
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => syncCanvas());
      ro.observe(container);
    }
  } catch (e) {
    console.error('[minimalCanvas] init failed', e);
  }
});

onBeforeUnmount(() => {
  ro?.disconnect();
  ro = null;
});
</script>

<style scoped>
.mc-shell {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 84px);
  background: #fff;
}
.mc-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  color: #909399;
  font-size: 13px;
  flex-shrink: 0;
}
.mc-actions {
  display: flex;
  gap: 8px;
}
.mc-canvas {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  position: relative;
}
</style>