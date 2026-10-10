import { describe, it, expect } from 'vitest';
import { DEFAULT_CELL_META, type CellMeta, type ValueDomainType, type CellType } from './types';

describe('TableDesigner / types', () => {
  describe('DEFAULT_CELL_META', () => {
    it('应提供安全的默认值', () => {
      expect(DEFAULT_CELL_META.cellType).toBe('text');
      expect(DEFAULT_CELL_META.valueDomainType).toBe('none');
      expect(DEFAULT_CELL_META.readOnly).toBe(false);
      expect(DEFAULT_CELL_META.required).toBe(false);
      expect(DEFAULT_CELL_META.cellRange).toBe('');
      expect(DEFAULT_CELL_META.dataFormat).toBe('');
    });

    it('默认单元格不应有可选字段', () => {
      expect(DEFAULT_CELL_META.options).toBeUndefined();
      expect(DEFAULT_CELL_META.dataSourceId).toBeUndefined();
    });

    it('修改默认值副本不应污染原始常量', () => {
      const copy: CellMeta = { ...DEFAULT_CELL_META };
      copy.cellType = 'number';
      copy.readOnly = true;
      expect(DEFAULT_CELL_META.cellType).toBe('text');
      expect(DEFAULT_CELL_META.readOnly).toBe(false);
    });
  });

  describe('类型契约（运行时枚举校验）', () => {
    const validCellTypes: CellType[] = ['text', 'number', 'formula'];
    const validDomainTypes: ValueDomainType[] = ['none', 'fixedSelect', 'dynamicSelect', 'date'];

    it('CellType 应包含三个合法值', () => {
      expect(validCellTypes).toHaveLength(3);
      expect(validCellTypes).toContain('text');
      expect(validCellTypes).toContain('number');
      expect(validCellTypes).toContain('formula');
    });

    it('ValueDomainType 应包含四个合法值', () => {
      expect(validDomainTypes).toHaveLength(4);
      expect(validDomainTypes).toContain('none');
      expect(validDomainTypes).toContain('fixedSelect');
      expect(validDomainTypes).toContain('dynamicSelect');
      expect(validDomainTypes).toContain('date');
    });
  });

  describe('CellMeta 结构校验', () => {
    it('完整的 CellMeta 应包含所有字段', () => {
      const full: CellMeta = {
        cellRange: 'R1C1',
        cellType: 'number',
        valueDomainType: 'fixedSelect',
        options: ['a', 'b'],
        dataSourceId: undefined,
        readOnly: true,
        dataFormat: '#,##0.00',
        required: true
      };
      expect(full.cellRange).toBe('R1C1');
      expect(full.cellType).toBe('number');
      expect(full.valueDomainType).toBe('fixedSelect');
      expect(full.options).toEqual(['a', 'b']);
      expect(full.readOnly).toBe(true);
      expect(full.dataFormat).toBe('#,##0.00');
      expect(full.required).toBe(true);
    });

    it('动态数据源下拉只存标识，不存选项数据', () => {
      const dynamicCell: CellMeta = {
        cellRange: 'R1C1',
        cellType: 'text',
        valueDomainType: 'dynamicSelect',
        dataSourceId: 'budget_subject',
        readOnly: false,
        dataFormat: '',
        required: false
      };
      expect(dynamicCell.dataSourceId).toBe('budget_subject');
      expect(dynamicCell.options).toBeUndefined();
    });
  });
});
