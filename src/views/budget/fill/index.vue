<template>
  <div class="app-container">
    <!-- 顶部：方案选择 + 公司选择 -->
    <el-card class="mb-4 filter-card" shadow="never">
      <el-form :inline="true" size="small">
        <el-form-item label="预算方案">
          <el-select v-model="planId" placeholder="请选择预算方案" style="width: 240px" @change="handlePlanChange" :disabled="planDisabled">
            <el-option
              v-for="item in planOptions"
              :key="item.id"
              :label="item.planName + (item.status === 'ARCHIVED' ? '（已归档）' : '')"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="showDeptSelect" label="填报单位">
          <el-select v-model="deptId" placeholder="请选择填报单位" style="width: 200px" @change="handleDeptChange">
            <el-option v-for="item in deptOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="填报单位">
          <span class="unit-text">{{ currentDeptName }}</span>
        </el-form-item>
        <el-form-item v-if="planStatus === 'ARCHIVED'" style="margin-bottom: 0">
          <el-tag type="warning" size="small">已归档方案，仅供查看</el-tag>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 空状态 -->
    <el-card v-if="!planId" shadow="never">
      <el-empty description="请先选择预算方案" />
    </el-card>

    <!-- 填报区域：折叠面板 -->
    <div v-else-if="planId && (deptId || !showDeptSelect)">
      <el-row :gutter="0">
        <!-- 左侧：板块导航 -->
        <el-col :span="3">
          <div class="section-nav">
            <div class="section-nav-title">预算板块</div>
            <div
              v-for="(section, idx) in sections"
              :key="section.code"
              class="section-nav-item"
              :class="{ active: activeSection === idx }"
              @click="scrollToSection(idx)"
            >
              <span class="section-nav-num">{{ section.code }}</span>
              <span class="section-nav-label">{{ section.name }}</span>
              <span v-if="section.status" class="section-nav-status">
                <el-tag :type="getStatusType(section.status)" size="small" effect="plain">{{ getStatusLabel(section.status) }}</el-tag>
              </span>
            </div>
          </div>
        </el-col>

        <!-- 右侧：填报表格 -->
        <el-col :span="21">
          <el-card shadow="never">
            <!-- 驳回原因提示：按板块分别显示 -->
            <el-alert
              v-for="item in rejectRemarks"
              :key="item.code"
              :title="`【${item.name}】${item.remark}`"
              type="error"
              show-icon
              :closable="false"
              class="mb-2"
            />
            <template #header>
              <div class="flex justify-between items-center">
                <span class="font-bold">预算填报 - {{ currentDeptName }}</span>
                <div>
                  <el-badge :value="unrepliedCommentCount" :max="99" :hidden="unrepliedCommentCount === 0" class="comment-badge">
                    <el-button v-if="planId && deptId" type="info" plain icon="ChatDotRound" size="small" @click="openComments">审批意见</el-button>
                  </el-badge>
                  <el-button v-if="planId && deptId" type="primary" plain icon="History" size="small" @click="openVersions">版本历史</el-button>
                  <el-button v-if="planId && deptId" type="success" plain icon="Flag" size="small" @click="openMyTargets">公司目标</el-button>
                  <el-button v-if="planId && deptId && !readonly" type="primary" plain icon="MagicStick" size="small" @click="openPrefill">智能预填</el-button>
                  <!-- AI 预填确认操作 -->
                  <template v-if="prefilledCount > 0">
                    <el-tag type="warning" size="small" class="mx-1">待确认预填 {{ prefilledCount }} 项</el-tag>
                    <el-button type="success" plain size="small" @click="acceptAllPrefill">全部采纳</el-button>
                    <el-button type="info" plain size="small" @click="ignoreAllPrefill">忽略标记</el-button>
                  </template>
                  <span class="mx-1"></span>
                  <!-- 全部已审批：锁定 -->
                  <template v-if="hasApproved && !hasDraftData && !hasSubmitted">
                    <el-tag type="success" size="large" class="mr-2">已审批通过</el-tag>
                  </template>
                  <!-- 全部已提交待审批：不可编辑 -->
                  <template v-else-if="hasSubmitted && !hasDraftData">
                    <el-tag type="warning" size="large" class="mr-2">已提交，待审批</el-tag>
                  </template>
                  <!-- 有草稿数据（含驳回）且方案非归档/关闭：可以编辑和提交 -->
                  <template v-if="hasDraftData && !readonly">
                    <el-button type="success" icon="Check" @click="handleSubmit" :loading="submitLoading">
                      提交审批
                    </el-button>
                    <el-button type="primary" icon="Document" @click="handleSaveDraft" :loading="saveLoading">
                      保存草稿
                    </el-button>
                  </template>
                </div>
              </div>
            </template>

            <div v-if="loading" class="text-center py-8">
              <el-icon class="is-loading" :size="24"><Loading /></el-icon>
              <div class="mt-2 text-gray-400">加载中...</div>
            </div>

            <div v-else-if="sections.length === 0">
              <el-empty description="暂无科目数据" />
            </div>

            <div v-else>
              <div v-for="(section, sIdx) in sections" :key="section.code" :id="'section-' + sIdx" class="section-block">
                <!-- 板块标题 -->
                <div class="section-header" @click="toggleSection(sIdx)">
                  <el-icon class="mr-1">
                    <ArrowDown v-if="section.expanded" />
                    <ArrowRight v-else />
                  </el-icon>
                  <span class="section-title">{{ section.name }}</span>
                  <span class="section-summary" v-if="section.code !== '01'">
                    本年预算合计: {{ formatAmount(section.totalBudget) }} 万元
                  </span>
                </div>

                <!-- 板块内容：01公司基本信息表使用文本输入 -->
                <el-table
                  v-if="section.expanded && section.code === '01'"
                  :data="tableRows(section)"
                  border
                  :row-class-name="getRowClass"
                  :show-header="true"
                  size="small"
                  style="width: 100%"
                  :max-height="600"
                >
                  <el-table-column label="信息项" min-width="240">
                    <template #default="{ row }">
                      <span :style="{ paddingLeft: (row.itemLevel - 1) * 16 + 'px', fontWeight: row.isSummary === 1 || row._isGroupHeader ? 'bold' : 'normal' }">
                        {{ row.itemName }}
                      </span>
                    </template>
                  </el-table-column>

                  <el-table-column label="信息内容" min-width="300">
                    <template #default="{ row }">
                      <el-select
                        v-if="row.itemCode === '0101' && row.isEditable === 1 && !readonly && !isFieldReadOnly(row)"
                        v-model="row.remark"
                        size="small"
                        placeholder="请选择"
                        style="width: 100%"
                        clearable
                        @change="scheduleAutoSave"
                      >
                        <el-option v-for="t in companyNatureOptions" :key="t" :label="t" :value="t" />
                      </el-select>
                      <el-input
                        v-else-if="row.isEditable === 1 && !readonly && !isFieldReadOnly(row)"
                        v-model="row.remark"
                        size="small"
                        placeholder="请输入"
                        style="width: 100%"
                        :inputmode="isBasicNumericField(row) ? 'decimal' : 'text'"
                        @input="onBasicInput(row)"
                      />
                      <span v-else>{{ row.remark || '-' }}</span>
                    </template>
                  </el-table-column>

                  <el-table-column label="状态" width="90" align="center">
                    <template #default="{ row }">
                      <el-tag v-if="row.id && row.isSummary !== 1" :type="getStatusType(row.status)" size="small">
                        {{ getStatusLabel(row.status) }}
                      </el-tag>
                      <span v-else-if="row.isSummary === 1">-</span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                </el-table>
                <!-- 01板块独立保存按钮（不参与审批流程，随时可保存） -->
                <div v-if="section.expanded && section.code === '01'" class="mt-2">
                  <el-button v-if="!readonly" type="primary" size="small" icon="Document" @click="handleSaveBasicInfo" :loading="saveLoading">
                    保存公司基本信息
                  </el-button>
                </div>

                <!-- 板块内容：其他板块使用数字输入 -->
                <el-table
                  v-else-if="section.expanded"
                  :data="tableRows(section)"
                  border
                  :row-class-name="getRowClass"
                  :show-header="true"
                  size="small"
                  style="width: 100%"
                  :max-height="600"
                >
                  <el-table-column label="预算项目" min-width="300">
                    <template #default="{ row }">
                      <span :style="{ paddingLeft: (row.itemLevel - 1) * 16 + 'px', fontWeight: row.isSummary === 1 || row._isGroupHeader ? 'bold' : 'normal' }">
                        {{ row.itemName }}
                      </span>
                    </template>
                  </el-table-column>

                  <el-table-column label="上年实际(万元)" width="170" align="center">
                    <template #default="{ row }">
                      <el-input-number
                        v-if="row.isEditable === 1 && !readonly && !isRowLocked(row)"
                        v-model="row.lastActual"
                        :precision="2"
                        :controls="false"
                        size="small"
                        style="width: 130px"
                        @change="onFillInput(row, section)"
                      />
                      <span v-else>{{ displayValue(row, 'lastActual') != null ? formatAmount(displayValue(row, 'lastActual')) : '-' }}</span>
                    </template>
                  </el-table-column>

                  <el-table-column label="本年预算(万元)" width="210" align="center">
                    <template #default="{ row }">
                      <div class="prefill-cell" :class="{ 'is-prefilled': row._prefilled }">
                        <el-input-number
                          v-if="row.isEditable === 1 && !readonly && !isRowLocked(row) && !isFieldReadOnly(row)"
                          v-model="row.budgetAmount"
                          :precision="2"
                          :controls="false"
                          size="small"
                          style="width: 130px"
                          @change="onFillInput(row, section)"
                        />
                        <span v-else>{{ displayValue(row, 'budgetAmount') != null ? formatAmount(displayValue(row, 'budgetAmount')) : '-' }}</span>
                        <el-tooltip v-if="row._prefilled && row.isEditable === 1 && !row.isSummary" content="采纳该预填值" placement="top">
                          <el-button size="small" type="success" circle text icon="Check" class="prefill-accept" @click="acceptPrefill(row)" />
                        </el-tooltip>
                      </div>
                    </template>
                  </el-table-column>

                  <el-table-column label="增减额" width="150" align="center">
                    <template #default="{ row }">
                      <span :class="getDiffClass(row)" class="diff-cell">
                        {{ formatDiff(row) }}
                        <span v-if="diffDirection(row) === 'up'" class="trend-badge up"><svg viewBox="0 0 24 24" width="9" height="9"><path d="M12 6l7 10H5z" fill="#fff"/></svg></span>
                        <span v-else-if="diffDirection(row) === 'down'" class="trend-badge down"><svg viewBox="0 0 24 24" width="9" height="9"><path d="M12 18L5 8h14z" fill="#fff"/></svg></span>
                      </span>
                    </template>
                  </el-table-column>

                  <el-table-column label="增减率" width="120" align="center">
                    <template #default="{ row }">
                      <span :class="getDiffClass(row)" class="diff-cell">
                        {{ formatDiffRate(row) }}
                        <span v-if="diffDirection(row) === 'up'" class="trend-badge up"><svg viewBox="0 0 24 24" width="9" height="9"><path d="M12 6l7 10H5z" fill="#fff"/></svg></span>
                        <span v-else-if="diffDirection(row) === 'down'" class="trend-badge down"><svg viewBox="0 0 24 24" width="9" height="9"><path d="M12 18L5 8h14z" fill="#fff"/></svg></span>
                      </span>
                    </template>
                  </el-table-column>

                  <el-table-column label="状态" width="90" align="center">
                    <template #default="{ row }">
                      <el-tag v-if="row.id && row.isSummary !== 1" :type="getStatusType(row.status)" size="small">
                        {{ getStatusLabel(row.status) }}
                      </el-tag>
                      <span v-else-if="row.isSummary === 1">-</span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                </el-table>

                <!-- 表注行：整行通栏纯文本说明，不参与填报/状态/合计 -->
                <div v-if="noteLines(section).length" class="section-note">
                  <div v-for="n in noteLines(section)" :key="n.itemCode || n.id" class="section-note-line">
                    {{ n.itemName }}
                  </div>
                </div>
              </div>

              <!-- 底部统计 -->
              <div class="mt-4 bg-gray-50 rounded text-sm fill-summary">
                <div class="fill-summary-flex">
                  <span class="fs-left">
                    <span>板块数: {{ sections.length }}</span>
                    <span class="fs-filled">已填写 {{ filledCount }} / 共 {{ editableCount }} 项</span>
                    <el-progress :percentage="editableCount ? Math.round(filledCount / editableCount * 100) : 0" :stroke-width="6" class="fs-progress" />
                  </span>
                  <span class="fs-total fs-total--actual">上年实际合计: {{ formatAmount(totalActual) }} 万元</span>
                  <span class="fs-total fs-total--budget">本年预算合计: {{ formatAmount(totalBudget) }} 万元</span>
                  <span class="fs-tail"></span>
                  <span class="fs-tail"></span>
                  <span class="fs-tail"></span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 未选公司 -->
    <el-card v-else-if="showDeptSelect && !deptId" shadow="never">
      <el-empty description="请选择填报单位" />
    </el-card>

    <!-- 审批意见 · 往来回复（时间线抽屉） -->
    <el-drawer v-model="commentsDialog" size="640px" direction="rtl" class="comment-drawer">
      <template #header>
        <div class="cd-header">
          <span class="cd-header__title">审批意见</span>
          <span v-if="groupedComments.length" class="cd-header__count">{{ groupedComments.length }} 轮往来</span>
        </div>
      </template>

      <div v-if="commentsLoading" class="cd-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
      </div>
      <el-empty v-else-if="groupedComments.length === 0" description="暂无审批意见" />

      <el-timeline v-else class="cd-timeline">
        <el-timeline-item
          v-for="group in groupedComments"
          :key="group.recordId"
          :type="getRoundStatusType(group.recordStatus)"
          hollow
          class="cd-round"
        >
          <div class="cd-round__head">
            <span class="cd-round__no">{{ group.submitRound ? '第 ' + group.submitRound + ' 轮' : '历史记录' }}</span>
            <el-tag :type="getRoundStatusType(group.recordStatus)" size="small" effect="light">
              {{ getRoundStatusLabel(group.recordStatus) }}
            </el-tag>
            <span class="cd-round__time">{{ formatTime(group.recordSubmitTime) }}</span>
          </div>
          <div v-if="group.recordApproverName" class="cd-round__approver">
            <el-icon><User /></el-icon>
            <span>{{ group.recordApproverName }}</span>
            <span v-if="group.recordApproveTime" class="cd-round__approve">审批于 {{ formatTime(group.recordApproveTime) }}</span>
          </div>

          <div class="cd-comment-list">
            <div v-for="c in group.comments" :key="c.id" class="cd-comment">
              <div class="cd-comment__hd">
                <span class="cd-comment__subject">{{ c.itemName || c.itemCode || '整体意见' }}</span>
                <el-tag size="small" :type="tagType(c.commentType)" effect="plain">{{ commentTypeLabel(c.commentType) }}</el-tag>
              </div>
              <div class="cd-comment__msg">{{ c.content }}</div>
              <div class="cd-comment__time">{{ formatTime(c.createTime) }}</div>

              <div v-if="c.replyContent" class="cd-reply">
                <div class="cd-reply__hd">
                  <el-icon><ChatLineRound /></el-icon>
                  <span>填报回复</span>
                  <span class="cd-reply__meta">{{ c.replierName }} · {{ formatTime(c.replyTime) }}</span>
                </div>
                <div class="cd-reply__msg">{{ c.replyContent }}</div>
              </div>

              <div v-if="!c.replyContent" class="cd-reply-input">
                <el-input
                  v-model="replyMap[c.id]"
                  type="textarea"
                  :rows="2"
                  placeholder="回复这条意见…"
                  size="small"
                  maxlength="200"
                  show-word-limit
                />
                <div class="cd-reply-input__footer">
                  <el-button size="small" type="primary" @click="doReply(c)">回复</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>

    <!-- 版本历史 + V1/V2 对比 -->
    <el-dialog v-model="versionDialog" title="版本历史（两上两下）" width="820px" top="6vh">
      <div class="mb-2">
        <span class="font-bold">选择对比版本：</span>
        <el-select v-model="cmpV1" :disabled="versions.length < 1" :placeholder="versions.length < 1 ? '暂无版本' : '选择左版本'" style="width: 160px" size="small">
          <el-option v-for="v in versions" :key="'v1-' + v.versionNo" :label="'V' + v.versionNo" :value="v.versionNo" />
        </el-select>
        <span class="mx-1">→</span>
        <el-select v-model="cmpV2" :disabled="versions.length < 1" :placeholder="versions.length < 1 ? '暂无版本' : '选择右版本'" style="width: 160px" size="small">
          <el-option v-for="v in versions" :key="'v2-' + v.versionNo" :label="'V' + v.versionNo" :value="v.versionNo" />
        </el-select>
        <el-button size="small" type="primary" class="ml-2" :disabled="versions.length < 2" :loading="compareLoading" @click="doCompare">对比</el-button>
      </div>

      <el-table :data="versions" size="small" border>
        <el-table-column prop="versionNo" label="版本" width="70">
          <template #default="{ row }">V{{ row.versionNo }}</template>
        </el-table-column>
        <el-table-column prop="templateCode" label="预算表" width="80" />
        <el-table-column prop="submittedTime" label="提交时间" width="170" />
        <el-table-column prop="submittedName" label="提交人" width="100" />
        <el-table-column prop="itemCount" label="科目数" width="80" />
        <el-table-column prop="totalAmount" label="预算合计(万元)" />
        <el-table-column label="操作" width="90" align="center">
          <template #default="{ row }">
            <el-button v-if="!readonly" size="small" type="warning" plain :loading="restoring === row.versionNo" @click="handleRestore(row)">恢复</el-button>
            <span v-else class="text-gray-400">—</span>
          </template>
        </el-table-column>
      </el-table>

      <template v-if="compareResult">
        <el-divider content-position="left">V{{ cmpV1 }} vs V{{ cmpV2 }} 差异（共 {{ compareResult.diffCount }} 项）</el-divider>
        <el-table :data="compareResult.rows" size="small" border max-height="360">
          <el-table-column prop="itemCode" label="科目编码" width="90" />
          <el-table-column prop="itemName" label="科目名称" min-width="140" />
          <el-table-column label="V1本年预算" width="120">
            <template #default="{ row }">{{ fmtR(row.budgetV1) }}</template>
          </el-table-column>
          <el-table-column label="V2本年预算" width="120">
            <template #default="{ row }">{{ fmtR(row.budgetV2) }}</template>
          </el-table-column>
          <el-table-column label="差异" width="120">
            <template #default="{ row }">
              <span :class="{ 'diff-up': Number(row.budgetV2) > Number(row.budgetV1), 'diff-down': Number(row.budgetV2) < Number(row.budgetV1) }">
                {{ diffText(row.budgetV1, row.budgetV2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag v-if="!row.inV1" type="warning" size="small">新增</el-tag>
              <el-tag v-else-if="!row.inV2" type="danger" size="small">删除</el-tag>
              <el-tag v-else-if="row.changed" type="primary" size="small">有修改</el-tag>
              <span v-else class="text-gray-400">一致</span>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-dialog>

    <!-- 公司目标（只读，一下下达） -->
    <el-dialog v-model="targetDialog" title="本公司目标基准线" width="700px" top="6vh">
      <div v-if="targetLoading" class="text-center py-6"><el-icon class="is-loading"><Loading /></el-icon></div>
      <el-empty v-else-if="targetRows.length === 0" description="集团尚未下达预算目标" />
      <el-scrollbar v-else max-height="480px">
        <el-table :data="targetRows" size="small" border>
          <el-table-column prop="templateCode" label="表" width="60" />
          <el-table-column prop="itemCode" label="科目编码" width="90" />
          <el-table-column prop="itemName" label="科目名称" min-width="150" />
          <el-table-column label="目标金额(万元)" width="140">
            <template #default="{ row }">{{ Number(row.targetAmount || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="弹性区间" width="130">
            <template #default="{ row }">
              {{ row.toleranceMin == null ? '-' : (row.toleranceMin * 100) + '%' }} ~ {{ row.toleranceMax == null ? '-' : (row.toleranceMax * 100) + '%' }}
            </template>
          </el-table-column>
        </el-table>
      </el-scrollbar>
    </el-dialog>

    <!-- 智能预填：基于上年实际×增长率 自动填充本年预算 -->
    <el-dialog v-model="prefillDialog" title="智能预填" width="520px" top="20vh">
      <el-alert
        title="系统将按「上年实际(万元) × (1 + 增长率)」自动填入「本年预算(万元)」。仅针对已录入上年实际的科目生效，未填写上年实际的科目保持原样，可后续逐表补录上年实际后再执行预填。"
        type="info"
        :closable="false"
        show-icon
        class="mb-3"
      />
      <el-form label-width="88px">
        <el-form-item label="预填范围">
          <el-radio-group v-model="prefillScope" size="small">
            <el-radio value="all">全表预填</el-radio>
            <el-radio value="current">当前板块({{ currentSectionName }})</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="增长率(%)">
          <el-input-number v-model="growthRate" :min="-100" :max="100" :step="0.1" :precision="1" size="small" style="width: 160px" />
          <span class="ml-2 text-gray-400 text-sm">默认 10%</span>
        </el-form-item>
        <el-form-item label="预览">
          <span class="text-sm text-gray-500">
            将处理 <b class="text-blue-600">{{ prefillCount }}</b> 个已有上年实际的科目
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="prefillDialog = false">取消</el-button>
        <el-button size="small" type="primary" @click="doPrefill" :loading="prefillLoading">执行预填</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="BudgetFill">
import { ref, computed, onMounted, onActivated, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading, ArrowDown, ArrowRight, Check, User, ChatLineRound } from '@element-plus/icons-vue';
import { getAllFillData, saveDraft, submitFill, listPlan, listDept, getMyUnit } from '@/api/budget/fill';
import { listApprovalComments, replyApprovalComment } from '@/api/budget/approvalComment';
import { listDataVersions, compareDataVersions, restoreDataVersion } from '@/api/budget/dataVersion';
import { getMyTargets } from '@/api/budget/target';
import { validateFill } from '@/api/budget/validate';
import { resolveFieldPermissions } from '@/api/budget/fieldVisibility';
import { useUserStore } from '@/store/modules/user';
import type { BudgetFillVo } from '@/api/budget/fill/types';

const userStore = useUserStore();

// ===== 数据 =====
const planId = ref<number>();
const planOptions = ref<any[]>([]);
const deptId = ref<number>();
const deptOptions = ref<any[]>([]);
const myUnitDisplay = ref<string>('');
const allFillData = ref<BudgetFillVo[]>([]);
const loading = ref(false);
const saveLoading = ref(false);
const submitLoading = ref(false);
const activeSection = ref(0);

// ===== 审批意见（批注）回复 =====
const commentsDialog = ref(false);
const commentsLoading = ref(false);
const comments = ref<any[]>([]);
const replyMap = ref<Record<number, string>>({});
const unrepliedCommentCount = computed(() => comments.value.filter(c => !c.replyContent).length);

// ===== 版本历史 / 对比 =====
const versionDialog = ref(false);
const versions = ref<any[]>([]);
const restoring = ref<number>();
const cmpV1 = ref<number>();
const cmpV2 = ref<number>();
const compareLoading = ref(false);
const compareResult = ref<any>();

// ===== 公司目标（只读） =====
const targetDialog = ref(false);
const targetLoading = ref(false);
const targetRows = ref<any[]>([]);

// ===== 智能预填 =====
const prefillDialog = ref(false);
const prefillLoading = ref(false);
const prefillScope = ref<'all' | 'current'>('current');
const growthRate = ref(10);

// 预填对象行集合：排除锁定/只读/无上年实际 / 01信息表 / 14 / 15
const getPrefillRows = () => {
  let targetRowsArr: BudgetFillVo[] = [];
  if (prefillScope.value === 'current' && activeSection.value >= 0) {
    const s = sections.value[activeSection.value];
    if (s) targetRowsArr = s.rows;
  } else {
    sections.value.forEach(s => targetRowsArr.push(...s.rows));
  }
  return targetRowsArr.filter(r =>
    r.isEditable === 1 &&
    !isRowLocked(r) &&
    r.templateCode !== '01' &&
    r.templateCode !== '14' &&
    r.templateCode !== '15' &&
    r.lastActual != null && Number(r.lastActual) !== 0 &&
    r.itemCode !== '1604'
  );
};

const prefillCount = computed(() => getPrefillRows().length);

const currentSectionName = computed(() => {
  if (activeSection.value >= 0 && sections.value[activeSection.value]) {
    return sections.value[activeSection.value].name;
  }
  return '—';
});

const openPrefill = () => {
  prefillScope.value = activeSection.value >= 0 ? 'current' : 'all';
  prefillDialog.value = true;
};

const doPrefill = async () => {
  const rows = getPrefillRows();
  if (!rows.length) {
    ElMessage.warning('当前范围没有可预填的科目（需已录入上年实际且可编辑）');
    return;
  }
  prefillLoading.value = true;
  try {
    const rate = growthRate.value / 100;
    rows.forEach(row => {
      row.budgetAmount = Math.round(Number(row.lastActual) * (1 + rate) * 100) / 100;
      row._prefilled = true; // 标记为 AI 预填，单元格浅蓝高亮，待用户采纳/忽略
      row._prefillValue = row.budgetAmount;
    });
    // 重算所有板块汇总（财报表跨表依赖需全局刷新）
    sections.value.forEach(s => computeSection(s));
    sections.value.forEach(s => updateSectionTotal(s));
    await doAutoSave();
    prefillDialog.value = false;
    ElMessage.success(`智能预填完成，共处理 ${rows.length} 项科目，请逐项确认或点击全部采纳`);
  } catch (err) {
    console.error('智能预填失败', err);
    ElMessage.error('智能预填失败');
  } finally {
    prefillLoading.value = false;
  }
};

// 全部采纳：清除所有 AI 预填标记（数值保留，视为人工确认）
const acceptAllPrefill = async () => {
  try {
    await ElMessageBox.confirm(`确认全部采纳 ${prefilledCount.value} 项智能预填值？采纳后不再高亮标记。`, '全部采纳', { type: 'info', confirmButtonText: '全部采纳', cancelButtonText: '取消' });
  } catch {
    return;
  }
  let n = 0;
  sections.value.forEach(s => s.rows.forEach(r => { if (r._prefilled) { r._prefilled = false; n++; } }));
  if (n) ElMessage.success(`已采纳 ${n} 项智能预填`);
};

// 全部忽略：清除所有 AI 预填标记（数值保留，不再提示确认）
const ignoreAllPrefill = () => {
  let n = 0;
  sections.value.forEach(s => s.rows.forEach(r => { if (r._prefilled) { r._prefilled = false; n++; } }));
  if (n) ElMessage.success(`已忽略 ${n} 项智能预填标记`);
};

// 单条采纳：确认当前行的预填值
const acceptPrefill = (row: any) => {
  row._prefilled = false;
  ElMessage.success('已采纳该预填值');
};

const prefilledCount = computed(() =>
  sections.value.reduce((sum, s) => sum + s.rows.filter(r => r._prefilled).length, 0)
);

const openMyTargets = async () => {
  targetDialog.value = true;
  targetLoading.value = true;
  const curDept = deptId.value;
  try {
    if (!curDept) {
      ElMessage.warning('请先选择填报单位');
      return;
    }
    const res = await getMyTargets({ planId: planId.value, deptId: curDept });
    targetRows.value = res.data || [];
  } catch {
    targetRows.value = [];
  } finally {
    targetLoading.value = false;
  }
};

const commentTypeLabel = (t: string) => ({ SUGGESTION: '建议修改', QUESTION: '疑问', WARNING: '警告' } as any)[t] || t;
const tagType = (t: string) => ({ SUGGESTION: 'primary', QUESTION: 'warning', WARNING: 'danger' } as any)[t] || 'info';

// 按轮次分组的审批意见
const groupedComments = computed(() => {
  const groups: Record<string, any> = {};
  comments.value.forEach((c: any) => {
    const key = c.recordId || 'unknown';
    if (!groups[key]) {
      groups[key] = {
        recordId: c.recordId,
        submitRound: c.submitRound,
        recordStatus: c.recordStatus,
        recordSubmitTime: c.recordSubmitTime,
        recordApproverName: c.recordApproverName,
        recordApproveTime: c.recordApproveTime,
        comments: []
      };
    }
    groups[key].comments.push(c);
  });
  // 按轮次倒序排列（最新轮次在前）
  return Object.values(groups).sort((a: any, b: any) => (b.submitRound || 0) - (a.submitRound || 0));
});

const getRoundStatusType = (status: string) => {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'warning';
};

const getRoundStatusLabel = (status: string) => {
  if (status === 'APPROVED') return '已通过';
  if (status === 'REJECTED') return '已驳回';
  return '待审批';
};

const formatTime = (val: any) => {
  if (!val) return '-';
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const openComments = async () => {
  commentsDialog.value = true;
  const curDept = deptId.value;
  await loadComments(curDept);
};

const loadComments = async (curDept: number | undefined) => {
  commentsLoading.value = true;
  try {
    const res = await listApprovalComments({ targetType: 'FILL', planId: planId.value, deptId: curDept });
    comments.value = res.data || [];
  } catch {
    comments.value = [];
  } finally {
    commentsLoading.value = false;
  }
};

const doReply = async (c: any) => {
  const content = replyMap.value[c.id];
  if (!content || !content.trim()) {
    ElMessage.warning('请输入回复内容');
    return;
  }
  try {
    await replyApprovalComment(c.id, content, 'REPLIED');
    ElMessage.success('回复成功');
    replyMap.value[c.id] = '';
    const curDept = deptId.value;
    await loadComments(curDept);
  } catch (error) {
    console.error(error);
    ElMessage.error('回复失败');
  }
};

const openVersions = async () => {
  versionDialog.value = true;
  compareResult.value = null;
  const curDept = deptId.value;
  try {
    const res = await listDataVersions({ planId: planId.value, deptId: curDept });
    versions.value = (res.data || []).slice().sort((a, b) => a.versionNo - b.versionNo);
    const vList = versions.value.map(v => v.versionNo);
    cmpV1.value = vList[0];
    cmpV2.value = vList[vList.length - 1];
  } catch {
    versions.value = [];
  }
};

const doCompare = async () => {
  const curDept = deptId.value;
  if (!cmpV1.value || !cmpV2.value || !curDept) {
    ElMessage.warning('请选择版本与填报单位');
    return;
  }
  if (cmpV1.value === cmpV2.value) {
    ElMessage.warning('请选择两个不同的版本');
    return;
  }
  compareLoading.value = true;
  try {
    const res = await compareDataVersions({ planId: planId.value, deptId: curDept, templateCode: '', v1: cmpV1.value, v2: cmpV2.value });
    compareResult.value = res.data || null;
  } catch {
    ElMessage.error('版本对比失败');
  } finally {
    compareLoading.value = false;
  }
};

const fmtR = (v: any) => (v === null || v === undefined ? '-' : Number(v).toFixed(2));
const diffText = (a: any, b: any) => {
  const na = Number(a) || 0;
  const nb = Number(b) || 0;
  const diff = nb - na;
  return diff.toFixed(2);
};

// 恢复历史版本：将选中版本快照回写到当前草稿
const handleRestore = async (row: any) => {
  const curDept = deptId.value;
  if (!curDept) {
    ElMessage.warning('请选择填报单位');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认将预算表 ${row.templateCode || '-'} 恢复到版本 V${row.versionNo}？当前草稿数据将被覆盖。`,
      '恢复历史版本',
      { type: 'warning', confirmButtonText: '确认恢复', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }
  restoring.value = row.versionNo;
  try {
    await restoreDataVersion({
      planId: planId.value,
      deptId: curDept,
      templateCode: row.templateCode,
      versionNo: row.versionNo
    });
    ElMessage.success(`已恢复到版本 V${row.versionNo}`);
    versionDialog.value = false;
    await loadFillData();
  } catch (error: any) {
    ElMessage.error(error?.msg || '恢复失败');
  } finally {
    restoring.value = undefined;
  }
};

// ===== 自动保存草稿 =====
let autoSaveTimer: any = null;
const autoSaving = ref(false);

// 收集当前可保存的草稿行（仅草稿状态且可编辑，不含14/15表），与手工保存口径一致
const collectDraftItems = () => {
  return allFillData.value
    .filter(d => d.isEditable === 1 && !isRowLocked(d) && !isFieldHidden(d) && d.status === 'DRAFT' && d.templateCode !== '14' && d.templateCode !== '15')
    .map(d => ({
      id: d.id,
      itemCode: d.itemCode,
      templateCode: d.templateCode,
      budgetAmount: d.budgetAmount,
      lastActual: d.lastActual,
      remark: d.remark && d.remark.startsWith('【驳回】') ? null : d.remark
    }));
};

// 输入变更后调度自动保存：停止输入 3 秒后触发，避免频繁请求
const scheduleAutoSave = () => {
  if (readonly.value || autoSaving.value || !planId.value) return;
  if (showDeptSelect.value && !deptId.value) return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => doAutoSave(), 3000);
};

const doAutoSave = async () => {
  autoSaveTimer = null;
  if (readonly.value || autoSaving.value || !planId.value) return;
  if (showDeptSelect.value && !deptId.value) return;
  const items = collectDraftItems();
  if (!items.length) return;
  autoSaving.value = true;
  try {
    await saveDraft({
      planId: planId.value,
      deptId: showDeptSelect.value ? deptId.value : undefined,
      orgId: showDeptSelect.value ? deptId.value : undefined,
      dataVersion: 'BUDGET',
      items
    });
    ElMessage({ message: '已自动保存草稿', type: 'success', duration: 1200 });
    await loadFillData(true);
  } catch (err) {
    console.error('自动保存失败', err);
  } finally {
    autoSaving.value = false;
  }
};

// ===== 板块定义 =====
const sectionConfig: Record<string, string> = {
  '01': '公司基本信息表',
  '02': '营业收入预算表',
  '03': '营业成本预算表',
  '04': '税金及附加预算表',
  '05': '销售费用预算表',
  '06': '管理费用预算表',
  '07': '财务费用预算表',
  '08': '人工成本预算表',
  '09': '固定资产投资预算表',
  '10': '融资预算表',
  '11': '现金流量预算表',
  '12': '预计利润表',
  '13': '预计资产负债表',
  '14': '预算执行情况表',
  '15': '预算调整审批表',
  '16': '三公经费预算表'
};

interface Section {
  code: string;
  name: string;
  rows: BudgetFillVo[];
  expanded: boolean;
  totalBudget: number;
  totalActual: number;
  status: string;
}

const sections = ref<Section[]>([]);

// ===== 计算属性 =====
const isSuperAdmin = computed(() => {
  return userStore.roles?.includes('superadmin') || userStore.roles?.includes('admin');
});

const showDeptSelect = computed(() => isSuperAdmin.value);

const currentDeptName = computed(() => {
  if (showDeptSelect.value) {
    const dept = deptOptions.value.find(d => d.deptId === deptId.value);
    return dept?.deptName || '未选择';
  }
  return myUnitDisplay.value || userStore.deptName || '未知部门';
});

const planStatus = computed(() => {
  const plan = planOptions.value.find(p => p.id === planId.value);
  return plan?.status || '';
});

const readonly = computed(() => planStatus.value === 'ARCHIVED' || planStatus.value === 'CLOSED');
const planDisabled = computed(() => false);

const editableCount = computed(() => {
  if (activeSection.value >= 0 && sections.value[activeSection.value]) {
    return sections.value[activeSection.value].rows.filter(d => d.isEditable === 1 && !isFieldHidden(d)).length;
  }
  return allFillData.value.filter(d => d.isEditable === 1 && !isFieldHidden(d) && d.templateCode !== '14' && d.templateCode !== '15').length;
});
const filledCount = computed(() => {
  if (activeSection.value >= 0 && sections.value[activeSection.value]) {
    return sections.value[activeSection.value].rows.filter(d => d.isEditable === 1 && !isFieldHidden(d) && (Number(d.budgetAmount) || Number(d.lastActual)) !== 0).length;
  }
  return allFillData.value.filter(d => d.isEditable === 1 && !isFieldHidden(d) && d.templateCode !== '14' && d.templateCode !== '15' && (Number(d.budgetAmount) || Number(d.lastActual)) !== 0).length;
});
const totalBudget = computed(() => {
  return sections.value.reduce((sum, s) => sum + (s.totalBudget || 0), 0);
});
const totalActual = computed(() => {
  return sections.value.reduce((sum, s) => sum + (s.totalActual || 0), 0);
});
const hasSubmitted = computed(() => {
  return allFillData.value.some(d => d.status === 'SUBMITTED' && d.templateCode !== '14' && d.templateCode !== '15');
});

const hasApproved = computed(() => {
  return allFillData.value.some(d => d.status === 'APPROVED' && d.templateCode !== '14' && d.templateCode !== '15');
});

// 是否有可编辑的草稿数据（驳回后回到草稿，或新填报）
const hasDraftData = computed(() => {
  return allFillData.value.some(d => d.status === 'DRAFT' && d.templateCode !== '14' && d.templateCode !== '15');
});

// 获取驳回原因（从DRAFT状态的数据中读取remark字段）
const rejectRemark = computed(() => {
  const rejected = allFillData.value.find(d => d.status === 'DRAFT' && d.templateCode !== '14' && d.templateCode !== '15' && d.remark && d.remark.startsWith('【驳回】'));
  return rejected?.remark || '';
});

// 获取所有不同板块的驳回原因
const rejectRemarks = computed(() => {
  const remarks: { code: string; name: string; remark: string }[] = [];
  const seen = new Set<string>();
  for (const d of allFillData.value) {
    if (d.status === 'DRAFT' && d.templateCode !== '14' && d.templateCode !== '15' && d.remark && d.remark.startsWith('【驳回】') && !seen.has(d.templateCode)) {
      seen.add(d.templateCode);
      const name = sectionConfig[d.templateCode] || d.templateName || d.templateCode;
      remarks.push({ code: d.templateCode, name, remark: d.remark });
    }
  }
  return remarks;
});

// ===== 工具方法 =====
const formatAmount = (val: number | undefined) => {
  if (val == null) return '0.00';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// 通用公式解析：根据 row.formula 计算汇总行值
// 支持 SUM(children) 和 SUM(1601,1602,1603) 和 SUM(02.0101,03.0201)
const formulaValue = (row: BudgetFillVo, field: 'budgetAmount' | 'lastActual'): number | null => {
  if (!row.formula) return null;
  const formula = row.formula.trim().toUpperCase();
  const sumMatch = formula.match(/^SUM\((.+)\)$/);
  if (!sumMatch) return null;

  const args = sumMatch[1].trim();
  const fieldKey = field === 'budgetAmount' ? 'budgetAmount' : 'lastActual';

  if (args === 'CHILDREN') {
    // 递归求和所有子孙可编辑行
    const sectionRows = allFillData.value.filter(d => d.templateCode === row.templateCode);
    const byCode = new Map<string, BudgetFillVo>();
    sectionRows.forEach(r => byCode.set(r.itemCode, r));
    const childrenMap = new Map<string, BudgetFillVo[]>();
    sectionRows.forEach(r => {
      if (r.parentCode && byCode.has(r.parentCode)) {
        if (!childrenMap.has(r.parentCode)) childrenMap.set(r.parentCode, []);
        childrenMap.get(r.parentCode)!.push(r);
      }
    });
    const sumDescendants = (parentCode: string): number => {
      let sum = 0;
      (childrenMap.get(parentCode) || []).forEach(child => {
        if (child.isEditable === 1) {
          sum += Number(child[fieldKey]) || 0;
        } else if (child.isSummary === 1 && childrenMap.has(child.itemCode)) {
          sum += sumDescendants(child.itemCode);
        }
      });
      return sum;
    };
    return sumDescendants(row.itemCode);
  }

  // SUM(code1,code2,...) 或 SUM(table.code,...)
  const parts = args.split(',').map(s => s.trim()).filter(Boolean);
  let sum = 0;
  for (const part of parts) {
    let tplCode: string;
    let itemCode: string;
    if (part.includes('.')) {
      const dotIdx = part.indexOf('.');
      tplCode = part.substring(0, dotIdx);
      itemCode = part.substring(dotIdx + 1);
    } else {
      tplCode = row.templateCode;
      itemCode = part;
    }
    const target = allFillData.value.find(d => d.templateCode === tplCode && d.itemCode === itemCode);
    if (target) {
      sum += Number(target[fieldKey]) || 0;
    }
  }
  return sum;
};

// 计算每个板块内汇总行(=0)的值 = 递归求和其子孙可编辑行；可编辑行(1)取自身值
const computeSummaryValues = (rows: BudgetFillVo[]) => {
  if (!rows.length) return;
  const byCode = new Map<string, BudgetFillVo>();
  rows.forEach(r => byCode.set(r.itemCode, r));
  const childrenMap = new Map<string, BudgetFillVo[]>();
  rows.forEach(r => {
    if (r.parentCode && byCode.has(r.parentCode)) {
      if (!childrenMap.has(r.parentCode)) childrenMap.set(r.parentCode, []);
      childrenMap.get(r.parentCode)!.push(r);
    }
  });
  const calc = (row: BudgetFillVo) => {
    if (row.isEditable === 1) {
      row._calc = {
        budget: Number(row.budgetAmount) || 0,
        actual: Number(row.lastActual) || 0
      };
      return row._calc!;
    }
    let b = 0, a = 0;
    (childrenMap.get(row.itemCode) || []).forEach(k => {
      const c = calc(k);
      b += c.budget; a += c.actual;
    });
    row._calc = { budget: b, actual: a };
    return row._calc!;
  };
  const roots = rows.filter(r => !r.parentCode || !byCode.has(r.parentCode));
  (roots.length ? roots : rows).forEach(calc);

  // 顶部参考行（"上一年实际完成值"等无子科目的历史参考行）：本年无填报、仅作上年实际参考展示。
  // 上年实际 = 本表全部可填报明细的上年实际合计；本年预算/增减置空，避免显示 0 / 无意义的增减率。
  const refRows = rows.filter(r =>
    r.isSummary === 1 && r.isEditable === 0 &&
    !(childrenMap.get(r.itemCode) || []).length &&
    String(r.itemName || '').includes('上一年'));
  if (refRows.length) {
    const totalActual = rows
      .filter(r => r.isEditable === 1)
      .reduce((s, r) => s + (Number(r.lastActual) || 0), 0);
    refRows.forEach(r => {
      r._calc = { budget: null, actual: totalActual };
    });
  }
};

// ===== 财报表专用计算（11现金流量 / 12预计利润 / 13预计资产负债）=====
const valOf = (r: BudgetFillVo | undefined) => r ? (Number(r.budgetAmount) || 0) : 0;

// 12 预计利润表：跨表引用02营业收入合计、03营业成本合计，其余按增量公式计算
const computeIncomeStatement = (rows: BudgetFillVo[]) => {
  const find = (code: string) => rows.find(r => r.itemCode === code);
  const all = allFillData.value;
  const locBudget = (templateCode: string) => all
    .filter(d => d.templateCode === templateCode && d.isEditable === 1)
    .reduce((s, d) => s + (Number(d.budgetAmount) || 0), 0);

  const revenue = locBudget('02');                                  // 营业收入 = 02表合计
  const cost = locBudget('03');                                     // 营业成本 = 03表合计
  const tax = valOf(find('120201'));
  const sell = valOf(find('120202'));
  const admin = valOf(find('120203'));
  const finance = valOf(find('120204'));
  const invest = valOf(find('120301'));
  const fairval = valOf(find('120302'));
  const impa = valOf(find('120303'));                               // 资产减值损失（减）
  const credit = valOf(find('120304'));                             // 信用减值损失（减）
  const otherIncome = invest + fairval - impa - credit;             // 其他收益（净）
  const opProfit = revenue - cost - tax - sell - admin - finance + otherIncome;
  const suoNet = valOf(find('1208'));
  const extraIn = valOf(find('1205'));
  const extraOut = valOf(find('1206'));
  const totalProfit = opProfit + extraIn - extraOut;
  const netProfit = totalProfit - suoNet;
  const minority = valOf(find('120901'));                           // 少数股东损益
  const parentNet = netProfit - minority;                           // 归母净利润

  const set = (code: string, budget: number) => {
    const r = find(code);
    if (r) { r._calc = { budget, actual: Number(r.lastActual) || 0 }; r.budgetAmount = budget; }
  };
  set('1201', revenue);
  set('1202', cost);
  set('1203', otherIncome);
  set('1204', opProfit);
  set('1205', extraIn);
  set('1206', extraOut);
  set('1207', totalProfit);
  set('1208', suoNet);
  set('1209', netProfit);
  set('120902', parentNet);
};

// 13 预计资产负债表：资产/负债/权益分类小计 + 总计 + 平衡校验
const computeBalanceSheet = (rows: BudgetFillVo[]) => {
  const find = (code: string) => rows.find(r => r.itemCode === code);
  const sum = (codes: string[]) => codes.reduce((s, c) => s + valOf(find(c)), 0);
  const set = (code: string, budget: number) => {
    const r = find(code);
    if (r) { r._calc = { budget, actual: Number(r.lastActual) || 0 }; r.budgetAmount = budget; }
  };
  const ca = sum(['130101', '130102', '130103', '130104', '130105', '130106', '130107']);   // 流动资产
  const nca = sum(['130201', '130202', '130203', '130204', '130205', '130206', '130207', '130208']); // 非流动资产
  const assets = ca + nca;
  const cl = sum(['1390101', '1390102', '1390103', '1390104', '1390105', '1390106', '1390107', '1390108']); // 流动负债
  const ncl = sum(['1390301', '1390302', '1390303', '1390304', '1390305', '1390306']);       // 非流动负债
  const tl = cl + ncl;
  const eq = sum(['1390601', '1390602', '1390603', '1390604', '1390605']);                   // 所有者权益
  const total = tl + eq;
  set('1301', ca);
  set('130108', ca);
  set('1302', nca);
  set('130209', nca);
  set('1303', assets);
  set('13901', cl);
  set('13902', cl);
  set('13903', ncl);
  set('13904', ncl);
  set('13905', tl);
  set('13906', eq);
  set('13907', eq);
  set('13908', total);
  const r13909 = find('13909');
  if (r13909) { r13909._calc = { budget: assets - total, actual: 0 }; r13909.budgetAmount = assets - total; } // 平衡校验
};

// 11 现金流量表：各小计=流入/流出净额，活动净额=流入-流出
const computeCashFlow = (rows: BudgetFillVo[]) => {
  const find = (code: string) => rows.find(r => r.itemCode === code);
  const val = (code: string) => valOf(find(code));
  const set = (code: string, budget: number) => {
    const r = find(code);
    if (r) { r._calc = { budget, actual: Number(r.lastActual) || 0 }; r.budgetAmount = budget; }
  };
  const inflow = val('110201') + val('110202') + val('110203') + val('110204'); // 经营流入
  const outflow = val('110301') + val('110302') + val('110303') + val('110304'); // 经营流出
  const inflowInv = val('110501') + val('110502') + val('110503') + val('110504');
  const outflowInv = val('110601') + val('110602') + val('110603');
  const inflowFin = val('110801') + val('110802');
  const outflowFin = val('110901') + val('110902') + val('110903');
  const opNet = inflow - outflow;
  const invNet = inflowInv - outflowInv;
  const finNet = inflowFin - outflowFin;
  const netInc = opNet + invNet + finNet;
  const end = val('1101') + netInc;
  set('1102', inflow); set('110205', inflow);
  set('1103', outflow); set('110305', outflow);
  set('1104', opNet);
  set('1105', inflowInv); set('110505', inflowInv);
  set('1106', outflowInv); set('110604', outflowInv);
  set('1107', invNet);
  set('1108', inflowFin); set('110803', inflowFin);
  set('1109', outflowFin); set('110904', outflowFin);
  set('1110', finNet);
  set('1111', netInc);
  set('1112', end);
};

// 板块计算分发：财报表用专用公式，其余板块用通用"父=子求和"
const computeSection = (section: Section) => {
  const rows = section.rows;
  if (!rows.length) return;
  if (section.code === '12') computeIncomeStatement(rows);
  else if (section.code === '13') computeBalanceSheet(rows);
  else if (section.code === '11') computeCashFlow(rows);
  else computeSummaryValues(rows);
};

// 行显示值：有formula的走公式 / 汇总行取_calc计算值 / 其余取填报值
const displayValue = (row: BudgetFillVo, field: 'budgetAmount' | 'lastActual') => {
  if (row.formula) {
    const val = formulaValue(row, field);
    if (val !== null) return val;
  }
  if (row._calc) {
    return field === 'budgetAmount' ? row._calc.budget : row._calc.actual;
  }
  return row[field];
};

const formatDiff = (row: BudgetFillVo) => {
  const budget = displayValue(row, 'budgetAmount');
  const actual = displayValue(row, 'lastActual');
  if (budget == null || actual == null) return '-';
  const diff = Number(budget) - Number(actual);
  return (diff >= 0 ? '+' : '') + formatAmount(diff);
};

const formatDiffRate = (row: BudgetFillVo) => {
  const budget = displayValue(row, 'budgetAmount');
  const actual = displayValue(row, 'lastActual');
  if (budget == null || actual == null || Number(actual) === 0) return '-';
  const rate = ((Number(budget) - Number(actual)) / Number(actual) * 100);
  return (rate >= 0 ? '+' : '') + rate.toFixed(2) + '%';
};

const getDiffClass = (row: BudgetFillVo) => {
  const budget = displayValue(row, 'budgetAmount');
  const actual = displayValue(row, 'lastActual');
  if (budget == null || actual == null) return 'text-gray-400';
  const diff = Number(budget) - Number(actual);
  if (diff > 0) return 'text-red-600 font-medium';
  if (diff < 0) return 'text-green-600 font-medium';
  return 'text-gray-500';
};

// 增减方向：上行(增加)=>'up'，下行(减少)=>'down'，持平/无值=>null
const diffDirection = (row: BudgetFillVo) => {
  const budget = displayValue(row, 'budgetAmount');
  const actual = displayValue(row, 'lastActual');
  if (budget == null || actual == null) return null;
  const diff = Number(budget) - Number(actual);
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return null;
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = { DRAFT: 'info', SUBMITTED: 'primary', APPROVED: 'success', REJECTED: 'danger' };
  return map[status] || 'info';
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = { DRAFT: '草稿', SUBMITTED: '已提交', APPROVED: '已审批', REJECTED: '已驳回' };
  return map[status] || status;
};

// 按行判断是否锁定：01公司基本信息始终可编辑；其他板块SUBMITTED/APPROVED锁定
const isRowLocked = (row: BudgetFillVo) => {
  if (row.templateCode === '01') return false;
  return row.status === 'SUBMITTED' || row.status === 'APPROVED';
};

// ===== 字段可见性（子公司维度 HIDE/READONLY/EDIT） =====
// 行上 _perm 由 applyFieldVisibility 依据 budget_field_visibility 规则解析后回填
const isFieldReadOnly = (row: any) => (row as any)._perm === 'READONLY';
const isFieldHidden = (row: any) => (row as any)._perm === 'HIDE';

// 按当前填报子公司解析所有板块字段权限，并附加到行 _perm（未命中规则的字段保持默认可编辑）
const applyFieldVisibility = async () => {
  allFillData.value.forEach(r => { (r as any)._perm = undefined; });
  if (!deptId.value) return;
  try {
    // 按 预算表(templateId) 分组收集后续待解析的科目主数据ID
    const byTpl = new Map<number, number[]>();
    for (const r of allFillData.value) {
      if (r.templateId && r.refSubjectId) {
        const arr = byTpl.get(r.templateId) ?? [];
        arr.push(r.refSubjectId);
        byTpl.set(r.templateId, arr);
      }
    }
    for (const [tplId, rawIds] of byTpl) {
      const subjectIds = [...new Set(rawIds)];
      const res = await resolveFieldPermissions({
        templateId: tplId,
        orgId: deptId.value,
        subjectIds,
      });
      const map = (res.data || {}) as Record<string, string>;
      for (const r of allFillData.value) {
        if (r.templateId === tplId && r.refSubjectId && map[String(r.refSubjectId)]) {
          (r as any)._perm = map[String(r.refSubjectId)];
        }
      }
    }
  } catch (err) {
    // 可见性解析失败不阻断填报，保持默认展示（静默降级）
    console.error('解析字段可见性失败', err);
  }
};

const getRowClass = ({ row }: { row: BudgetFillVo }) => {
  if (row.isSummary === 1) return 'summary-row';
  if (row.isEditable === 0) return 'readonly-row';
  return '';
};

// 表注行：科目名以"注"开头的只读说明行，整行通栏展示，不参与填报/状态/合计
const isNoteRow = (row: any) => !!row.itemName && String(row.itemName).trim().startsWith('注');
const tableRows = (section: Section) => section.rows.filter((r: any) => !isNoteRow(r) && !isFieldHidden(r));
const noteLines = (section: Section) => section.rows.filter((r: any) => isNoteRow(r));

// ===== 板块分组逻辑 =====
const buildSections = () => {
  // 保留刷新前各板块的展开状态，避免自动保存刷新后板块折叠
  const prevExpanded = new Map<string, boolean>();
  sections.value.forEach(s => prevExpanded.set(s.code, s.expanded));

  // 按 templateCode 分组
  const groupMap = new Map<string, BudgetFillVo[]>();
  for (const item of allFillData.value) {
    const code = item.templateCode;
    // 排除14-预算执行情况表、15-预算调整审批表（不是填报数据）
    if (code === '14' || code === '15') continue;
    if (!groupMap.has(code)) groupMap.set(code, []);
    groupMap.get(code)!.push(item);
  }

  const result: Section[] = [];
  for (const [code, rows] of groupMap) {
    // 按 itemCode 排序（编码本身有层级关系，排序后就是正确的树形结构）
    rows.sort((a, b) => (a.itemCode || '').localeCompare(b.itemCode || ''));

    result.push({
      code,
      name: sectionConfig[code] || rows[0]?.templateName || `预算表${code}`,
      rows,
      expanded: prevExpanded.get(code) ?? false,
      totalBudget: 0,
      totalActual: 0,
      status: ''
    });
  }

  // 按 code 排序
  result.sort((a, b) => a.code.localeCompare(b.code));
  sections.value = result;

  // 计算每个板块的汇总行值
  sections.value.forEach(s => computeSection(s));

  // 计算每个板块的小计
  sections.value.forEach(s => updateSectionTotal(s));

  // 计算每个板块的填报状态
  sections.value.forEach(s => {
    s.status = calcSectionStatus(s.rows);
  });
};

// 板块状态：优先 APPROVED > SUBMITTED > DRAFT；无已存行视为 DRAFT
const calcSectionStatus = (rows: BudgetFillVo[]) => {
  const saved = rows.filter(r => r.id && !isNoteRow(r));
  if (saved.length === 0) return 'DRAFT';
  if (saved.some(r => r.status === 'APPROVED')) return 'APPROVED';
  if (saved.some(r => r.status === 'SUBMITTED')) return 'SUBMITTED';
  return 'DRAFT';
};

const updateSectionTotal = (section: Section) => {
  if (section.code === '01') {
    section.totalBudget = 0;
    section.totalActual = 0;
    return;
  }
  const editableRows = section.rows.filter(r => r.isEditable === 1 && !isFieldHidden(r));
  section.totalBudget = editableRows.reduce((sum, r) => sum + (Number(r.budgetAmount) || 0), 0);
  section.totalActual = editableRows.reduce((sum, r) => sum + (Number(r.lastActual) || 0), 0);
};

const updateCalculations = (row: BudgetFillVo, section: Section) => {
  // 整体重算所有板块：财报表(12利润)跨表引用02/03，需同步刷新
  sections.value.forEach(s => computeSection(s));
  sections.value.forEach(s => updateSectionTotal(s));
};

// 数字科目输入后：重算汇总 + 调度自动保存
const onFillInput = (row: BudgetFillVo, section: Section) => {
  updateCalculations(row, section);
  scheduleAutoSave();
};

// 01公司基本信息输入后：清理非法字符 + 调度自动保存
const onBasicInput = (row: BudgetFillVo) => {
  sanitizeBasicInput(row);
  scheduleAutoSave();
};

const toggleSection = (idx: number) => {
  sections.value[idx].expanded = !sections.value[idx].expanded;
};

const scrollToSection = (idx: number) => {
  activeSection.value = idx;
  // 自动展开对应板块
  if (!sections.value[idx].expanded) {
    sections.value[idx].expanded = true;
  }
  // 滚动定位（延迟等待DOM更新）
  nextTick(() => {
    const el = document.getElementById('section-' + idx);
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
};

// ===== 数据加载 =====
const loadPlans = async () => {
  try {
    const res = await listPlan();
    const list = res.rows || res.data || [];
    // 只显示已发布和已归档
    planOptions.value = list.filter((p: any) => p.status === 'PUBLISHED' || p.status === 'ARCHIVED');
  } catch (error) {
    console.error('加载预算方案失败', error);
  }
};

const loadDepts = async () => {
  try {
    const res = await listDept();
    const list = res.data || res.rows || [];
    // 只显示子级单位（parent_id > 0），排除顶级集团本部
    deptOptions.value = list.filter((d: any) => {
      return d.deptName && d.parentId && d.parentId > 0;
    });
  } catch (error) {
    console.error('加载部门列表失败', error);
  }
};

const loadMyUnit = async () => {
  try {
    const res = await getMyUnit();
    const data = res.data || {};
    myUnitDisplay.value = data.displayName || data.deptName || '';
    if (!deptId.value && data.deptId && !isSuperAdmin.value) {
      deptId.value = data.deptId;
    }
  } catch (error) {
    console.error('加载当前填报单位失败', error);
  }
};

const loadFillData = async (silent = false) => {
  if (!planId.value) return;
  if (showDeptSelect.value && !deptId.value) return;

  if (!silent) loading.value = true;
  try {
    const params: any = { planId: planId.value };
    if (showDeptSelect.value && deptId.value) {
      params.deptId = deptId.value;
    }
    const res = await getAllFillData(params);
    allFillData.value = res.data || [];
    await applyFieldVisibility();
    buildSections();
    if (planId.value && (deptId.value || !showDeptSelect.value)) {
      loadComments(deptId.value);
    }
  } catch (error) {
    console.error('加载填报数据失败', error);
    ElMessage.error('加载填报数据失败');
  } finally {
    if (!silent) loading.value = false;
  }
};

// ===== 事件处理 =====
const handlePlanChange = () => {
  if (planId.value) {
    loadFillData();
  } else {
    allFillData.value = [];
    sections.value = [];
  }
};

const handleDeptChange = () => {
  if (deptId.value) {
    loadFillData();
  } else {
    allFillData.value = [];
    sections.value = [];
  }
};

const handleSaveDraft = async () => {
  saveLoading.value = true;
  try {
    const items = allFillData.value
      .filter(d => d.isEditable === 1 && !isRowLocked(d) && !isFieldHidden(d) && d.status === 'DRAFT' && d.templateCode !== '14' && d.templateCode !== '15')
      .map(d => ({
        id: d.id,
        itemCode: d.itemCode,
        templateCode: d.templateCode,
        budgetAmount: d.budgetAmount,
        lastActual: d.lastActual,
        remark: d.remark && d.remark.startsWith('【驳回】') ? null : d.remark
      }));

    await saveDraft({
      planId: planId.value!,
      deptId: showDeptSelect.value ? deptId.value : undefined,
      orgId: showDeptSelect.value ? deptId.value : undefined,
      dataVersion: 'BUDGET',
      items
    });
    ElMessage.success('草稿保存成功');
    loadFillData();
  } catch (error) {
    console.error(error);
    ElMessage.error('保存失败');
  } finally {
    saveLoading.value = false;
  }
};

// 01公司基本信息：判断该科目是否只允许输入数字
const companyNatureOptions = ['国有独资企业', '国有控股企业', '国有参股企业', '其他'];
const BASIC_NUMERIC_CODES = ['0103', '0104', '0105', '0106', '0107', '0110'];
const BASIC_AMOUNT_CODES = ['0103', '0104', '0105', '0106']; // 金额类：允许小数
const BASIC_INT_CODES = ['0107', '0110'];                    // 人数/电话：仅数字

const isBasicNumericField = (row: any) => {
  return BASIC_NUMERIC_CODES.includes(row.itemCode);
};

const sanitizeBasicInput = (row: any) => {
  if (!row.remark) {
    row.remark = '';
    return;
  }
  if (BASIC_AMOUNT_CODES.includes(row.itemCode)) {
    // 金额：仅保留数字与一个小数点，且小数点后最多两位小数
    row.remark = row.remark
      .replace(/[^\d.]/g, '')
      .replace(/^\./, '')
      .replace(/\.{2,}/g, '.')
      .replace(/(\..*)\./g, '$1')
      .replace(/\.\d{3,}$/, (m: string) => m.slice(0, 3));
  } else if (BASIC_INT_CODES.includes(row.itemCode)) {
    // 人数/电话：仅保留数字
    row.remark = row.remark.replace(/[^\d]/g, '');
  }
};

// 01公司基本信息独立保存（不参与审批流程）
const handleSaveBasicInfo = async () => {
  saveLoading.value = true;
  try {
    const items = allFillData.value
      .filter(d => d.templateCode === '01' && d.isEditable === 1 && !isFieldHidden(d))
      .map(d => ({
        id: d.id,
        itemCode: d.itemCode,
        templateCode: d.templateCode,
        budgetAmount: null,
        lastActual: null,
        remark: d.remark
      }));

    await saveDraft({
      planId: planId.value!,
      deptId: showDeptSelect.value ? deptId.value : undefined,
      orgId: showDeptSelect.value ? deptId.value : undefined,
      templateCode: '01',
      dataVersion: 'BUDGET',
      items
    });
    ElMessage.success('公司基本信息保存成功');
    loadFillData();
  } catch (error) {
    console.error(error);
    ElMessage.error('保存失败');
  } finally {
    saveLoading.value = false;
  }
};

const submitReason = ref('');

const handleSubmit = async () => {
  // 提交前校验预检：ERROR 阻断并展示清单；WARN 强制填写原因说明
  if (planId.value) {
    try {
      const curOrg = showDeptSelect.value ? deptId.value : undefined;
      const vRes = curOrg != null
        ? await validateFill({ planId: planId.value, orgId: curOrg, type: undefined })
        : null;
      const v = vRes?.data;
      if (v) {
        const errs = (v.items || []).filter((i: any) => i.level === 'ERROR');
        if (errs.length > 0) {
          const tips = errs.slice(0, 8).map((i: any) => `· ${i.itemName || i.rule || ''}：${i.message || ''}`).join('\n');
          await ElMessageBox.alert(
            (tips ? tips + '\n' : '') + (errs.length > 8 ? '……（其余省略）' : ''),
            `校验未通过（${errs.length} 处错误）`,
            { type: 'error', confirmButtonText: '返回修改', customStyle: { whiteSpace: 'pre-line' } }
          );
          return;
        }
        const warns = (v.items || []).filter((i: any) => i.level === 'WARN');
        if (warns.length > 0) {
          const warnTips = warns.slice(0, 6).map((i: any) => `· ${i.itemName}：${i.message}`).join('\n');
          try {
            const r = await ElMessageBox.prompt(
              (warnTips ? warnTips + '\n' : '') + (warns.length > 6 ? '……（其余省略）\n' : '') + '请填写差异原因说明后才能提交：',
              `合理性提醒（${warns.length} 处同比变动超 ±30%）`,
              {
                confirmButtonText: '提交',
                cancelButtonText: '取消',
                inputType: 'textarea',
                inputPlaceholder: '如：业务扩张、价格调整等原因',
                inputValidator: (val: any) => (val && String(val).trim()) || '请填写说明'
              }
            );
            submitReason.value = r.value;
          } catch {
            return;
          }
        }
      }
    } catch (err) {
      // 预检接口异常不阻断，交由后端提交时强拦兜底
      console.warn('提交校验预检异常', err);
    }
  }

  try {
    await ElMessageBox.confirm('提交后数据将进入审批流程，确认提交？', '提示', { type: 'warning' });
  } catch {
    return;
  }

  submitLoading.value = true;
  try {
    const items = allFillData.value
      .filter(d => d.isEditable === 1 && !isRowLocked(d) && !isFieldHidden(d) && d.status === 'DRAFT' && d.templateCode !== '14' && d.templateCode !== '15')
      .map(d => ({
        id: d.id,
        itemCode: d.itemCode,
        templateCode: d.templateCode,
        budgetAmount: d.budgetAmount,
        lastActual: d.lastActual,
        remark: d.remark && d.remark.startsWith('【驳回】') ? null : d.remark
      }));

    await submitFill({
      planId: planId.value!,
      deptId: showDeptSelect.value ? deptId.value : undefined,
      orgId: showDeptSelect.value ? deptId.value : undefined,
      dataVersion: 'BUDGET',
      submitReason: submitReason.value,
      items
    });
    submitReason.value = '';
    ElMessage.success('提交成功，等待审批');
    loadFillData();
  } catch (error) {
    console.error(error);
    ElMessage.error('提交失败');
  } finally {
    submitLoading.value = false;
  }
};

// ===== 初始化 =====
onMounted(async () => {
  await loadPlans();
  await loadMyUnit();
  if (showDeptSelect.value) {
    await loadDepts();
  }
});

// 页面重新激活时自动刷新数据（从审批中心切回来时触发）
onActivated(() => {
  if (planId.value && (deptId.value || !showDeptSelect.value)) {
    loadFillData();
  }
});
</script>

<style scoped>
.filter-card :deep(.el-card__body) {
  padding: 8px 14px;
}
.comment-badge { margin-right: 12px; }
.filter-card .el-form-item {
  margin-right: 12px;
  margin-bottom: 0;
}
.filter-card .el-form-item__label {
  color: #606266;
  font-size: 12px;
}
.unit-text {
  display: inline-flex;
  align-items: center;
  height: 24px;
  font-size: 12px;
  line-height: 1;
  color: #303133;
  font-weight: 500;
}
.fill-progress :deep(.el-progress-bar__outer) {
  background: #f0f2f5;
  border-radius: 0;
}
.fill-progress :deep(.el-progress-bar__inner) {
  border-radius: 0;
  background: #409eff;
}
/* 底部统计：flex 布局镜像表格列宽，使两个合计对齐到对应表头列 */
.fill-summary {
  box-sizing: border-box;
  padding: 12px 2px;
}
.fill-summary-flex {
  display: flex;
  align-items: center;
}
.fs-left {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  white-space: nowrap;
}
.fs-filled {
  margin-left: 24px;
}
.fs-progress {
  width: 240px;
  flex-shrink: 0;
  margin-left: 12px;
}
.fs-total {
  flex-shrink: 0;
  box-sizing: border-box;
  text-align: right;
  padding-right: 10px;
  white-space: nowrap;
  color: #303133;
  font-weight: 500;
}
.fs-total--actual {
  width: 170px;
}
.fs-total--budget {
  width: 210px;
}
.fs-tail {
  flex-shrink: 0;
  box-sizing: border-box;
}
/* 尾部三列镜像增减额/增减率/状态的固定宽，保证合计与表头列对齐 */
.fs-tail:nth-child(4) {
  width: 150px;
}
.fs-tail:nth-child(5) {
  width: 120px;
}
.fs-tail:nth-child(6) {
  width: 90px;
}
/* AI 预填单元格浅蓝高亮 */
.prefill-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.prefill-cell.is-prefilled {
  background: #e6f1ff;
  border-radius: 4px;
  padding: 2px 4px;
  box-shadow: inset 0 0 0 1px #a0cfff;
}
.prefill-accept {
  flex-shrink: 0;
  margin-left: 2px;
}
.section-nav {
  position: sticky;
  top: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.section-nav-title {
  padding: 10px 12px;
  font-weight: bold;
  font-size: 14px;
  border-bottom: 1px solid #ebeef5;
  background: #f5f7fa;
}

.section-nav-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.section-nav-item:hover {
  background: #ecf5ff;
}

.section-nav-item.active {
  background: #ecf5ff;
  color: #409eff;
  border-left: 3px solid #409eff;
}

.section-nav-num {
  display: inline-block;
  width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  font-size: 11px;
  margin-right: 8px;
  flex-shrink: 0;
}

.section-nav-label {
  flex: 1;
  font-size: 13px;
  line-height: 1.3;
}

.section-nav-status {
  flex-shrink: 0;
  margin-left: 6px;
  display: flex;
  align-items: center;
}

.section-block {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: #1e5bb5;
  color: #fff;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-size: 15px;
  font-weight: bold;
}

.section-header:hover {
  background: #1a4fa3;
}

.section-title {
  flex: 1;
}

.section-summary {
  font-size: 13px;
  font-weight: normal;
  opacity: 0.9;
}

.section-note {
  margin-top: 6px;
}

.section-note-line {
  padding: 8px 12px;
  background: #fdf2f2;
  border: 1px solid #f6d1d1;
  border-radius: 4px;
  color: #666;
  font-size: 12px;
  line-height: 1.6;
  white-space: normal;
}

/* 增减额/增减率：左侧方向徽标（与文字一致：增=绿、减=红） */
.diff-cell {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}

.trend-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  flex-shrink: 0;
  line-height: 0;
}

.trend-badge.up { background: #ef4444; }
.trend-badge.down { background: #10b981; }

:deep(.summary-row) {
  background-color: #f0f7ff !important;
  font-weight: bold;
}

:deep(.readonly-row) {
  background-color: #fafafa !important;
  color: #999;
}

:deep(.readonly-row .el-input__inner) {
  background-color: #fafafa;
}

:deep(.el-table) {
  border-radius: 0 0 4px 4px;
}

/* ===== 审批意见 · 往来回复（时间线抽屉） ===== */
.comment-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 16px 20px;
  border-bottom: 1px solid #eef0f3;
}

.cd-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.cd-header__title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.cd-header__count {
  font-size: 12px;
  color: #8f959e;
}

.comment-drawer :deep(.el-drawer__body) {
  padding: 20px 24px;
  background: #f7f8fa;
}

.cd-loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
  font-size: 22px;
  color: #c0c4cc;
}

.cd-timeline {
  padding-left: 4px;
}

.cd-timeline :deep(.el-timeline-item) {
  padding-bottom: 24px;
}

.cd-timeline :deep(.el-timeline-item:last-child) {
  padding-bottom: 0;
}

.cd-round__head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.cd-round__no {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.cd-round__time {
  margin-left: auto;
  font-size: 12px;
  color: #8f959e;
}

.cd-round__approver {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  font-size: 12px;
  color: #646a73;
}

.cd-round__approver .el-icon {
  color: #8f959e;
}

.cd-round__approve {
  color: #8f959e;
}

.cd-comment-list {
  margin-top: 10px;
}

.cd-comment {
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.cd-comment:last-child {
  margin-bottom: 0;
}

.cd-comment__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.cd-comment__subject {
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cd-comment__msg {
  font-size: 14px;
  color: #1f2329;
  line-height: 1.7;
}

.cd-comment__time {
  margin-top: 8px;
  font-size: 12px;
  color: #c0c4cc;
}

.cd-reply {
  margin-top: 12px;
  padding: 12px 14px;
  background: #f2f7ff;
  border-radius: 8px;
}

.cd-reply__hd {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #2f6fe0;
  margin-bottom: 6px;
}

.cd-reply__meta {
  margin-left: auto;
  font-weight: 400;
  color: #8f959e;
}

.cd-reply__msg {
  font-size: 14px;
  color: #1f2329;
  line-height: 1.6;
}

.cd-reply-input {
  margin-top: 12px;
}

.cd-reply-input__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
