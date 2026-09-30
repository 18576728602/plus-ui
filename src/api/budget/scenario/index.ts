import request from '@/utils/request';

export interface ScenarioParams {
  id?: number;
  planId: number;
  scenarioType: string;
  scenarioName: string;
  revenueGrowth?: number;
  grossMargin?: number;
  costExpenseRate?: number;
  financingRate?: number;
  investReturnRate?: number;
  isDefault?: number;
  remark?: string;
}

/** 情景参数列表 */
export const listScenarios = (params: { planId: number }) => {
  return request({
    url: '/budget/scenario/list',
    method: 'get',
    params
  });
};

/** 保存情景参数（新增/更新） */
export const saveScenario = (data: ScenarioParams) => {
  return request({
    url: '/budget/scenario/save',
    method: 'post',
    data
  });
};

/** 删除情景 */
export const deleteScenario = (id: number) => {
  return request({
    url: `/budget/scenario/${id}`,
    method: 'delete'
  });
};

/** 情景模拟结果（指标表 + 雷达图 + 瀑布图） */
export const simulateScenario = (params: { planId: number; orgId?: number }) => {
  return request({
    url: '/budget/scenario/simulate',
    method: 'get',
    params
  });
};

/** 敏感性分析（龙卷风图数据） */
export const sensitivityAnalysis = (params: { planId: number; orgId?: number }) => {
  return request({
    url: '/budget/scenario/sensitivity',
    method: 'get',
    params
  });
};