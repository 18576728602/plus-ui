import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { BudgetModuleVO, BudgetModuleForm, BudgetModuleQuery } from '@/api/budget/budgetModule/types';

/**
 * 查询部门-预算板块映射列表
 * @param query
 * @returns {*}
 */

export const listBudgetModule = (query?: BudgetModuleQuery): AxiosPromise<BudgetModuleVO[]> => {
  return request({
    url: '/system/budgetModule/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询部门-预算板块映射详细
 * @param id
 */
export const getBudgetModule = (id: string | number): AxiosPromise<BudgetModuleVO> => {
  return request({
    url: '/system/budgetModule/' + id,
    method: 'get'
  });
};

/**
 * 新增部门-预算板块映射
 * @param data
 */
export const addBudgetModule = (data: BudgetModuleForm) => {
  return request({
    url: '/system/budgetModule',
    method: 'post',
    data: data
  });
};

/**
 * 修改部门-预算板块映射
 * @param data
 */
export const updateBudgetModule = (data: BudgetModuleForm) => {
  return request({
    url: '/system/budgetModule',
    method: 'put',
    data: data
  });
};

/**
 * 删除部门-预算板块映射
 * @param id
 */
export const delBudgetModule = (id: string | number | Array<string | number>) => {
  return request({
    url: '/system/budgetModule/' + id,
    method: 'delete'
  });
};
