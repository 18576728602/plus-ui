export interface TemplateItemVO {
  /**
   * 主键ID
   */
  id: string | number;

  /**
   * 方案ID: 0=基础模板
   */
  planId: number;

  /**
   * 来源方案ID(空/undefined=本方案新增)
   */
  fromPlanId?: number;

  /**
   * 预算表编号(01-16)
   */
  templateCode: string;

  /**
   * 预算表名称
   */
  templateName: string;

  /**
   * 科目编码
   */
  itemCode: string;

  /**
   * 科目名称
   */
  itemName: string;

  /**
   * 上级科目编码
   */
  parentCode: string;

  /**
   * 层级
   */
  itemLevel: number;

  /**
   * 排序号
   */
  itemOrder: number;

  /**
   * 负责部门编码
   */
  responsibleDept: string;

  /**
   * 是否汇总行: 0=否, 1=是
   */
  isSummary: number;

  /**
   * 是否可编辑: 0=否, 1=是
   */
  isEditable: number;

  /**
   * 计算公式(如: SUM(children))
   */
  formula: string;

  /**
   * 适用公司ID(逗号分隔,空=全部公司)
   */
  orgScope?: string;

}

export interface TemplateItemForm extends BaseEntity {
  /**
   * 主键ID
   */
  id?: string | number;

  /**
   * 方案ID: 0=基础模板
   */
  planId?: number;

  /**
   * 预算表编号(01-16)
   */
  templateCode?: string;

  /**
   * 预算表名称
   */
  templateName?: string;

  /**
   * 科目编码
   */
  itemCode?: string;

  /**
   * 科目名称
   */
  itemName?: string;

  /**
   * 上级科目编码
   */
  parentCode?: string;

  /**
   * 层级
   */
  itemLevel?: number;

  /**
   * 排序号
   */
  itemOrder?: number;

  /**
   * 负责部门编码
   */
  responsibleDept?: string;

  /**
   * 是否汇总行: 0=否, 1=是
   */
  isSummary?: number;

  /**
   * 是否可编辑: 0=否, 1=是
   */
  isEditable?: number;

  /**
   * 计算公式(如: SUM(children))
   */
  formula?: string;

  /**
   * 适用公司ID(逗号分隔,空=全部公司)
   */
  orgScope?: string;

}

export interface BudgetCompany {
  deptId: number;
  deptName: string;
}

export interface SubjectImportForm {
  /**
   * 目标方案ID
   */
  planId: string | number;

  /**
   * 选中的科目主数据ID集合
   */
  subjectIds: Array<string | number>;
}

export interface TemplateItemQuery extends PageQuery {
  /**
   * 方案ID: 0=基础模板
   */
  planId?: number;

  /**
   * 预算表编号(01-16)
   */
  templateCode?: string;

  /**
   * 预算表名称
   */
  templateName?: string;

  /**
   * 科目编码
   */
  itemCode?: string;

  /**
   * 科目名称
   */
  itemName?: string;

  /**
   * 上级科目编码
   */
  parentCode?: string;

  /**
   * 层级
   */
  itemLevel?: number;

  /**
   * 排序号
   */
  itemOrder?: number;

  /**
   * 负责部门编码
   */
  responsibleDept?: string;

  /**
   * 是否汇总行: 0=否, 1=是
   */
  isSummary?: number;

  /**
   * 是否可编辑: 0=否, 1=是
   */
  isEditable?: number;

  /**
   * 计算公式(如: SUM(children))
   */
  formula?: string;

  /**
   * 日期范围参数
   */
  params?: any;
}
