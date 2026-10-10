import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useTableDesigner } from './useTableDesigner';

// ===== Mock Univer 相关模块 =====
const mockGetActiveRange = vi.fn(() => ({
  getRow: () => 0,
  getColumn: () => 0,
  getValue: () => null,
  setValue: vi.fn()
}));

const mockGetActiveSheet = vi.fn(() => ({
  getRange: () => ({
    getValue: () => null,
    setValue: vi.fn()
  })
}));

const mockGetActiveWorkbook = vi.fn(() => ({
  getActiveRange: mockGetActiveRange,
  getActiveSheet: mockGetActiveSheet,
  isCellEditing: () => false,
  endEditingAsync: async () => true,
  save: () => ({ id: 'snapshot-1', sheets: { 'sheet-01': { id: 'sheet-01' } }, sheetOrder: ['sheet-01'] })
}));

const mockAddEvent = vi.fn();
const mockCreateUnit = vi.fn();
const mockDispose = vi.fn();

vi.mock('@univerjs/presets', () => ({
  createUniver: vi.fn(() => ({
    univer: {
      createUnit: mockCreateUnit,
      dispose: mockDispose
    },
    univerAPI: {
      getActiveWorkbook: mockGetActiveWorkbook,
      addEvent: mockAddEvent,
      Event: {
        SelectionMoveEnd: 'selection-move-end',
        CommandExecuted: 'command-executed'
      }
    }
  })),
  LocaleType: { ZH_CN: 'zh-CN' },
  merge: (...args: any[]) => Object.assign({}, ...args),
  mergeLocales: (...args: any[]) => Object.assign({}, ...args),
  UniverInstanceType: { UNIVER_SHEET: 2 }
}));

vi.mock('@univerjs/core/facade', () => ({
  FUniver: class {}
}));

// Mock facade 扩展模块（仅 side-effect import，测试环境无需真实加载）
vi.mock('@univerjs/sheets-data-validation/lib/facade', () => ({}));
vi.mock('@univerjs/sheets-ui/lib/facade', () => ({}));

vi.mock('@univerjs/preset-sheets-core', () => ({
  UniverSheetsCorePreset: vi.fn((config) => ({ name: 'sheets-core', config }))
}));

vi.mock('@univerjs/ui-adapter-vue3', () => ({
  UniverVue3AdapterPlugin: class {}
}));

vi.mock('@univerjs/preset-sheets-core/locales/zh-CN', () => ({ default: {} }));

vi.mock('@univerjs/preset-sheets-core/lib/worker.js?worker', () => ({
  default: class MockWorker {}
}));

describe('TableDesigner / useTableDesigner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createContainer = () => {
    const el = document.createElement('div');
    // mock 容器尺寸，确保 ensureContainerReady 立即通过
    Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
    return ref<HTMLElement | null>(el);
  };

  describe('init', () => {
    it('初始化后 ready 应为 true', async () => {
      const container = createContainer();
      const { ready, init } = useTableDesigner(container);
      await init();
      expect(ready.value).toBe(true);
    });

    it('初始化时应创建一个空白工作簿', async () => {
      const container = createContainer();
      const { init } = useTableDesigner(container);
      await init();
      expect(mockCreateUnit).toHaveBeenCalledWith(2, expect.objectContaining({
        sheetOrder: ['sheet-01']
      }));
    });

    it('初始化时应注册选中区域和命令执行事件', async () => {
      const container = createContainer();
      const { init } = useTableDesigner(container);
      await init();
      expect(mockAddEvent).toHaveBeenCalledTimes(2);
      expect(mockAddEvent).toHaveBeenCalledWith('selection-move-end', expect.any(Function));
      expect(mockAddEvent).toHaveBeenCalledWith('command-executed', expect.any(Function));
    });
  });

  describe('getJSON', () => {
    it('应返回工作簿快照', async () => {
      const container = createContainer();
      const { init, getJSON } = useTableDesigner(container);
      await init();
      const json = await getJSON();
      expect(json.id).toBe('snapshot-1');
      expect(mockGetActiveWorkbook).toHaveBeenCalled();
    });
  });

  describe('loadJSON', () => {
    it('应加载传入的工作簿数据', async () => {
      const container = createContainer();
      const { init, loadJSON } = useTableDesigner(container);
      await init();
      vi.clearAllMocks();
      await loadJSON({ id: 'custom-snapshot', sheets: { 'sheet-01': { id: 'sheet-01' } }, sheetOrder: ['sheet-01'] });
      expect(mockCreateUnit).toHaveBeenCalledWith(2, { id: 'custom-snapshot', sheets: { 'sheet-01': { id: 'sheet-01' } }, sheetOrder: ['sheet-01'] });
    });

    it('传入空值时不创建工作簿', async () => {
      const container = createContainer();
      const { init, loadJSON } = useTableDesigner(container);
      await init();
      vi.clearAllMocks();
      await loadJSON(null);
      expect(mockCreateUnit).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('应重置到初始快照', async () => {
      const container = createContainer();
      const { init, reset } = useTableDesigner(container);
      await init();
      vi.clearAllMocks();
      await reset();
      expect(mockCreateUnit).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('应销毁实例并清空容器', async () => {
      const container = createContainer();
      const { init, destroy, ready } = useTableDesigner(container);
      await init();
      destroy();
      expect(mockDispose).toHaveBeenCalled();
      expect(ready.value).toBe(false);
      expect(container.value?.innerHTML).toBe('');
    });
  });

  describe('setCellMeta', () => {
    it('无选中单元格时不写入', async () => {
      const container = createContainer();
      const { init, setCellMeta } = useTableDesigner(container);
      await init();
      const setValueSpy = vi.fn();
      mockGetActiveSheet.mockReturnValueOnce({
        getRange: () => ({ getValue: () => null, setValue: setValueSpy })
      });
      setCellMeta({ cellRange: '', cellType: 'text', valueDomainType: 'none', readOnly: false, dataFormat: '', required: false });
      expect(setValueSpy).not.toHaveBeenCalled();
    });
  });
});
