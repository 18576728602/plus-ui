import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import CellPropertyPanel from './CellPropertyPanel.vue';
import { DEFAULT_CELL_META, type CellMeta } from './types';

const buildWrapper = (props: Record<string, any> = {}) => {
  return mount(CellPropertyPanel, {
    props: {
      meta: null,
      position: null,
      availableDataSources: [],
      readonly: false,
      ...props
    },
    global: {
      plugins: [ElementPlus]
    }
  });
};

describe('TableDesigner / CellPropertyPanel', () => {
  describe('空状态', () => {
    it('未选中单元格时显示空提示', () => {
      const wrapper = buildWrapper({ meta: null, position: null });
      expect(wrapper.text()).toContain('请在画布中选中一个单元格');
    });

    it('未选中单元格时不渲染表单', () => {
      const wrapper = buildWrapper({ meta: null, position: null });
      expect(wrapper.find('.cpp-form').exists()).toBe(false);
    });
  });

  describe('选中单元格', () => {
    const position = { row: 0, col: 0 };

    it('选中单元格后渲染配置表单', () => {
      const wrapper = buildWrapper({ meta: DEFAULT_CELL_META, position });
      expect(wrapper.find('.cpp-form').exists()).toBe(true);
    });

    it('显示单元格位置标签', () => {
      const wrapper = buildWrapper({ meta: DEFAULT_CELL_META, position });
      expect(wrapper.text()).toContain('R1C1');
    });

    it('meta 为 null 时使用默认值渲染表单', () => {
      const wrapper = buildWrapper({ meta: null, position });
      expect(wrapper.find('.cpp-form').exists()).toBe(true);
    });
  });

  describe('事件触发', () => {
    const position = { row: 0, col: 0 };

    it('切换值域类型为 fixedSelect 时清理 dataSourceId', async () => {
      const meta: CellMeta = { ...DEFAULT_CELL_META, valueDomainType: 'dynamicSelect', dataSourceId: 'budget_subject' };
      const wrapper = buildWrapper({ meta, position });
      const selects = wrapper.findAllComponents({ name: 'ElSelect' });
      expect(selects.length).toBeGreaterThan(0);
      await selects[0].vm.$emit('update:modelValue', 'fixedSelect');
      await selects[0].vm.$emit('change', 'fixedSelect');
      const emitted = wrapper.emitted('update:meta')!;
      expect(emitted[0][0].valueDomainType).toBe('fixedSelect');
      expect(emitted[0][0].dataSourceId).toBeUndefined();
    });

    it('切换值域类型为 dynamicSelect 时清理 options', async () => {
      const meta: CellMeta = { ...DEFAULT_CELL_META, valueDomainType: 'fixedSelect', options: ['a', 'b'] };
      const wrapper = buildWrapper({ meta, position });
      const selects = wrapper.findAllComponents({ name: 'ElSelect' });
      expect(selects.length).toBeGreaterThan(0);
      await selects[0].vm.$emit('update:modelValue', 'dynamicSelect');
      await selects[0].vm.$emit('change', 'dynamicSelect');
      const emitted = wrapper.emitted('update:meta')!;
      expect(emitted[0][0].valueDomainType).toBe('dynamicSelect');
      expect(emitted[0][0].options).toBeUndefined();
    });

    it('点击清除配置触发 clear 事件', async () => {
      const wrapper = buildWrapper({ meta: DEFAULT_CELL_META, position });
      const clearBtn = wrapper.find('.cpp-actions button');
      await clearBtn.trigger('click');
      expect(wrapper.emitted('clear')).toBeTruthy();
    });
  });

  describe('数据源列表', () => {
    it('availableDataSources 传入时渲染下拉选项', async () => {
      const position = { row: 0, col: 0 };
      const meta: CellMeta = { ...DEFAULT_CELL_META, valueDomainType: 'dynamicSelect' };
      const wrapper = buildWrapper({
        meta,
        position,
        availableDataSources: ['budget_subject', 'report_index']
      });
      const options = wrapper.findAllComponents({ name: 'ElOption' });
      const labels = options.map((o) => o.props('label'));
      expect(labels).toContain('budget_subject');
      expect(labels).toContain('report_index');
    });

    it('未提供 availableDataSources 时不渲染数据源选项', () => {
      const position = { row: 0, col: 0 };
      const meta: CellMeta = { ...DEFAULT_CELL_META, valueDomainType: 'dynamicSelect' };
      const wrapper = buildWrapper({ meta, position, availableDataSources: [] });
      const options = wrapper.findAllComponents({ name: 'ElOption' });
      const labels = options.map((o) => o.props('label'));
      expect(labels).not.toContain('budget_subject');
    });
  });

  describe('只读模式', () => {
    const position = { row: 0, col: 0 };

    it('readonly=true 时面板添加 is-readonly 类', () => {
      const wrapper = buildWrapper({ meta: DEFAULT_CELL_META, position, readonly: true });
      expect(wrapper.find('.cell-prop-panel.is-readonly').exists()).toBe(true);
    });

    it('readonly=true 时清除配置按钮禁用', () => {
      const wrapper = buildWrapper({ meta: DEFAULT_CELL_META, position, readonly: true });
      const clearBtn = wrapper.find('.cpp-actions button');
      expect(clearBtn.attributes('disabled')).toBe('');
    });
  });
});
