import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { SubjectVO, SubjectForm, SubjectQuery } from '@/api/budget/subject/types';

/**
 * 分页查询科目主数据列表
 * @param query
 */
export const listSubject = (query?: SubjectQuery): AxiosPromise<SubjectVO[]> => {
  return request({
    url: '/budget/subject/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询科目主数据全量列表(按层级排序,用于构造 一二三级 树)
 * @param query
 */
export const querySubjectAll = (query?: SubjectQuery): AxiosPromise<SubjectVO[]> => {
  return request({
    url: '/budget/subject/queryList',
    method: 'get',
    params: query
  });
};

/**
 * 查询科目主数据详细
 * @param id
 */
export const getSubject = (id: string | number): AxiosPromise<SubjectVO> => {
  return request({
    url: '/budget/subject/' + id,
    method: 'get'
  });
};

/**
 * 新增科目主数据
 * @param data
 */
export const addSubject = (data: SubjectForm) => {
  return request({
    url: '/budget/subject',
    method: 'post',
    data: data
  });
};

/**
 * 修改科目主数据
 * @param data
 */
export const updateSubject = (data: SubjectForm) => {
  return request({
    url: '/budget/subject',
    method: 'put',
    data: data
  });
};

/**
 * 删除科目主数据
 * @param id
 */
export const delSubject = (id: string | number | Array<string | number>) => {
  return request({
    url: '/budget/subject/' + id,
    method: 'delete'
  });
};

/**
 * 查询预算表模板列表(含编码+名称,用于所属预算表下拉)
 */
export const listBudgetTemplate = (): AxiosPromise<{ templateCode: string; templateName: string }[]> => {
  return request({
    url: '/budget/template/list',
    method: 'get'
  });
};

/**
 * 自动生成科目编码(新增时调用,不手工输入)
 * @param params
 */
export const querySubjectNextCode = (params: { templateCode?: string; parentCode?: string; subjectType?: string; orgId?: number }): AxiosPromise<string> => {
  return request({
    url: '/budget/subject/nextCode',
    method: 'get',
    params: params
  });
};