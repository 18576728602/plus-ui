import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { GatherMapVO, GatherMapForm, GatherMapQuery } from '@/api/budget/gather/types';
import type { BudgetCompany } from '@/api/budget/templateItem/types';

/**
 * 查询预算科目归集映射列表
 */
export const listGatherMap = (query?: GatherMapQuery): AxiosPromise<GatherMapVO[]> => {
  return request({
    url: '/budget/gather/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询预算科目归集映射详细
 */
export const getGatherMap = (id: string | number): AxiosPromise<GatherMapVO> => {
  return request({
    url: '/budget/gather/' + id,
    method: 'get'
  });
};

/**
 * 新增预算科目归集映射
 */
export const addGatherMap = (data: GatherMapForm) => {
  return request({
    url: '/budget/gather',
    method: 'post',
    data: data
  });
};

/**
 * 修改预算科目归集映射
 */
export const updateGatherMap = (data: GatherMapForm) => {
  return request({
    url: '/budget/gather',
    method: 'put',
    data: data
  });
};

/**
 * 删除预算科目归集映射
 */
export const delGatherMap = (id: string | number | Array<string | number>) => {
  return request({
    url: '/budget/gather/' + id,
    method: 'delete'
  });
};

/**
 * 查询本部内设部门（归集源部门下拉数据源）
 */
export const listGatherDepts = (): AxiosPromise<BudgetCompany[]> => {
  return request({
    url: '/budget/gather/depts',
    method: 'get'
  });
};

/**
 * 执行归集：部门17表明细 -> 本部06表目标科目
 */
export const runGather = (planId: string | number) => {
  return request({
    url: '/budget/gather/run',
    method: 'post',
    params: { planId }
  });
};