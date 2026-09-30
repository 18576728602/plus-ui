import request from '@/utils/request';

/** 获取集团总览 */
export function getOverview(planId: number) {
  return request({
    url: '/budget/summary/overview',
    method: 'get',
    params: { planId }
  });
}

/** 获取各单位填报汇总 */
export function getDeptSummaryList(planId: number) {
  return request({
    url: '/budget/summary/deptSummary',
    method: 'get',
    params: { planId }
  });
}

/** 获取各板块汇总 */
export function getTemplateSummaryList(planId: number) {
  return request({
    url: '/budget/summary/templateSummary',
    method: 'get',
    params: { planId }
  });
}

/** 查询预算方案列表 */
export function listPlan() {
  return request({
    url: '/budget/plan/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 100 }
  });
}
