import request from '@/utils/request';

/**
 * 概览卡
 */
export function getAnalysisOverview(params) {
  return request({
    url: '/budget/analysis/overview',
    method: 'get',
    params
  });
}

/**
 * 差异归因列表
 */
export function getAnalysis(params) {
  return request({
    url: '/budget/analysis/analyze',
    method: 'get',
    params
  });
}