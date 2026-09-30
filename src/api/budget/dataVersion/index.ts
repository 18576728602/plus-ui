import request from '@/utils/request';
import { AxiosPromise } from 'axios';

// 版本历史摘要
export const listDataVersions = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/dataVersion/list', method: 'get', params });
};

// 两个版本对比（V1 vs V2）
export const compareDataVersions = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/dataVersion/compare', method: 'get', params });
};

// 恢复历史版本（从版本快照回写当前草稿）
export const restoreDataVersion = (data: any): AxiosPromise<any> => {
  return request({ url: '/budget/dataVersion/restore', method: 'post', data });
};