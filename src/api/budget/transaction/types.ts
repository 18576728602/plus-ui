export interface TransactionVO {
  /**
   * 主键ID
   */
  id: string | number;

  /**
   * 预算方案ID
   */
  planId: string | number;

  /**
   * 借出方组织ID
   */
  lenderOrgId: string | number;

  /**
   * 借入方组织ID
   */
  borrowerOrgId: string | number;

  /**
   * 交易类型: LOAN=统借统贷, FUND_TRANSFER=闲置资金调剂, INTERNAL_SALE=内部购销
   */
  tradeType: string;

  /**
   * 金额(万元)
   */
  amount: number;

  /**
   * 利率
   */
  interestRate: number;

  /**
   * 开始日期
   */
  startDate: string;

  /**
   * 结束日期
   */
  endDate: string;

  /**
   * 是否已配对: 0=否, 1=是
   */
  matched: number;

  /**
   * 备注
   */
  remark: string;

}

export interface TransactionForm extends BaseEntity {
  /**
   * 主键ID
   */
  id?: string | number;

  /**
   * 预算方案ID
   */
  planId?: string | number;

  /**
   * 借出方组织ID
   */
  lenderOrgId?: string | number;

  /**
   * 借入方组织ID
   */
  borrowerOrgId?: string | number;

  /**
   * 交易类型: LOAN=统借统贷, FUND_TRANSFER=闲置资金调剂, INTERNAL_SALE=内部购销
   */
  tradeType?: string;

  /**
   * 金额(万元)
   */
  amount?: number;

  /**
   * 利率
   */
  interestRate?: number;

  /**
   * 开始日期
   */
  startDate?: string;

  /**
   * 结束日期
   */
  endDate?: string;

  /**
   * 是否已配对: 0=否, 1=是
   */
  matched?: number;

  /**
   * 备注
   */
  remark?: string;

}

export interface TransactionQuery extends PageQuery {

  /**
   * 预算方案ID
   */
  planId?: string | number;

  /**
   * 借出方组织ID
   */
  lenderOrgId?: string | number;

  /**
   * 借入方组织ID
   */
  borrowerOrgId?: string | number;

  /**
   * 交易类型: LOAN=统借统贷, FUND_TRANSFER=闲置资金调剂, INTERNAL_SALE=内部购销
   */
  tradeType?: string;

  /**
   * 金额(万元)
   */
  amount?: number;

  /**
   * 利率
   */
  interestRate?: number;

  /**
   * 开始日期
   */
  startDate?: string;

  /**
   * 结束日期
   */
  endDate?: string;

  /**
   * 是否已配对: 0=否, 1=是
   */
  matched?: number;

  /**
   * 日期范围参数
   */
  params?: any;
}
