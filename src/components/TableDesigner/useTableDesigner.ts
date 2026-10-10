/**
 * 通用表格设计器 - Univer 实例管理 Hook
 *
 * 职责：
 * - 创建/销毁 Univer 实例
 * - JSON 导入（loadJSON）/ 导出（getJSON）
 * - 单元格元数据读写（存在 cellData 的 custom 属性中）
 * - 选中单元格变化事件
 *
 * 稳定性：关键操作全部 try-catch；loadJSON 前校验 JSON 合法性；页面离开主动销毁。
 */
import { onBeforeUnmount, onDeactivated, ref, shallowRef, watch, type Ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createUniver, LocaleType, mergeLocales, UniverInstanceType, type Univer } from '@univerjs/presets';
import { FUniver } from '@univerjs/core/facade';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import { UniverVue3AdapterPlugin } from '@univerjs/ui-adapter-vue3';
import UniverSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN';
import { SHEETS_FEATURE_PLUGINS, SHEETS_FEATURE_LOCALES } from './sheetsFeaturePlugins';
// 显式加载 sheets-data-validation facade 扩展，使 univerAPI.newDataValidation() / range.setDataValidation() 可用
import '@univerjs/sheets-data-validation/lib/facade';
// 显式加载 sheets-ui facade 扩展，使 api.Event.SelectionMoveEnd / SelectionChanged 等事件常量可用
// （未加载时 api.Event.SelectionMoveEnd 为 undefined，addEvent(undefined, cb) 静默失败，导致切换单元格时右侧配置面板不刷新）
import '@univerjs/sheets-ui/lib/facade';
import { DEFAULT_CELL_META, type CellMeta, type DataSourceLoader, type ValueDomainType } from './types';

export function useTableDesigner(
  container: Ref<HTMLElement | null>,
  options?: { dataSourceLoader?: DataSourceLoader; readonly?: Ref<boolean> }
) {
  const univerInstance = shallowRef<Univer | null>(null);
  const univerAPI = shallowRef<FUniver | null>(null);
  const ready = ref(false);

  // 初始快照（用于重置）
  const initialSnapshot = shallowRef<any>(null);

  // 当前选中单元格的元数据
  const activeCellMeta = ref<CellMeta | null>(null);
  const activeCellPosition = ref<{ row: number; col: number } | null>(null);

  // 业务元数据独立存储 Map，键为 `${sheetId}:${row}:${col}`。
  // 不再写入 cell value，避免污染 Univer 的 ICellData 结构触发公式引擎 Object.keys(undefined) 崩溃
  // （Univer 的 _getDirtyRangesByCellValue 会 new ObjectMatrix(cellValue) 把 cell value 当 2D 矩阵处理）
  const cellMetaMap = new Map<string, CellMeta>();
  const metaKey = (sheetId: string | undefined, row: number, col: number) =>
    `${sheetId ?? ''}:${row}:${col}`;

  /** 监听画布宿主尺寸并喂给 Univer 渲染根，修复渲染层 canvas 高度恒为 0 的问题。
   *  只设根 .univer-relative 高度，内部 sheet 区布局交给 Univer 自身 CSS。
   *  （之前强制内部 section 全高会与顶部 Ribbon/工具栏冲突，导致网格区被挤掉） */
  let heightObserver: ResizeObserver | null = null;

  const syncCanvasHeight = () => {
    if (!container.value) return;
    const host = container.value;
    const h = host.clientHeight;
    if (!h) return;
    const root = host.querySelector<HTMLElement>('.univer-relative');
    if (root && root.offsetHeight < h) {
      root.style.height = `${h}px`;
    }
  };

  const startCanvasSizeSync = () => {
    if (!container.value) return;
    if (heightObserver) heightObserver.disconnect();
    // jsdom 等测试环境无 ResizeObserver，跳过监听（浏览器正常具备）
    if (typeof ResizeObserver !== 'undefined') {
      heightObserver = new ResizeObserver(() => syncCanvasHeight());
      heightObserver.observe(container.value);
    }
    // 引擎 DOM 异步挂载，延迟多帧补几次以捕获挂载完成后的真实尺寸
    for (let i = 1; i <= 10; i++) setTimeout(syncCanvasHeight, i * 120);
  };

  const stopCanvasSizeSync = () => {
    heightObserver?.disconnect();
    heightObserver = null;
  };

  /** 创建空白工作簿数据 */
  const createEmptyWorkbook = () => ({
    id: `td-workbook-${Date.now()}`,
    name: '设计画布',
    appVersion: '1.0.0',
    locale: LocaleType.ZH_CN,
    sheetOrder: ['sheet-01'],
    sheets: {
      'sheet-01': {
        id: 'sheet-01',
        name: 'Sheet1',
        rowCount: 100,
        columnCount: 26,
        cellData: {}
      }
    }
  });

  /** 校验画布 JSON 合法性（宽松：只要是有 sheets 的对象即放行，具体结构由 createUnit 解析） */
  const isValidWorkbookData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    if (!data.sheets || typeof data.sheets !== 'object') return false;
    return Object.keys(data.sheets).length > 0;
  };

  /** 初始化 Univer */
  const init = (createEmpty: boolean = true) => {
    if (!container.value) return;

    try {
      const { univer, univerAPI: api } = createUniver({
        locale: LocaleType.ZH_CN,
        locales: {
          // 核心 locale 必须与扩展插件 locale 合并，否则扩展插件的 ZH_CN 会覆盖核心，
          // 导致 Ribbon 页签显示原始 i18n key（如 ui.ribbon.start）
          [LocaleType.ZH_CN]: mergeLocales(UniverSheetsCoreZhCN, SHEETS_FEATURE_LOCALES[LocaleType.ZH_CN])
        },
        presets: [
          UniverSheetsCorePreset({
            container: container.value,
            header: true,
            toolbar: true,
            formulaBar: true,
            footer: {}
            // 主线程渲染：不传 workerURL。（vite dev 下 worker+OffscreenCanvas 会导致单元格内容层的 canvas 高度恒为 0，表格内容/样式无法绘制）
          })
        ],
        plugins: [
          // 补齐参考版 Ribbon「插入」「数据」页签：基座插件须先于 UI 插件注册
          ...SHEETS_FEATURE_PLUGINS,
          [UniverVue3AdapterPlugin, {}]
        ]
      });

      univerInstance.value = univer;
      univerAPI.value = api;

      if (createEmpty) {
        univer.createUnit(UniverInstanceType.UNIVER_SHEET, createEmptyWorkbook());
        initialSnapshot.value = api.getActiveWorkbook()?.save() ?? null;
      }
      // 应用只读状态
      applyReadonly(options?.readonly?.value ?? false);

      // 注册只读命令拦截
      registerReadonlyGuard();

      // 选中区域变化时更新元数据
      api.addEvent(api.Event.SelectionMoveEnd, () => {
        try {
          // 每次选中变化时重新应用只读状态，防止被内部逻辑重置
          if (options?.readonly?.value) applyReadonly(true);
          refreshActiveCellMeta();
        } catch (e) {
          console.warn('[TableDesigner] SelectionMoveEnd error:', e);
        }
      });

      // 命令执行事件（含复制/粘贴等），异常捕获防止画布崩溃
      api.addEvent(api.Event.CommandExecuted, () => {
        try {
          refreshActiveCellMeta();
        } catch (e) {
          console.warn('[TableDesigner] CommandExecuted error:', e);
        }
      });

      ready.value = true;
      startCanvasSizeSync();
    } catch (e) {
      console.error('[TableDesigner] init failed:', e);
      ElMessage.error('画布初始化失败，请刷新页面重试');
      ready.value = false;
    }
  };


  /** 读取单元格实际的 Univer 数据验证，推导值域类型与选项（用于与 meta 对账，避免"实际是下拉、面板显示无"） */
  const detectValueDomainFromCell = (row: number, col: number): { valueDomainType: ValueDomainType; options?: string[] } | null => {
    const api = univerAPI.value;
    if (!api) return null;
    try {
      const worksheet = api.getActiveWorkbook()?.getActiveSheet();
      if (!worksheet) return null;
      const dv = worksheet.getRange(row, col).getDataValidation();
      if (!dv) return null;
      const type = dv.getCriteriaType();
      if (type === 'list' || type === 'listMultiple') {
        const [, formula1] = dv.getCriteriaValues();
        let options;
        if (formula1 && !/[!$:]/.test(formula1)) {
          options = formula1.split(',').map((s) => s.trim()).filter(Boolean);
        }
        return { valueDomainType: 'fixedSelect', options };
      }
      if (type === 'date') return { valueDomainType: 'date' };
      return null;
    } catch (e) {
      console.warn('[TableDesigner] detectValueDomainFromCell error:', e);
      return null;
    }
  };

  /** 刷新当前选中单元格的元数据（从独立 Map 读取，并与单元格实际数据验证对账，确保值域类型同步） */
  const refreshActiveCellMeta = () => {
    const api = univerAPI.value;
    if (!api) return;
    try {
      const workbook = api.getActiveWorkbook();
      const range = workbook?.getActiveRange();
      if (!range) return;

      const row = range.getRow();
      const col = range.getColumn();
      activeCellPosition.value = { row, col };

      const sheetId = workbook?.getActiveSheet()?.getSheetId();
      const key = metaKey(sheetId, row, col);
      let meta = cellMetaMap.get(key) ?? null;

      // 对账：以单元格实际数据验证为准，同步 meta 的值域类型
      const detected = detectValueDomainFromCell(row, col);
      if (detected && !meta?.dataSourceId) {
        if (!meta) meta = { ...DEFAULT_CELL_META, cellRange: `R${row + 1}C${col + 1}` };
        if (meta.valueDomainType !== detected.valueDomainType || (detected.options?.length && !meta.options)) {
          meta.valueDomainType = detected.valueDomainType;
          if (detected.options?.length) meta.options = detected.options;
          cellMetaMap.set(key, meta);
        }
      } else if (!detected) {
        if (meta && meta.valueDomainType !== 'none') {
          meta = { ...meta, valueDomainType: 'none', options: undefined, dataSourceId: undefined };
          cellMetaMap.set(key, meta);
        }
      }

      activeCellMeta.value = meta ? { ...meta } : null;
    } catch (e) {
      console.warn('[TableDesigner] refreshActiveCellMeta error:', e);
    }
  };

  /** 获取当前选中单元格的原始值 */
  const getActiveCellValue = (): any => {
    try {
      const range = univerAPI.value?.getActiveWorkbook()?.getActiveRange();
      return range?.getValue();
    } catch (e) {
      console.warn('[TableDesigner] getActiveCellValue error:', e);
      return null;
    }
  };

  /** 写入单元格元数据（存入独立 Map，不污染 cell value） */
  const setCellMeta = (meta: CellMeta) => {
    const api = univerAPI.value;
    if (!api || !activeCellPosition.value) return;

    try {
      const { row, col } = activeCellPosition.value;
      const worksheet = api.getActiveWorkbook()?.getActiveSheet();
      if (!worksheet) return;

      const sheetId = worksheet.getSheetId();
      const metaWithRange: CellMeta = {
        ...meta,
        cellRange: `R${row + 1}C${col + 1}`
      };

      // 写入独立 Map，不再调用 range.setValue()，避免污染 ICellData 触发公式引擎崩溃
      cellMetaMap.set(metaKey(sheetId, row, col), metaWithRange);

      // 应用 Univer 原生数据验证（下拉/日期），与 cell value 解耦
      applyDataValidation(meta, row, col);

      activeCellMeta.value = metaWithRange;
    } catch (e) {
      console.warn('[TableDesigner] setCellMeta error:', e);
    }
  };

  /** 根据值域类型应用/清除 Univer 数据验证规则 */
  const applyDataValidation = async (meta: CellMeta, row: number, col: number) => {
    const api = univerAPI.value;
    if (!api) return;
    try {
      const workbook = api.getActiveWorkbook();
      const worksheet = workbook?.getActiveSheet();
      if (!worksheet) return;
      const range = worksheet.getRange(row, col);

      if (meta.valueDomainType === 'fixedSelect' && meta.options?.length) {
        // 固定下拉：用 requireValueInList 创建下拉
        const rule = (api as any).newDataValidation()
          .requireValueInList(meta.options, false, true)
          .setOptions({ allowBlank: true, showErrorMessage: true, error: '请从下拉列表中选择' })
          .build();
        range.setDataValidation(rule);
      } else if (meta.valueDomainType === 'dynamicSelect' && meta.dataSourceId) {
        // 动态数据源下拉：从业务层加载选项，再创建下拉
        const loader = options?.dataSourceLoader;
        if (loader) {
          const dynamicOptions = await loader(meta.dataSourceId!);
          if (dynamicOptions?.length) {
            // 存储选项映射（名称→编码），单元格只展示名称，编码隐形传递给后台
            meta.dynamicOptions = dynamicOptions;
            const values = dynamicOptions.map((o) => o.label);
            const rule = (api as any).newDataValidation()
              .requireValueInList(values, false, true)
              .setOptions({ allowBlank: true, showErrorMessage: true, error: '请从下拉列表中选择' })
              .build();
            range.setDataValidation(rule);
          }
        }
      } else if (meta.valueDomainType === 'date') {
        // 日期选择：用日期校验
        const rule = (api as any).newDataValidation()
          .requireDateBetween(new Date('2000-01-01'), new Date('2099-12-31'))
          .setOptions({ allowBlank: true, showErrorMessage: true, error: '请输入有效日期' })
          .build();
        range.setDataValidation(rule);
      } else {
        // 无值域类型：清除数据验证
        range.setDataValidation(null as any);
      }
    } catch (e) {
      console.warn('[TableDesigner] applyDataValidation error:', e);
    }
  };



  /** 应用只读状态：调用 Univer setEditable 控制画布是否可编辑（延迟执行确保权限服务就绪） */
  const applyReadonly = (readonly: boolean) => {
    const doApply = () => {
      try {
        univerAPI.value?.getActiveWorkbook()?.setEditable(!readonly);
      } catch (e) {
        console.warn('[TableDesigner] applyReadonly error:', e);
      }
    };
    // 立即尝试一次
    doApply();
    // 延迟再应用一次，确保 Univer 内部权限点初始化完成后生效
    setTimeout(doApply, 0);
    setTimeout(doApply, 100);
  };

  /** 只读模式下允许放行的命令（选择、滚动等非编辑命令） */
  const READONLY_ALLOWED_COMMANDS = new Set([
    'sheet.operation.set-selections',
    'sheet.operation.scroll',
    'sheet.operation.set-scroll-relative',
    'sheet.operation.set-scroll',
    'sheet.operation.set-zoom',
    'sheet.operation.set-active-sheet',
    'sheet.operation.set-pane-split'
  ]);

  /** 注册命令拦截：只读模式下阻止所有编辑类命令 */
  const registerReadonlyGuard = () => {
    const api = univerAPI.value;
    if (!api) return;
    api.addEvent(api.Event.BeforeCommandExecute, (event: any) => {
      if (!options?.readonly?.value) return;
      const id = String(event?.id ?? '');
      // 放行选择/导航类命令
      if (READONLY_ALLOWED_COMMANDS.has(id)) return;
      if (id.includes('selection') || id.includes('scroll') || id.includes('zoom') || id.includes('active-sheet')) return;
      // 其余编辑命令全部拦截
      event.cancel = true;
    });
  };

  /** 加载画布后，遍历 meta Map 重新应用所有数据验证，保证画布下拉与 meta 值域类型一致 */
  const reapplyAllDataValidations = () => {
    cellMetaMap.forEach((meta, key) => {
      if (meta.valueDomainType === 'none') return;
      const parts = key.split(':');
      const row = Number(parts[parts.length - 2]);
      const col = Number(parts[parts.length - 1]);
      if (!isNaN(row) && !isNaN(col)) applyDataValidation(meta, row, col);
    });
  };

  /** 获取画布 JSON（先提交编辑态值，再取快照，并注入业务元数据 Map） */
  const getJSON = async (): Promise<any> => {
    try {
      const workbook = univerAPI.value?.getActiveWorkbook();
      if (!workbook) return null;
      // 用 Univer 官方 API 显式结束编辑态，把输入值提交到 cellData
      if (workbook.isCellEditing?.()) {
        await workbook.endEditingAsync(true);
      }
      const snapshot = workbook.save() ?? null;
      if (snapshot) {
        // 注入独立存储的业务元数据，随快照一起序列化（Univer 会忽略未知字段）
        snapshot.__td_meta_map__ = Array.from(cellMetaMap.entries());
      }
      return snapshot;
    } catch (e) {
      console.warn('[TableDesigner] getJSON error:', e);
      return null;
    }
  };

  /** 加载画布 JSON（含业务元数据 Map） */
  const loadJSON = (data: any) => {
    if (!data) return;

    if (!isValidWorkbookData(data)) {
      console.error('[TableDesigner] 非法画布数据，已拒绝加载:', data);
      ElMessage.error('画布数据格式异常，无法加载');
      return;
    }

    try {
      // 提取业务元数据 Map（从快照自定义字段还原）
      cellMetaMap.clear();
      const metaEntries = data.__td_meta_map__;
      if (Array.isArray(metaEntries)) {
        metaEntries.forEach(([k, v]: [string, CellMeta]) => cellMetaMap.set(k, v));
      }
      // 从快照中剥离自定义字段，避免污染 Univer createUnit（附加列配置由业务壳读写，画布不消费）
      const { __td_meta_map__: _ignored, __td_extra_cols__: _ignoredExtra, ...workbookData } = data;

      if (univerInstance.value) {
        destroy();
      }
      init(false);
      univerInstance.value?.createUnit(UniverInstanceType.UNIVER_SHEET, workbookData);
      initialSnapshot.value = workbookData;
      // 应用只读状态
      applyReadonly(options?.readonly?.value ?? false);
      // 加载后重新应用所有 meta 的数据验证，确保画布下拉与 meta 值域类型一致
      reapplyAllDataValidations();
    } catch (e) {
      console.error('[TableDesigner] loadJSON failed:', e);
      ElMessage.error('画布加载失败，请刷新页面重试');
    }
  };

  /** 重置到空白工作簿（不加载任何 JSON，清空元数据 Map） */
  const reset = () => {
    if (univerInstance.value) {
      destroy();
    }
    cellMetaMap.clear();
    init(true); // createEmpty=true → 创建全新空工作簿
  };

  /** 销毁实例 */
  const destroy = () => {
    stopCanvasSizeSync();
    if (univerInstance.value) {
      try {
        univerInstance.value.dispose();
      } catch {
        /* ignore */
      }
      univerInstance.value = null;
      univerAPI.value = null;
    }
    if (container.value) {
      container.value.innerHTML = '';
    }
    ready.value = false;
    activeCellMeta.value = null;
    activeCellPosition.value = null;
    cellMetaMap.clear();
  };

  // keep-alive 缓存页面：离开页面时销毁 Univer 实例（释放内存+canvas）
  onDeactivated(() => {
    destroy();
  });

  // 组件真正卸载（关闭标签页等）时销毁，作为保险
  onBeforeUnmount(() => {
    destroy();
  });


  // 监听 readonly 变化，动态切换画布可编辑状态
  if (options?.readonly) {
    watch(options.readonly, (val) => applyReadonly(val));
  }

  return {
    ready,
    univerAPI,
    activeCellMeta,
    activeCellPosition,
    init,
    destroy,
    getJSON,
    loadJSON,
    reset,
    setCellMeta,
    getActiveCellValue
  };
}
