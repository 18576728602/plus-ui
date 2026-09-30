import request from '@/utils/request';
import { AxiosPromise } from 'axios';

/** 查询预算调整列表 */
export function listAdjustment(query?: any) {
  return request({
    url: '/budget/adjustment/list',
    method: 'get',
    params: query
  });
}

/** 查询详情 */
export function getAdjustment(id: number) {
  return request({
    url: '/budget/adjustment/' + id,
    method: 'get'
  });
}

/** 新增 */
export function addAdjustment(data: any) {
  return request({
    url: '/budget/adjustment',
    method: 'post',
    data: data
  });
}

/** 修改 */
export function updateAdjustment(data: any) {
  return request({
    url: '/budget/adjustment',
    method: 'put',
    data: data
  });
}

/** 删除 */
export function delAdjustment(ids: string | number | string[] | number[]) {
  return request({
    url: '/budget/adjustment/' + ids,
    method: 'delete'
  });
}

/** 审批 */
export function approveAdjustment(data: { id: number; approveResult: string; approveRemark?: string }) {
  return request({
    url: '/budget/adjustment/approve',
    method: 'put',
    data: data
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

/** 查询部门列表(子公司) */
export function listDept() {
  return request({
    url: '/system/dept/list',
    method: 'get'
  });
}

/** 查询模板科目列表(按预算表编号) */
export function listTemplateItems(templateCode: string) {
  return request({
    url: '/budget/templateItem/list',
    method: 'get',
    params: { templateCode }
  });
}

/** 查询全部模板科目(用于动态生成预算表/科目下拉) */
export function listAllTemplateItems() {
  return request({
    url: '/budget/templateItem/list',
    method: 'get'
  });
}

/** 查询填报数据(获取原预算金额，复用填报同款接口，万元口径BigDecimal不截断) */
export function getBudgetData(params: { planId: number; deptId: number; templateCode: string }) {
  return request({
    url: '/budget/fill/getFillData',
    method: 'get',
    params
  });
}

/** 查询某单位某方案下已审批通过的预算表编号（预算调整申请时预算表/科目下拉仅展示本单位可调整的表） */
export function listApprovedTemplates(planId: number, orgId?: number) {
  return request({
    url: '/budget/adjustment/approvedTemplates',
    method: 'get',
    params: { planId, orgId }
  });
}

/** 调整影响分析：预估本次调整对本公司/集团影响及科目历史调整 */
export function analyzeAdjustmentImpact(params: {
  planId: number;
  orgId: number;
  templateCode: string;
  itemCode: string;
  originalAmount?: number;
  adjustAmount: number;
}) {
  return request({
    url: '/budget/adjustment/impact',
    method: 'get',
    params
  });
}
