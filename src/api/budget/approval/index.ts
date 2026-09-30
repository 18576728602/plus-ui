import request from '@/utils/request';
import { AxiosPromise } from 'axios';

// 查询审批列表（填报+调整）
export const listPendingApprovals = (params: any): AxiosPromise<any> => {
  return request({
    url: '/budget/approval/list',
    method: 'get',
    params
  });
};

// 批量审批
export const batchApprove = (data: {
  ids: number[];
  type: 'FILL' | 'ADJUSTMENT';
  action: 'APPROVED' | 'REJECTED';
  remark: string;
}) => {
  return request({
    url: '/budget/approval/batch',
    method: 'post',
    data
  });
};

// 统计概览
export const getApprovalStats = (params?: any): AxiosPromise<any> => {
  return request({
    url: '/budget/approval/stats',
    method: 'get',
    params
  });
};

// 审批轨迹（8.6 时间线）
export const getApprovalTrace = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/approval/trace', method: 'get', params });
};

// 审批转交（8.4 全程留痕）
export const transferApproval = (data: any): AxiosPromise<any> => {
  return request({ url: '/budget/approval/transfer', method: 'post', data });
};

// 审批效率统计（8.5 平均审批时长 + 待办滞留）
export const getApprovalEfficiency = (params?: any): AxiosPromise<any> => {
  return request({ url: '/budget/approval/efficiency', method: 'get', params });
};

// 终审·正式发布（7.1 数据冻结 / 正式版本 V1.0）
export const publishRelease = (data: { planId: number; deptId: number; templateCode?: string }): AxiosPromise<any> => {
  return request({ url: '/budget/release/publish', method: 'post', data });
};

// 审批抄送（会签知情，8.4同源能力）
export const copyApproval = (data: {
  planId: number;
  deptId: number;
  templateCode: string;
  type: 'FILL' | 'ADJUSTMENT';
  receiverIds: number[];
  reason?: string;
}) => {
  return request({
    url: '/budget/approval/copy',
    method: 'post',
    data
  });
};

// 我的抄送（被抄送人视角）
export const listMyCopy = (params?: any): AxiosPromise<any> => {
  return request({
    url: '/budget/approval/myCopy',
    method: 'get',
    params
  });
};

// 标记抄送已读
export const markCopyRead = (ccId: number) => {
  return request({
    url: `/budget/approval/copyRead/${ccId}`,
    method: 'post'
  });
};

// 查询可抄送/转交的候选用户（仅拥有预算审批权限的用户）
export const listCcCandidates = (excludeUserId?: number): AxiosPromise<any> => {
  return request({
    url: '/budget/approval/ccCandidates',
    method: 'get',
    params: { excludeUserId }
  });
};
