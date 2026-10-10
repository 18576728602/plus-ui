import request from '@/utils/request';
import { AxiosPromise } from 'axios';

/** 查询预算方案列表 */
export const listPlan = (params?: any): AxiosPromise<any> => {
  return request({ url: '/budget/plan/list', method: 'get', params });
};

/** 查询预算方案详细 */
export const getPlan = (id: string | number): AxiosPromise<any> => {
  return request({ url: '/budget/plan/' + id, method: 'get' });
};

/** 新增预算方案 */
export const addPlan = (data: any): AxiosPromise<number> => {
  return request({ url: '/budget/plan', method: 'post', data });
};

/** 修改预算方案 */
export const updatePlan = (data: any): AxiosPromise<void> => {
  return request({ url: '/budget/plan', method: 'put', data });
};

/** 删除预算方案 */
export const delPlan = (id: string | number | Array<string | number>): AxiosPromise<void> => {
  return request({ url: '/budget/plan/' + id, method: 'delete' });
};

/** 修改方案状态 */
export const changePlanStatus = (id: string | number, status: string): AxiosPromise<void> => {
  return request({ url: '/budget/plan/changeStatus', method: 'put', data: { id, status } });
};

/** 撤销归档 */
export const unarchivePlan = (id: string | number): AxiosPromise<void> => {
  return request({ url: `/budget/plan/${id}/unarchive`, method: 'put' });
};

/** 撤销作废 */
export const unvoidPlan = (id: string | number): AxiosPromise<void> => {
  return request({ url: `/budget/plan/${id}/unvoid`, method: 'put' });
};

/** 恢复已删除方案 */
export const restorePlan = (id: string | number): AxiosPromise<void> => {
  return request({ url: `/budget/plan/${id}/restore`, method: 'put' });
};

/** 查询参与填报的公司列表（集团下子公司） */
export interface BudgetCompany {
  deptId: number;
  deptName: string;
}
export const listPlanCompanies = (): AxiosPromise<BudgetCompany[]> => {
  return request({ url: '/budget/plan/companies', method: 'get' });
};

/** 预算模板（挂载用） */
export interface BudgetTemplateMount {
  id: number;
  templateCode: string;
  templateName: string;
  budgetYear: number;
  category: string;
  status: string;
}

/** 查询方案已挂载的模板 */
export const listMountedTemplates = (planId: number | string): AxiosPromise<BudgetTemplateMount[]> => {
  return request({ url: `/budget/plan/${planId}/templates/mounted`, method: 'get' });
};

/** 查询可挂载的模板（已发布且未挂载） */
export const listAvailableTemplates = (planId: number | string): AxiosPromise<BudgetTemplateMount[]> => {
  return request({ url: `/budget/plan/${planId}/templates/available`, method: 'get' });
};

/** 挂载模板到方案 */
export const mountPlanTemplates = (planId: number | string, templateIds: number[]): AxiosPromise<void> => {
  return request({ url: `/budget/plan/${planId}/templates/mount`, method: 'post', data: templateIds });
};

/** 从方案解挂模板 */
export const unmountPlanTemplates = (planId: number | string, templateIds: number[]): AxiosPromise<void> => {
  return request({ url: `/budget/plan/${planId}/templates/unmount`, method: 'delete', data: templateIds });
};