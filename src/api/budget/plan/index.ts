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
