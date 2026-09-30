import request from '@/utils/request';
import { AxiosPromise } from 'axios';

/** 业务分类视图对象（budget_category，独立分类字典，科目明细按 categoryCode 平铺归属） */
export interface BudgetCategoryVO {
  id?: number;
  /** 分类编码(业务关联唯一键,如 01/02/03...) */
  categoryCode?: string;
  /** 分类名称 */
  categoryName?: string;
  /** 分类下平铺的有效明细科目数 */
  subjectCount?: number;
  sort?: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface BudgetCategoryForm {
  id?: number;
  categoryCode?: string;
  categoryName?: string;
  sort?: number;
  remark?: string;
}

/** 分页查询业务分类 */
export const listBudgetCategoryPage = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/category/page', method: 'get', params });
};

/** 查询业务分类全量(用于筛选下拉/树分组) */
export const listBudgetCategory = (params?: any): AxiosPromise<BudgetCategoryVO[]> => {
  return request({ url: '/budget/category/list', method: 'get', params });
};

/** 获取业务分类详情 */
export const getBudgetCategory = (id: string | number): AxiosPromise<BudgetCategoryVO> => {
  return request({ url: '/budget/category/' + id, method: 'get' });
};

/** 自动生成分类编码 */
export const getBudgetCategoryNextCode = (): AxiosPromise<string> => {
  return request({ url: '/budget/category/nextCode', method: 'get' });
};

/** 新增业务分类 */
export const addBudgetCategory = (data: BudgetCategoryForm): AxiosPromise<void> => {
  return request({ url: '/budget/category', method: 'post', data });
};

/** 修改业务分类 */
export const updateBudgetCategory = (data: BudgetCategoryForm): AxiosPromise<void> => {
  return request({ url: '/budget/category', method: 'put', data });
};

/** 删除业务分类 */
export const delBudgetCategory = (ids: string | number | Array<string | number>): AxiosPromise<void> => {
  return request({ url: '/budget/category/' + ids, method: 'delete' });
};