export interface SubjectMasterVO {
  id: number;
  subjectCode: string;
  subjectName: string;
  parentCode?: string;
  level?: number;
  sort?: number;
  subjectType?: 'SYS' | 'DEPT';
  orgId?: number;
  orgScope?: string;
  templateCode?: string;
  budgetYear?: number;
  templateId?: number;
  /** 挂接引用数(同 budget_template_item.ref_subject_id 行数, 含方案挂接 + 预算表挂载) */
  refCount?: number;
  /** 生效标记:0=停用,1=有效 */
  validFlag?: string;
  /** 是否汇总行:1=汇总/大类,0=明细 */
  isSummary?: number;
  /** 是否可编辑:1=可编辑,0=只读 */
  isEditable?: number;
  /** 行类型:HEAD=分组/表头, ITEM=明细可填报, SUM=汇总(子级累加), REF=只读基准(上一年实际等) */
  rowType?: 'HEAD' | 'ITEM' | 'SUM' | 'REF';
  /** 业务分类编码(引用 budget_category.category_code,如 01=公司基本信息/02=营业收入；空=未分类) */
  categoryCode?: string;
  /** 小数位:CURRENCY/PERCENT可配(0-6,默认2),NUMBER固定0(整数/人数类禁小数),TEXT不适用 */
  decimalPlaces?: number;
  /** 分类分组虚拟节点标记(方案A：分类独立成 budget_category 表，树顶层为分类分组节点，其下平铺明细) */
  _isCategory?: boolean;
  /** 创建时间(用于科目明细页按创建先后排序) */
  createTime?: string | number | Date;
  /** 分类分组节点名称(仅 _isCategory=true 时有效，来自 budget_category.category_name) */
  categoryName?: string;
  /** 树形子节点(前端组装树时填充) */
  children?: SubjectMasterVO[];
}

export interface SubjectMasterForm {
  id?: number;
  subjectCode?: string;
  subjectName?: string;
  parentCode?: number | string;
  level?: number;
  sort?: number;
  subjectType?: 'SYS' | 'DEPT';
  orgId?: number;
  orgScope?: string;
  templateCode?: string;
  templateId?: number;
  budgetYear?: number;
  validFlag?: string;
  rowType?: 'HEAD' | 'ITEM' | 'SUM' | 'REF';
  /** 业务分类编码 */
  categoryCode?: string;
  /** 数据类型: CURRENCY=货币金额/NUMBER=普通数字/PERCENT=百分比/TEXT=文本 */
  dataType?: 'CURRENCY' | 'NUMBER' | 'PERCENT' | 'TEXT';
  /** 计量单位(如 元/万元/人/%) */
  unit?: string;
  /** 是否参与汇总取数 */
  participateSummary?: boolean;
  /** 是否必填(完整性校验) */
  requiredFlag?: boolean;
  /** 是否计算项(公式科目) */
  isFormula?: boolean;
  /** 小数位:CURRENCY/PERCENT可配(0-6,默认2),NUMBER固定0(整数/人数类禁小数),TEXT不适用 */
  decimalPlaces?: number;
}

export interface SubjectMasterQuery {
  /** 科目类型:空=全部, SYS=集团共享, DEPT=公司私有 */
  subjectType?: string;
  keyword?: string;
  categoryCode?: string;
  orgId?: number;
  showDisabled?: boolean;
  /** 是否保留 HEAD 分组表头为可展开父节点(科目明细页=true；预算表挂载等出稿场景默认 false 透明化) */
  keepHead?: boolean;
  /** 方案A：是否按分类分组生成树(科目明细页=true，树顶层为分类分组节点；挂载页默认 false) */
  groupByCategory?: boolean;
  templateCode?: string;
  budgetYear?: number;
  templateId?: number;
}