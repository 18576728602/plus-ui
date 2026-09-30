import request from '@/utils/request';
import type { AxiosPromise } from 'axios';

export interface BudgetTemplateType {
  id?: number;
  templateCode?: string;
  templateName?: string;
  sortOrder?: number;
  status?: string;
  createBy?: string;
  createTime?: string;
  budgetYear?: number;
  subjectCount?: number;
  templateId?: number;
  /** 表类型: BASE=基础表/TEXT=文本表/SPECIAL=特种表 */
  templateType?: string;
  /** 表说明(用途) */
  remark?: string;
  /** 实际完成列名(画布表头) */
  actualLabel?: string;
  /** 预算值列名(画布表头,展示为 {年度}年{列名}) */
  budgetLabel?: string;
  /** 复制目标年份（复制接口使用） */
  targetYear?: number;
}

/**
 * 获取自动生成的预算表编码(B+全局最大序号+1)
 */
export const nextBudgetTemplateCode = (): AxiosPromise<string> => {
  return request({
    url: '/budget/template/nextCode',
    method: 'get'
  });
};

/**
 * 查询预算表模板列表，可按年度过滤（同一编码可存在多个年度版本）
 */
export const listBudgetTemplate = (budgetYear?: number): AxiosPromise<BudgetTemplateType[]> => {
  return request({
    url: '/budget/template/list',
    method: 'get',
    params: budgetYear ? { budgetYear } : undefined
  });
};

/**
 * 新增预算表模板
 */
export const addBudgetTemplate = (data: BudgetTemplateType) => {
  return request({
    url: '/budget/template',
    method: 'post',
    data: data
  });
};

/**
 * 修改预算表模板
 */
export const updateBudgetTemplate = (data: BudgetTemplateType) => {
  return request({
    url: '/budget/template',
    method: 'put',
    data: data
  });
};

/**
 * 删除预算表模板（按 id）
 */
export const delBudgetTemplate = (id: number) => {
  return request({
    url: `/budget/template/${id}`,
    method: 'delete'
  });
};

/**
 * 复制预算表：将源预算表及其挂载的科目清单深复制到目标年度，便于下一年填报直接复用结构
 */
export const copyBudgetTemplate = (data: { id: number; targetYear: number; templateName?: string }) => {
  return request({
    url: '/budget/template/copy',
    method: 'post',
    data: data
  });
};

/**
 * 查询某预算表已挂载的科目清单(扁平)，用于组装该表自身的科目树
 */
export const getTemplateItems = (templateId: number, budgetYear?: number): AxiosPromise<BudgetTemplateItemType[]> => {
  return request({
    url: '/budget/template/items',
    method: 'get',
    params: { templateId, budgetYear }
  });
};

/**
 * 从科目主数据「挂载」一组科目到某预算表(自动补全祖先链、跳过已挂载)
 */
export const mountTemplateSubjects = (data: { templateId: number; subjectIds: number[] }) => {
  return request({
    url: '/budget/template/mount',
    method: 'post',
    data: data
  });
};

/**
 * 解挂：从某预算表移除若干已挂载科目（按该表挂载行 id 逻辑删除，不改主数据）
 */
export const unmountTemplateSubjects = (data: { templateId: number; itemIds: number[] }) => {
  return request({
    url: '/budget/template/unmount',
    method: 'post',
    data: data
  });
};

/**
 * 更新预算表挂载科目的属性（公式、排序、是否汇总、是否可编辑等）
 */
export const updateTemplateItem = (data: BudgetTemplateItemType) => {
  return request({
    url: '/budget/template/item',
    method: 'put',
    data: data
  });
};

/**
 * 新增预算表挂载行（画布新增的分类标题/汇总/链接/备注/计算行等落库）
 */
export const addTemplateItem = (data: BudgetTemplateItemType) => {
  return request({
    url: '/budget/template/item',
    method: 'post',
    data: data
  });
};

/**
 * 删除预算表挂载行（仅用于模板自有行：新增的分类标题/汇总/链接/备注/计算行等）
 */
export const delTemplateItems = (ids: (number | string)[]) => {
  return request({
    url: '/budget/template/item/' + ids,
    method: 'delete'
  });
};

export interface BudgetTemplateItemType {
  id?: number;
  planId?: number | 0;
  templateId?: number;
  budgetYear?: number;
  templateCode?: string;
  templateName?: string;
  itemCode?: string;
  itemName?: string;
  parentCode?: string;
  itemLevel?: number;
  itemOrder?: number;
  responsibleDept?: string;
  isSummary?: number;
  isEditable?: number;
  formula?: string;
  orgScope?: string;
  /** 行类型: HEAD/ITEM/SUM/REF/LINK/NOTE/CALC(空=按明细推断) */
  rowType?: string;
  /** 单元格自定义内容(JSON: {列key: 文本}, Excel 式自由填写) */
  cellData?: string;
  refSubjectId?: number;
}
