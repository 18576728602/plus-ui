import request from '@/utils/request';

/**
 * 获取所有模板列表（Tab）
 */
export function getTemplates() {
  return request({
    url: '/budget/matrix/templates',
    method: 'get'
  });
}

/**
 * 获取矩阵数据
 * @param planId 预算方案ID
 * @param templateCode 模板编号
 */
export function getMatrixData(planId: number, templateCode: string) {
  return request({
    url: '/budget/matrix/data',
    method: 'get',
    params: { planId, templateCode }
  });
}
