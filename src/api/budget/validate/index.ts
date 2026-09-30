import request from '@/utils/request';
import { AxiosPromise } from 'axios';

// 填报校验（三类：逻辑/合理性/完整性）
export const validateFill = (params: any): AxiosPromise<any> => {
  return request({ url: '/budget/validate', method: 'get', params });
};