/**
 * 模板设计器 - Sheets 功能扩展插件
 *
 * 目的：在 Univer 1.0.2 内补齐参考版体验版（Univer 2.x UniverSheetsUIPreset）的 Ribbon 页签。
 * `UniverSheetsCorePreset` 默认只注册「开始 / 公式 / 视图」三个页签；「插入」「数据」两页签对应
 * 的 drawing（图片）、filter（筛选）、data-validation（数据验证）功能未被注册。
 *
 * 以「基座插件 + UI 插件」成对注册，并合并各自中文 locale，使菜单完整且为中文。
 * 已知风险：部分 UI 组件为绝对定位悬浮层，需配合 useTableDesigner 中「仅修正工作表画布 section」
 * 的画布尺寸同步逻辑，避免被打散进单元格区域。
 */
import { LocaleType, merge } from '@univerjs/presets';
import { UniverSheetsDrawingPlugin } from '@univerjs/sheets-drawing';
import { UniverSheetsFilterPlugin } from '@univerjs/sheets-filter';
import { UniverSheetsDataValidationPlugin } from '@univerjs/sheets-data-validation';

import { UniverSheetsDrawingUIPlugin } from '@univerjs/sheets-drawing-ui';
import { UniverSheetsFilterUIPlugin } from '@univerjs/sheets-filter-ui';
import { UniverSheetsDataValidationUIPlugin } from '@univerjs/sheets-data-validation-ui';

// 显式加载 facade 扩展，使 univerAPI.newDataValidation() 等 FUniver 扩展方法可用
import '@univerjs/sheets-data-validation/lib/facade';

import ZhCnDrawingUi from '@univerjs/sheets-drawing-ui/locale/zh-CN';
import ZhCnFilterUi from '@univerjs/sheets-filter-ui/locale/zh-CN';
import ZhCnDvUi from '@univerjs/sheets-data-validation-ui/locale/zh-CN';

/** 需追加到 createUniver plugins 数组：UI 插件依赖其基座插件提供的服务，故基座在前 */
export const SHEETS_FEATURE_PLUGINS = [
  [UniverSheetsDrawingPlugin, {}],
  [UniverSheetsDrawingUIPlugin, {}],
  [UniverSheetsFilterPlugin, {}],
  [UniverSheetsFilterUIPlugin, {}],
  [UniverSheetsDataValidationPlugin, {}],
  [UniverSheetsDataValidationUIPlugin, {}],
] as const;

/** 扩展插件对应的中文 locale（链式两参 merge，规避潜在签名差异） */
export const SHEETS_FEATURE_LOCALES_ZH_CN = merge(
  merge(merge({}, ZhCnDrawingUi), ZhCnFilterUi),
  ZhCnDvUi
);

export const SHEETS_FEATURE_LOCALES = {
  [LocaleType.ZH_CN]: SHEETS_FEATURE_LOCALES_ZH_CN,
};