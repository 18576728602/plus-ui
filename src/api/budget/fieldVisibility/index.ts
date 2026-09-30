import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { FieldPermissionMap, FieldVisibilityVO } from './types';

/** 查询字段可见性规则列表 */
export const listFieldVisibility = (params: {
  templateId?: number;
  planId?: number;
  budgetYear?: number;
  pageNum?: number;
  pageSize?: number;
}): AxiosPromise<{ rows: FieldVisibilityVO[]; total: number }> => {
  return request({
    url: '/budget/fieldVisibility/list',
    method: 'get',
    params,
  });
};

/** 查询单条规则详情 */
export const getFieldVisibility = (id: number): AxiosPromise<FieldVisibilityVO> => {
  return request({
    url: `/budget/fieldVisibility/${id}`,
    method: 'get',
  });
};

/** 新增/更新规则（按唯一键幂等） */
export const saveFieldVisibility = (data: any): AxiosPromise<void> => {
  return request({
    url: '/budget/fieldVisibility',
    method: 'post',
    data,
  });
};

/** 批量删除规则 */
export const delFieldVisibility = (ids: number[]): AxiosPromise<void> => {
  return request({
    url: `/budget/fieldVisibility/${ids.join(',')}`,
    method: 'delete',
  });
};

/** 解析某子公司对一批填报字段的最终权限(填报页取显隐、提交时越权校验) */
export const resolveFieldPermissions = (
  params: { templateId: number; planId?: number; budgetYear?: number; orgId: number; subjectIds: Array<number> }
): AxiosPromise<FieldPermissionMap> => {
  return request({ url: '/budget/fieldVisibility/resolve', method: 'get', params });
};
