export interface PlanVO {
  /**
   * 主键ID
   */
  id: string | number;

  /**
   * 方案编码
   */
  planCode: string;

  /**
   * 方案名称
   */
  planName: string;

  /**
   * 预算年度
   */
  budgetYear: number;

  /**
   * 填报开始日期
   */
  startDate: string;

  /**
   * 填报截止日期
   */
  endDate: string;

  /**
   * 状态: DRAFT=草稿, PUBLISHED=已发布, CLOSED=已关闭, ARCHIVED=已归档
   */
  status: string;

  /**
   * 审批流程JSON配置
   */
  approvalFlow: string;

  /**
   * 方案说明
   */
  description: string;

}

export interface PlanForm extends BaseEntity {
  /**
   * 主键ID
   */
  id?: string | number;

  /**
   * 方案编码
   */
  planCode?: string;

  /**
   * 方案名称
   */
  planName?: string;

  /**
   * 预算年度
   */
  budgetYear?: number;

  /**
   * 填报开始日期
   */
  startDate?: string;

  /**
   * 填报截止日期
   */
  endDate?: string;

  /**
   * 状态: DRAFT=草稿, PUBLISHED=已发布, CLOSED=已关闭, ARCHIVED=已归档
   */
  status?: string;

  /**
   * 审批流程JSON配置
   */
  approvalFlow?: string;

  /**
   * 方案说明
   */
  description?: string;

}

export interface PlanQuery extends PageQuery {

  /**
   * 方案编码
   */
  planCode?: string;

  /**
   * 方案名称
   */
  planName?: string;

  /**
   * 预算年度
   */
  budgetYear?: number;

  /**
   * 填报开始日期
   */
  startDate?: string;

  /**
   * 填报截止日期
   */
  endDate?: string;

  /**
   * 状态: DRAFT=草稿, PUBLISHED=已发布, CLOSED=已关闭, ARCHIVED=已归档
   */
  status?: string;

  /**
   * 审批流程JSON配置
   */
  approvalFlow?: string;

  /**
   * 方案说明
   */
  description?: string;

  /**
   * 日期范围参数
   */
  params?: any;
}
