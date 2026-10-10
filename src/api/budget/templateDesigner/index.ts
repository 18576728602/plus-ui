import request from '@/utils/request';
import type { AxiosPromise } from 'axios';

/**
 * 预算模板设计器 · API
 * 用于对接后端「模板设计 JSON 存取 / 发布」接口。
 * 目前后端 BudgetTemplateController 尚未提供设计 JSON 存取端点，
 * 以下接口为预留契约，待后端补齐后直接启用。
 */

export interface TemplateDesignData {
  templateId: number;
  /** 设计器产出的完整 JSON（画布结构、列配置、单元格数据等） */
  designData: any;
  /** 设计器版本号（用于乐观锁/迁移判断） */
  schemaVersion?: number;
}

/**
 * 获取某预算模板已保存的设计 JSON
 */
export const getTemplateDesign = (templateId: number): AxiosPromise<TemplateDesignData> => {
  return request({
    url: `/budget/template/design/${templateId}`,
    method: 'get'
  });
};

/**
 * 保存预算模板设计 JSON（新增或覆盖）
 */
export const saveTemplateDesign = (data: TemplateDesignData) => {
  return request({
    url: '/budget/template/design',
    method: 'post',
    data
  });
};

/**
 * 发布预算模板设计（将草稿状态切换为已发布，对填报用户可见）
 */
export const publishTemplateDesign = (templateId: number) => {
  return request({
    url: `/budget/template/design/publish/${templateId}`,
    method: 'post'
  });
};
