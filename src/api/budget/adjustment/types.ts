export interface AdjustmentVO {
  /**
   * 主键ID
   */
  id: string | number;

  /**
   * 预算方案ID
   */
  planId: string | number;

  /**
   * 调整单位
   */
  orgId: string | number;

  /**
   * 预算表编号
   */
  templateCode: string;

  /**
   * 调整科目编码
   */
  itemCode: string;

  /**
   * 原预算金额
   */
  originalAmount: number;

  /**
   * 调整金额(正数增加,负数减少)
   */
  adjustAmount: number;

  /**
   * 调整后金额
   */
  adjustedAmount: number;

  /**
   * 调整日期
   */
  adjustDate: string;

  /**
   * 调整原因
   */
  reason: string;

  /**
   * 状态: PENDING=待审批, APPROVED=已通过, REJECTED=已驳回
   */
  status: string;

  /**
   * 申请人
   */
  applicantId: string | number;

  /**
   * 申请人姓名
   */
  applicantName: string;

  /**
   * 审批人
   */
  approverId: string | number;

  /**
   * 审批人姓名
   */
  approverName: string;

  /**
   * 审批时间
   */
  approveTime: string;

  /**
   * 审批意见
   */
  approveRemark: string;

}

export interface AdjustmentForm extends BaseEntity {
  /**
   * 主键ID
   */
  id?: string | number;

  /**
   * 预算方案ID
   */
  planId?: string | number;

  /**
   * 调整单位
   */
  orgId?: string | number;

  /**
   * 预算表编号
   */
  templateCode?: string;

  /**
   * 调整科目编码
   */
  itemCode?: string;

  /**
   * 原预算金额
   */
  originalAmount?: number;

  /**
   * 调整金额(正数增加,负数减少)
   */
  adjustAmount?: number;

  /**
   * 调整后金额
   */
  adjustedAmount?: number;

  /**
   * 调整日期
   */
  adjustDate?: string;

  /**
   * 调整原因
   */
  reason?: string;

  /**
   * 状态: PENDING=待审批, APPROVED=已通过, REJECTED=已驳回
   */
  status?: string;

  /**
   * 申请人
   */
  applicantId?: string | number;

  /**
   * 申请人姓名
   */
  applicantName?: string;

  /**
   * 审批人
   */
  approverId?: string | number;

  /**
   * 审批人姓名
   */
  approverName?: string;

  /**
   * 审批时间
   */
  approveTime?: string;

  /**
   * 审批意见
   */
  approveRemark?: string;

}

export interface AdjustmentQuery extends PageQuery {

  /**
   * 预算方案ID
   */
  planId?: string | number;

  /**
   * 调整单位
   */
  orgId?: string | number;

  /**
   * 预算表编号
   */
  templateCode?: string;

  /**
   * 调整科目编码
   */
  itemCode?: string;

  /**
   * 原预算金额
   */
  originalAmount?: number;

  /**
   * 调整金额(正数增加,负数减少)
   */
  adjustAmount?: number;

  /**
   * 调整后金额
   */
  adjustedAmount?: number;

  /**
   * 调整日期
   */
  adjustDate?: string;

  /**
   * 调整原因
   */
  reason?: string;

  /**
   * 状态: PENDING=待审批, APPROVED=已通过, REJECTED=已驳回
   */
  status?: string;

  /**
   * 申请人
   */
  applicantId?: string | number;

  /**
   * 申请人姓名
   */
  applicantName?: string;

  /**
   * 审批人
   */
  approverId?: string | number;

  /**
   * 审批人姓名
   */
  approverName?: string;

  /**
   * 审批时间
   */
  approveTime?: string;

  /**
   * 审批意见
   */
  approveRemark?: string;

  /**
   * 日期范围参数
   */
  params?: any;
}
