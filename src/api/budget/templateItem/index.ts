import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { TemplateItemVO, TemplateItemForm, TemplateItemQuery, BudgetCompany, SubjectImportForm } from '@/api/budget/templateItem/types';

/**
 * 查询预算模板科目列表
 * @param query
 * @returns {*}
 */

export const listTemplateItem = (query?: TemplateItemQuery): AxiosPromise<TemplateItemVO[]> => {
  return request({
    url: '/budget/templateItem/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询预算模板科目详细
 * @param id
 */
export const getTemplateItem = (id: string | number): AxiosPromise<TemplateItemVO> => {
  return request({
    url: '/budget/templateItem/' + id,
    method: 'get'
  });
};

/**
 * 新增预算模板科目
 * @param data
 */
export const addTemplateItem = (data: TemplateItemForm) => {
  return request({
    url: '/budget/templateItem',
    method: 'post',
    data: data
  });
};

/**
 * 修改预算模板科目
 * @param data
 */
export const updateTemplateItem = (data: TemplateItemForm) => {
  return request({
    url: '/budget/templateItem',
    method: 'put',
    data: data
  });
};

/**
 * 平铺查询某方案的科目列表（复用 list 接口），供下拉选择源/目标科目
 * @param query
 */
export const queryTemplateItems = (query?: TemplateItemQuery): AxiosPromise<TemplateItemVO[]> => {
  return request({
    url: '/budget/templateItem/list',
    method: 'get',
    params: query
  });
};

/**
 * 分页查询某方案的已停用科目(del_flag=1)，用于还原管理
 * @param query
 */
export const listDisabledTemplateItem = (query?: TemplateItemQuery): AxiosPromise<TemplateItemVO[]> => {
  return request({
    url: '/budget/templateItem/disabledList',
    method: 'get',
    params: query
  });
};

/**
 * 查询参与填报的公司列表，用于科目"适用公司"范围选择
 */
export const listTemplateItemCompanies = (): AxiosPromise<BudgetCompany[]> => {
  return request({
    url: '/budget/templateItem/companies',
    method: 'get'
  });
};

/**
 * 还原已停用科目(del_flag 1 -> 0)
 * @param id
 */
export const restoreTemplateItem = (id: string | number | Array<string | number>) => {
  return request({
    url: '/budget/templateItem/restore/' + id,
    method: 'put'
  });
};

/**
 * 从科目主数据库导入科目到指定方案（复制挂接）
 * @param data { planId, subjectIds }
 */
export const importFromMaster = (data: SubjectImportForm) => {
  return request({
    url: '/budget/templateItem/importFromMaster',
    method: 'post',
    data: data
  });
};

/**
 * 删除预算模板科目（逻辑删除即停用）
 * @param id
 */
export const delTemplateItem = (id: string | number | Array<string | number>) => {
  return request({
    url: '/budget/templateItem/' + id,
    method: 'delete'
  });
};
