/** 字段可见性规则 VO */
export interface FieldVisibilityVO {
  id: number;
  templateId?: number;
  templateCode?: string;
  templateName?: string;
  planId?: number;
  budgetYear?: number;
  refSubjectId: number;
  subjectCode?: string;
  subjectName?: string;
  orgId: number;
  orgName?: string;
  fieldPermission: 'HIDE' | 'READONLY' | 'EDIT';
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

/** 权限解析结果：key=refSubjectId, value=权限值 */
export type FieldPermissionMap = Record<string, 'HIDE' | 'READONLY' | 'EDIT'>;
