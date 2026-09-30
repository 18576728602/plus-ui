import request from '@/utils/request';
import { AxiosPromise } from 'axios';

// 目标下达公司列表
export const listTargetCompanies = (planId: number): AxiosPromise<any> => {
  return request({ url: '/budget/target/companies', method: 'get', params: { planId } });
};

// 目标明细/版本
export const getTargetDetail = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/target/detail', method: 'get', params });
};

// 目标编辑科目集
export const getTargetBuildItems = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/target/buildItems', method: 'get', params });
};

// 保存目标草稿
export const saveTargetDraft = (data: any): AxiosPromise<any> => {
  return request({ url: '/budget/target/draft', method: 'post', data });
};

// 下达目标
export const publishTarget = (planId: number, deptId: number): AxiosPromise<any> => {
  return request({ url: '/budget/target/publish', method: 'put', params: { planId, deptId } });
};

// 目标版本历史
export const listTargetHistory = (planId: number, deptId: number): AxiosPromise<any> => {
  return request({ url: '/budget/target/history', method: 'get', params: { planId, deptId } });
};

// 子公司只读查看目标（填报页用）
export const getMyTargets = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/target/my', method: 'get', params });
};

// 目标 vs 实际填报 对比
export const compareTargetFill = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/target/compareFill', method: 'get', params });
};