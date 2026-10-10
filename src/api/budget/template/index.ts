import request from '@/utils/request';
import type { AxiosPromise } from 'axios';

export interface BudgetTemplateType {
  id?: number;
  templateCode?: string;
  templateName?: string;
  status?: string;
  createBy?: string;
  createTime?: string;
  updateTime?: string;
  budgetYear?: number;
  subjectCount?: number;
  templateId?: number;
  /** 表说明(用途) */
  remark?: string;
  /** 实际完成列名(画布表头) */
  actualLabel?: string;
  /** 预算值列名(画布表头,展示为 {年度}年{列名}) */
  budgetLabel?: string;
  /** 复制目标年份（复制接口使用） */
  targetYear?: number;
  /** 分类:BUSINESS=经营预算/CAPITAL=资本预算/SPECIAL=专项预算 */
  category?: string;
  /** 预算表张数（工作表数量） */
  budgetTableCount?: number;
  /** 字段数（挂载科目数） */
  fieldCount?: number;
  /** 是否被已发布方案挂载（锁定） */
  locked?: boolean;
  /** 负责人名称 */
  ownerName?: string;
  /** 画布设计 JSON（Univer 工作簿快照，对应后端 design_json 字段） */
  designJson?: any;
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
 * 查询预算模板列表，可按年度过滤（同一编码可存在多个年度版本）
 */
export interface TemplateQuery {
  keyword?: string;
  category?: string;
  status?: string;
  budgetYear?: number;
  pageNum?: number;
  pageSize?: number;
  /** 排序字段(prop): templateCode/templateName/budgetYear/category/status/createTime/ownerName */
  orderByColumn?: string;
  /** 排序方向: ascending/descending */
  isAsc?: string;
}
export const listBudgetTemplate = (query?: TemplateQuery): AxiosPromise<any> => {
  return request({
    url: '/budget/template/list',
    method: 'get',
    params: query || {}
  });
};

/** 分类Tab统计 */
export const getTemplateStats = (): AxiosPromise<Record<string, number>> => {
  return request({
    url: '/budget/template/stats',
    method: 'get'
  });
};

/**
 * 获取单个预算模板完整数据（含 designJson，list 接口不返回此大字段）
 */
export const getBudgetTemplateById = (id: number): AxiosPromise<BudgetTemplateType> => {
  return request({
    url: `/budget/template/${id}`,
    method: 'get'
  });
};

/**
 * 新增预算模板
 */
export const addBudgetTemplate = (data: BudgetTemplateType) => {
  return request({
    url: '/budget/template',
    method: 'post',
    data: data
  });
};

/**
 * 修改预算模板
 */
export const updateBudgetTemplate = (data: BudgetTemplateType) => {
  return request({
    url: '/budget/template',
    method: 'put',
    data: data
  });
};

/**
 * 删除预算模板（按 id）
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
