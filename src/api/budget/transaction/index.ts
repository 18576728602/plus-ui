import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { TransactionVO, TransactionForm, TransactionQuery } from '@/api/budget/transaction/types';

/**
 * 查询内部交易登记列表
 * @param query
 * @returns {*}
 */

export const listTransaction = (query?: TransactionQuery): AxiosPromise<TransactionVO[]> => {
  return request({
    url: '/budget/transaction/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询内部交易登记详细
 * @param id
 */
export const getTransaction = (id: string | number): AxiosPromise<TransactionVO> => {
  return request({
    url: '/budget/transaction/' + id,
    method: 'get'
  });
};

/**
 * 新增内部交易登记
 * @param data
 */
export const addTransaction = (data: TransactionForm) => {
  return request({
    url: '/budget/transaction',
    method: 'post',
    data: data
  });
};

/**
 * 修改内部交易登记
 * @param data
 */
export const updateTransaction = (data: TransactionForm) => {
  return request({
    url: '/budget/transaction',
    method: 'put',
    data: data
  });
};

/**
 * 删除内部交易登记
 * @param id
 */
export const delTransaction = (id: string | number | Array<string | number>) => {
  return request({
    url: '/budget/transaction/' + id,
    method: 'delete'
  });
};
