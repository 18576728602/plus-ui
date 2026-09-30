import request from '@/utils/request';

/**
 * 获取预算执行预警清单（多源融合）
 */
export const getWarningList = (params: { planId?: number; orgId?: number; threshold?: number }) => {
  return request({
    url: '/budget/warning/list',
    method: 'get',
    params
  });
};

/**
 * 查询预警闭环处理记录
 */
export const getWarningRecordList = (params: { planId?: number; orgId?: number; level?: string; status?: string }) => {
  return request({
    url: '/budget/warning/record/list',
    method: 'get',
    params
  });
};

/**
 * 新建预警闭环记录
 */
export const createWarningRecord = (data: any) => {
  return request({
    url: '/budget/warning/record/create',
    method: 'post',
    data
  });
};

/**
 * 处置预警（确认/整改/跟踪）
 */
export const handleWarningRecord = (data: any) => {
  return request({
    url: '/budget/warning/record/handle',
    method: 'post',
    data
  });
};

/**
 * 升级预警
 */
export const escalateWarningRecord = (data: any) => {
  return request({
    url: '/budget/warning/record/escalate',
    method: 'post',
    data
  });
};

/**
 * 解除预警（关闭闭环）
 */
export const closeWarningRecord = (params: { recordId: number; result?: string }) => {
  return request({
    url: '/budget/warning/record/close',
    method: 'post',
    params
  });
};

export const getPlanList = () => {
  return request({
    url: '/budget/plan/list',
    method: 'get'
  });
};

export const getUnitOptions = () => {
  return request({
    url: '/budget/dashboard/unitOptions',
    method: 'get'
  });
};