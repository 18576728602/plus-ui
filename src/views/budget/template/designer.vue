<template>
  <div class="dsg-root" v-loading="loading">
    <!-- ============ 顶栏：面包屑 + 模板信息 + 操作 ============ -->
    <div class="dsg-topbar">
      <el-button link icon="Back" @click="emit('back')">返回列表</el-button>
      <span class="dsg-crumb"><b>预算模板设计器</b></span>
      <div class="dsg-divider"></div>
      <span class="dsg-top-title">{{ form.templateName || '预算模板设计器' }}</span>
      <div class="dsg-spacer"></div>
      <el-button icon="RefreshLeft" @click="resetAll">重置</el-button>
      <el-button icon="View" @click="preview">预览</el-button>
      <el-button icon="Check" type="primary" plain :loading="saving" @click="saveTemplate">保存</el-button>
      <el-button icon="Promotion" type="primary" :loading="publishing" :disabled="form.status === '1'" @click="publishTemplate">发布</el-button>
    </div>

    <!-- ============ 副工具栏 ============ -->
    <div class="dsg-subbar">
      <span class="dsg-tpl-name">{{ form.templateName }}</span>
      <span class="dsg-tpl-meta">{{ form.templateCode }} · {{ form.budgetYear }} 年</span>
      <span class="dsg-tpl-meta">共 {{ rows.length }} 条科目明细</span>
      <span class="dsg-tpl-meta">单位：万元</span>
      <el-tag size="small" :type="form.status === '1' ? 'success' : 'info'">{{ form.status === '1' ? '启用' : '停用' }}</el-tag>
      <div class="dsg-spacer"></div>
      <el-button size="small" plain icon="Setting" @click="openColDialog">列名设置</el-button>
      <el-button size="small" type="primary" plain icon="FolderAdd" @click="openMountDialog">挂载科目</el-button>
    </div>

    <!-- ============ 主体两栏 ============ -->
    <div class="dsg-main">
      <!-- 中：预算表画布 -->
      <div class="dsg-panel-center">
        <div class="dsg-canvas-card">
          <div class="dsg-canvas-head">
            <div class="dsg-canvas-title">
              预算表画布 <span class="dsg-year-tag">{{ form.budgetYear }} 年度</span>
            </div>
            <div class="dsg-canvas-actions">
              <el-button size="small" type="success" plain icon="Plus" @click="addPlainRow">新增行</el-button>
              <el-button size="small" type="primary" plain @click="addCol">新增列</el-button>
              <el-dropdown trigger="click" @command="handleDropCol">
                <el-button size="small" plain
                  >删列<el-icon class="el-icon--right"><ArrowDown /></el-icon
                ></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <template v-for="co in dataCols" :key="co.key">
                      <el-dropdown-item :command="co.key">
                        {{ co.label }}
                      </el-dropdown-item>
                    </template>
                    <template v-if="dataCols.length === 0">
                      <el-dropdown-item disabled>暂无数据列</el-dropdown-item>
                    </template>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-dropdown trigger="click" @command="clearCol">
                <el-button size="small" plain type="danger"
                  >清空列<el-icon class="el-icon--right"><ArrowDown /></el-icon
                ></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <template v-for="co in dataCols" :key="co.key">
                      <el-dropdown-item :command="co.key">
                        {{ co.label }}
                      </el-dropdown-item>
                    </template>
                    <template v-if="dataCols.length === 0">
                      <el-dropdown-item disabled>暂无数据列</el-dropdown-item>
                    </template>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-divider direction="vertical" />
              <el-button size="small" @click="expandAll">全部展开</el-button>
              <el-button size="small" @click="collapseAll">全部折叠</el-button>
            </div>
          </div>
          <div class="dsg-table-wrap">
            <table class="dsg-table">
              <thead>
                <tr>
                  <th class="dsg-row-no" :title="双击修改列名" @dblclick.stop="beginEditHead('row')">
                    <el-input
                      v-if="editingHeadKey === 'row'"
                      v-model="headLabels.row"
                      size="small"
                      autofocus
                      @blur="commitEditHead('row')"
                      @keyup.enter="commitEditHead('row')"
                    />
                    <span v-else>{{ headLabels.row }}</span>
                  </th>
                  <th class="dsg-subject-col" :title="双击修改列名" @dblclick.stop="beginEditHead('subject')">
                    <el-input
                      v-if="editingHeadKey === 'subject'"
                      v-model="headLabels.subject"
                      size="small"
                      autofocus
                      @blur="commitEditHead('subject')"
                      @keyup.enter="commitEditHead('subject')"
                    />
                    <span v-else>{{ headLabels.subject }}</span>
                  </th>
                  <th
                    v-for="co in dataCols"
                    :key="co.key"
                    class="dsg-data-col"
                    :class="{ 'dsg-col-selected': colSelKey === co.key }"
                    :style="{ minWidth: colWidthOf(co.key), width: colWidthOf(co.key) }"
                    title="点击选中列、双击改列名、右缘拖拽调列宽"
                    @click.stop="selectCol(co)"
                    @dblclick.stop="beginEditCol(co)"
                  >
                    <el-input
                      v-if="editingColKey === co.key"
                      v-model="co.label"
                      size="small"
                      autofocus
                      @blur="commitEditCol(co)"
                      @keyup.enter="commitEditCol(co)"
                    />
                    <span v-else>{{ colLabelOf(co.key) }}</span>
                    <span class="dsg-col-resize" @mousedown.stop.prevent="startResize($event, co)"></span>
                  </th>
                  <th class="dsg-op-col" :title="双击修改列名" @dblclick.stop="beginEditHead('op')">
                    <el-input
                      v-if="editingHeadKey === 'op'"
                      v-model="headLabels.op"
                      size="small"
                      autofocus
                      @blur="commitEditHead('op')"
                      @keyup.enter="commitEditHead('op')"
                    />
                    <span v-else>{{ headLabels.op }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(d, idx) in displayRows" :key="d.row.id">
                  <tr :class="{ 'dsg-row-selected': selectedRowKey === d.row.id }" @click="selectRow(d.row)">
                    <td class="dsg-row-no">
                      <span
                        v-if="hasChildren(d.row)"
                        class="dsg-tree-toggle"
                        :class="{ fold: !expandedSet.has(d.row.id as number) }"
                        @click.stop="toggleExpand(d.row)"
                      >
                        <el-icon><CaretRight /></el-icon>
                      </span>
                      <span class="dsg-line-no">{{ idx + 1 }}</span>
                    </td>
                    <td class="dsg-subject-cell" :style="{ paddingLeft: 8 + d.depth * 18 + 'px' }">
                      <span class="dsg-cell-code">{{ d.row.itemCode || d.row.subjectCode }}</span>
                      <el-input
                        v-if="editNameKey === d.row.id"
                        v-model="editNameVal"
                        size="small"
                        class="dsg-inline-name"
                        autofocus
                        @click.stop
                        @keyup.enter.stop="commitEditName(d.row)"
                        @keyup.esc.stop="cancelEditName()"
                        @blur="commitEditName(d.row)"
                      />
                      <span v-else class="dsg-cell-name" :title="'双击修改行名称'" @dblclick.stop="startEditName(d.row)">{{
                        d.row.itemName || d.row.subjectName
                      }}</span>
                    </td>
                    <td
                      v-for="co in dataCols"
                      :key="co.key"
                      class="dsg-data-cell dsg-cell-input-cell"
                      :class="{ 'dsg-cell-selected': selectedCells.has(cellKeyOf(d.row, co.key)) }"
                      :style="{ minWidth: colWidthOf(co.key), width: colWidthOf(co.key) }"
                      @click.stop="selectCell(d.row, co, $event)"
                    >
                      <!-- 不可填列：只读显示 --，不渲染输入框 -->
                      <div v-if="!colEditableOf(co.key)" class="dsg-cell-ro" title="该列不可填写（可在右侧「列属性-允许填报」开启）">--</div>
                      <!-- 文本/数字单元格：常驻输入框，v-model 直达 cellValues -->
                      <div v-else-if="cellKindOf(d.row, co.key) === 'text' || cellKindOf(d.row, co.key) === 'number'">
                        <el-input
                          :model-value="cellValues[cellKeyOf(d.row, co)]"
                          size="small"
                          class="dsg-cell-input"
                          :class="{ 'dsg-cell-num': cellKindOf(d.row, co.key) === 'number' }"
                          :placeholder="cellKindOf(d.row, co.key) === 'number' ? '0' : '--'"
                          @update:model-value="(v: string) => onCellLive(d.row, co, v)"
                          @blur="() => onCellBlurNum(d.row, co)"
                          @keydown="(e: KeyboardEvent) => onValueKeydown(e, d.row)"
                        />
                      </div>
                      <!-- 科目单元格：仅允许选择科目，展示科目名称 -->
                      <div
                        v-else-if="cellKindOf(d.row, co.key) === 'subject'"
                        class="dsg-cell-subject"
                        :title="subjectTipOf(d.row, co.key)"
                        @click.stop="openSubjectPicker(d.row, co)"
                      >
                        <span v-if="cellMetaOf(d.row, co.key).subjectName" class="dsg-subj-name">{{ cellMetaOf(d.row, co.key).subjectName }}</span>
                        <span v-else class="dsg-subj-empty">点选科目</span>
                        <span v-if="cellMetaOf(d.row, co.key).amount" class="dsg-subj-amount">{{ cellMetaOf(d.row, co.key).amount }}</span>
                        <el-icon class="dsg-subj-icon"><Coin /></el-icon>
                        <el-icon v-if="cellMetaOf(d.row, co.key).subjectName" class="dsg-subj-clear" @click.stop="clearSubjectCell(d.row, co.key)"
                          ><Close
                        /></el-icon>
                      </div>
                      <!-- 公式单元格：= 前缀 + 输入 + 结果 -->
                      <div
                        v-else
                        class="dsg-cell-formula"
                        :class="{ 'dsg-cell-err': !!cellMetaOf(d.row, co.key).error }"
                        :title="cellMetaOf(d.row, co.key).error || cellMetaOf(d.row, co.key).formula || ''"
                      >
                        <span class="dsg-fx-prefix">=</span>
                        <el-input
                          :model-value="formulaTextOf(d.row, co.key)"
                          size="small"
                          class="dsg-fx-input"
                          placeholder="SUM(H2:H5)"
                          @change="(v: string) => setFormula(d.row, co.key, v)"
                        />
                        <span v-if="cellMetaOf(d.row, co.key).error" class="dsg-fx-err">{{ cellMetaOf(d.row, co.key).error }}</span>
                        <span v-else-if="resultTextOf(d.row, co.key) !== ''" class="dsg-fx-result">{{ resultTextOf(d.row, co.key) }}</span>
                      </div>
                    </td>
                    <td class="dsg-op-cell">
                      <el-button link size="small" icon="Top" :disabled="idx === 0" @click.stop="moveRow(idx, -1)" title="上移" />
                      <el-button
                        link
                        size="small"
                        icon="Bottom"
                        :disabled="idx === displayRows.length - 1"
                        @click.stop="moveRow(idx, 1)"
                        title="下移"
                      />
                      <el-button
                        link
                        type="danger"
                        size="small"
                        icon="Delete"
                        @click.stop="removeRow(d.row)"
                        :title="d.row._local || !d.row.refSubjectId ? '删除' : '解挂'"
                      />
                      <el-button link type="success" size="small" icon="Plus" title="新增一行" @click.stop="addRowByType('ITEM')" />
                    </td>
                  </tr>
                </template>
                <tr v-if="displayRows.length === 0">
                  <td colspan="5" class="dsg-canvas-empty">暂无科目行 · 点击右上角「挂载科目」添加明细</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="dsg-canvas-foot">
            <span
              >共 <b>{{ displayRows.length }}</b> 行</span
            >
            <span
              >公式 <b>{{ formulaCount }}</b> 条</span
            >
            <span style="margin-left: auto">双击表头改列名 · 单元格可自由填写 · 支持新增/删除行列</span>
          </div>
        </div>
      </div>

      <!-- 右：行属性 > 基础信息 -->
      <div class="dsg-panel dsg-panel-right">
        <div class="dsg-prop-title-row">
          <span class="dsg-prop-title">行属性</span>
          <el-tag size="small" effect="plain" type="info">基础信息</el-tag>
        </div>
        <!-- 列属性：点击数据列列头后显示 -->
        <template v-if="colSel">
          <div class="dsg-prop-section">
            <div class="dsg-prop-title-row">
              <span class="dsg-prop-title">列属性</span>
              <el-tag size="small" effect="plain" type="warning">{{ colSel.label }}</el-tag>
            </div>
            <div class="dsg-prop-row">
              <label class="dsg-prop-label">列名</label>
              <el-input v-model="colSelLabel" size="small" />
            </div>
          </div>
          <el-divider />
        </template>
        <template v-if="selectedRow">
          <div class="dsg-prop-section">
            <div class="dsg-prop-row">
              <label class="dsg-prop-label">行名称</label>
              <el-input
                :model-value="selectedRow.itemName || selectedRow.subjectName"
                :disabled="rowLocked"
                :placeholder="rowLocked ? '由科目明细绑定' : '请输入行名称'"
                :title="rowLocked ? ROW_LOCK_HINT : ''"
                size="small"
                @change="(v: string) => v && (((selectedRow as any).itemName = v), ((selectedRow as any).subjectName = v))"
              />
            </div>
            <div class="dsg-prop-row">
              <label class="dsg-prop-label">行编码</label>
              <el-input
                :model-value="selectedRow.itemCode || selectedRow.subjectCode"
                :disabled="rowLocked"
                :placeholder="rowLocked ? '由科目明细绑定' : '请输入行编码'"
                :title="rowLocked ? ROW_LOCK_HINT : ''"
                size="small"
                @change="(v: string) => v && (((selectedRow as any).itemCode = v), ((selectedRow as any).subjectCode = v))"
              />
            </div>
            <div class="dsg-prop-row" v-if="!rowLocked">
              <el-button size="small" type="primary" plain style="width: 100%" @click="openBindSubject">关联科目…</el-button>
            </div>
            <div class="dsg-prop-row">
              <label class="dsg-prop-label">排序号</label>
              <el-input-number v-model="selForm.itemOrder" :min="0" :max="9999" controls-position="right" size="small" style="width: 100%" />
            </div>
            <div class="dsg-prop-row">
              <label class="dsg-prop-label">适用单位/公司</label>
              <div class="dsg-org-field" @click="openOrgPicker">
                <div class="dsg-org-display">
                  <span class="dsg-org-text">{{ orgNameShow }}</span>
                  <el-icon class="dsg-org-arrow"><ArrowDown /></el-icon>
                </div>
              </div>
              <div v-if="orgScopeIds.length" class="dsg-org-tags">
                <el-tag v-for="id in orgScopeIds" :key="String(id)" size="small" closable @close="removeOrgTag(id)">
                  {{ orgIdNameMap.get(id) || id }}
                </el-tag>
              </div>
              <div v-else class="dsg-org-tip">未勾选时默认「全部单位/公司」适用</div>
            </div>
            <el-button type="primary" size="small" style="width: 100%" :loading="saving" @click="saveRowProps">应用属性</el-button>
          </div>
        </template>
        <div v-else class="dsg-empty-right">
          <el-icon class="dsg-empty-icon"><FolderOpened /></el-icon>
          <div class="dsg-empty-text">选中明细行后可设置行属性</div>
        </div>
      </div>
    </div>

    <!-- ============ 底部状态栏 ============ -->
    <div class="dsg-statusbar">
      <span><span class="dsg-dot" :class="{ dirty: !lastSave }"></span>{{ lastSave || '待保存' }}</span>
      <span
        >行数：<b>{{ rows.length }}</b></span
      >
      <span
        >公式：<b>{{ formulaCount }}</b></span
      >
      <span style="margin-left: auto; color: #67c23a">✓ 无循环引用</span>
    </div>

    <!-- 挂载科目弹窗 -->
    <el-dialog v-model="mountDialog.visible" :title="mountDialog.title" width="640px" top="6vh" append-to-body>
      <div class="dsg-md-head">
        <el-input v-model.trim="mountKeyword" size="small" placeholder="搜索编码/名称" clearable prefix-icon="Search" style="width: 200px" />
        <span class="dsg-md-count"
          >本表已挂载 <b>{{ rows.length }}</b> 项</span
        >
      </div>
      <div class="dsg-md-tree" v-loading="mountLoading">
        <el-tree
          ref="mountTreeRef"
          :data="mountTree"
          :props="mountTreeProps"
          node-key="subjectCode"
          show-checkbox
          default-expand-all
          :filter-node-method="filterMountNode"
        >
          <template #default="{ data }">
            <span class="dsg-md-node">
              <span class="dsg-cell-code">{{ data.subjectCode }}</span>
              <span>{{ data.subjectName }}</span>
              <el-tag v-if="mountedCodeSet.has(data.subjectCode)" size="small" type="success" effect="plain">已选择</el-tag>
              <el-tag v-if="Number(data.isSummary) === 1" size="small" type="warning" effect="plain">汇总</el-tag>
            </span>
          </template>
        </el-tree>
      </div>
      <div class="dsg-md-note">
        勾选一级节点会连带选中其下明细；已挂载的科目置灰并显示「已选择」，不可重复挂载；挂载仅写入实际明细科目，一级表头/分组节点本身不进入预算表。
      </div>
      <template #footer>
        <el-button type="primary" :loading="mountSubmitLoading" @click="submitMount">确认挂载</el-button>
        <el-button @click="mountDialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>

    <!-- 新增明细行：选科目弹窗 -->
    <el-dialog v-model="pickDialog.visible" title="选择科目 · 新增明细行" width="520px" top="6vh" append-to-body>
      <el-input
        v-model.trim="pickKeyword"
        size="small"
        placeholder="搜索编码/名称"
        clearable
        prefix-icon="Search"
        style="width: 100%; margin-bottom: 10px"
      />
      <div class="dsg-md-tree" v-loading="pickLoading" style="height: 360px">
        <el-tree
          ref="pickTreeRef"
          :data="pickTree"
          :props="pickTreeProps"
          node-key="subjectCode"
          default-expand-all
          highlight-current
          :filter-node-method="filterPickNode"
          @node-click="handlePickNode"
        >
          <template #default="{ data }">
            <span class="dsg-md-node">
              <span class="dsg-cell-code">{{ data.subjectCode }}</span>
              <span>{{ data.subjectName }}</span>
              <el-tag v-if="mountedCodeSet.has(data.subjectCode)" size="small" type="success" effect="plain">已挂载</el-tag>
              <el-tag v-if="Number(data.isSummary) === 1" size="small" type="warning" effect="plain">总</el-tag>
            </span>
          </template>
        </el-tree>
      </div>
      <div class="dsg-md-note">点击一级分类下的「明细」节点即可选中，其名称/编码将自动带入新行；已挂载的科目显示「已挂载」，不可重复选择。</div>
      <div v-if="pickPreview" class="dsg-pick-preview">
        <span
          >已选：<b>{{ pickPreview.itemCode }}</b> {{ pickPreview.itemName }}</span
        >
      </div>
      <template #footer>
        <el-button type="primary" :disabled="!pickPreview" @click="confirmPick">确认新增</el-button>
        <el-button @click="pickDialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>

    <!-- 适用单位/公司 选择弹窗 -->
    <el-dialog v-model="orgDialog.visible" title="适用单位/公司" width="480px" top="6vh" append-to-body>
      <el-divider content-position="left"><el-checkbox v-model="orgAll">全部单位/公司</el-checkbox></el-divider>
      <div class="dsg-md-tree" v-loading="orgLoading" style="height: 320px">
        <el-tree
          ref="orgTreeRef"
          :data="orgTree"
          :props="{ label: 'label', children: 'children' }"
          node-key="id"
          show-checkbox
          default-expand-all
          @check="handleOrgCheck"
        />
      </div>
      <div class="dsg-md-note">按层级勾选：勾选上级代表其下全部单位适用；仅勾选下级则只该单位适用。勾选「全部单位/公司」则视为全局适用。</div>
      <template #footer>
        <el-button type="primary" @click="confirmOrg">确定</el-button>
        <el-button @click="orgDialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>

    <!-- 科目单元格：科目选择弹窗（单选绑定到当前单元格） -->
    <el-dialog v-model="subjectCellDialog.visible" title="选择科目 · 绑定到当前单元格" width="520px" top="6vh" append-to-body>
      <div class="dsg-md-head">
        <el-input v-model.trim="subjectCellKeyword" size="small" placeholder="搜索编码/名称" clearable prefix-icon="Search" style="width: 220px" />
        <span class="dsg-md-count">单选一个科目</span>
      </div>
      <div class="dsg-md-tree" v-loading="mountLoading">
        <el-tree
          ref="subjectTreeRef"
          :data="mountTree"
          :props="subjectCellTreeProps"
          node-key="subjectCode"
          highlight-current
          default-expand-all
          :filter-node-method="filterMountNode"
          @node-click="(data: SubjectMasterVO) => (subjectCellSelected = data)"
        >
          <template #default="{ data }">
            <span class="dsg-md-node">
              <span class="dsg-cell-code">{{ data.subjectCode }}</span>
              <span>{{ data.subjectName }}</span>
              <el-tag v-if="Number(data.isSummary) === 1" size="small" type="warning" effect="plain">汇总</el-tag>
            </span>
          </template>
        </el-tree>
      </div>
      <div class="dsg-md-note">
        科目单元格仅展示科目名称，不允许手工输入文字；公式引用该单元格时读取科目对应金额。绑定后可在画布中再次点击更换，或悬停单元格右上角 × 清空。
      </div>
      <template #footer>
        <el-button type="primary" @click="confirmSubjectCell">确定</el-button>
        <el-button @click="subjectCellDialog.visible = false">取 消</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->

    <!-- 列名设置弹窗 -->
    <el-dialog v-model="colDialogVisible" title="列名设置" width="420px" append-to-body>
      <div class="dsg-col-form">
        <div class="dsg-prop-row">
          <label class="dsg-prop-label">实际完成列名</label>
          <el-input v-model="colForm.actualLabel" size="small" placeholder="如：上一年实际完成值" />
        </div>
        <div class="dsg-prop-row">
          <label class="dsg-prop-label">预算值列名</label>
          <el-input v-model="colForm.budgetLabel" size="small" placeholder="如：预算值(编制)" />
        </div>
        <div class="dsg-col-tip">表头展示为「{{ form.budgetYear }}年{{ colForm.budgetLabel }}」</div>
      </div>
      <template #footer>
        <el-button type="primary" :loading="saving" @click="saveColNames">保存列名</el-button>
        <el-button @click="colDialogVisible = false">取 消</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" title="模板预览 · 只读" width="720px" top="6vh" append-to-body>
      <div class="dsg-preview">
        <table class="dsg-table">
          <thead>
            <tr>
              <th class="dsg-row-no">{{ headLabels.row }}</th>
              <th class="dsg-subject-col">{{ headLabels.subject }}</th>
              <th v-for="co in dataCols" :key="co.key" class="dsg-data-col">{{ co.label }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(d, idx) in displayRows" :key="d.row.id">
              <tr>
                <td class="dsg-row-no">{{ idx + 1 }}</td>
                <td class="dsg-subject-cell" :style="{ paddingLeft: 8 + d.depth * 18 + 'px' }">
                  <span class="dsg-cell-code">{{ d.row.itemCode || d.row.subjectCode }}</span>
                  <span class="dsg-cell-name">{{ d.row.itemName || d.row.subjectName }}</span>
                </td>
                <td v-for="co in dataCols" :key="co.key" class="dsg-data-cell">
                  <span v-if="cellKindOf(d.row, co.key) === 'subject'">{{ cellMetaOf(d.row, co.key).subjectName || '--' }}</span>
                  <span v-else-if="cellKindOf(d.row, co.key) === 'formula'">{{ resultTextOf(d.row, co.key) || '--' }}</span>
                  <span v-else>{{ cellValOf(d.row, co.key) || '--' }}</span>
                </td>
              </tr>
            </template>
            <tr v-if="displayRows.length === 0"></tr>
          </tbody>
        </table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getTemplateItems,
  mountTemplateSubjects,
  unmountTemplateSubjects,
  updateTemplateItem,
  addTemplateItem,
  delTemplateItems,
  updateBudgetTemplate,
  type BudgetTemplateType,
  type BudgetTemplateItemType
} from '@/api/budget/template';
import { listSubjectMasterFlat, listSubjectMasterTree } from '@/api/budget/subjectMaster';
import type { SubjectMasterVO } from '@/api/budget/subjectMaster/types';
import { deptTreeSelect } from '@/api/system/user';
import { Parser } from 'hot-formula-parser';

const props = defineProps<{ template: BudgetTemplateType | null }>();
const emit = defineEmits<{ (e: 'back'): void; (e: 'changed'): void }>();

type RowItem = SubjectMasterVO & BudgetTemplateItemType;

/* ---------- 基础状态 ---------- */
const loading = ref(false);
const saving = ref(false);
const publishing = ref(false);
const rows = ref<RowItem[]>([]);
/** 本地新增行（负 id、_local:true），不落库、不被 loadDetail 覆盖 */
const localRows = ref<RowItem[]>([]);
/** 合并后的全部行：滚动数据 + 本地新增行 */
const allRows = computed<RowItem[]>(() => [...rows.value, ...localRows.value]);
const selectedRowKey = ref<number | null>(null);
const lastSave = ref('');
const previewVisible = ref(false);
/* 固定列表头文本（行/预算项目/操作），支持双击自定义 */
const headLabels = reactive({
  row: '\u5e8f\u53f7',
  subject: '\u9884\u7b97\u79d1\u76ee\u660e\u7ec6',
  op: '\u64cd\u4f5c'
});
const editingHeadKey = ref<string | null>(null);
const beginEditHead = (k: 'row' | 'subject' | 'op') => {
  editingHeadKey.value = k;
};
const commitEditHead = (k: 'row' | 'subject' | 'op') => {
  editingHeadKey.value = null;
  if (!headLabels[k].trim()) headLabels[k] = k === 'row' ? '\u5e8f\u53f7' : k === 'subject' ? '\u9884\u7b97\u79d1\u76ee\u660e\u7ec6' : '\u64cd\u4f5c';
};

const form = reactive<BudgetTemplateType>({
  id: undefined,
  templateCode: '',
  templateName: '',
  budgetYear: 2027,
  templateType: 'BASE',
  status: '0',
  actualLabel: '\u4e0a\u4e00\u5e74\u5b9e\u9645\u5b8c\u6210\u503c',
  budgetLabel: '\u9884\u7b97\u503c(\u7f16\u5236)'
});

/* ---------- data cols / add row (pure frontend) ---------- */
const dataCols = ref<{ key: string; label: string; kind: string }[]>([
  { key: 'ref', label: '\u4e0a\u4e00\u5e74\u5b9e\u9645\u5b8c\u6210\u503c', kind: 'ref' },
  { key: 'budget', label: '\u9884\u7b97\u503c(\u7f16\u5236)', kind: 'input' }
]);
const editingColKey = ref<string | null>(null);
const colSeq = ref(3);
const nextColKey = () => {
  let k = dataCols.value.length + 1;
  while (dataCols.value.some((c) => c.key === 'c' + k)) k++;
  return 'c' + k;
};
const addCol = () => {
  colSeq.value++;
  dataCols.value.push({ key: nextColKey(), label: `\u5217${colSeq.value}`, kind: 'input' });
};
const beginEditCol = (co: { key: string; label: string }) => {
  co.label = colLabelOf(co.key); // 预填当前列名，编辑起点与右侧面板一致
  editingColKey.value = co.key;
};
const commitEditCol = (co: { key: string; label: string }) => {
  editingColKey.value = null;
  if (!dataCols.value.some((c) => c.key === co.key)) return;
  setColLabel(co.key, co.label);
};
const dropCol = (co: { key: string }) => {
  dataCols.value = dataCols.value.filter((c) => c.key !== co.key);
};
const handleDropCol = (key: string) => {
  const found = dataCols.value.find((c) => c.key === key);
  if (!found) return;
  dataCols.value = dataCols.value.filter((c) => c.key !== key);
  if (colSelKey.value === key) colSelKey.value = null;
  ElMessage.success(`\u5df2\u5220\u9664\u5217\u300c${found.label}\u300d`);
};
/* 清空整列所有单元格内容(用于清除测试残留脏值/历史错值)，逐行落库 */
const clearCol = (key: string) => {
  const co = dataCols.value.find((c) => c.key === key);
  if (!co) return;
  const label = co.label;
  try {
    ElMessageBox.confirm(`确定清空整列「${label}」的所有单元格内容？`, '清空列', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消'
    });
  } catch {
    return;
  }
  const touched: RowItem[] = [];
  allRows.value.forEach((r) => {
    const k = cellKeyOf(r, { key });
    const had = !!(cellValues[k] ?? '') || cellMeta[k];
    if (cellValues[k]) delete cellValues[k];
    if (cellMeta[k]) delete cellMeta[k];
    if (had) touched.push(r);
  });
  touched.forEach(scheduleCellSave);
  recalcAll();
  ElMessage.success(`\u5df2\u6e05\u7a7a\u5217\u300c${label}\u300d`);
};

/* ---------- 列属性（点击列头选中列，右侧配置） ---------- */
const colSelKey = ref<string | null>(null);
/* 列录入类型：文本/数字/科目/公式（列级生效 + 持久化） */
type ColType = 'TEXT' | 'NUMBER' | 'SUBJECT' | 'FORMULA';
const NUM_TEXT_RE = /^[-+]?\d*\.?\d+%?$/;
const isNumericText = (s: string) => NUM_TEXT_RE.test(String(s).trim());
const colLabelOf = (key: string) => {
  if (key === 'ref') return form.actualLabel;
  if (key === 'budget') return form.budgetLabel;
  const co = dataCols.value.find((c) => c.key === key);
  return co ? co.label : key;
};
/* 列名唯一来源：内建列(ref/budget)写模板列名字段，自定义列写 co.label；表头与右侧面板共用 */
const setColLabel = (key: string, v: string) => {
  const s = (v || '').trim();
  if (key === 'ref') form.actualLabel = s || '上一年实际完成值';
  else if (key === 'budget') form.budgetLabel = s || '预算值(编制)';
  else {
    const co = dataCols.value.find((c) => c.key === key);
    if (co) co.label = s || '列';
  }
};
const colProps = reactive<Record<string, { editable: boolean; dataType: string; colType: ColType }>>({
  ref: { editable: true, dataType: 'CURRENCY', colType: 'TEXT' },
  budget: { editable: true, dataType: 'CURRENCY', colType: 'TEXT' }
});
const colPropOf = (key: string): { editable: boolean; dataType: string; colType: ColType } => {
  if (!colProps[key]) colProps[key] = { editable: true, dataType: 'CURRENCY', colType: 'TEXT' };
  return colProps[key];
};
/* 列是否允许填报（不可填的列显示 -- 且不渲染输入框） */
const colEditableOf = (key: string) => {
  // 值列（上一年实际/预算值）始终可填，类型取自科目明细设置的数据类型
  if (key === 'ref' || key === 'budget') return true;
  return !!colPropOf(key).editable;
};
/* 本地持久化（按模板 id）：新一轮会话仍保留列类型配置（后端落库后续补） */
const colPropsStorageKey = () => `dsg_colprops_v2_${props.template?.id ?? 0}`;
const saveColProps = () => {
  try {
    localStorage.setItem(colPropsStorageKey(), JSON.stringify(colProps));
  } catch {
    /* ignore */
  }
};
const loadColProps = () => {
  try {
    const raw = localStorage.getItem(colPropsStorageKey());
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, { editable?: boolean; dataType?: string; colType?: ColType }>;
    Object.keys(colProps).forEach((k) => delete colProps[k]);
    Object.entries(obj).forEach(([k, v]) => {
      colProps[k] = { editable: v?.editable ?? true, dataType: v?.dataType ?? 'CURRENCY', colType: v?.colType ?? 'TEXT' };
    });
  } catch {
    /* ignore */
  }
};
/* 列属性（可填/类型）变更即落 localStorage，保持会话间一致 */
watch(colProps, saveColProps, { deep: true });
const colSel = computed(() => dataCols.value.find((c) => c.key === colSelKey.value) || null);
/* 列名：内建列（上一年实际/预算值）与模板列名字段联动（保存时落库），自定义列仅前端 */
const colSelLabel = computed({
  get: () => {
    const c = colSel.value;
    if (!c) return '';
    if (c.key === 'ref') return form.actualLabel;
    if (c.key === 'budget') return form.budgetLabel;
    return c.label;
  },
  set: (v: string) => {
    const c = colSel.value;
    if (!c) return;
    if (c.key === 'ref') form.actualLabel = v;
    else if (c.key === 'budget') form.budgetLabel = v;
    else c.label = v || '\u5217';
  }
});
const selectCol = (co: { key: string; label: string }) => {
  colSelKey.value = co.key;
  colPropOf(co.key);
};

/* ---------- 单元格自由填写（Excel 式，防抖落库） ---------- */
const cellValues = reactive<Record<string, string>>({});
const cellKey = (rowId: number, colKey: string) => `${rowId}_${colKey}`;
const cellValOf = (r: RowItem, co: { key: string }) => {
  const id = r.id != null ? r.id : ((r.itemCode || r.subjectCode || '') as any);
  if (id == null || id === '') return '';
  return cellValues[cellKey(Number(id), co.key)] ?? '';
};
/* ---------- 单元格类型元数据（Excel 式三类型：文本/科目/公式） ---------- */
type CellKind = 'text' | 'number' | 'subject' | 'formula';
interface CellMeta {
  kind: CellKind;
  subjectId?: number;
  subjectCode?: string;
  subjectName?: string;
  remark?: string;
  amount?: string;
  formula?: string;
  result?: string;
  error?: string;
}
const cellMeta = reactive<Record<string, CellMeta>>({});
const cellKeyOf = (r: RowItem, co: { key: string }) => {
  return cellKey(rowUid(r), co.key);
};
/* 按行对象引用分配永久唯一序号，避免 id 为空/相同的行(汇总/标题/自定义行)撞同一个 cell key */
const rowUidMap = new WeakMap<object, number>();
let _uidSeed = 1;
const rowUid = (r: RowItem) => {
  let u = rowUidMap.get(r);
  if (u == null) {
    u = _uidSeed++;
    rowUidMap.set(r, u);
  }
  return u;
};
/* 值列默认类型：按科目详情设置的数据类型（数值类→数字格，其余→文本格） */
const subjectNumeric = (dt?: string) => dt === 'CURRENCY' || dt === 'NUMBER' || dt === 'PERCENT';
/* 行的小数位规则：NUMBER(人数/次数类)固定整数0；CURRENCY/PERCENT取科目配置(默认2,上限6)；TEXT不适用 */
const decimalsOfRow = (r: RowItem): number => {
  if (r.dataType === 'NUMBER') return 0;
  if (r.dataType === 'CURRENCY' || r.dataType === 'PERCENT') {
    const dp = Number(r.decimalPlaces);
    if (Number.isFinite(dp)) return Math.max(0, Math.min(dp, 6));
    return 2;
  }
  return 2;
};
/* 按小数位四舍五入（避免浮点误差） */
const roundTo = (num: number, dp: number): number => {
  const f = Math.pow(10, dp);
  return Math.round((num + Number.EPSILON) * f) / f;
};
const cellMetaOf = (r: RowItem, co: { key: string }): CellMeta => {
  const k = cellKeyOf(r, co);
  if (!k) return { kind: 'text' };
  if (!cellMeta[k]) {
    cellMeta[k] = {
      kind: (co.key === 'ref' || co.key === 'budget') && subjectNumeric(r.dataType) ? 'number' : 'text'
    };
  }
  return cellMeta[k];
};
const cellKindOf = (r: RowItem, co: { key: string }): CellKind => cellMetaOf(r, co).kind;
const formulaTextOf = (r: RowItem, co: { key: string }) => (cellMetaOf(r, co).formula || '').replace(/^=/, '');
const resultTextOf = (r: RowItem, co: { key: string }) => cellMetaOf(r, co).result ?? '';
const setFormula = (r: RowItem, co: { key: string }, v: string) => {
  if (!colEditableOf(co.key)) {
    ElMessage.warning('该列不可填写，请在右侧「列属性-允许填报」开启');
    return;
  }
  const m = cellMetaOf(r, co);
  m.kind = 'formula';
  let s = (v || '').trim();
  if (s && !s.startsWith('=')) s = '=' + s;
  m.formula = s || '';
  m.result = '';
  m.error = '';
  recalcAll();
  scheduleCellSave(r);
};

/* ---------- 单元格选中（单选/ctrl 多选）与批量清空 ---------- */
const selectedCells = ref(new Set<string>());
const activeCell = ref<null | { r: RowItem; co: { key: string } }>(null);
const selectCell = (r: RowItem, co: { key: string }, ev?: MouseEvent) => {
  const k = cellKeyOf(r, co);
  if (!k) return;
  if (ev?.ctrlKey || ev?.metaKey) {
    const s = new Set(selectedCells.value);
    if (s.has(k)) s.delete(k);
    else s.add(k);
    selectedCells.value = s;
    activeCell.value = { r, co };
  } else {
    selectedCells.value = new Set([k]);
    activeCell.value = { r, co };
  }
};
/* 常驻输入框：update 直写 cellValues（与 model 同键，及时回显且保留）；blur 只做数字校验 */
const onCellLive = (r: RowItem, co: { key: string }, v: string) => {
  const k = cellKeyOf(r, co);
  if (!k) return;
  const m = cellMetaOf(r, co);
  if (m.kind === 'subject') {
    m.kind = 'text';
    m.subjectId = undefined;
    m.subjectCode = '';
    m.subjectName = '';
    m.remark = '';
    m.amount = '';
  }
  // 文本科目：约束以科目明细自身数据类型为准，只保留中文/字母/空格，剥离数字与符号(配合 onValueKeydown)
  if (r.dataType === 'TEXT') v = v.replace(/[^\u4e00-\u9fa5a-zA-Z ]/g, '');
  cellValues[k] = v || '';
  scheduleCellSave(r);
};
/* 值格键位约束：以科目明细自身数据类型为准（而非单元格 kind）。
   文本科目只允许中文(输入法组词)/字母/空格，拦截数字及各类符号 */
const onValueKeydown = (e: KeyboardEvent, r: RowItem) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // 保留复制/粘贴等快捷键
  if (e.isComposing) return; // 中文输入法组词期间不拦截
  if (r.dataType === 'TEXT' && e.key.length === 1 && !/^[a-zA-Z ]$/.test(e.key)) {
    e.preventDefault();
  }
};
const onCellBlurNum = (r: RowItem, co: { key: string }) => {
  const k = cellKeyOf(r, co);
  if (!k) return;
  const v = (cellValues[k] || '').trim();
  if (v !== '' && cellKindOf(r, co) === 'number') {
    if (!isNumericText(v)) {
      ElMessage.warning('该格为数字类型，仅支持数字；已清空');
      delete cellValues[k];
    } else {
      // 按科目数据类型+小数位四舍五入：人数类(NUMBER)归整数，货币/百分比按配置位
      const n = Number(v);
      if (Number.isFinite(n)) {
        cellValues[k] = String(roundTo(n, decimalsOfRow(r)));
      }
    }
  }
  recalcAll();
};
/* ---------- 科目单元格选择（下拉树单选） ---------- */
const subjectCellDialog = reactive({ visible: false, k: '', r: null as RowItem | null, co: null as { key: string } | null });
const subjectCellKeyword = ref('');
const subjectTreeRef = ref();
const subjectCellSelected = ref<SubjectMasterVO | null>(null);
const openSubjectPicker = (r: RowItem, co: { key: string }) => {
  if (!colEditableOf(co.key)) {
    ElMessage.warning('该列不可填写，请在右侧「列属性-允许填报」开启');
    return;
  }
  subjectCellDialog.r = r;
  subjectCellDialog.co = co;
  subjectCellDialog.k = cellKeyOf(r, co);
  subjectCellSelected.value = null;
  subjectCellKeyword.value = '';
  subjectCellDialog.visible = true;
  if (!mountTree.value.length) loadMountTree();
  setTimeout(() => subjectTreeRef.value?.filter(subjectCellKeyword.value), 60);
};
const confirmSubjectCell = () => {
  const node = subjectCellSelected.value;
  const r = subjectCellDialog.r;
  const co = subjectCellDialog.co;
  if (!node || !r || !co) {
    ElMessage.warning('请先选择科目');
    return;
  }
  const m = cellMetaOf(r, co);
  m.kind = 'subject';
  m.subjectId = node.id;
  m.subjectCode = node.subjectCode;
  m.subjectName = node.subjectName;
  m.remark = node.remark || '';
  m.amount = '';
  m.formula = '';
  m.result = '';
  m.error = '';
  delete cellValues[cellKeyOf(r, co)];
  subjectCellDialog.visible = false;
  scheduleCellSave(r);
  recalcAll();
};
const clearSubjectCell = (r: RowItem, colKey: string) => {
  const co = { key: colKey };
  const m = cellMetaOf(r, co);
  m.kind = 'text';
  m.subjectId = undefined;
  m.subjectCode = '';
  m.subjectName = '';
  m.remark = '';
  m.amount = '';
  delete cellValues[cellKeyOf(r, co)];
  scheduleCellSave(r);
  recalcAll();
};
const subjectTipOf = (r: RowItem, co: { key: string }) => {
  const m = cellMetaOf(r, co);
  if (!m.subjectCode) return '点击选择科目';
  return `编码：${m.subjectCode}\n名称：${m.subjectName || ''}${m.remark ? `\n备注：${m.remark}` : ''}`;
};

/* ---------- 列宽（表头右缘拖拽） ---------- */
const colWidths = reactive<Record<string, number>>({ ref: 130, budget: 130 });
const colWidthOf = (co: { key: string }) => `${colWidths[co.key] ?? 130}px`;
let resizing: null | { co: { key: string }; startX: number; startW: number } = null;
const startResize = (e: MouseEvent, co: { key: string }) => {
  resizing = { co, startX: e.clientX, startW: colWidths[co.key] ?? 130 };
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
};
const onResizeMove = (e: MouseEvent) => {
  if (!resizing) return;
  colWidths[resizing.co.key] = Math.max(60, resizing.startW + e.clientX - resizing.startX);
};
const onResizeEnd = () => {
  resizing = null;
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
};

/* ---------- 公式引擎（基于 hot-formula-parser + formulajs，支持 Excel 语法与函数） ---------- */
const colLetters = (i: number): string => {
  let s = '';
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
};
const colIndexFromLetters = (s: string): number => {
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
const splitRef = (ref: string): [number, number] => {
  const m = /^([A-Z]{1,3})(\d+)$/.exec(ref);
  return m ? [colIndexFromLetters(m[1]), parseInt(m[2], 10)] : [0, 0];
};
const refMap = new Map<string, { r: RowItem; co: { key: string } }>();
const buildRefMap = () => {
  refMap.clear();
  dataCols.value.forEach((co, ci) => {
    displayRows.value.forEach((d, ri) => {
      refMap.set(colLetters(ci) + (ri + 1), { r: d.row, co });
    });
  });
};
const refOf = (r: RowItem, co: { key: string }): string => {
  const k = cellKeyOf(r, co);
  buildRefMap();
  let ref = 'A1';
  refMap.forEach((c, rf) => {
    if (cellKey(c.r.id as number, c.co.key) === k) ref = rf;
  });
  return ref;
};
interface EvalResult {
  result: number;
  error: string;
  circular: boolean;
}
/** 本轮是否为循环引用命中（自写解析器依赖调用栈检测；改用引擎后共享标记，递归子树也可见） */
let circularRefHit = false;
/** 单元格取值标记：#值错误（类型/子公式错误/循环下游） */
const CELL_ERR = Symbol('cell_err');
const cellValResolve = (label: string, computing: Set<string>): number | string | symbol => {
  const c = refMap.get(label);
  if (!c) return 0;
  const k = cellKey(c.r.id as number, c.co.key);
  const m = cellMeta[k] ?? { kind: 'text' };
  if (m.kind === 'formula') {
    const f = (m.formula || '').trim();
    if (computing.has(k)) return CELL_ERR;
    const r = evalFormulaExpr(f.startsWith('=') ? f.slice(1) : f, new Set([...computing, k]));
    if (r.error) return CELL_ERR;
    return r.result;
  }
  if (m.kind === 'subject') {
    const n = Number(m.amount);
    return m.amount === undefined || m.amount === '' ? 0 : Number.isNaN(n) ? CELL_ERR : n;
  }
  // 纯文本：返回原始字符串，供字符串函数(COUNTIF/CONCATENATE等)使用；空单元格按 0 参与数值计算
  const t = String(cellValues[k] ?? '').trim();
  return t === '' ? 0 : t;
};
/** 解析并求值单个公式（不含 =）。返回数值/错误码（#VALUE!/#DIV/0!/#循环引用…） */
const evalFormulaExpr = (expr: string, computing: Set<string>): EvalResult => {
  buildRefMap();
  const parser = new Parser();
  parser.on('callCellValue', (cellCoord: any, done: (v: unknown) => void) => {
    const label = String(cellCoord.label).replace(/\$/g, '');
    const key = refMap.get(label) ? cellKey(refMap.get(label)!.r.id as number, refMap.get(label)!.co.key) : '';
    if (key && computing.has(key)) {
      circularRefHit = true;
      return done(new Error('#ERROR!'));
    }
    if (label in refMap) {
      const v = cellValResolve(label, computing);
      done(v === CELL_ERR ? new Error('#VALUE!') : v);
    } else {
      done(0);
    }
  });
  parser.on('callRangeValue', (start: any, end: any, done: (v: unknown) => void) => {
    const out: (number | string)[][] = [];
    for (let r = start.row.index; r <= end.row.index; r++) {
      const rowArr: (number | string)[] = [];
      for (let col = start.column.index; col <= end.column.index; col++) {
        const label = colLetters(col) + (r + 1);
        const key = refMap.get(label) ? cellKey(refMap.get(label)!.r.id as number, refMap.get(label)!.co.key) : '';
        if (key && computing.has(key)) {
          circularRefHit = true;
          rowArr.push(0);
          continue;
        }
        if (label in refMap) {
          const v = cellValResolve(label, computing);
          rowArr.push(v === CELL_ERR ? 0 : v);
        } else rowArr.push(0);
      }
      out.push(rowArr);
    }
    done(out);
  });
  const res = parser.parse(expr);
  if (res.error) {
    if (circularRefHit) return { result: NaN, error: '#循环引用', circular: true };
    return { result: NaN, error: res.error, circular: false };
  }
  const n = Number(res.result as any);
  if (Number.isNaN(n)) return { result: NaN, error: '#VALUE!', circular: false };
  return { result: n, error: '', circular: false };
};
const formatNum = (n: number): string => {
  if (!Number.isFinite(n)) return '#值错误';
  return (Math.round(n * 100) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
};
/* 全量重算所有公式单元格并标记错误 */
const recalcAll = () => {
  buildRefMap();
  Object.keys(cellMeta).forEach((k) => {
    const m = cellMeta[k];
    if (m.kind !== 'formula') return;
    const f = (m.formula || '').trim();
    if (!f.startsWith('=')) {
      m.result = '';
      m.error = '';
      return;
    }
    circularRefHit = false;
    const r = evalFormulaExpr(f.slice(1).trim(), new Set([k]));
    if (r.error) {
      m.result = '';
      m.error = r.error;
    } else {
      m.result = formatNum(r.result);
      m.error = '';
    }
  });
};

/* ---------- 单元格复制粘贴（公式按相对引用平移） ---------- */
const clipboardCells = ref<
  {
    srcRef: string;
    kind: string;
    text: string;
    subjectId?: number;
    subjectCode?: string;
    subjectName?: string;
    remark?: string;
    amount?: string;
    formula?: string;
  }[]
>([]);
const shiftFormula = (f: string, sc: number, sr: number, dc: number, dr: number): string =>
  f.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)/g, (_m, a1: string, col: string, a2: string, row: string) => {
    const c = colIndexFromLetters(col);
    const nr = Math.max(1, parseInt(row, 10) + (dr - sr));
    const nc = Math.max(0, c + (dc - sc));
    return (a1 || '') + colLetters(nc) + (a2 || '') + nr;
  });
const onCanvasKeydown = (e: KeyboardEvent) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const key = e.key.toLowerCase();
  if (key === 'c') {
    if (!selectedCells.value.size) return;
    buildRefMap();
    const items: typeof clipboardCells.value = [];
    selectedCells.value.forEach((k) => {
      let srcRef = '';
      refMap.forEach((c, rf) => {
        if (cellKey(c.r.id as number, c.co.key) === k) srcRef = rf;
      });
      const m = cellMeta[k] ?? { kind: 'text' };
      items.push({
        srcRef,
        kind: m.kind,
        text: cellValues[k] ?? '',
        subjectId: m.subjectId,
        subjectCode: m.subjectCode,
        subjectName: m.subjectName,
        remark: m.remark,
        amount: m.amount,
        formula: m.formula || ''
      });
    });
    clipboardCells.value = items;
    ElMessage.success(`已复制 ${items.length} 个单元格`);
    e.preventDefault();
  } else if (key === 'v') {
    if (!clipboardCells.value.length || !activeCell.value) return;
    const dst = activeCell.value;
    buildRefMap();
    const [dc0, dr0] = splitRef(refOf(dst.r, dst.co));
    const [sc0, sr0] = clipboardCells.value.length ? splitRef(clipboardCells.value[0].srcRef) : [0, 0];
    clipboardCells.value.forEach((it) => {
      const [sc, sr] = splitRef(it.srcRef);
      const target = refMap.get(`${colLetters(dc0 + (sc - sc0))}${dr0 + (sr - sr0)}`);
      if (!target) return;
      const tk = cellKey(target.r.id as number, target.co.key);
      const tm = cellMetaOf(target.r, target.co);
      if (it.kind === 'subject') {
        tm.kind = 'subject';
        tm.subjectId = it.subjectId;
        tm.subjectCode = it.subjectCode;
        tm.subjectName = it.subjectName;
        tm.remark = it.remark;
        tm.amount = it.amount;
        tm.formula = '';
        tm.result = '';
        tm.error = '';
        delete cellValues[tk];
      } else if (it.kind === 'formula') {
        tm.kind = 'formula';
        tm.formula = shiftFormula(it.formula || '', sc0, sr0, dc0, dr0);
        tm.result = '';
        tm.error = '';
        delete cellValues[tk];
      } else {
        tm.kind = 'text';
        tm.subjectId = undefined;
        tm.subjectCode = '';
        tm.subjectName = '';
        tm.remark = '';
        tm.amount = '';
        tm.formula = '';
        tm.result = '';
        tm.error = '';
        cellValues[tk] = it.text ?? '';
      }
      scheduleCellSave(target.r);
    });
    recalcAll();
    ElMessage.success(`已粘贴 ${clipboardCells.value.length} 个单元格`);
    e.preventDefault();
  }
};

/* 收集某行全部已填写单元格 {列key: 单元格数据}，序列化为 cellData JSON（文本=字符串，科目/公式=对象） */
const collectCellMap = (rowId: number): Record<string, unknown> => {
  const map: Record<string, unknown> = {};
  Object.keys(cellMeta).forEach((k) => {
    if (!k.startsWith(`${rowId}_`)) return;
    const col = k.slice(String(rowId).length + 1);
    const m = cellMeta[k];
    if (m.kind === 'text') {
      if ((cellValues[k] ?? '') !== '') map[col] = cellValues[k];
    } else {
      map[col] = { ...m, result: '', error: '' };
    }
  });
  Object.keys(cellValues).forEach((k) => {
    if (!k.startsWith(`${rowId}_`)) return;
    const col = k.slice(String(rowId).length + 1);
    if (!(col in map) && (cellValues[k] ?? '') !== '') map[col] = cellValues[k];
  });
  return map;
};
const cellSaveTimers = new Map<number, ReturnType<typeof setTimeout>>();
const scheduleCellSave = (r: RowItem) => {
  if (r.id == null) return;
  const id = r.id as number;
  if (cellSaveTimers.has(id)) clearTimeout(cellSaveTimers.get(id)!);
  cellSaveTimers.set(
    id,
    setTimeout(async () => {
      cellSaveTimers.delete(id);
      await persistCells(r);
    }, 800)
  );
};
const persistCells = async (r: RowItem) => {
  if (r.id == null || !props.template?.id) return;
  if ((r as RowItem & { _local?: boolean })._local) return; // 本地行：应用属性落库时一并携带
  const map = collectCellMap(r.id as number);
  saving.value = true;
  try {
    await updateTemplateItem({
      id: r.id as number,
      templateId: props.template.id,
      templateCode: form.templateCode,
      templateName: form.templateName,
      itemCode: r.itemCode || r.subjectCode || '',
      itemName: r.itemName || r.subjectName || '',
      itemOrder: r.itemOrder ?? r.sort ?? 0,
      cellData: Object.keys(map).length ? JSON.stringify(map) : ''
    });
    lastSave.value = `\u5df2\u4fdd\u5b58\u5355\u5143\u683c \u00b7 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
    emit('changed');
  } catch {
    /* 后端 cell_data 未就绪时静默：内容保留在前端内存，后端补充后自动恢复落库 */
  } finally {
    saving.value = false;
  }
};
const localSeq = ref(0);
/* 新增/关联科目：选科目弹窗（mode=add 新增明细行；mode=bind 关联到当前自定义行） */
const pickDialog = reactive({ visible: false, rt: 'ITEM' as RowType, mode: 'add' as 'add' | 'bind' });
const bindRow = ref<RowItem | null>(null);
const pickTreeRef = ref();
const pickTree = ref<SubjectMasterVO[]>([]);
const pickKeyword = ref('');
const pickLoading = ref(false);
const pickPreview = ref(null as null | { itemCode: string; itemName: string; subjectId?: number; subject: SubjectMasterVO });
const filterPickNode = (v: string, d: any) => !v || `${d.subjectCode} ${d.subjectName}`.toLowerCase().includes(v.toLowerCase());
watch(pickKeyword, (v) => pickTreeRef.value?.filter(v));
const openPickDialog = async (rt: RowType) => {
  pickDialog.rt = rt;
  pickPreview.value = null;
  pickKeyword.value = '';
  pickDialog.visible = true;
  pickLoading.value = true;
  try {
    pickTree.value = await listSubjectMasterTree({ keepHead: true });
  } finally {
    pickLoading.value = false;
  }
};
const handlePickNode = (data: SubjectMasterVO) => {
  if (Number(data.isSummary) === 1) {
    ElMessage.info('请选择「明细」节点');
    return;
  }
  pickPreview.value = {
    itemCode: data.subjectCode,
    itemName: data.subjectName,
    subjectId: data.id,
    subject: data
  };
};
const confirmPick = () => {
  if (!pickPreview.value) return;
  const pv = pickPreview.value;
  // 关联科目：回填名称/编码并转「锁定」态
  if (pickDialog.mode === 'bind') {
    const r = bindRow.value;
    if (r) {
      r.itemCode = pv.itemCode;
      r.itemName = pv.itemName;
      r.subjectCode = pv.itemCode;
      r.subjectName = pv.itemName;
      (r as any).refSubjectId = pv.subjectId ?? 0;
      r.rowType = 'ITEM';
      ElMessage.success(`已关联科目「${pv.itemName}」，该行已锁定（可在科目主数据处调整或清除科目）`);
    }
    bindRow.value = null;
    pickDialog.visible = false;
    return;
  }
  localSeq.value += 1;
  const order = allRows.value.reduce((m, r) => Math.max(m, r.itemOrder ?? 0), 0) + 1;
  const key = -(Date.now() % 1000000) - localSeq.value;
  localRows.value.push({
    id: key,
    itemCode: pv.itemCode,
    itemName: pv.itemName,
    subjectCode: pv.itemCode,
    subjectName: pv.itemName,
    parentCode: '',
    level: 1,
    sort: order,
    itemOrder: order,
    isSummary: 0,
    isEditable: 1,
    formula: '',
    responsibleDept: '',
    orgScope: '',
    refSubjectId: pv.subjectId ?? 0,
    rowType: 'ITEM',
    _local: true
  } as RowItem);
  selectedRowKey.value = key;
  pickDialog.visible = false;
  ElMessage.success(`\u5df2\u65b0\u589e\u660e\u7ec6\u884c\u300c${pv.itemName}\u300d`);
};
const addRowByType = async (rt: RowType) => {
  if (!props.template?.id) {
    ElMessage.warning('\u6a21\u677fID\u7f3a\u5931');
    return;
  }
  // 明细行走「选科目」弹窗，其余类型直接加空行
  if (rt === 'ITEM') {
    await openPickDialog(rt);
    return;
  }
  localSeq.value += 1;
  const order = allRows.value.reduce((m, r) => Math.max(m, r.itemOrder ?? 0), 0) + 1;
  const nm = rowTypeLib.find((t) => t.type === rt)?.name || '\u65b0\u884c';
  const key = -(Date.now() % 1000000) - localSeq.value;
  localRows.value.push({
    id: key,
    itemCode: '',
    itemName: nm,
    subjectCode: '',
    subjectName: nm,
    parentCode: '',
    level: 1,
    sort: order,
    itemOrder: order,
    isSummary: rt === 'SUM' ? 1 : 0,
    isEditable: rt === 'ITEM' ? 1 : 0,
    formula: rt === 'SUM' ? 'SUM(children)' : '',
    responsibleDept: '',
    orgScope: '',
    refSubjectId: 0,
    rowType: rt,
    _local: true
  } as RowItem);
  selectedRowKey.value = key;
  ElMessage.success(`\u5df2\u65b0\u589e\u4e00\u884c\u300c${nm}\u300d\uff0c\u9009\u4e2d\u540e\u53ef\u7f16\u8f91\u884c\u5c5e\u6027`);
};
/* Excel 式「新增行」：直接加一行普通空行（可自由填写），不弹选科目 */
const addPlainRow = () => {
  addRowByType('TEXT');
};
/* 适用单位/公司 */
const orgDialog = reactive({ visible: false });
const orgTreeRef = ref();
const orgTree = ref<{ id: string | number; label: string; children?: any[] }[]>([]);
const orgLoading = ref(false);
const orgAll = ref(false);
const orgIdNameMap = new Map<string | number, string>();
const ORG_SHOW_MAX = 3;
const orgScopeIds = computed<(string | number)[]>(() =>
  (selForm.orgScope || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
);
const orgNameList = computed<string[]>(() => (orgScopeIds.value.length ? orgScopeIds.value.map((x) => orgIdNameMap.get(x) ?? String(x)) : []));
const orgNameShow = computed<string>(() => {
  if (!orgScopeIds.value.length) return '\u5168\u90e8\u5355\u4f4d/\u516c\u53f8';
  const names = orgNameList.value;
  if (names.length > ORG_SHOW_MAX) return names.slice(0, ORG_SHOW_MAX).join('、') + ` \u7b49${names.length}\u9879`;
  return names.join('、');
});
const removeOrgTag = (id: string | number) => {
  selForm.orgScope = orgScopeIds.value.filter((x) => String(x) !== String(id)).join(',');
};
const loadOrgTree = async () => {
  orgLoading.value = true;
  try {
    const res: any = await deptTreeSelect();
    orgTree.value = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    orgIdNameMap.clear();
    const walk = (nodes: { id: string | number; label: string; children?: any[] }[]) => {
      nodes.forEach((n) => {
        if (n.id != null && n.label) orgIdNameMap.set(n.id, n.label);
        if (n.children?.length) walk(n.children);
      });
    };
    walk(orgTree.value);
  } finally {
    orgLoading.value = false;
  }
};
const openOrgPicker = async () => {
  orgAll.value = !(selForm.orgScope || '').trim();
  orgDialog.visible = true;
  await loadOrgTree();
  const ids = (selForm.orgScope || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  // 等待树渲染后设置勾选
  setTimeout(() => {
    orgTreeRef.value?.setCheckedKeys(ids);
  }, 100);
};
/* 勾选树节点时，若此前处于「全部单位/公司」则自动取消全局选择，保证二者互斥 */
const handleOrgCheck = () => {
  if (orgAll.value) orgAll.value = false;
};
/* 勾选「全部单位/公司」时清空局部勾选 */
watch(orgAll, (v) => {
  if (v && orgTreeRef.value) orgTreeRef.value.setCheckedKeys([]);
});
/* 若上级节点已勾选，其所有下级自动隐含，从结果中剔除，避免重复存储 */
const pruneDescendants = (ids: (string | number)[]): (string | number)[] => {
  const set = new Set(ids.map((x) => String(x)));
  const walk = (nodes: { id: any; children?: any[] }[]) => {
    nodes.forEach((n) => {
      const key = String(n.id);
      if (set.has(key) && n.children?.length) {
        const stack = [...n.children];
        while (stack.length) {
          const c = stack.pop()!;
          set.delete(String(c.id));
          if (c.children?.length) stack.push(...c.children);
        }
      }
      if (n.children?.length) walk(n.children);
    });
  };
  walk(orgTree.value);
  return [...set];
};
const confirmOrg = () => {
  if (orgAll.value) {
    selForm.orgScope = '';
  } else {
    // 级联勾选：勾选下级不带上上级；下级的全部勾完时上级自动选中（隐含其下级）
    const checked: (string | number)[] = orgTreeRef.value?.getCheckedKeys() ?? [];
    selForm.orgScope = pruneDescendants(checked).join(',');
  }
  orgDialog.visible = false;
};
type RowType = 'HEAD' | 'ITEM' | 'SUM' | 'REF' | 'LINK' | 'NOTE' | 'CALC' | 'TEXT';
const rowTypeLib: { type: RowType; name: string; desc: string; icon: string }[] = [
  { type: 'HEAD', name: '分类标题行', desc: '板块/分类分组标题，不参与计算', icon: '▤' },
  { type: 'ITEM', name: '明细行', desc: '科目明细行，可填报', icon: '▪' },
  { type: 'SUM', name: '自动汇总行', desc: '自动汇总其子级科目', icon: '∑' },
  { type: 'REF', name: '跨表引用行', desc: '引用其他预算表数值', icon: '⇄' },
  { type: 'LINK', name: '链接行', desc: '跳转到其他表/页面', icon: '↗' },
  { type: 'NOTE', name: '备注行', desc: '填写说明与备注文字', icon: '✎' },
  { type: 'CALC', name: '计算行', desc: '自定义公式计算', icon: 'ƒ' }
];
const rowTypeOf = (r: any): string => {
  if (!r) return 'ITEM';
  // 本地新增行带显式类型，直接采用
  if (r.rowType) return r.rowType;
  if (Number(r.isSummary) === 1) return 'SUM';
  const f = r.formula || '';
  if (f && f.toUpperCase().startsWith('REF')) return 'REF';
  if (f && !f.toUpperCase().includes('CHILDREN')) return 'CALC';
  if (Number(r.isEditable ?? 1) === 0) return 'NOTE';
  return 'ITEM';
};

/* ---------- 明细加载 ---------- */
const loadDetail = async () => {
  loading.value = true;
  try {
    const t = props.template;
    if (t?.id == null) {
      rows.value = [];
      return;
    }
    const res: any = await getTemplateItems(t.id, t.budgetYear);
    const items: BudgetTemplateItemType[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const mRes: any = await listSubjectMasterFlat({ budgetYear: t.budgetYear });
    const masters: SubjectMasterVO[] = Array.isArray(mRes) ? mRes : Array.isArray(mRes?.data) ? mRes.data : [];
    const masterMap = new Map<number, SubjectMasterVO>();
    masters.forEach((m) => m.id != null && masterMap.set(m.id, m));
    rows.value = items
      .map((it) => {
        const master = it.refSubjectId != null ? masterMap.get(it.refSubjectId) : null;
        return {
          ...(master ?? {}),
          id: it.id,
          subjectCode: it.itemCode,
          subjectName: it.itemName,
          parentCode: it.parentCode,
          level: it.itemLevel,
          sort: it.itemOrder,
          isSummary: it.isSummary,
          isEditable: it.isEditable,
          refSubjectId: it.refSubjectId,
          responsibleDept: it.responsibleDept,
          orgScope: it.orgScope,
          formula: it.formula,
          rowType: it.rowType,
          itemOrder: it.itemOrder,
          itemCode: it.itemCode,
          itemName: it.itemName
        } as RowItem;
      })
      .sort((a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0));
    // 回填单元格自定义内容（cellData: {列key: 文本|{kind,科目/公式信息}}，兼容新旧格式）
    items.forEach((it) => {
      if (it.id == null || !it.cellData) return;
      try {
        const parsed = JSON.parse(it.cellData) as Record<string, unknown>;
        Object.entries(parsed).forEach(([col, val]) => {
          const k = cellKey(it.id as number, col);
          if (val && typeof val === 'object') {
            const m = val as Partial<CellMeta>;
            const kind: CellKind = m.kind === 'subject' || m.kind === 'formula' ? m.kind : 'text';
            cellMeta[k] = {
              kind,
              subjectId: m.subjectId,
              subjectCode: m.subjectCode,
              subjectName: m.subjectName,
              remark: m.remark,
              amount: m.amount,
              formula: m.formula,
              result: '',
              error: ''
            };
            delete cellValues[k];
          } else {
            cellMeta[k] = { kind: 'text' };
            cellValues[k] = String(val ?? '');
          }
        });
      } catch {
        /* 忽略损坏的 cellData */
      }
    });
    recalcAll();
    // 默认展开所有含子级的节点
    expandAll();
  } finally {
    loading.value = false;
  }
};

/* ---------- 层级树（缩进 + 展开/折叠） ---------- */
const expandedSet = ref(new Set<number>());
const childMap = computed(() => {
  const map = new Map<string, RowItem[]>();
  allRows.value.forEach((r) => {
    const p = (r.parentCode || '') as string;
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(r);
  });
  return map;
});
const hasChildren = (r: RowItem) => {
  const kids = childMap.value.get((r.itemCode || r.subjectCode || '') as string);
  return !!kids && kids.length > 0;
};
const displayRows = computed(() => {
  const items = [...allRows.value];
  const codeSet = new Set(items.map((r) => r.itemCode || r.subjectCode).filter(Boolean));
  const tops = items.filter((r) => !r.parentCode || !codeSet.has(r.parentCode as string));
  const result: { row: RowItem; depth: number }[] = [];
  const walk = (nodes: RowItem[], depth: number) => {
    nodes
      .sort((a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0) || Number(a.id) - Number(b.id))
      .forEach((n) => {
        result.push({ row: n, depth });
        const kids = (childMap.value.get((n.itemCode || n.subjectCode || '') as string) || []).sort(
          (a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0) || Number(a.id) - Number(b.id)
        );
        if (kids.length && expandedSet.value.has(n.id as number)) walk(kids, depth + 1);
      });
  };
  walk(tops, 0);
  return result;
});
const toggleExpand = (r: RowItem) => {
  const s = new Set(expandedSet.value);
  if (s.has(r.id as number)) s.delete(r.id as number);
  else s.add(r.id as number);
  expandedSet.value = s;
};
const expandAll = () => {
  expandedSet.value = new Set(rows.value.filter((r) => hasChildren(r)).map((r) => r.id as number));
};
const collapseAll = () => {
  expandedSet.value = new Set();
};

/* ---------- 选中行 / 行属性面板 ---------- */
const selectedRow = computed(() => allRows.value.find((r) => r.id === selectedRowKey.value) || null);
/* 画布双击改行名称：editNameKey 记录正在编辑的行，editNameVal 为临时值 */
const editNameKey = ref<number | string | null>(null);
const editNameVal = ref('');
const editNameLoading = ref(false);
const startEditName = (r: RowItem) => {
  // 科目绑定行取自科目明细，名称不可在画布内随意改（需重新挂接或调整科目）
  if ((r as RowItem & { refSubjectId?: number }).refSubjectId) return;
  editNameKey.value = r.id;
  editNameVal.value = r.itemName || r.subjectName || '';
};
const cancelEditName = () => {
  editNameKey.value = null;
  editNameVal.value = '';
};
const commitEditName = async (r: RowItem) => {
  if (editNameKey.value == null) return;
  editNameKey.value = null;
  const v = (editNameVal.value || '').trim();
  if (!v) {
    ElMessage.warning('行名称不能为空');
    return;
  }
  if (v === (r.itemName || r.subjectName)) return;
  r.itemName = v;
  r.subjectName = v;
  if (!(r as RowItem & { _local?: boolean })._local && r.id != null && props.template?.id) {
    editNameLoading.value = true;
    try {
      await updateTemplateItem({
        id: r.id,
        templateId: props.template.id,
        templateCode: form.templateCode,
        templateName: form.templateName,
        itemCode: (r as any).itemCode || (r as any).subjectCode || '',
        itemName: v,
        itemOrder: (r as any).itemOrder ?? (r as any).sort ?? 0
      });
      ElMessage.success('行名称已更新');
      await loadDetail();
      emit('changed');
    } finally {
      editNameLoading.value = false;
    }
  }
};
/* 科目绑定锁定：由「科目明细」选定的行，行名称/编码置灰只读 */
const ROW_LOCK_HINT = '该行由科目明细绑定，如需修改请在业务科目处调整或重新「关联科目」';
const rowLocked = computed(() => {
  const r = selectedRow.value;
  return !!(r && (r as RowItem & { refSubjectId?: number }).refSubjectId);
});
/* 自定义行：方式 A 从科目明细关联到当前行（回填并锁定） */
const openBindSubject = async () => {
  const r = selectedRow.value;
  if (!r) return;
  bindRow.value = r;
  pickDialog.mode = 'bind';
  await openPickDialog('ITEM');
};
const selForm = reactive<{
  rowType: RowType;
  itemOrder: number;
  customFormula: string;
  editable: boolean;
  responsibleDept: string;
  orgScope: string;
}>({
  rowType: 'ITEM',
  itemOrder: 0,
  customFormula: '',
  editable: true,
  responsibleDept: '',
  orgScope: ''
});
const selectRow = (r: RowItem) => {
  selectedRowKey.value = r.id as number;
  colSelKey.value = null;
};
watch(selectedRowKey, (k) => {
  const r = k != null ? allRows.value.find((x) => x.id === k) : null;
  if (!r) return;
  selForm.rowType = (rowTypeOf(r) as RowType) === 'TEXT' ? 'NOTE' : (rowTypeOf(r) as RowType);
  selForm.itemOrder = r.itemOrder ?? r.sort ?? 0;
  selForm.editable = Number(r.isEditable ?? 1) === 1;
  selForm.responsibleDept = r.responsibleDept || '';
  selForm.orgScope = r.orgScope || '';
  const f = r.formula || '';
  selForm.customFormula = f && !f.toUpperCase().includes('CHILDREN') ? f : '';
  // 排序号按画布位置显示为顺号（1..N），避免出现 101 这类跳号
  const pos = displayRows.value.findIndex((d) => d.row.id === k);
  if (pos >= 0) selForm.itemOrder = pos + 1;
});

/* ---------- 保存行属性 ---------- */
const saveRowProps = async () => {
  const r = selectedRow.value;
  if (!r?.id || !props.template?.id) {
    ElMessage.warning('请先选中一行');
    return;
  }
  let isSummary = 0,
    isEditable = 1,
    formula = '';
  const rt = selForm.rowType;
  if (rt === 'SUM') {
    isSummary = 1;
    isEditable = 0;
    formula = 'SUM(children)';
  } else if (rt === 'HEAD' || rt === 'NOTE' || rt === 'LINK') {
    isSummary = 0;
    isEditable = 0;
    formula = '';
  } else if (rt === 'REF') {
    isSummary = 0;
    isEditable = 0;
    formula = selForm.customFormula || 'REF()';
  } else if (rt === 'CALC') {
    isSummary = 0;
    isEditable = 0;
    formula = selForm.customFormula || '';
  } else {
    isEditable = selForm.editable ? 1 : 0;
    formula = '';
  }
  // 排序号按画布展示位置归一化（1..N -> 10,20,30..），避免出现 101 这类跳号
  const pos = displayRows.value.findIndex((d) => d.row.id === r.id);
  const order = (pos >= 0 ? pos + 1 : selForm.itemOrder) * 10;
  saving.value = true;
  try {
    const isLocal = !!(r as RowItem & { _local?: boolean })._local;
    if (isLocal) {
      const row = localRows.value.find((x) => x.id === r.id);
      if (!row) return;
      // 行编码为空时自动生成，保证可落库
      let code = (row.itemCode || row.subjectCode || '').trim();
      if (!code) {
        code = `R${String(row.id).replace('-', '').slice(0, 5)}`;
        row.itemCode = code;
        row.subjectCode = code;
      }
      row.itemName = row.itemName || row.subjectName || rowTypeLib.find((t) => t.type === rt)?.name || '新行';
      row.subjectName = row.itemName;
      row.rowType = rt;
      row.itemOrder = order;
      row.sort = order;
      row.isSummary = isSummary;
      row.isEditable = isEditable;
      row.orgScope = selForm.orgScope;
      row.formula = formula;
      // 本地行「应用属性」即调用后端新增接口持久化
      await addTemplateItem({
        templateId: props.template.id,
        templateCode: form.templateCode,
        templateName: form.templateName,
        itemCode: code,
        itemName: row.itemName,
        parentCode: '',
        itemLevel: 1,
        itemOrder: order,
        isSummary,
        isEditable,
        formula,
        orgScope: selForm.orgScope,
        rowType: rt,
        refSubjectId: row.refSubjectId || 0,
        cellData: Object.keys(collectCellMap(r.id as number)).length ? JSON.stringify(collectCellMap(r.id as number)) : ''
      });
      localRows.value = localRows.value.filter((x) => x.id !== r.id);
      selectedRowKey.value = null;
      ElMessage.success('已应用属性并保存为新行');
      lastSave.value = `已保存 · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
      await loadDetail();
      emit('changed');
      return;
    }
    await updateTemplateItem({
      id: r.id,
      templateId: props.template.id,
      templateCode: form.templateCode,
      templateName: form.templateName,
      itemCode: r.itemCode || r.subjectCode || '',
      itemName: r.itemName || r.subjectName || '',
      itemOrder: order,
      isSummary,
      isEditable,
      responsibleDept: '',
      formula,
      orgScope: selForm.orgScope,
      rowType: rt
    });
    ElMessage.success('已应用属性');
    lastSave.value = `已保存 · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
    await loadDetail();
    emit('changed');
  } finally {
    saving.value = false;
  }
};

/* ---------- 行排序（上移/下移） ---------- */
const moveRow = async (idx: number, dir: -1 | 1) => {
  const arr = displayRows.value;
  const t = arr[idx];
  const n = arr[idx + dir];
  if (!t || !n || !props.template?.id) return;
  if ((t.row.parentCode || '') !== (n.row.parentCode || '')) {
    ElMessage.warning('相邻行层级不同，请先折叠子级再调整顺序');
    return;
  }
  const group = (childMap.value.get(t.row.parentCode || '') || [])
    .filter((s) => (s.parentCode || '') === (t.row.parentCode || ''))
    .sort((a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0) || (a.id as number) - (b.id as number));
  const ti = group.findIndex((s) => s.id === t.row.id);
  const target = group[ti + dir];
  if (ti < 0 || !target) return;
  const tmp = target.itemOrder;
  target.itemOrder = t.row.itemOrder;
  t.row.itemOrder = tmp;
  saving.value = true;
  try {
    const ordered = group
      .sort((a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0) || (a.id as number) - (b.id as number))
      .map((s, i) => ({ row: s, order: (i + 1) * 10 }));
    const remote = ordered.filter((o) => !(o.row as RowItem & { _local?: boolean })._local && (o.row.id as number) > 0);
    const local = ordered.filter((o) => (o.row as RowItem & { _local?: boolean })._local || (o.row.id as number) < 0);
    // 本地行：仅更新本地 itemOrder
    local.forEach((o) => {
      const lr = localRows.value.find((x) => x.id === o.row.id);
      if (lr) {
        lr.itemOrder = o.order;
        lr.sort = o.order;
      }
    });
    if (remote.length) {
      await Promise.all(
        remote.map((o) =>
          updateTemplateItem({
            id: o.row.id as number,
            templateId: props.template.id,
            templateCode: form.templateCode,
            templateName: form.templateName,
            itemCode: (o.row as any).itemCode || (o.row as any).subjectCode || '',
            itemName: (o.row as any).itemName || (o.row as any).subjectName || '',
            itemOrder: o.order
          })
        )
      );
    }
    ElMessage.success('\u5df2\u8c03\u6574\u6392\u5e8f');
    await loadDetail();
    emit('changed');
  } finally {
    saving.value = false;
  }
};

/* ---------- 移除（本地行直接删除 / 模板自有行硬删 / 科目挂载行解挂） ---------- */
const removeRow = async (r: RowItem) => {
  if (!r.id || !(r as RowItem & { _local?: boolean })._local) {
    // 后端行
    if (!props.template?.id || r.id == null) return;
    const owned = !(r as RowItem & { refSubjectId?: number }).refSubjectId;
    try {
      await ElMessageBox.confirm(
        owned
          ? `确定删除「${r.itemName || r.subjectName}」吗？删除后不可恢复。`
          : `确定从表中解挂「${r.itemName || r.subjectName}」吗？仅移除本表挂载，不影响科目主数据。`,
        owned ? '删除确认' : '解挂确认',
        {
          type: 'warning',
          confirmButtonText: owned ? '删除' : '解挂',
          cancelButtonText: '取消'
        }
      );
    } catch {
      return;
    }
    saving.value = true;
    try {
      if (owned) {
        // 模板自有行（新增的分类标题/汇总/链接/备注/计算行）：直接删除模板行
        await delTemplateItems([r.id]);
        ElMessage.success('已删除');
      } else {
        await unmountTemplateSubjects({ templateId: props.template.id, itemIds: [r.id] });
        ElMessage.success('已解挂');
      }
      if (selectedRowKey.value === r.id) selectedRowKey.value = null;
      await loadDetail();
      emit('changed');
    } finally {
      saving.value = false;
    }
    return;
  }
  // 本地新增行：直接移除，不落库
  localRows.value = localRows.value.filter((x) => x.id !== r.id);
  if (selectedRowKey.value === r.id) selectedRowKey.value = null;
  ElMessage.success('\u5df2\u5220\u9664\u672c\u5730\u65b0\u589e\u884c');
};

/* ---------- 挂载弹窗 ---------- */
const mountDialog = reactive({ visible: false, title: '' });
const mountTreeRef = ref();
const mountTree = ref<SubjectMasterVO[]>([]);
const mountKeyword = ref('');
const mountLoading = ref(false);
const mountSubmitLoading = ref(false);
const mountCodeIdMap = new Map<string, number>();
/* 已挂载科目：置灰不可再选，并在科目明细后提示「已选择」 */
const mountedCodeSet = computed(() => new Set(rows.value.map((r) => r.itemCode || r.subjectCode).filter(Boolean)));
const mountTreeProps = {
  label: 'subjectName',
  children: 'children',
  disabled: (data: any) => mountedCodeSet.value.has(data.subjectCode)
};
/* 选科目弹窗：已挂载科目置灰并标注「已挂载」 */
const pickTreeProps = {
  label: 'subjectName',
  children: 'children',
  disabled: (data: any) => mountedCodeSet.value.has(data.subjectCode)
};
/* 单元格科目选择弹窗：允许选择全部科目（不套挂载置灰） */
const subjectCellTreeProps = {
  label: 'subjectName',
  children: 'children'
};
const filterMountNode = (v: string, d: any) => !v || `${d.subjectCode} ${d.subjectName}`.toLowerCase().includes(v.toLowerCase());
watch(mountKeyword, (v) => mountTreeRef.value?.filter(v));
watch(subjectCellKeyword, (v) => subjectTreeRef.value?.filter(v));
const loadMountTree = async () => {
  mountLoading.value = true;
  try {
    const flatRes: any = await listSubjectMasterFlat({});
    const flat: SubjectMasterVO[] = Array.isArray(flatRes) ? flatRes : Array.isArray(flatRes?.data) ? flatRes.data : [];
    mountCodeIdMap.clear();
    flat.forEach((m) => {
      if (m.subjectCode != null && m.id != null) mountCodeIdMap.set(m.subjectCode, m.id);
    });
    mountTree.value = await listSubjectMasterTree({ keepHead: true });
  } finally {
    mountLoading.value = false;
  }
};
const openMountDialog = async () => {
  if (!props.template?.id) {
    ElMessage.warning('模板ID缺失');
    return;
  }
  mountDialog.title = `挂载科目 · ${props.template.templateCode} ${props.template.templateName}（${props.template.budgetYear}年）`;
  mountDialog.visible = true;
  mountKeyword.value = '';
  mountTreeRef.value?.setCheckedKeys([]);
  await loadMountTree();
};
const submitMount = async () => {
  if (!props.template?.id) {
    ElMessage.warning('模板ID缺失');
    return;
  }
  const checked: string[] = mountTreeRef.value?.getCheckedKeys() ?? [];
  const half: string[] = mountTreeRef.value?.getHalfCheckedKeys() ?? [];
  const codes = Array.from(new Set([...checked, ...half]));
  if (!codes.length) {
    ElMessage.warning('请至少勾选一个科目');
    return;
  }
  const ids = codes.map((c) => mountCodeIdMap.get(c)).filter((x): x is number => x != null);
  if (!ids.length) {
    ElMessage.warning('未匹配到有效科目');
    return;
  }
  mountSubmitLoading.value = true;
  try {
    const res: any = await mountTemplateSubjects({ templateId: props.template.id, subjectIds: ids });
    const added = typeof res === 'number' ? res : (res?.data ?? 0);
    ElMessage.success(`挂载成功${added ? `，新增 ${added} 项` : '（均为已挂载，已跳过）'}`);
    mountDialog.visible = false;
    await loadDetail();
    emit('changed');
  } finally {
    mountSubmitLoading.value = false;
  }
};

/* ---------- 列名设置 ---------- */
const colDialogVisible = ref(false);
const colForm = reactive({ actualLabel: '', budgetLabel: '' });
const openColDialog = () => {
  colForm.actualLabel = form.actualLabel || '上一年实际完成值';
  colForm.budgetLabel = form.budgetLabel || '预算值(编制)';
  colDialogVisible.value = true;
};
const saveColNames = async () => {
  if (!props.template?.id) return;
  if (!colForm.actualLabel.trim() || !colForm.budgetLabel.trim()) {
    ElMessage.warning('列名不能为空');
    return;
  }
  saving.value = true;
  try {
    await updateBudgetTemplate({
      id: props.template.id,
      templateCode: form.templateCode,
      templateName: form.templateName,
      budgetYear: form.budgetYear,
      templateType: form.templateType,
      actualLabel: colForm.actualLabel.trim(),
      budgetLabel: colForm.budgetLabel.trim()
    });
    form.actualLabel = colForm.actualLabel.trim();
    form.budgetLabel = colForm.budgetLabel.trim();
    ElMessage.success('列名已保存');
    lastSave.value = `已保存 · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
    emit('changed');
  } finally {
    saving.value = false;
  }
};

/* ---------- 模板保存 / 发布 / 重置 / 预览 ---------- */
const saveTemplate = async () => {
  if (!form.templateName?.trim()) {
    ElMessage.warning('模板名称不能为空');
    return;
  }
  if (props.template?.id == null) return;
  saving.value = true;
  try {
    await updateBudgetTemplate({
      id: props.template.id,
      templateCode: form.templateCode,
      templateName: form.templateName,
      budgetYear: form.budgetYear,
      templateType: form.templateType,
      actualLabel: form.actualLabel,
      budgetLabel: form.budgetLabel
    });
    ElMessage.success('模板已保存');
    lastSave.value = `已保存 · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
    emit('changed');
  } finally {
    saving.value = false;
  }
};
const publishTemplate = async () => {
  if (props.template?.id == null) return;
  try {
    await ElMessageBox.confirm('发布后模板状态将置为启用，供填报/矩阵/审批使用。确定发布吗？', '发布模板', {
      type: 'warning',
      confirmButtonText: '发布',
      cancelButtonText: '取消'
    });
  } catch {
    return;
  }
  publishing.value = true;
  try {
    await updateBudgetTemplate({
      id: props.template.id,
      templateCode: form.templateCode,
      templateName: form.templateName,
      budgetYear: form.budgetYear,
      templateType: form.templateType,
      actualLabel: form.actualLabel,
      budgetLabel: form.budgetLabel,
      status: '1'
    });
    ElMessage.success('已发布');
    form.status = '1';
    lastSave.value = '已发布';
    emit('changed');
  } finally {
    publishing.value = false;
  }
};
const resetAll = async () => {
  try {
    await ElMessageBox.confirm('重置将放弃未保存的本地修改并重新加载模板结构。确定重置吗？', '重置确认', { type: 'warning' });
  } catch {
    return;
  }
  selectedRowKey.value = null;
  await loadDetail();
};
const preview = () => {
  previewVisible.value = true;
};

const formulaCount = computed(() => rows.value.filter((r) => Number(r.isSummary) === 1 || r.formula).length);

// 父级刷新选中表后（保存/发布/挂载），同步模板信息
watch(
  () => props.template,
  (t) => {
    if (t) Object.assign(form, { ...t });
  },
  { deep: true }
);

onMounted(async () => {
  Object.assign(form, { ...props.template });
  loadColProps(); // 恢复本模板的列类型/可填配置（localStorage，后端落库后续补）
  loadOrgTree(); // 预加载单位树，供「适用单位/公司」显示名称
  document.addEventListener('keydown', onCanvasKeydown);
  await loadDetail();
});
</script>

<style scoped>
.dsg-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 196px);
  min-height: 480px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

/* ===== 顶栏 ===== */
.dsg-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}
.dsg-crumb {
  font-size: 12px;
  color: #909399;
}
.dsg-crumb b {
  color: #303133;
  font-weight: 600;
}
.dsg-divider {
  width: 1px;
  height: 18px;
  background: #e4e7ed;
}
.dsg-top-title {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}
.dsg-spacer {
  flex: 1;
}

/* ===== 副工具栏 ===== */
.dsg-subbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  background: #fafbfc;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}
.dsg-tpl-name {
  font-weight: 600;
  color: #303133;
  font-size: 13px;
}
.dsg-tpl-meta {
  font-size: 12px;
  color: #909399;
}
.dsg-tpl-meta::before {
  content: '';
  display: inline-block;
  width: 1px;
  height: 10px;
  background: #dcdfe6;
  margin: 0 10px;
  vertical-align: middle;
}
.dsg-tpl-name + .dsg-tpl-meta::before {
  display: none;
}

/* ===== 三栏 ===== */
.dsg-main {
  display: flex;
  flex: 1;
  min-height: 0;
}
.dsg-panel {
  width: 240px;
  background: #fff;
  overflow-y: auto;
  flex-shrink: 0;
}
.dsg-panel-left {
  border-right: 1px solid #e4e7ed;
}
.dsg-panel-right {
  border-left: 1px solid #e4e7ed;
  width: 300px;
}
.dsg-panel-center {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 14px;
  background: #f5f7fa;
}

/* ===== 画布 ===== */
.dsg-canvas-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}
.dsg-canvas-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fafbfc;
  border-bottom: 1px solid #ebeef5;
}
.dsg-canvas-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsg-year-tag {
  background: #fdf6ec;
  color: #b88230;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.dsg-canvas-actions {
  display: flex;
  gap: 6px;
}
.dsg-table-wrap {
  overflow: auto;
  max-height: calc(100vh - 380px);
}
.dsg-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 720px;
}
.dsg-table th,
.dsg-table td {
  border: 1px solid #ebeef5;
  padding: 7px 10px;
  font-size: 12px;
}
.dsg-table th {
  background: #f5f7fa;
  color: #606266;
  font-weight: 500;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 2;
  white-space: nowrap;
}
.dsg-row-no {
  width: 60px;
  min-width: 60px;
  text-align: center;
  color: #909399;
  font-size: 11px;
}
.dsg-subject-col {
  min-width: 300px;
}
.dsg-data-col {
  min-width: 130px;
  width: 130px;
  text-align: right;
}
.dsg-op-col {
  width: 110px;
  min-width: 110px;
  text-align: center;
}
.dsg-table tr {
  cursor: pointer;
}
.dsg-table tr.dsg-row-selected td {
  background: #ecf5ff;
}
.dsg-table tr.dsg-row-head td {
  background: #fafbfc;
  font-weight: 600;
}
.dsg-table tr.dsg-row-head td.dsg-subject-cell .dsg-cell-name {
  color: #303133;
}
.dsg-table tr.dsg-row-sum td {
  background: #fdf6ec;
}
.dsg-table tr.dsg-row-note td {
  color: #909399;
}
.dsg-tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  cursor: pointer;
  color: #909399;
  margin-right: 4px;
  vertical-align: middle;
  transition: 0.15s;
}
.dsg-tree-toggle.fold {
  transform: rotate(-90deg);
}
.dsg-line-no {
  font-family: Consolas, monospace;
  color: #909399;
  font-size: 11px;
}
.dsg-cell-code {
  font-family: Consolas, monospace;
  color: #409eff;
  font-size: 11px;
  margin-right: 6px;
}
.dsg-cell-name {
  color: #303133;
}
.dsg-inline-name {
  display: inline-block;
  width: 160px;
  vertical-align: middle;
}
.dsg-merged-cell {
  text-align: center;
  background: #fdf6ec !important;
  color: #b88230;
  font-weight: 500;
  user-select: none;
}
.dsg-merged-text {
  display: inline-block;
}
.dsg-cell-locked {
  background: #fafafa;
}
.dsg-cell-locked .dsg-placeholder,
.dsg-cell-locked {
  color: #c0c4cc;
}
.dsg-col-selected {
  background: #e6f4ff !important;
}
.dsg-prop-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.dsg-tag-head {
  background: #f4f4f5;
  color: #909399;
}
.dsg-tag-item {
  background: #ecf5ff;
  color: #409eff;
}
.dsg-tag-sum {
  background: #fdf6ec;
  color: #b88230;
}
.dsg-tag-ref {
  background: #f0f9eb;
  color: #67c23a;
}
.dsg-tag-link {
  background: #eef1f6;
  color: #2c5f8a;
}
.dsg-tag-note {
  background: #f4f4f5;
  color: #909399;
}
.dsg-tag-calc {
  background: #f5eef8;
  color: #8a5fb8;
}
.dsg-tag-text {
  background: #f4f4f5;
  color: #909399;
}
.dsg-data-cell.ref {
  background: #fafbfc;
}
.dsg-data-cell.input {
  background: #fdfaf3;
}
.dsg-placeholder {
  color: #b88230;
  font-size: 11px;
}
/* Excel 式单元格：输入框填满单元格、无边框盒，聚焦高亮 */
.dsg-cell-input-cell {
  padding: 0 !important;
}
.dsg-cell-input-cell .dsg-cell-input {
  width: 100%;
}
.dsg-cell-input-cell .el-input__wrapper {
  box-shadow: none !important;
  border-radius: 0;
  background: transparent;
  padding: 0 8px;
}
.dsg-cell-input-cell .el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1px #409eff inset !important;
}
/* 选中单元格高亮 */
.dsg-cell-selected {
  background: #e6f4ff !important;
  box-shadow: inset 0 0 0 1.5px #409eff;
}
/* 科目单元格 */
.dsg-cell-subject {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  cursor: pointer;
  border-radius: 3px;
  background: #f0f9eb;
  padding: 0 6px;
  overflow: hidden;
}
.dsg-cell-subject:hover {
  border-color: #67c23a;
  box-shadow: 0 0 0 1px #67c23a;
}
.dsg-subj-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #529b2e;
  font-size: 12px;
}
.dsg-subj-empty {
  flex: 1;
  color: #c0c4cc;
  font-size: 12px;
}
.dsg-subj-amount {
  color: #606266;
  font-size: 12px;
  font-weight: 600;
  font-family: Consolas, monospace;
}
.dsg-subj-icon {
  color: #67c23a;
  font-size: 13px;
  flex-shrink: 0;
}
.dsg-subj-clear {
  color: #c0c4cc;
  font-size: 12px;
  flex-shrink: 0;
  visibility: hidden;
}
.dsg-cell-subject:hover .dsg-subj-clear {
  visibility: visible;
}
.dsg-subj-clear:hover {
  color: #f56c6c;
}
/* 公式单元格 */
.dsg-cell-formula {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
}
.dsg-fx-prefix {
  color: #8a5fb8;
  font-weight: 700;
  font-family: Georgia, serif;
  font-size: 13px;
  flex-shrink: 0;
}
.dsg-cell-formula .dsg-fx-input .el-input__wrapper {
  padding: 0 4px;
}
.dsg-fx-input {
  flex: 1;
  min-width: 0;
}
.dsg-fx-input .el-input__inner {
  color: #8a5fb8;
  font-family: Consolas, monospace;
  font-size: 12px;
}
.dsg-fx-result {
  color: #303133;
  font-weight: 600;
  font-family: Consolas, monospace;
  font-size: 12px;
  flex-shrink: 0;
}
.dsg-fx-err {
  color: #f56c6c;
  font-weight: 600;
  font-family: Consolas, monospace;
  font-size: 11px;
  flex-shrink: 0;
}
.dsg-cell-formula.dsg-cell-err {
  background: #fef0f0;
}
.dsg-cell-formula.dsg-cell-err .dsg-fx-input .el-input__inner {
  color: #f56c6c;
}
/* 列宽拖拽手柄 */
.dsg-col-resize {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 3;
}
.dsg-col-resize:hover {
  background: #409eff;
  opacity: 0.4;
}
.dsg-op-cell {
  white-space: nowrap;
}
.dsg-canvas-empty {
  text-align: center;
  color: #909399;
  padding: 28px 0;
}
.dsg-canvas-foot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  background: #fafbfc;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}
.dsg-canvas-foot b {
  color: #303133;
}

/* ===== 右侧行属性 ===== */
.dsg-prop-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #ebeef5;
}
.dsg-prop-title {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.5px;
}
.dsg-prop-section {
  padding: 12px 14px;
  border-bottom: 1px solid #ebeef5;
}
.dsg-prop-row {
  margin-bottom: 12px;
}
.dsg-prop-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
  display: block;
}
.dsg-org-field {
  width: 100%;
}
.dsg-org-display {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-height: 30px;
  padding: 0 10px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12.5px;
  color: #303133;
  box-sizing: border-box;
}
.dsg-org-display:hover {
  border-color: #409eff;
}
.dsg-org-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsg-org-more {
  flex-shrink: 0;
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
}
.dsg-org-arrow {
  flex-shrink: 0;
  color: #909399;
}
.dsg-org-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.dsg-org-tags .el-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsg-org-tip {
  margin-top: 6px;
  font-size: 11px;
  color: #c0c4cc;
}
.dsg-pick-preview {
  margin-top: 10px;
  padding: 8px 10px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  color: #303133;
  font-size: 13px;
}
.dsg-fn-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.dsg-fn-chip {
  padding: 2px 8px;
  border-radius: 4px;
  background: #fdf6ec;
  color: #b88230;
  font-size: 11px;
  cursor: pointer;
  font-weight: 600;
  border: 1px solid transparent;
}
.dsg-fn-chip:hover {
  border-color: #b88230;
}
.dsg-empty-right {
  padding: 48px 20px;
  text-align: center;
  color: #909399;
}
.dsg-empty-icon {
  font-size: 38px;
  opacity: 0.4;
  margin-bottom: 10px;
}
.dsg-empty-text {
  font-size: 12px;
}

/* ===== 状态栏 ===== */
.dsg-statusbar {
  height: 30px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 16px;
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}
.dsg-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #67c23a;
  display: inline-block;
  margin-right: 5px;
}
.dsg-dot.dirty {
  background: #e6a23c;
}

/* ===== 挂载弹窗 ===== */
.dsg-md-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.dsg-md-count {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}
.dsg-md-count b {
  color: #e6a23c;
}
.dsg-md-tree {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  max-height: 420px;
  overflow: auto;
  padding: 8px;
}
.dsg-md-node {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
}
.dsg-md-note {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

/* ===== 预览 ===== */
.dsg-preview {
  max-height: 60vh;
  overflow: auto;
}
.dsg-preview .dsg-table {
  min-width: 620px;
}

.dsg-panel::-webkit-scrollbar,
.dsg-panel-center::-webkit-scrollbar,
.dsg-table-wrap::-webkit-scrollbar,
.dsg-preview::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.dsg-panel::-webkit-scrollbar-thumb,
.dsg-panel-center::-webkit-scrollbar-thumb,
.dsg-table-wrap::-webkit-scrollbar-thumb,
.dsg-preview::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 4px;
}
</style>
