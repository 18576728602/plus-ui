import request from '@/utils/request';

/** 查询内部交易列表 */
export function listInternalTransaction(params: {
  planId?: number;
  transactionType?: string;
  status?: string;
  pageNum?: number;
  pageSize?: number;
}) {
  return request({
    url: '/budget/internal/list',
    method: 'get',
    params
  });
}

/** 新增内部交易 */
export function addInternalTransaction(data: any) {
  return request({
    url: '/budget/internal',
    method: 'post',
    data
  });
}

/** 修改内部交易 */
export function updateInternalTransaction(data: any) {
  return request({
    url: '/budget/internal',
    method: 'put',
    data
  });
}

/** 删除内部交易 */
export function delInternalTransaction(id: number) {
  return request({
    url: `/budget/internal/${id}`,
    method: 'delete'
  });
}

/** 批量删除 */
export function delInternalTransactionBatch(ids: number[]) {
  return request({
    url: `/budget/internal/batch/${ids.join(',')}`,
    method: 'delete'
  });
}

/** 确认内部交易 */
export function confirmInternalTransaction(ids: number[]) {
  return request({
    url: '/budget/internal/confirm',
    method: 'put',
    data: { ids }
  });
}

/** 撤销确认 */
export function revokeInternalTransaction(ids: number[]) {
  return request({
    url: '/budget/internal/revoke',
    method: 'put',
    data: { ids }
  });
}

/** 获取抵销项目配置 */
export function getEliminationConfigs(transactionType?: string) {
  return request({
    url: '/budget/internal/configs',
    method: 'get',
    params: { transactionType }
  });
}

/** 获取部门选项 */
export function getDeptOptions() {
  return request({
    url: '/budget/internal/depts',
    method: 'get'
  });
}

/** 获取合并报表数据（orgId为空=全集团） */
export function getConsolidatedStatement(planId: number, statementType: string, orgId?: number) {
  return request({
    url: '/budget/consolidated/statement',
    method: 'get',
    params: { planId, statementType, orgId }
  });
}

/** 获取合并范围信息（orgId为空=全集团） */
export function getConsolidationScope(planId: number, orgId?: number) {
  return request({
    url: '/budget/consolidated/scope',
    method: 'get',
    params: { planId, orgId }
  });
}

/** 获取抵销汇总信息（orgId为空=全集团） */
export function getEliminationSummary(planId: number, orgId?: number) {
  return request({
    url: '/budget/consolidated/elimination-summary',
    method: 'get',
    params: { planId, orgId }
  });
}

/** 保存手动抵销调整 */
export function saveConsolidatedAdjustments(data: {
  planId: number;
  statementType: string;
  adjustments: { itemCode: string; adjustAmount: number }[];
}) {
  return request({
    url: '/budget/consolidated/save-adjustments',
    method: 'post',
    data
  });
}
