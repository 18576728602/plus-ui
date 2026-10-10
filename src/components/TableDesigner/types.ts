/**
 * 通用表格设计器 - 类型定义
 *
 * 设计原则：
 * - 公共组件不内置任何业务数据源；
 * - 单元格配置 JSON 中只存数据源标识，不存完整选项数据；
 * - 业务层通过扩展接口注入数据源与自定义校验。
 */

/** 单元格类型 */
export type CellType = 'text' | 'number' | 'formula';

/** 值域类型 */
export type ValueDomainType =
  | 'none' // 无（普通输入）
  | 'fixedSelect' // 固定下拉
  | 'dynamicSelect' // 动态数据源下拉
  | 'date'; // 日期选择

/**
 * 单元格配置（存储在画布 JSON 中，每个单元格的扩展元数据）
 * 存储格式示例：
 * {
 *   "cellRange": "R1C1",
 *   "cellType": "text",
 *   "valueDomainType": "dynamicSelect",
 *   "dataSourceId": "budget_subject",
 *   "readOnly": false,
 *   "dataFormat": "",
 *   "required": false
 * }
 */
export interface CellMeta {
  /** 单元格范围，如 R1C1 */
  cellRange: string;
  /** 单元格类型 */
  cellType: CellType;
  /** 值域类型 */
  valueDomainType: ValueDomainType;
  /** 固定下拉选项（valueDomainType=fixedSelect 时使用） */
  options?: string[];
  /** 动态数据源标识（valueDomainType=dynamicSelect 时使用） */
  dataSourceId?: string;
  /** 动态数据源选项映射（用于名称→编码反查，隐形传递给后台） */
  dynamicOptions?: DynamicOption[];
  /** 是否只读 */
  readOnly: boolean;
  /** 数据格式（如千分位、百分比等格式化字符串） */
  dataFormat?: string;
  /** 是否必填 */
  required: boolean;
}

/** 默认单元格配置 */
export const DEFAULT_CELL_META: CellMeta = {
  cellRange: '',
  cellType: 'text',
  valueDomainType: 'none',
  readOnly: false,
  dataFormat: '',
  required: false
};

/** 动态数据源选项 */
export interface DynamicOption {
  label: string;
  value: string | number;
  /** 可选扩展字段，如科目编码、科目名称等 */
  extra?: Record<string, any>;
}

/** 数据源加载器：业务层根据标识返回选项列表 */
export type DataSourceLoader = (key: string) => Promise<DynamicOption[]>;

/** 自定义校验器 */
export interface CustomValidator {
  /** 校验名称（如"金额不能为负"） */
  name: string;
  /** 校验函数，返回错误信息；通过则返回 null */
  validate: (value: any, meta: CellMeta) => string | null;
}

/** 表格设计器 Props */
export interface TableDesignerProps {
  /** 画布 JSON（Univer IWorkbookData） */
  modelValue?: any;
  /** 只读模式（已发布且被方案挂载 或 预览态） */
  readonly?: boolean;
  /** 动态数据源加载器 */
  dataSourceLoader?: DataSourceLoader;
  /** 可用数据源标识列表（由业务层注入，公共组件不硬编码） */
  dataSourceKeys?: string[];
  /** 自定义校验器列表 */
  validators?: CustomValidator[];
}

/** 表格设计器 Emits */
export type TableDesignerEmits = {
  (e: 'update:modelValue', data: any): void;
  /** 保存事件，传出画布 JSON */
  (e: 'save', data: any): void;
  /** 预览事件 */
  (e: 'preview', data: any): void;
  /** 内容变更事件 */
  (e: 'change', data: any): void;
};

/** 表格设计器实例暴露方法 */
export interface TableDesignerExpose {
  /** 获取画布 JSON */
  getJSON: () => Promise<any>;
  /** 加载画布 JSON */
  loadJSON: (data: any) => void;
  /** 重置到初始状态 */
  reset: () => void;
  /** 强制画布重绘（容器尺寸变化/数据加载后调用，修复网格空白） */
  refresh: () => void;
  /** 切换预览态 */
  setPreview: (preview: boolean) => void;
}
