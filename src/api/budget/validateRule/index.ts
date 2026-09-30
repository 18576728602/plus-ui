import request from '@/utils/request';
import type { AxiosPromise } from 'axios';

export interface ValidateRule {
  id?: number;
  ruleType: string;
  ruleName: string;
  ruleLevel: string;
  enabled: number;
  thresholdValue?: number;
  sortOrder: number;
  description?: string;
}

export const listValidateRules = (): AxiosPromise<ValidateRule[]> => {
  return request({ url: '/budget/validateRule/list', method: 'get' });
};

export const getValidateRule = (id: number): AxiosPromise<ValidateRule> => {
  return request({ url: `/budget/validateRule/${id}`, method: 'get' });
};

export const addValidateRule = (data: ValidateRule) => {
  return request({ url: '/budget/validateRule', method: 'post', data });
};

export const updateValidateRule = (data: ValidateRule) => {
  return request({ url: '/budget/validateRule', method: 'put', data });
};

export const delValidateRule = (id: number) => {
  return request({ url: `/budget/validateRule/${id}`, method: 'delete' });
};

export const toggleValidateRuleEnabled = (id: number, enabled: number) => {
  return request({ url: '/budget/validateRule/toggleEnabled', method: 'put', params: { id, enabled } });
};
