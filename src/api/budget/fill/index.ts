import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import type { BudgetFillVo, BudgetFillBo } from './types';

/**
 * 获取当前登录人的填报单位（含格式化显示名）
 */
export const getMyUnit = (): AxiosPromise<any> => {
  return request({
    url: '/budget/fill/myUnit',
    method: 'get'
  });
};

/**
 * 获取单个预算表填报数据
 */
export const getFillData = (params: { planId: number; templateCode: string; deptId?: number }): AxiosPromise<BudgetFillVo[]> => {
  return request({
    url: '/budget/fill/getFillData',
    method: 'get',
    params
  });
};

/**
 * 获取所有板块填报数据
 */
export const getAllFillData = (params: { planId: number; deptId?: number }): AxiosPromise<BudgetFillVo[]> => {
  return request({
    url: '/budget/fill/getAllFillData',
    method: 'get',
    params
  });
};

/**
 * 保存草稿
 */
export const saveDraft = (data: BudgetFillBo): AxiosPromise<void> => {
  return request({
    url: '/budget/fill/saveDraft',
    method: 'post',
    data
  });
};

/**
 * 提交审批
 */
export const submitFill = (data: BudgetFillBo): AxiosPromise<void> => {
  return request({
    url: '/budget/fill/submit',
    method: 'post',
    data
  });
};

/**
 * 获取预算方案列表（已发布+已归档）
 */
export const listPlan = (): AxiosPromise<any[]> => {
  return request({
    url: '/budget/plan/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 100 }
  });
};

/**
 * 获取部门列表（公司）
 */
export const listDept = (): AxiosPromise<any[]> => {
  return request({
    url: '/system/dept/list',
    method: 'get'
  });
};
