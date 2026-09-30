export interface SubjectVO extends BaseEntity {
  /**
   * 主键ID
   */
  id: string | number;

  /**
   * 科目编码(SYS全集团唯一/DEPT公司内唯一)
   */
  subjectCode: string;

  /**
   * 科目名称
   */
  subjectName: string;

  /**
   * 父级科目编码(顶层为空)
   */
  parentCode?: string;

  /**
   * 科目层级(1/2/3...)
   */
  level: number;

  /**
   * 同级排序
   */
  sort?: number;

  /**
   * 科目类型:SYS=集团共享/DEPT=公司私有
   */
  subjectType: string;

  /**
   * 归属公司ID(DEPT时必填,SYS为空)
   */
  orgId?: number;

  /**
   * 适用公司ID(逗号分隔,空=全部公司)
   */
  orgScope?: string;

  /**
   * 默认所属预算表(01-16)
   */
  templateCode?: string;

  /**
   * 有效标记:0=停用,1=有效
   */
  validFlag: string;

  /**
   * 是否汇总行:1=汇总行,0=明细行
   */
  isSummary?: number;

  /**
   * 是否可编辑:1=可编辑,0=只读
   */
  isEditable?: number;

  /**
   * 备注
   */
  remark?: string;

  /**
   * 创建时间
   */
  createTime?: string;

  /**
   * 创建人
   */
  createBy?: number;

  /**
   * 修改时间
   */
  updateTime?: string;

  /**
   * 修改人
   */
  updateBy?: number;
}

export interface SubjectForm {
  /**
   * 主键ID
   */
  id?: string | number;

  /**
   * 科目编码
   */
  subjectCode?: string;

  /**
   * 科目名称
   */
  subjectName?: string;

  /**
   * 父级科目编码(顶层为空)
   */
  parentCode?: string;

  /**
   * 科目层级(自动推导)
   */
  level?: number;

  /**
   * 同级排序
   */
  sort?: number;

  /**
   * 科目类型:SYS=集团共享/DEPT=公司私有
   */
  subjectType?: string;

  /**
   * 归属公司ID(DEPT时必填,SYS为空)
   */
  orgId?: number;

  /**
   * 适用公司ID(逗号分隔,空=全部公司)
   */
  orgScope?: string;

  /**
   * 适用公司ID数组(前后端转换用)
   */
  orgScopeArr?: Array<string | number>;

  /**
   * 默认所属预算表(01-16)
   */
  templateCode?: string;

  /**
   * 有效标记:0=停用,1=有效
   */
  validFlag?: string;

  /**
   * 备注
   */
  remark?: string;
}

export interface SubjectQuery extends PageQuery {
  /**
   * 科目编码
   */
  subjectCode?: string;

  /**
   * 科目名称
   */
  subjectName?: string;

  /**
   * 科目类型:SYS/DEPT
   */
  subjectType?: string;

  /**
   * 所属预算表
   */
  templateCode?: string;

  /**
   * 有效标记
   */
  validFlag?: string;

  /**
   * 归属公司ID
   */
  orgId?: number;

  /**
   * 日期范围参数
   */
  params?: any;
}