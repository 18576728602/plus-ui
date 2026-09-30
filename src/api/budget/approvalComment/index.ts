import request from '@/utils/request';
import { AxiosPromise } from 'axios';

// 新增批注
export const addApprovalComment = (data: any): AxiosPromise<any> => {
  return request({ url: '/budget/approvalComment', method: 'post', data });
};

// 查询批注列表
export const listApprovalComments = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/approvalComment/list', method: 'get', params });
};

// 回复批注
export const replyApprovalComment = (id: number | string, replyContent: string, status?: string): AxiosPromise<any> => {
  return request({ url: `/budget/approvalComment/${id}/reply`, method: 'post', params: { replyContent, status } });
};

// 标记批注处理状态
export const handleApprovalComment = (id: number | string, status?: string): AxiosPromise<any> => {
  return request({ url: `/budget/approvalComment/${id}/handle`, method: 'put', params: { status } });
};

// 删除批注
export const delApprovalComment = (id: number | string): AxiosPromise<any> => {
  return request({ url: `/budget/approvalComment/${id}`, method: 'delete' });
};