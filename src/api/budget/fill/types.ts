export interface BudgetFillVo {
  id?: number;
  planId?: number;
  orgId?: number;
  deptId?: number;
  templateCode: string;
  templateName: string;
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
  // 前端计算用的汇总行值（非后端字段）
  _calc?: { budget: number; actual: number };
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
}

export interface BudgetFillBo {
  planId: number;
  orgId?: number;
  deptId?: number;
  templateCode?: string;
  dataVersion?: string;
  items: FillItemBo[];
}
