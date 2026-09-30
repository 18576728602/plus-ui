import request from '@/utils/request';
import type { AxiosPromise } from 'axios';

export interface ExecutionSummary {
  totalBudget: number;
  totalExecution: number;
  totalLastActual: number;
  executionRate: number;
  deviation: number;
  itemCount: number;
  executedCount: number;
  unexecutedCount: number;
}

export const getExecutionList = (params: {
  planId: number;
  orgId?: number;
  templateCode?: string;
}): AxiosPromise<any[]> => {
  return request({
    url: '/budget/execution/list',
    method: 'get',
    params
  });
};

export const getExecutionSummary = (params: {
  planId: number;
  orgId?: number;
}): AxiosPromise<ExecutionSummary> => {
  return request({
    url: '/budget/execution/summary',
    method: 'get',
    params
  });
};

export const inputExecution = (data: {
  planId: number;
  orgId: number;
  templateCode: string;
  itemCode: string;
  q1Amount?: number;
  q2Amount?: number;
  q3Amount?: number;
  q4Amount?: number;
}): AxiosPromise<void> => {
  return request({
    url: '/budget/execution/input',
    method: 'post',
    params: data
  });
};
