import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { DataVO, DataForm, DataQuery } from '@/api/budget/data/types';

/**
 * 查询预算填报数据列表
 * @param query
 * @returns {*}
 */

export const listData = (query?: DataQuery): AxiosPromise<DataVO[]> => {
  return request({
    url: '/system/data/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询预算填报数据详细
 * @param id
 */
export const getData = (id: string | number): AxiosPromise<DataVO> => {
  return request({
    url: '/system/data/' + id,
    method: 'get'
  });
};

/**
 * 新增预算填报数据
 * @param data
 */
export const addData = (data: DataForm) => {
  return request({
    url: '/system/data',
    method: 'post',
    data: data
  });
};

/**
 * 修改预算填报数据
 * @param data
 */
export const updateData = (data: DataForm) => {
  return request({
    url: '/system/data',
    method: 'put',
    data: data
  });
};

/**
 * 删除预算填报数据
 * @param id
 */
export const delData = (id: string | number | Array<string | number>) => {
  return request({
    url: '/system/data/' + id,
    method: 'delete'
  });
};
