export interface DataVO {
  /**
   * 主键ID
   */
  id: string | number;

  /**
   * 预算方案ID
   */
  planId: string | number;

  /**
   * 组织ID(单位)
   */
  orgId: string | number;

  /**
   * 部门ID(集团本部部门填报时)
   */
  deptId: string | number;

  /**
   * 预算表编号
   */
  templateCode: string;

  /**
   * 科目编码
   */
  itemCode: string;

  /**
   * 预算金额
   */
  budgetAmount: number;

  /**
   * 上年实际金额
   */
  lastActual: number;

  /**
   * 实际执行金额
   */
  executionAmount: number;

  /**
   * 数据版本: BUDGET=预算数, ACTUAL=上年实际, EXECUTION=执行数
   */
  dataVersion: string;

  /**
   * 填报说明
   */
  remark: string;

  /**
   * 状态: DRAFT=草稿, SUBMITTED=已提交, APPROVED=已审批, REJECTED=已驳回
   */
  status: string;

}

export interface DataForm extends BaseEntity {
  /**
   * 主键ID
   */
  id?: string | number;

  /**
   * 预算方案ID
   */
  planId?: string | number;

  /**
   * 组织ID(单位)
   */
  orgId?: string | number;

  /**
   * 部门ID(集团本部部门填报时)
   */
  deptId?: string | number;

  /**
   * 预算表编号
   */
  templateCode?: string;

  /**
   * 科目编码
   */
  itemCode?: string;

  /**
   * 预算金额
   */
  budgetAmount?: number;

  /**
   * 上年实际金额
   */
  lastActual?: number;

  /**
   * 实际执行金额
   */
  executionAmount?: number;

  /**
   * 数据版本: BUDGET=预算数, ACTUAL=上年实际, EXECUTION=执行数
   */
  dataVersion?: string;

  /**
   * 填报说明
   */
  remark?: string;

  /**
   * 状态: DRAFT=草稿, SUBMITTED=已提交, APPROVED=已审批, REJECTED=已驳回
   */
  status?: string;

}

export interface DataQuery extends PageQuery {

  /**
   * 预算方案ID
   */
  planId?: string | number;

  /**
   * 组织ID(单位)
   */
  orgId?: string | number;

  /**
   * 部门ID(集团本部部门填报时)
   */
  deptId?: string | number;

  /**
   * 预算表编号
   */
  templateCode?: string;

  /**
   * 科目编码
   */
  itemCode?: string;

  /**
   * 预算金额
   */
  budgetAmount?: number;

  /**
   * 上年实际金额
   */
  lastActual?: number;

  /**
   * 实际执行金额
   */
  executionAmount?: number;

  /**
   * 数据版本: BUDGET=预算数, ACTUAL=上年实际, EXECUTION=执行数
   */
  dataVersion?: string;

  /**
   * 状态: DRAFT=草稿, SUBMITTED=已提交, APPROVED=已审批, REJECTED=已驳回
   */
  status?: string;

  /**
   * 日期范围参数
   */
  params?: any;
}
