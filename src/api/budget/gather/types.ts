export interface GatherMapVO {
  /**
   * 主键ID
   */
  id: string | number;

  /**
   * 方案ID: 0=基础/默认
   */
  planId?: number;

  /**
   * 源部门ID(本部内设部门)
   */
  deptId?: number;

  /**
   * 源部门名称
   */
  deptName?: string;

  /**
   * 源预算表编号(通常为17)
   */
  srcTemplateCode?: string;

  /**
   * 源科目编码(17表明细)
   */
  srcItemCode?: string;

  /**
   * 源科目名称
   */
  srcItemName?: string;

  /**
   * 目标预算表编号(通常为06)
   */
  tgtTemplateCode?: string;

  /**
   * 目标科目编码(06表汇总科目)
   */
  tgtItemCode?: string;

  /**
   * 目标科目名称
   */
  tgtItemName?: string;

  /**
   * 源预算表名称
   */
  srcTemplateName?: string;

  /**
   * 目标预算表名称
   */
  tgtTemplateName?: string;

  /**
   * 目标部门ID(为空=本部)
   */
  tgtDeptId?: number;

  /**
   * 目标部门名称
   */
  tgtDeptName?: string;
}

export interface GatherMapForm {
  /**
   * 主键ID
   */
  id?: string | number;

  /**
   * 方案ID: 0=基础/默认
   */
  planId?: number;

  /**
   * 源部门ID(本部内设部门)
   */
  deptId?: number;

  /**
   * 源部门名称
   */
  deptName?: string;

  /**
   * 源预算表编号(通常为17)
   */
  srcTemplateCode?: string;

  /**
   * 源科目编码(17表明细)
   */
  srcItemCode?: string;

  /**
   * 源科目名称
   */
  srcItemName?: string;

  /**
   * 目标预算表编号(通常为06)
   */
  tgtTemplateCode?: string;

  /**
   * 目标科目编码(06表汇总科目)
   */
  tgtItemCode?: string;

  /**
   * 目标科目名称
   */
  tgtItemName?: string;

  /**
   * 目标部门ID(为空=本部)
   */
  tgtDeptId?: number;

  /**
   * 目标部门名称
   */
  tgtDeptName?: string;
}

export interface GatherMapQuery extends PageQuery {
  /**
   * 方案ID
   */
  planId?: number;

  /**
   * 源部门ID
   */
  deptId?: number;

  /**
   * 目标部门ID
   */
  tgtDeptId?: number;

  /**
   * 源预算表编号
   */
  srcTemplateCode?: string;

  /**
   * 源科目编码
   */
  srcItemCode?: string;

  /**
   * 目标科目编码
   */
  tgtItemCode?: string;
}