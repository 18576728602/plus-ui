import request from '@/utils/request';
import type { AxiosPromise } from 'axios';

/** 预览公式计算结果 */
export const previewFormula = (params: {
  formula: string;
  templateId?: number;
  templateCode?: string;
  budgetYear?: number;
  itemCode?: string;
  valueField?: string;
}): AxiosPromise<string | number> => {
  return request({
    url: '/budget/formula/preview',
    method: 'get',
    params,
  });
};

/** 校验公式语法 */
export const validateFormula = (formula: string): AxiosPromise<string> => {
  return request({
    url: '/budget/formula/validate',
    method: 'get',
    params: { formula },
  });
};

/** 批量计算公式 */
export const evaluateFormulaBatch = (
  templateId: number,
  budgetYear: number,
  formulaMap: Record<string, string>,
  valueField = 'budgetAmount'
): AxiosPromise<Record<string, number>> => {
  return request({
    url: '/budget/formula/evaluateBatch',
    method: 'post',
    params: { templateId, budgetYear, valueField },
    data: formulaMap,
  });
};
