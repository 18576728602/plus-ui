import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import { BudgetControlRuleVO, BudgetControlRuleForm, BudgetControlRuleQuery } from './types';

/**
 * 分页查询预算控制规则
 */
export const listBudgetControlRule = (query?: BudgetControlRuleQuery): AxiosPromise<any> => {
  return request({
    url: '/budget/control/list',
    method: 'get',
    params: query
  });
};

/**
 * 新增预算控制规则
 */
export const addBudgetControlRule = (data: BudgetControlRuleForm) => {
  return request({
    url: '/budget/control',
    method: 'post',
    data
  });
};

/**
 * 修改预算控制规则
 */
export const updateBudgetControlRule = (data: BudgetControlRuleForm) => {
  return request({
    url: '/budget/control',
    method: 'put',
    data
  });
};

/**
 * 启停预算控制规则
 */
export const toggleBudgetControlRule = (id: number, enabled: boolean): AxiosPromise<void> => {
  return request({
    url: '/budget/control/toggle/' + id,
    method: 'put',
    params: { enabled }
  });
};

/**
 * 删除预算控制规则
 */
export const delBudgetControlRule = (id: number | Array<number>) => {
  return request({
    url: '/budget/control/' + id,
    method: 'delete'
  });
};

/**
 * 获取适用公司列表（按填报权限限缩，用于"适用单位"下拉）
 */
export const listControlCompanies = (): AxiosPromise<any[]> => {
  return request({
    url: '/budget/templateItem/companies',
    method: 'get'
  });
};

export { BudgetControlRuleVO, BudgetControlRuleForm, BudgetControlRuleQuery };