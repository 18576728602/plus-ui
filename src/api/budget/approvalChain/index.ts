import request from '@/utils/request';
import { AxiosPromise } from 'axios';

// 多级审批链 - 当前用户待审批的链待办
export const listMyPendingChains = (): AxiosPromise<any> => {
  return request({ url: '/budget/approvalChain/myPending', method: 'get' });
};

// 查询某方案+单位最新一轮审批链及各节点
export const getLatestChain = (planId: number, deptId: number): AxiosPromise<any> => {
  return request({ url: '/budget/approvalChain/latest', method: 'get', params: { planId, deptId } });
};

// 推进审批链：通过/驳回
export const advanceChain = (data: any): AxiosPromise<any> => {
  return request({ url: '/budget/approvalChain/advance', method: 'post', data });
};