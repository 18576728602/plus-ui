import request from '@/utils/request';

/** 查询抵销分录清单 */
export function listEliminationEntries(params: {
  planId: number;
  transactionType?: string;
  projectCode?: string;
}) {
  return request({
    url: '/budget/elimination/entries',
    method: 'get',
    params
  });
}

/** 查询抵销项目配置（复用内部交易模块配置） */
export function getEliminationConfigs(transactionType?: string) {
  return request({
    url: '/budget/internal/configs',
    method: 'get',
    params: { transactionType }
  });
}

/** 查询预算方案列表 */
export function listPlanOptions() {
  return request({
    url: '/budget/plan/list',
    method: 'get',
    params: { pageSize: 999 }
  });
}