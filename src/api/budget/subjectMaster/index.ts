import request from '@/utils/request';
import { AxiosPromise, AxiosResponse } from 'axios';
import { SubjectMasterVO, SubjectMasterForm, SubjectMasterQuery } from './types';
import { listBudgetCategory, BudgetCategoryVO } from '@/api/budget/category';

/** 结构行识别：完全数据驱动，依据后端 row_type 判断。
 *  keepHead=true(科目明细页)：HEAD=分组/表头 作为真实可展开父节点保留；SUM=汇总 仍透明化。
 *  keepHead=false(预算表挂载等出稿场景)：HEAD+SUM 均透明化(隐藏自身但保留子树)。
 *  ITEM=明细可填报、REF=只读基准(上一年实际等) 始终作为真实数据节点展示。
 *  后端新增子科目会自动把父级提升为 HEAD，故无需名称正则兜底。 */
const isStructural = (n: SubjectMasterVO, keepHead = false) => {
  const rt = n.rowType;
  if (rt === 'SUM') return true;
  // keepHead=true 时 HEAD 保留为非透明父节点；仅预算表等出稿场景才把 HEAD 也透明化
  if (rt === 'HEAD') return !keepHead;
  if (rt) return false;
  // 兜底：存量数据尚未同步 row_type 时，以 is_summary=1 汇总口径近似（兼容 number/string 双形态）
  return Number(n.isSummary) === 1;
};

/** 将后端 /queryList 返回的扁平主数据列表组装为树（按 parentCode + 类型 + 归属公司）
 *  keepHead: 是否保留 HEAD 分组表头为可展开父节点(科目明细页=true；预算表挂载等出稿场景=false 透明化) */
function buildTree(
  list: SubjectMasterVO[],
  keyword?: string,
  showDisabled = false,
  keepHead = false
): SubjectMasterVO[] {
  // 默认隐藏停用科目；勾选"显示已停用"后保留（带 isOff 态由前端展示）
  const nodes = list
    .filter((n) => showDisabled || n.validFlag !== '0')
    .map((n) => ({ ...n, children: [] as SubjectMasterVO[] }));
  const roots: SubjectMasterVO[] = [];
  nodes.forEach((n) => {
    const parent =
      n.parentCode && n.parentCode !== n.subjectCode
        ? nodes.find(
            (p) =>
              p.subjectCode === n.parentCode &&
              p.subjectType === n.subjectType &&
              (p.orgId ?? null) === (n.orgId ?? null)
          )
        : undefined;
    if (parent) {
      parent.children!.push(n);
    } else {
      roots.push(n);
    }
  });
  // 透明化结构节点：隐藏自身但保留子树，且子树提升一级，避免表根/序号头/合计/指标等骨架噪音占据树
  const emit = (node: SubjectMasterVO): SubjectMasterVO[] => {
    const children = node.children || [];
    if (isStructural(node, keepHead)) {
      return children.flatMap((c) => emit(c));
    }
    return [{ ...node, children: children.flatMap((c) => emit(c)) }];
  };
  let tree = roots.flatMap((r) => emit(r));
  // 关键词过滤：只保留「自身名称/编码命中」的节点及其所有祖先路径，其余裁剪
  if (keyword && String(keyword).trim()) {
    const kw = String(keyword).trim().toLowerCase();
    const match = (n: SubjectMasterVO) =>
      (n.subjectName ?? '').toLowerCase().includes(kw) || (n.subjectCode ?? '').toLowerCase().includes(kw);
    const prune = (n: SubjectMasterVO): SubjectMasterVO | null => {
      const cs = (n.children || []).map((c) => prune(c)).filter((c): c is SubjectMasterVO => !!c);
      if (match(n) || cs.length > 0) {
        return { ...n, children: cs };
      }
      return null;
    };
    tree = tree.map(prune).filter((n): n is SubjectMasterVO => !!n);
  }
  return tree;
}

/** 依据分类分组生成树（方案A：顶层为分类分组节点，分类下平铺明细；未分类明细归入"未分类"分组）
 *  parentCode 指向分类编码的明细直接作为该分类的子节点；指向其他明细的按层级挂父子。 */
function buildCategoryTree(
  cats: BudgetCategoryVO[],
  list: SubjectMasterVO[],
  keyword?: string,
  showDisabled = false
): SubjectMasterVO[] {
  const nodes = list
    .filter((n) => showDisabled || n.validFlag !== '0')
    .map((n) => ({ ...n, children: [] as SubjectMasterVO[] }));
  const keyOf = (n: SubjectMasterVO) => `${n.subjectCode}|${n.subjectType}|${n.orgId ?? ''}`;
  const byKey = new Map<string, SubjectMasterVO>();
  nodes.forEach((n) => byKey.set(keyOf(n), n));

  const rootGroups: SubjectMasterVO[] = cats.map((c, idx) => ({
    id: -(idx + 1),
    _isCategory: true,
    categoryCode: c.categoryCode,
    categoryName: c.categoryName || c.categoryCode,
    subjectName: c.categoryName || c.categoryCode,
    subjectCode: c.categoryCode,
    children: [] as SubjectMasterVO[]
  }));
  const groupByCode = new Map<string, SubjectMasterVO>();
  rootGroups.forEach((g) => groupByCode.set(g.categoryCode!, g));

  nodes.forEach((n) => {
    const g = n.categoryCode ? groupByCode.get(n.categoryCode) : undefined;
    if (!g) return;
    let parent: SubjectMasterVO | undefined;
    if (n.parentCode && n.parentCode !== n.subjectCode) {
      parent = nodes.find(
        (p) => p !== n && keyOf(p) === `${n.parentCode}|${n.subjectType}|${n.orgId ?? ''}`
      );
    }
    if (parent) {
      parent.children!.push(n);
    } else {
      g.children!.push(n);
    }
  });
  // 未分类明细单列一组，避免丢失
  const orphans = nodes.filter((n) => {
    const g = n.categoryCode ? groupByCode.get(n.categoryCode) : undefined;
    if (g) return false;
    // 已作为某节点的子节点，不单独成组
    return !nodes.some((p) => p !== n && (p.children || []).some((c) => c.id === n.id));
  });
  if (orphans.length) {
    rootGroups.push({
      id: -900001,
      _isCategory: true,
      categoryCode: '',
      categoryName: '未分类',
      subjectName: '未分类',
      subjectCode: '',
      children: orphans
    });
  }

  // 关键词过滤：分类名/编码命中保留整分类，否则仅保留子级命中的分支
  if (keyword && String(keyword).trim()) {
    const kw = String(keyword).trim().toLowerCase();
    const match = (n: SubjectMasterVO) =>
      (n.subjectName ?? '').toLowerCase().includes(kw) || (n.subjectCode ?? '').toLowerCase().includes(kw);
    const prune = (n: SubjectMasterVO): SubjectMasterVO | null => {
      const cs = (n.children || []).map((c) => prune(c)).filter((c): c is SubjectMasterVO => !!c);
      if (match(n) || cs.length > 0) return { ...n, children: cs };
      return null;
    };
    return rootGroups.map((g) => prune(g)).filter((n): n is SubjectMasterVO => !!n);
  }
  return rootGroups;
}

/** 按创建时间先后排序(时间早的在前)，用于科目明细页分类与明细的有序展示 */
function sortByCreated<T extends { createTime?: string | number | Date }>(arr: T[]): T[] {
  return [...arr].sort(
    (m, n) => (m.createTime ? new Date(m.createTime).getTime() : 0) - (n.createTime ? new Date(n.createTime).getTime() : 0)
  );
}

/** 查询科目主数据树。
 *  groupByCategory=true：科目明细页，按分类分组(顶层为分类节点，下平铺明细)，分类与明细均按创建时间先后排列；
 *  否则：预算表挂载等出稿场景，按 parentCode 组树，keepHead 控制结构行展示。 */
export const listSubjectMasterTree = async (query?: SubjectMasterQuery): Promise<SubjectMasterVO[]> => {
  const groupByCat = query?.groupByCategory === true;
  let cats: BudgetCategoryVO[] = [];
  if (groupByCat) {
    try {
      const catRes: any = await listBudgetCategory();
      cats = Array.isArray(catRes) ? catRes : Array.isArray(catRes?.data) ? catRes.data : [];
    } catch {
      cats = [];
    }
  }
  const res: any = await request({ url: '/budget/subject/queryList', method: 'get', params: query });
  const list: SubjectMasterVO[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
  if (groupByCat) {
    return buildCategoryTree(sortByCreated(cats), sortByCreated(list), query?.keyword, query?.showDisabled);
  }
  return buildTree(list, query?.keyword, query?.showDisabled, Boolean(query?.keepHead));
};

/** 查询科目主数据全量(扁平,不组装树,用于统计等) */
export const listSubjectMasterFlat = (query?: SubjectMasterQuery): AxiosPromise<SubjectMasterVO[]> => {
  return request({ url: '/budget/subject/queryList', method: 'get', params: query });
};

/** 获取科目主数据详情 */
export const getSubjectMaster = (id: string | number): AxiosPromise<SubjectMasterVO> => {
  return request({ url: '/budget/subject/' + id, method: 'get' });
};

/** 自动生成科目编码 */
export const getSubjectMasterNextCode = (parentCode?: string, subjectType: string = 'SYS', templateCode?: string): AxiosPromise<string> => {
  return request({ url: '/budget/subject/nextCode', method: 'get', params: { parentCode, subjectType, templateCode } });
};

/** 新增科目主数据 */
export const addSubjectMaster = (data: SubjectMasterForm): AxiosPromise<void> => {
  return request({ url: '/budget/subject', method: 'post', data });
};

/** 修改科目主数据 */
export const updateSubjectMaster = (data: SubjectMasterForm): AxiosPromise<void> => {
  return request({ url: '/budget/subject', method: 'put', data });
};

/** 删除科目主数据 */
export const delSubjectMaster = (ids: string | number | Array<string | number>): AxiosPromise<void> => {
  return request({ url: '/budget/subject/' + ids, method: 'delete' });
};

/** 启用/停用科目主数据（validFlag: 0=停用, 1=有效） */
export const changeSubjectMasterValid = (id: string | number, validFlag: string): AxiosPromise<void> => {
  return request({ url: `/budget/subject/valid/${id}/${validFlag}`, method: 'put' });
};

/** 停用前引用提示：查询科目被方案/预算表挂接引用的次数 */
export const getSubjectMasterRefCount = (id: string | number): AxiosPromise<number> => {
  return request({ url: `/budget/subject/refCount/${id}`, method: 'get' });
};