import request from '@/utils/request';

/** 预算版本对比 */
export function compareVersions(params) {
  return request({
    url: '/budget/versionCompare/compare',
    method: 'get',
    params
  });
}

/** 预算版本对比结果导出(XLSX) */
export function exportVersions(params) {
  return request({
    url: '/budget/versionCompare/export',
    method: 'post',
    params,
    responseType: 'blob'
  });
}