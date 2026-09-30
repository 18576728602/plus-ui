import request from '@/utils/request';

export const getStats = (planId?: number, orgId?: number) => {
  return request({
    url: '/budget/dashboard/stats',
    method: 'get',
    params: { planId, orgId }
  });
};

export const getFillProgress = (planId?: number, orgId?: number) => {
  return request({
    url: '/budget/dashboard/fillProgress',
    method: 'get',
    params: { planId, orgId }
  });
};

export const getTodoList = () => {
  return request({
    url: '/budget/dashboard/todoList',
    method: 'get'
  });
};

export const getRecentActivities = (planId?: number, orgId?: number) => {
  return request({
    url: '/budget/dashboard/recentActivities',
    method: 'get',
    params: { planId, orgId }
  });
};

export const getQuarterTrend = (planId?: number, orgId?: number) => {
  return request({
    url: '/budget/dashboard/quarterTrend',
    method: 'get',
    params: { planId, orgId }
  });
};

export const getUnitOptions = () => {
  return request({
    url: '/budget/dashboard/unitOptions',
    method: 'get'
  });
};