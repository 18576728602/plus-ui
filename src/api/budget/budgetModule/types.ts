export interface BudgetModuleVO {
  /**
   * 主键ID
   */
  id: string | number;

  /**
   * 部门ID
   */
  deptId: string | number;

  /**
   * 预算表编号
   */
  templateCode: string;

  /**
   * 负责科目编码列表(逗号分隔)
   */
  itemCodes: string;

}

export interface BudgetModuleForm extends BaseEntity {
  /**
   * 主键ID
   */
  id?: string | number;

  /**
   * 部门ID
   */
  deptId?: string | number;

  /**
   * 预算表编号
   */
  templateCode?: string;

  /**
   * 负责科目编码列表(逗号分隔)
   */
  itemCodes?: string;

}

export interface BudgetModuleQuery extends PageQuery {

  /**
   * 部门ID
   */
  deptId?: string | number;

  /**
   * 预算表编号
   */
  templateCode?: string;

  /**
   * 负责科目编码列表(逗号分隔)
   */
  itemCodes?: string;

  /**
   * 日期范围参数
   */
  params?: any;
}
