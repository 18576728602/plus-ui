export interface BudgetFillVo {
  id?: number;
  planId?: string | number;
  orgId?: number;
  deptId?: number;
  templateCode: string;
  templateName: string;
  /** 板块标题（模板设计画布标题行文本，用于板块折叠标题展示） */
  title?: string;
  /** 预算表ID(字段可见性规则 template_id 维度) */
  templateId?: number;
  /** 科目主数据ID(字段可见性规则按此关联;空=无主数据引用) */
  refSubjectId?: number;
  itemCode: string;
  itemName: string;
  parentCode?: string;
  itemLevel: number;
  itemOrder: number;
  isSummary: number;
  isEditable: number;
  formula?: string;
  lastActual?: number;
  budgetAmount?: number;
  executionAmount?: number;
  remark?: string;
  status: string;
  // 设计器格式配置（本年预算列；上年实际列前端复用同格式）
  inputType?: 'TEXT' | 'NUMBER' | 'INTEGER' | 'SELECT';
  decimals?: number | null;
  unit?: string;
  options?: string[];
  allowEmpty?: boolean;
  budgetLabel?: string;
  actualLabel?: string;
  lastActualText?: string;
  // 模板设计画布列配置（后端解析 design_json 回填）
  subjectLabel?: string;
  showDiff?: boolean;
  showDiffRate?: boolean;
  diffLabel?: string;
  diffRateLabel?: string;
  // 前端计算用的汇总行值（非后端字段）
  _calc?: { budget: number | null; actual: number | null };
  // AI 预填标记：智能预填产生的值，浅蓝高亮，待用户采纳/忽略
  _prefilled?: boolean;
  _prefillValue?: number;
}

export interface FillItemBo {
  id?: number;
  itemCode: string;
  templateCode: string;
  budgetAmount?: number | null;
  lastActual?: number | null;
  remark?: string;
  inputType?: 'TEXT' | 'NUMBER' | 'INTEGER' | 'SELECT';
  lastActualText?: string;
}

export interface BudgetFillBo {
  planId: string | number;
  submitReason?: string;
  /** 提交附件URL（逗号分隔），审批人可见 */
  attachment?: string;
  orgId?: number;
  deptId?: number;
  templateCode?: string;
  dataVersion?: string;
  items: FillItemBo[];
}
