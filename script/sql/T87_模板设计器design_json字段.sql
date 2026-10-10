-- 模板设计器：budget_template 表新增 design_json 字段（存储 Univer 工作簿画布快照）
-- LONGTEXT 类型，因为 Univer JSON 可能很大（多 sheet + 样式 + 数据）

ALTER TABLE budget_template ADD COLUMN design_json LONGTEXT NULL COMMENT '画布设计JSON（Univer工作簿快照）' AFTER del_flag;
