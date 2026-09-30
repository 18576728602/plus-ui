import request from '@/utils/request';

/** 一键生成预算执行分析报告 */
export function generateReport(params: { planId: number; orgId?: number; period?: string }) {
  return request({
    url: '/budget/report/generate',
    method: 'get',
    params
  });
}

/** 导出预算执行分析报告为 Word(.doc) */
export function exportReport(params: { planId: number; orgId?: number; period?: string }) {
  return request({
    url: '/budget/report/export',
    method: 'post',
    params,
    responseType: 'blob'
  });
}