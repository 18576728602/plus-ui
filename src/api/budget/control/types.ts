/**
 * 预算控制规则视图对象
 */
export interface BudgetControlRuleVO {
  id?: number;
  planId?: number;
  orgId?: number;
  templateCode?: string;
  controlStrength?: string;
  warnPercent?: number;
  blockPercent?: number;
  controlScope?: string;
  sortOrder?: number;
  enabled?: boolean;
  remark?: string;
}

/**
 * 预算控制规则表单对象
 */
export interface BudgetControlRuleForm {
  id?: number;
  planId?: number;
  orgId?: number;
  templateCode?: string;
  controlStrength?: string;
  warnPercent?: number;
  blockPercent?: number;
  controlScope?: string;
  sortOrder?: number;
  enabled?: boolean;
  remark?: string;
}

/**
 * 预算控制规则查询对象
 */
export interface BudgetControlRuleQuery extends PageQuery {
  planId?: number;
  orgId?: number;
  templateCode?: string;
  controlStrength?: string;
  controlScope?: string;
  enabled?: boolean;
}