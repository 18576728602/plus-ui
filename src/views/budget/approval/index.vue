<template>
  <div class="app-container">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card-box">
          <div class="stat-icon" style="background: #fdf6ec; color: #e6a23c">
            <el-icon size="28"><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">待审批总数</div>
            <div class="stat-value">{{ stats.totalPending || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card-box">
          <div class="stat-icon" style="background: #ecf5ff; color: #409eff">
            <el-icon size="28"><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">填报待审批</div>
            <div class="stat-value">{{ stats.fillPending || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card-box">
          <div class="stat-icon" style="background: #f4ecff; color: #9c27b0">
            <el-icon size="28"><EditPen /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">调整待审批</div>
            <div class="stat-value">{{ stats.adjPending || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card-box">
          <div class="stat-icon" style="background: #f0f9eb; color: #67c23a">
            <el-icon size="28"><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">今日已处理</div>
            <div class="stat-value">{{ stats.processedToday || 0 }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 审批效率统计（8.5 平均审批时长） -->
    <div class="mb-4 efficiency-bar">
      <span class="eb-label">审批效率</span>
      <span class="eb-item">填报平均审批 <b>{{ fmtHours(eff.fillAvgHours) }}</b></span>
      <span class="eb-item">调整平均审批 <b>{{ fmtHours(eff.adjAvgHours) }}</b></span>
      <span class="eb-item">最长待办滞留 <b :class="{ 'eb-warn': (eff.maxPendHours || 0) > 48 }">{{ fmtHours(eff.maxPendHours) }}</b></span>
      <span class="eb-item">已办填报 <b>{{ eff.fillApprovedCnt || 0 }}</b> / 已办调整 <b>{{ eff.adjApprovedCnt || 0 }}</b></span>
    </div>

    <!-- 筛选栏 -->
    <el-card class="mb-4 filter-card" shadow="never">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item label="预算方案" class="filter-item">
          <el-select v-model="queryParams.planId" placeholder="全部" clearable style="width: 200px" @change="handleQuery">
            <el-option v-for="item in planOptions" :key="item.id" :label="item.planName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" class="filter-item">
          <el-select v-model="queryParams.type" placeholder="全部" clearable style="width: 140px" @change="handleQuery">
            <el-option label="预算填报" value="FILL" />
            <el-option label="预算调整" value="ADJUSTMENT" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="deptOptions.length > 1" label="申请单位" class="filter-item">
          <el-select v-model="queryParams.orgId" placeholder="全部" clearable filterable style="width: 220px" @change="handleQuery">
            <el-option v-for="item in deptOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item">
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 审批列表 -->
    <el-card shadow="never">
      <el-tabs v-model="activeStatusTab" @tab-change="handleTabChange" class="mb-4">
        <el-tab-pane name="PENDING">
          <template #label>
            <span>待审批</span>
            <el-badge :value="stats.totalPending || 0" :max="999" class="tab-badge" type="warning" />
          </template>
        </el-tab-pane>
        <el-tab-pane name="APPROVED">
          <template #label>
            <span>已通过</span>
            <el-badge :value="stats.totalApproved || 0" :max="999" class="tab-badge" type="success" />
          </template>
        </el-tab-pane>
        <el-tab-pane name="REJECTED">
          <template #label>
            <span>已驳回</span>
            <el-badge :value="stats.totalRejected || 0" :max="999" class="tab-badge" type="danger" />
          </template>
        </el-tab-pane>
        <el-tab-pane name="CHAIN">
          <template #label>
            <span>多级审批</span>
            <el-badge :value="chainPendingCount" :max="999" class="tab-badge" type="warning" />
          </template>
        </el-tab-pane>
      </el-tabs>

      <div class="mb-4 flex justify-between items-center">
        <div v-if="activeStatusTab === 'PENDING' && hasAnyApprovePerm()">
          <el-button v-hasPermi="['budget:approval:approve', 'budget:adjustment:approve']" type="success" icon="Check" :disabled="selection.length === 0" @click="handleBatchApprove('APPROVED')">
            批量通过
          </el-button>
          <el-button v-hasPermi="['budget:approval:approve', 'budget:adjustment:approve']" type="danger" icon="Close" :disabled="selection.length === 0" @click="handleBatchApprove('REJECTED')">
            批量驳回
          </el-button>
          <span class="ml-4 text-sm text-gray-500" v-if="selection.length > 0">
            已选 {{ selection.length }} 项
          </span>
        </div>
      </div>

      <el-table v-if="activeStatusTab !== 'CHAIN'" :data="tableData" border size="small" v-loading="loading" style="width: 100%"
        @selection-change="handleSelectionChange" :row-key="getRowKey">
        <el-table-column type="selection" width="50" align="center" :selectable="canSelect" v-if="activeStatusTab === 'PENDING'" />
        <el-table-column label="预算方案" prop="planName" min-width="180" />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'FILL' ? 'primary' : 'warning'" size="small">{{ row.typeLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请单位" prop="deptName" min-width="200">
          <template #default="{ row }">{{ row.deptName || '-' }}</template>
        </el-table-column>
        <el-table-column label="预算表" min-width="180">
          <template #default="{ row }">
            {{ row.templateCode }} - {{ row.templateName || '' }}
          </template>
        </el-table-column>
        <el-table-column label="科目明细" min-width="350">
          <template #default="{ row }">
            <span v-if="row.type === 'FILL' && row.templateCode === '01'">共 {{ row.itemCount }} 条信息项</span>
            <span v-else-if="row.type === 'FILL'">共 {{ row.itemCount }} 条科目，预算总额 {{ formatAmount(row.totalAmount) }} 万元</span>
            <span v-else>
              {{ row.itemCode }} {{ row.itemName }} | 原预算 {{ formatAmount(row.originalAmount) }} → 调整 {{ formatAdjustAmount(row.adjustAmount) }} → 调整后 {{ formatAmount(row.adjustedAmount) }} 万元
              <span v-if="row.reason"> | {{ row.reason }}</span>
              <el-link v-if="row.attachment" type="primary" :underline="false" class="ml-2" @click="handleViewAttachment(row)">附件</el-link>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="申请人" width="100" align="center">
          <template #default="{ row }">{{ row.applicantName || row.createBy || '-' }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="150" align="center">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="轮次" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.submitRound" size="small" type="info" effect="plain">第{{ row.submitRound }}轮</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="160" align="center" v-if="activeStatusTab !== 'PENDING'">
          <template #default="{ row }">
            <el-tag :type="activeStatusTab === 'APPROVED' ? 'success' : 'danger'" size="small">
              {{ activeStatusTab === 'APPROVED' ? '已通过' : '已驳回' }}
            </el-tag>
            <div v-if="row.approverName" class="text-xs text-gray-400 mt-1">{{ row.approverName }}</div>
            <div v-if="row.approveRemark" class="text-xs text-gray-500" style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="row.approveRemark">{{ row.approveRemark }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="info" size="small" link @click="handleViewDetail(row)">查看明细</el-button>
            <el-button v-if="activeStatusTab === 'PENDING' && canApproveType(row.type)" type="warning" size="small" link @click="handleInquire(row)">询问</el-button>
            <el-button v-if="activeStatusTab === 'PENDING' && canApproveType(row.type)" type="primary" size="small" link @click="handleReview(row)">审核</el-button>
            <el-button v-if="activeStatusTab === 'APPROVED' && row.type === 'FILL'" type="success" size="small" link @click="handlePublish(row)">正式发布</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end" v-if="activeStatusTab !== 'CHAIN'">
        <el-pagination v-model:current-page="queryParams.pageNum" v-model:page-size="queryParams.pageSize"
          :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleQuery" @current-change="handleQuery" />
      </div>

      <!-- 多级审批链待办 -->
      <template v-if="activeStatusTab === 'CHAIN'">
        <div class="chain-hint">三级/四级孙公司填报提交后，从填报单位本级自下而上逐级审批；您当前待办条数为 {{ chainPendingCount }}。</div>
        <el-table :data="chainTableData" border size="small" v-loading="chainLoading" style="width: 100%">
          <el-table-column label="填报单位" prop="deptName" min-width="200" />
        <el-table-column label="预算方案" prop="planName" min-width="200" />
          <el-table-column label="预算表" width="90" align="center">
            <template #default="{ row }">{{ row.templateCode || '-' }}</template>
          </el-table-column>
          <el-table-column label="当前环节" width="160" align="center">
            <template #default="{ row }">
              <el-tag type="warning" size="small" effect="light">{{ row.nodeDeptName }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="审批进度" min-width="320">
            <template #default="{ row }">
              <div class="chain-nodes">
                <span v-for="(n, i) in row.nodes" :key="i" class="chain-node">
                  <span class="cn-dot" :class="chainNodeClass(n.status)"></span>
                  <span class="cn-name" :class="{ 'cn-active': n.id === row.nodeId }">{{ n.nodeDeptName }}</span>
                  <el-icon v-if="i < row.nodes.length - 1" class="cn-arrow">
                    <Right />
                  </el-icon>
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="申请人" width="110" align="center">
            <template #default="{ row }">{{ row.applicantName || '-' }}</template>
          </el-table-column>
          <el-table-column label="提交时间" width="150" align="center">
            <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="success" size="small" link :disabled="!row.hasPerm" @click="openChainApprove(row, true)">通过</el-button>
              <el-button type="danger" size="small" link :disabled="!row.hasPerm" @click="openChainApprove(row, false)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-card>

    <!-- 多级审批通过/驳回弹窗 -->
    <el-dialog v-model="chainApproveDialogVisible" :title="chainApproveForm.approve ? '多级审批 · 通过' : '多级审批 · 驳回'" width="520px" :close-on-click-modal="false">
      <el-descriptions :column="2" border size="small" class="mb-4" v-if="chainCur">
        <el-descriptions-item label="填报单位">{{ chainCur.deptName }}</el-descriptions-item>
        <el-descriptions-item label="预算方案">{{ chainCur.planName }}</el-descriptions-item>
        <el-descriptions-item label="预算表">{{ chainCur.templateCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="当前环节">{{ chainCur.nodeDeptName }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ chainCur.applicantName || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-form ref="chainApproveRef" :model="chainApproveForm" :rules="chainApproveRules" label-width="80px">
        <el-form-item :label="chainApproveForm.approve ? '通过意见' : '驳回原因'" prop="comment">
          <el-input v-model="chainApproveForm.comment" type="textarea" :rows="4"
            :placeholder="chainApproveForm.approve ? '请输入审批意见（可选）' : '请输入驳回原因（必填）'"
            show-word-limit maxlength="300" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="chainApproveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmChainApprove">确定</el-button>
      </template>
    </el-dialog>

    <!-- 查看明细弹窗 -->
    <el-dialog v-model="detailDialogVisible" :title="detailDialogTitle" width="1120px" :close-on-click-modal="false" class="detail-dialog" @close="dialogMode = 'view'">
      <div v-if="currentDetail" class="detail-scroll">
        <!-- 1. 预算明细 -->
        <el-descriptions :column="2" border size="small" class="mb-4">
          <el-descriptions-item label="填报单位">{{ currentDetail.deptName }}</el-descriptions-item>
          <el-descriptions-item label="预算表">{{ currentDetail.templateCode }} - {{ currentDetail.templateName }}</el-descriptions-item>
          <template v-if="currentDetail.type === 'FILL'">
            <el-descriptions-item label="科目条数">{{ currentDetail.itemCount }} 条</el-descriptions-item>
            <el-descriptions-item label="预算总额" v-if="currentDetail.templateCode !== '01'">{{ formatAmount(currentDetail.totalAmount) }} 万元</el-descriptions-item>
            <el-descriptions-item label="信息条数" v-else>公司基本信息</el-descriptions-item>
          </template>
          <template v-else>
            <el-descriptions-item label="调整科目">{{ currentDetail.itemCode }}</el-descriptions-item>
            <el-descriptions-item label="原预算">{{ formatAmount(currentDetail.originalAmount) }} → 调整后 {{ formatAmount(currentDetail.adjustedAmount) }} 万元</el-descriptions-item>
          </template>
          <el-descriptions-item label="申请人">{{ currentDetail.applicantName || currentDetail.createBy || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatTime(currentDetail.createTime) }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.submitRound" label="提交轮次">第 {{ currentDetail.submitRound }} 轮</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.submitReason" label="提交说明">{{ currentDetail.submitReason }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.approverName" label="审批人">{{ currentDetail.approverName }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.approveRemark" label="审批意见">{{ currentDetail.approveRemark }}</el-descriptions-item>
        </el-descriptions>

        <!-- 预算调整明细 -->
        <el-table v-if="currentDetail.type === 'ADJUSTMENT'" :data="currentDetail.detailList || []" border size="small" style="width: 100%" max-height="300">
          <el-table-column label="科目编码" prop="itemCode" width="120" align="center" />
          <el-table-column label="科目名称" prop="itemName" min-width="200" />
          <el-table-column label="原预算(万元)" width="120" align="right">
            <template #default="{ row }">{{ row.originalAmount != null ? formatAmount(row.originalAmount) : '-' }}</template>
          </el-table-column>
          <el-table-column label="调整额(万元)" width="120" align="right">
            <template #default="{ row }">
              <span :style="{ color: Number(row.adjustAmount) >= 0 ? '#f56c6c' : '#67c23a' }">
                {{ row.adjustAmount != null ? (Number(row.adjustAmount) >= 0 ? '+' : '') + formatAmount(row.adjustAmount) : '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="调整后(万元)" width="120" align="right">
            <template #default="{ row }">{{ row.adjustedAmount != null ? formatAmount(row.adjustedAmount) : '-' }}</template>
          </el-table-column>
          <el-table-column label="调整原因" min-width="200">
            <template #default="{ row }">{{ row.reason || '-' }}</template>
          </el-table-column>
        </el-table>

        <!-- 01公司基本信息表：显示文本内容 -->
        <el-table v-else-if="currentDetail.templateCode === '01'" :data="currentDetail.detailList || []" border size="small" style="width: 100%" max-height="300">
          <el-table-column label="科目编码" prop="itemCode" width="100" align="center" />
          <el-table-column label="信息项" prop="itemName" min-width="200" />
          <el-table-column label="信息内容" min-width="250">
            <template #default="{ row }">{{ row.remark || '-' }}</template>
          </el-table-column>
        </el-table>

        <!-- 其他板块：显示数字列 -->
        <el-table v-else :data="currentDetail.detailList || []" border size="small" style="width: 100%" max-height="300">
          <el-table-column label="科目编码" prop="itemCode" width="100" align="center" />
          <el-table-column label="科目名称" prop="itemName" min-width="200" />
          <el-table-column label="上年实际(万元)" width="120" align="right">
            <template #default="{ row }">{{ row.lastActual != null ? formatAmount(row.lastActual) : '-' }}</template>
          </el-table-column>
          <el-table-column label="本年预算(万元)" width="120" align="right">
            <template #default="{ row }">{{ row.budgetAmount != null ? formatAmount(row.budgetAmount) : '-' }}</template>
          </el-table-column>
          <el-table-column label="增减额(万元)" width="120" align="right">
            <template #default="{ row }">
              <span v-if="row.lastActual != null && row.budgetAmount != null"
                :style="{ color: row.budgetAmount - row.lastActual >= 0 ? '#f56c6c' : '#67c23a' }">
                {{ formatAmount(row.budgetAmount - row.lastActual) }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="增减率" width="100" align="right">
            <template #default="{ row }">
              <span v-if="row.lastActual != null && row.lastActual != 0 && row.budgetAmount != null"
                :style="{ color: row.budgetAmount - row.lastActual >= 0 ? '#f56c6c' : '#67c23a' }">
                {{ ((row.budgetAmount - row.lastActual) / row.lastActual * 100).toFixed(2) }}%
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 2. 单元格批注 - 按轮次分组 -->
        <el-divider content-position="left">单元格批注{{ commentList.length ? `（${commentList.length}）` : '' }}</el-divider>
        <div class="comment-panel" v-loading="commentLoading">
          <template v-if="groupedCommentList.length === 0">
            <el-empty description="暂无单元格批注" :image-size="60" />
          </template>
          <div v-for="group in groupedCommentList" :key="group.recordId" class="comment-round-card">
            <!-- 轮次头部 -->
            <div class="round-header" :class="'round-' + (group.recordStatus || 'PENDING').toLowerCase()">
              <div class="round-title">
                <span class="round-badge">{{ group.submitRound ? '第 ' + group.submitRound + ' 轮' : '历史记录' }}</span>
                <el-tag :type="getRoundStatusType(group.recordStatus)" size="small" effect="dark" class="round-status-tag">
                  {{ getRoundStatusLabel(group.recordStatus) }}
                </el-tag>
              </div>
              <div class="round-meta">
                <span v-if="group.recordSubmitTime" class="round-time">提交：{{ formatTime2(group.recordSubmitTime) }}</span>
                <span v-if="group.recordApproverName" class="round-approver">审批人：{{ group.recordApproverName }}</span>
                <span v-if="group.recordApproveTime" class="round-time">审批：{{ formatTime2(group.recordApproveTime) }}</span>
              </div>
            </div>
            <!-- 该轮次的批注列表 -->
            <div class="round-comments">
              <div v-for="c in group.comments" :key="c.id" class="comment-card">
                <div class="comment-card-head">
                  <div class="comment-tags">
                    <el-tag size="small" :type="commentTypeTag(c.commentType)" effect="light" class="comment-type-tag">{{ c.commentTypeLabel }}</el-tag>
                    <el-tag v-if="c.itemName" size="small" type="info" effect="plain" class="comment-subject-tag">科目：{{ c.itemName }}</el-tag>
                    <el-tag v-else size="small" type="info" effect="plain" class="comment-subject-tag">整体意见</el-tag>
                  </div>
                  <span class="comment-time">{{ formatTime2(c.createTime) }}</span>
                </div>
                <div class="comment-card-body">
                  <div class="comment-msg">{{ c.content }}</div>
                  <div v-if="c.replyContent" class="comment-reply-box">
                    <div class="reply-label">填报回复</div>
                    <div class="reply-content">{{ c.replyContent }}</div>
                    <div class="reply-meta">{{ c.replierName }} · {{ formatTime2(c.replyTime) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 审批人新增批注（待审批、询问模式可新增，审核模式只读） -->
          <template v-if="activeStatusTab === 'PENDING' || dialogMode === 'inquire'">
            <el-divider content-position="left">新增批注</el-divider>
            <el-form :inline="true" class="cm-form" :model="commentForm">
              <el-form-item label="科目">
                <el-select v-model="commentForm.itemCode" clearable filterable placeholder="留空=整体意见" style="width: 200px" :disabled="currentDetail.type === 'ADJUSTMENT'">
                  <el-option v-for="d in currentDetail.detailList" :key="d.itemCode" :label="d.itemCode + ' ' + (d.itemName || '')" :value="d.itemCode" />
                </el-select>
              </el-form-item>
              <el-form-item label="类型">
                <el-select v-model="commentForm.commentType" style="width: 130px">
                  <el-option label="建议修改" value="SUGGESTION" />
                  <el-option label="疑问" value="QUESTION" />
                  <el-option label="警告" value="WARNING" />
                </el-select>
              </el-form-item>
              <el-form-item label="内容" class="cm-form-content">
                <el-input v-model="commentForm.content" type="textarea" :rows="2" placeholder="请输入审批意见" maxlength="300" show-word-limit style="width: 420px" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :disabled="!commentForm.content" :loading="commentLoading" @click="submitComment">
                  {{ commentForm.commentType === 'QUESTION' ? '发送询问' : '提交批注' }}
                </el-button>
              </el-form-item>
            </el-form>
          </template>
          <div v-if="dialogMode === 'review' && commentList.length > 0" class="cm-readonly-hint">
            <el-icon><InfoFilled /></el-icon>
            审核模式下批注为只读，如需新增批注请使用"询问"功能
          </div>
        </div>

        <!-- 3. 审批轨迹 -->
        <el-divider content-position="left">审批轨迹</el-divider>
        <el-timeline v-loading="traceLoading" class="mt-2">
          <el-timeline-item v-for="(n, i) in traceList" :key="i" :type="traceType(n.actionType)"
            :timestamp="formatTime2(n.time)" placement="top" :hollow="n.actionType === 'CURRENT'">
            <div class="tl-content">
              <span class="tl-icon">{{ traceIcon(n.actionType) }}</span>
              <b class="tl-label">{{ n.label }}</b>
              <span class="tl-operator">审批人：{{ n.operatorName || '-' }}</span>
            </div>
            <div v-if="n.remark" class="tl-remark">审批意见：{{ n.remark }}</div>
          </el-timeline-item>
          <el-empty v-if="traceList.length === 0" description="暂无审批轨迹" :image-size="60" />
        </el-timeline>

        <!-- 4. 审批操作区（仅审核模式显示） -->
        <template v-if="dialogMode === 'review'">
          <el-divider content-position="left">审批操作</el-divider>
          <div class="approval-action-area">
            <el-form :model="approveForm" label-width="80px">
              <el-form-item label="审批结果">
                <el-radio-group v-model="approveForm.action">
                  <el-radio value="APPROVED">通过</el-radio>
                  <el-radio value="REJECTED">驳回</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="审批意见" required>
                <el-input v-model="approveForm.remark" type="textarea" :rows="4"
                  :placeholder="approveForm.action === 'REJECTED' ? '请输入驳回原因（必填）' : '请输入审批意见（必填）'"
                  show-word-limit maxlength="200" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="confirmDetailApprove">确认提交</el-button>
                <el-button @click="detailDialogVisible = false">取消</el-button>
              </el-form-item>
            </el-form>
          </div>
        </template>
      </div>
    </el-dialog>

    <!-- 审批转交弹窗（8.4） -->
    <el-dialog v-model="transferDialogVisible" title="审批转交" width="480px" :close-on-click-modal="false">
      <el-form :model="transferForm" label-width="90px">
        <el-form-item label="待办事项">
          <el-input :model-value="transferForm.deptName + ' / ' + transferForm.templateName" disabled />
        </el-form-item>
        <el-form-item label="接收人">
          <el-select v-model="transferForm.receiverId" filterable placeholder="选择审批人" style="width: 100%">
            <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName + '（' + u.userName + '）'" :value="u.userId" />
          </el-select>
        </el-form-item>
        <el-form-item label="转交原因">
          <el-input v-model="transferForm.reason" type="textarea" :rows="3" placeholder="请填写转交原因（留痕）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!transferForm.receiverId" @click="confirmTransfer">确定转交</el-button>
      </template>
    </el-dialog>

    <!-- 审批抄送弹窗（会签知情） -->
    <el-dialog v-model="copyDialogVisible" title="审批抄送" width="520px" :close-on-click-modal="false">
      <el-form :model="copyForm" label-width="90px">
        <el-form-item label="待办事项">
          <el-input :model-value="copyForm.deptName + ' / ' + copyForm.templateName" disabled />
        </el-form-item>
        <el-form-item label="抄送人">
          <el-select v-model="copyForm.receiverIds" multiple filterable collapse-tags collapse-tags-tooltip placeholder="选择被抄送人（可多选）" style="width: 100%" :max-collapse-tags="3">
            <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName + '（' + u.userName + '）'" :value="u.userId" />
          </el-select>
          <div class="el-form-item__help" style="font-size: 12px; color: var(--el-text-color-secondary);">被抄送人仅知悉，不参与审批，可在「我的抄送」中查看</div>
        </el-form-item>
        <el-form-item label="抄送说明">
          <el-input v-model="copyForm.reason" type="textarea" :rows="3" placeholder="请填写抄送说明（留痕）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!copyForm.receiverIds.length" @click="confirmCopy">确定抄送</el-button>
      </template>
    </el-dialog>

    <!-- 审批弹窗 -->
    <el-dialog v-model="approveDialogVisible" :title="dialogTitle" width="500px" :close-on-click-modal="false">
      <el-form ref="approveRef" :model="approveForm" :rules="approveRules" label-width="80px">
        <el-form-item label="审批结果" prop="action">
          <el-radio-group v-model="approveForm.action">
            <el-radio value="APPROVED">通过</el-radio>
            <el-radio value="REJECTED">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批意见" prop="remark">
          <el-input v-model="approveForm.remark" type="textarea" :rows="4"
            :placeholder="approveForm.action === 'REJECTED' ? '请输入驳回原因（必填）' : '请输入审批意见（必填）'"
            show-word-limit maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchApprove">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="BudgetApproval">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Clock, Document, EditPen, CircleCheck, Right, WarningFilled, InfoFilled } from '@element-plus/icons-vue';
import { listPendingApprovals, batchApprove, getApprovalStats, getApprovalTrace, transferApproval, getApprovalEfficiency, publishRelease, copyApproval } from '@/api/budget/approval';
import { addApprovalComment, listApprovalComments } from '@/api/budget/approvalComment';
import { listMyPendingChains, getLatestChain, advanceChain } from '@/api/budget/approvalChain';
import { listPlan, listDept } from '@/api/budget/fill';
import { useUserStore } from '@/store/modules/user';
import type { FormInstance } from 'element-plus';

const loading = ref(false);
const userStore = useUserStore();
const tableData = ref<any[]>([]);
const total = ref(0);
const selection = ref<any[]>([]);
const planOptions = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
const stats = ref<any>({});
const eff = ref<any>({});
const approveRef = ref<FormInstance>();
const activeStatusTab = ref('PENDING');

// 多级审批链（三级/四级孙公司逐级审批）
const chainLoading = ref(false);
const chainTableData = ref<any[]>([]);
const chainPendingCount = ref(0);
const chainApproveDialogVisible = ref(false);
const chainApproveRef = ref<FormInstance>();
const chainCur = ref<any>(null);
const chainApproveForm = reactive({
  nodeId: undefined as number | undefined,
  approve: true,
  comment: ''
});
const chainApproveRules = computed(() => ({
  comment: [
    { required: !chainApproveForm.approve, message: '驳回原因必填', trigger: 'blur' }
  ]
}));

const chainNodeClass = (status: string) => {
  if (status === 'APPROVED') return 'cn-done';
  if (status === 'REJECTED') return 'cn-reject';
  if (status === 'PENDING') return 'cn-pending';
  return '';
};

const openChainApprove = (row: any, approve: boolean) => {
  chainCur.value = row;
  chainApproveForm.nodeId = row.nodeId;
  chainApproveForm.approve = approve;
  chainApproveForm.comment = '';
  chainApproveDialogVisible.value = true;
};

const confirmChainApprove = async () => {
  if (!chainApproveRef.value) return;
  await chainApproveRef.value.validate(async (valid) => {
    if (!valid) return;
    const actionLabel = chainApproveForm.approve ? '通过' : '驳回';
    try {
      await ElMessageBox.confirm(
        `确认${actionLabel}当前环节审批。${!chainApproveForm.approve ? '驳回将导致整链作废，填报数据打回草稿。' : ''}`,
        '多级审批确认',
        { type: chainApproveForm.approve ? 'success' : 'warning', confirmButtonText: '确认' }
      );
      const res = await advanceChain({
        nodeId: chainApproveForm.nodeId,
        approve: chainApproveForm.approve,
        comment: chainApproveForm.comment
      });
      const resultStatus = res.data || res;
      ElMessage.success(
        chainApproveForm.approve
          ? (resultStatus === 'APPROVED' ? '审批通过，整链全部完成' : '审批通过，已推进至下一环节')
          : '已驳回，数据已打回草稿'
      );
      chainApproveDialogVisible.value = false;
      loadChainPending();
      handleQuery();
      loadStats();
    } catch (error) {
      console.error(error);
    }
  });
};

const loadChainPending = async (withNodes: boolean = true) => {
  chainLoading.value = true;
  try {
    const res = await listMyPendingChains();
    const list = res.data || [];
    if (withNodes && activeStatusTab.value === 'CHAIN') {
      // parallel fetch nodes to build progress timeline
      await Promise.all(list.map(async (row: any) => {
        const res2 = await getLatestChain(row.planId, row.deptId);
        row.nodes = (res2?.nodes || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
      }));
    }
    chainTableData.value = list;
    chainPendingCount.value = list.length;
  } catch (error) {
    console.error(error);
  } finally {
    chainLoading.value = false;
  }
};

// 单元格批注（8.2）
const detailActiveTab = ref('detail');
const commentList = ref<any[]>([]);
const commentLoading = ref(false);
const commentForm = reactive<any>({ itemCode: undefined, commentType: 'SUGGESTION', content: '' });

const commentedItemKeys = computed(() => {
  const userId = userStore.userId;
  return commentList.value
    .filter(c => c.commenterId === userId)
    .map(c => c.itemCode || '__overall__');
});

const commentedItemDesc = computed(() => {
  const keys = commentedItemKeys.value;
  if (keys.length === 0) return '';
  const names = keys.map(k => {
    if (k === '__overall__') return '整体意见';
    const item = currentDetail.value?.detailList?.find((d: any) => d.itemCode === k);
    return item ? `${k} ${item.itemName || ''}` : k;
  });
  return names.join('、');
});

const isItemCommented = computed(() => {
  // 所有类型批注均不限制次数，支持往来多次对话
  return false;
});

// 按轮次分组的审批意见
const groupedCommentList = computed(() => {
  const groups: Record<string, any> = {};
  commentList.value.forEach((c: any) => {
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

// 审批轨迹（8.6）
const traceList = ref<any[]>([]);
const traceLoading = ref(false);
// 审批转交（8.4）
const transferDialogVisible = ref(false);
const transferForm = reactive<any>({ planId: undefined, deptId: undefined, templateCode: undefined, type: 'FILL', receiverId: undefined, reason: '', deptName: '', templateName: '' });
const userOptions = ref<any[]>([]);
// 审批抄送（会签知情）
const copyDialogVisible = ref(false);
const copyForm = reactive<any>({ planId: undefined, deptId: undefined, templateCode: undefined, type: 'FILL', receiverIds: [] as number[], reason: '', deptName: '', templateName: '' });

const queryParams = reactive({
  type: '',
  planId: undefined as number | undefined,
  orgId: undefined as number | undefined,
  status: 'PENDING',
  pageNum: 1,
  pageSize: 10
});

const getRowKey = (row: any) => row.type + '_' + row.id;

// 是否有任意审批权限（预算填报审批 或 预算调整审批）
const hasAnyApprovePerm = () => {
  const p = userStore.permissions || [];
  if (p.includes('*:*:*')) return true;
  return p.includes('budget:approval:approve') || p.includes('budget:adjustment:approve');
};

// 是否有指定类型的审批权限：填报(FILL)→budget:approval:approve；调整(ADJUSTMENT)→budget:adjustment:approve
const canApproveType = (type: string) => {
  const p = userStore.permissions || [];
  if (p.includes('*:*:*')) return true;
  return type === 'ADJUSTMENT' ? p.includes('budget:adjustment:approve') : p.includes('budget:approval:approve');
};

// 无可审批类型时，连勾选框也可隐藏（只看不改）
const canSelect = (row: any) => canApproveType(row.type);

const formatAmount = (val: any) => {
  if (val == null) return '0.00';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatAdjustAmount = (val: any) => {
  if (val == null) return '0.00';
  const num = Number(val);
  const str = num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return num >= 0 ? '+' + str : str;
};

const handleViewAttachment = (row: any) => {
  if (row.attachment) {
    window.open(row.attachment, '_blank');
  }
};

const formatTime = (val: any) => {
  if (!val) return '-';
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const handleTabChange = () => {
  if (activeStatusTab.value === 'CHAIN') {
    queryParams.status = 'PENDING';
    loadChainPending();
    return;
  }
  queryParams.status = activeStatusTab.value;
  queryParams.pageNum = 1;
  handleQuery();
};

const handleQuery = async () => {
  loading.value = true;
  try {
    const res = await listPendingApprovals(queryParams);
    // 兼容两种返回结构：{rows} 直接的 TableDataInfo，或 {data:{rows}} 被 R 包裹
    const pageRows = res?.rows || res?.data?.rows || [];
    tableData.value = pageRows;
    total.value = res?.total ?? res?.data?.total ?? 0;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
  loadStats();
};

const resetQuery = () => {
  queryParams.type = '';
  queryParams.planId = undefined;
  queryParams.orgId = undefined;
  queryParams.pageNum = 1;
  handleQuery();
};

const handleSelectionChange = (val: any[]) => {
  selection.value = val;
};

// 查看明细（含单元格批注 + 审批轨迹）
const detailDialogVisible = ref(false);
const currentDetail = ref<any>(null);
const handleViewDetail = (row: any) => {
  currentDetail.value = row;
  detailActiveTab.value = 'detail';
  detailDialogVisible.value = true;
  dialogMode.value = 'view';
  commentForm.itemCode = undefined;
  commentForm.commentType = 'SUGGESTION';
  commentForm.content = '';
  loadComments();
  loadTrace();
};

const loadComments = async () => {
  if (!currentDetail.value) return;
  commentLoading.value = true;
  try {
    const res = await listApprovalComments({
      targetType: currentDetail.value.type,
      planId: currentDetail.value.planId,
      deptId: currentDetail.value.deptId,
      templateCode: currentDetail.value.templateCode,
      itemCode: undefined,
      recordId: currentDetail.value.id
    });
    commentList.value = res.data || [];
  } catch (error) {
    console.error(error);
  } finally {
    commentLoading.value = false;
  }
};

const submitComment = async () => {
  if (!currentDetail.value) return;
  if (!commentForm.content) {
    ElMessage.warning('请输入批注内容');
    return;
  }
  commentLoading.value = true;
  try {
    await addApprovalComment({
    targetType: currentDetail.value.type,
    planId: currentDetail.value.planId,
    deptId: currentDetail.value.deptId,
    templateCode: currentDetail.value.templateCode,
    itemCode: commentForm.itemCode,
    commentType: commentForm.commentType,
    content: commentForm.content,
    recordId: currentDetail.value.id
  });
    ElMessage.success('批注已提交');
    commentForm.content = '';
    commentForm.itemCode = undefined;
    loadComments();
  } catch (error) {
    console.error(error);
  } finally {
    commentLoading.value = false;
  }
};

const commentTypeTag = (t: string) => (t === 'SUGGESTION' ? 'primary' : t === 'WARNING' ? 'danger' : 'warning');

// 审批轨迹（8.6）
const loadTrace = async () => {
  if (!currentDetail.value) return;
  traceLoading.value = true;
  try {
    const res = await getApprovalTrace({
      type: currentDetail.value.type,
      planId: currentDetail.value.planId,
      deptId: currentDetail.value.deptId,
      templateCode: currentDetail.value.templateCode
    });
    traceList.value = res.data || [];
  } catch (error) {
    console.error(error);
  } finally {
    traceLoading.value = false;
  }
};
const traceType = (t: string) => (t === 'APPROVE' ? 'success' : t === 'REJECT' ? 'danger' : t === 'SUBMIT' ? 'primary' : t === 'TRANSFER' ? 'warning' : t === 'CC' ? 'info' : 'info');
const traceIcon = (t: string) => (t === 'APPROVE' ? '✅' : t === 'REJECT' ? '❌' : t === 'SUBMIT' ? '📤' : t === 'TRANSFER' ? '↔️' : t === 'CC' ? '📧' : '⚪');

// 审批转交（8.4）
const openTransfer = (row: any) => {
  transferForm.planId = row.planId;
  transferForm.deptId = row.deptId;
  transferForm.templateCode = row.templateCode;
  transferForm.type = row.type;
  transferForm.receiverId = undefined;
  transferForm.reason = '';
  transferForm.deptName = row.deptName || '';
  transferForm.templateName = (row.templateCode || '') + ' ' + (row.templateName || '');
  transferDialogVisible.value = true;
  loadUsers(row.createBy);
};

const confirmTransfer = async () => {
  if (!transferForm.receiverId) {
    ElMessage.warning('请选择接收人');
    return;
  }
  await ElMessageBox.confirm('确认将该待办转交给所选审批人？转交记录将全程留痕。', '提示', { type: 'warning', confirmButtonText: '确认转交' });
  try {
    await transferApproval({
      planId: transferForm.planId,
      deptId: transferForm.deptId,
      templateCode: transferForm.templateCode,
      type: transferForm.type,
      receiverId: transferForm.receiverId,
      reason: transferForm.reason
    });
    ElMessage.success('转交成功');
    transferDialogVisible.value = false;
    handleQuery();
  } catch (error) {
    console.error(error);
  }
};

// 审批抄送（会签知情）
const openCopy = (row: any) => {
  copyForm.planId = row.planId;
  copyForm.deptId = row.deptId;
  copyForm.templateCode = row.templateCode;
  copyForm.type = row.type;
  copyForm.receiverIds = [];
  copyForm.reason = '';
  copyForm.deptName = row.deptName || '';
  copyForm.templateName = (row.templateCode || '') + ' ' + (row.templateName || '');
  copyDialogVisible.value = true;
  loadUsers(row.createBy);
};

const confirmCopy = async () => {
  if (!copyForm.receiverIds.length) {
    ElMessage.warning('请选择被抄送人');
    return;
  }
  await ElMessageBox.confirm('确认将当前审批单抄送给所选用户？被抄送人仅知悉，不参与审批。', '提示', { type: 'info', confirmButtonText: '确定抄送' });
  try {
    await copyApproval({
      planId: copyForm.planId,
      deptId: copyForm.deptId,
      templateCode: copyForm.templateCode,
      type: copyForm.type,
      receiverIds: copyForm.receiverIds,
      reason: copyForm.reason
    });
    ElMessage.success('抄送成功');
    copyDialogVisible.value = false;
  } catch (error) {
    console.error(error);
  }
};

// 时间格式化（含秒 + 无值时返回-）
const formatTime2 = (val: any) => {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

// 审批效率（8.5）
const fmtHours = (v: any) => {
  if (v == null || v === 0) return '—';
  const h = Number(v);
  return `${h < 1 ? (h * 60).toFixed(0) + '分钟' : h.toFixed(1) + '小时'}`;
};
const loadEfficiency = async () => {
  try {
    const res = await getApprovalEfficiency({
      planId: queryParams.planId,
      type: queryParams.type || undefined,
      orgId: queryParams.orgId
    });
    eff.value = res.data || {};
  } catch (error) {
    console.error(error);
  }
};

// 审批弹窗
const approveDialogVisible = ref(false);
const approveForm = reactive({
  action: 'APPROVED' as string,
  remark: '',
  ids: [] as number[],
  type: ''
});

const dialogTitle = computed(() => {
  if (approveForm.ids.length > 1) {
    return `批量${approveForm.action === 'APPROVED' ? '通过' : '驳回'}（${approveForm.ids.length}项）`;
  }
  return approveForm.action === 'APPROVED' ? '审批通过' : '审批驳回';
});

const approveRules = computed(() => ({
  action: [{ required: true, message: '请选择审批结果', trigger: 'change' }],
  remark: [{ required: true, message: '请输入审批意见', trigger: 'blur' }]
}));

const handleBatchApprove = (action: string) => {
  if (selection.value.length === 0) {
    ElMessage.warning('请选择审批项');
    return;
  }
  // 校验选中项均属于当前用户有审批权限的类型
  const denied = selection.value.find(r => !canApproveType(r.type));
  if (denied) {
    ElMessage.warning('选中项包含您无权限审批的类型，请仅选择有审批权限的项');
    return;
  }
  approveForm.action = action;
  approveForm.remark = '';
  approveForm.ids = selection.value.map(item => item.id);
  approveForm.type = selection.value[0].type;
  approveDialogVisible.value = true;
};

const handlePublish = async (row: any) => {
  const scope = `${row.deptName || row.deptId} · ${row.templateCode || ''} ${row.templateName || ''}`;
  try {
    await ElMessageBox.confirm(
      `确认对「${scope}」执行正式发布？发布后该范围数据将冻结为正式版本 V1.0，不可再编辑。`,
      '正式发布',
      { type: 'warning', confirmButtonText: '确认发布', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }
  try {
    const r: any = await publishRelease({
      planId: row.planId,
      deptId: row.deptId,
      templateCode: row.templateCode
    });
    const ver = (r as any)?.data ?? r?.msg ?? '';
    ElMessage.success(`正式发布成功：${ver || '已冻结'}`);
    handleQuery();
  } catch (error: any) {
    ElMessage.error(error?.msg || '正式发布失败，请确认该范围内数据均已通过终审');
  }
};

const dialogMode = ref<'view' | 'inquire' | 'review'>('view');

const detailDialogTitle = computed(() => {
  if (dialogMode.value === 'inquire') return '询问 - 预算明细';
  if (dialogMode.value === 'review') return '审核 - 预算明细';
  return currentDetail.value?.type === 'ADJUSTMENT' ? '调整明细' : '填报明细';
});

const handleInquire = (row: any) => {
  currentDetail.value = row;
  detailActiveTab.value = 'detail';
  detailDialogVisible.value = true;
  dialogMode.value = 'inquire';
  commentForm.itemCode = undefined;
  commentForm.commentType = 'SUGGESTION';
  commentForm.content = '';
  loadComments();
  loadTrace();
};

const handleReview = (row: any) => {
  approveForm.action = 'APPROVED';
  approveForm.remark = '';
  approveForm.ids = [row.id];
  approveForm.type = row.type;
  currentDetail.value = row;
  detailActiveTab.value = 'detail';
  detailDialogVisible.value = true;
  dialogMode.value = 'review';
  commentForm.itemCode = undefined;
  commentForm.commentType = 'SUGGESTION';
  commentForm.content = '';
  loadComments();
  loadTrace();
};

const handleSingleApprove = (row: any, action: string) => {
  approveForm.action = action;
  approveForm.remark = '';
  approveForm.ids = [row.id];
  approveForm.type = row.type;
  handleReview(row);
};

const confirmDetailApprove = async () => {
  if (!approveForm.remark) {
    ElMessage.warning('请输入审批意见');
    return;
  }
  const actionLabel = approveForm.action === 'APPROVED' ? '通过' : '驳回';
  await ElMessageBox.confirm(
    `确认${actionLabel}该审批？该操作不可撤销。`,
    '提示',
    { type: 'warning', confirmButtonText: '确认提交' }
  );
  try {
    await batchApprove({
      ids: approveForm.ids,
      type: approveForm.type,
      action: approveForm.action,
      remark: approveForm.remark
    });
    ElMessage.success(approveForm.action === 'APPROVED' ? '审批通过' : '已驳回');
    detailDialogVisible.value = false;
    dialogMode.value = 'view';
    handleQuery();
    loadStats();
  } catch (error) {
    console.error(error);
  }
};

const confirmBatchApprove = async () => {
  if (!approveRef.value) return;
  await approveRef.value.validate(async (valid) => {
    if (!valid) return;
    const actionLabel = approveForm.action === 'APPROVED' ? '通过' : '驳回';
    await ElMessageBox.confirm(
      `确认${actionLabel}选中的 ${approveForm.ids.length} 项审批？该操作不可撤销。`,
      '提示',
      { type: 'warning', confirmButtonText: '确认提交' }
    );
    try {
      await batchApprove({
        ids: approveForm.ids,
        type: approveForm.type,
        action: approveForm.action,
        remark: approveForm.remark
      });
      ElMessage.success(approveForm.action === 'APPROVED' ? '审批通过' : '已驳回');
      approveDialogVisible.value = false;
      handleQuery();
      loadStats();
    } catch (error) {
      console.error(error);
    }
  });
};

const loadStats = async () => {
  try {
    const res = await getApprovalStats({
      planId: queryParams.planId,
      type: queryParams.type || undefined,
      orgId: queryParams.orgId
    });
    stats.value = res.data || {};
  } catch (error) {
    console.error(error);
  }
  loadEfficiency();
};

const loadDepts = async () => {
  if (deptOptions.value.length) return;
  try {
    const res = await listDept();
    const list = res.data || res.rows || [];
    deptOptions.value = list.filter((d: any) => d.parentId && d.parentId > 0);
  } catch (error) {
    console.error(error);
  }
};

const loadPlans = async () => {
  try {
    const res = await listPlan();
    const list = res.rows || res.data || [];
    planOptions.value = list.filter((p: any) => p.status === 'PUBLISHED' || p.status === 'ARCHIVED');
  } catch (error) {
    console.error(error);
  }
};

const loadUsers = async (excludeApplicantId?: any) => {
  try {
    const { listCcCandidates } = await import('@/api/budget/approval');
    const res: any = await listCcCandidates(excludeApplicantId);
    const raw = res.data || res.rows || [];
    userOptions.value = raw.map((u: any) => ({
      userId: u.userId ?? u.user_id,
      userName: u.userName ?? u.user_name,
      nickName: u.nickName ?? u.nick_name,
      deptId: u.deptId ?? u.dept_id
    }));
  } catch (error) {
    console.error('加载审批人失败', error);
  }
};

onMounted(() => {
  loadPlans();
  handleQuery();
  loadStats();
  loadEfficiency();
  loadChainPending(false);
});
</script>

<style scoped>
.filter-card :deep(.el-card__body) { padding: 10px 16px; }
.filter-form { display: flex; flex-wrap: wrap; align-items: center; gap: 0; }
.filter-item { margin-bottom: 0 !important; }
.stat-card-box { display: flex; align-items: center; padding: 16px; }
.stat-card-box :deep(.el-card__body) { display: flex; align-items: center; width: 100%; }
.stat-icon { width: 56px; height: 56px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; }
.stat-info { flex: 1; }
.stat-label { font-size: 14px; color: #999; }
.stat-value { font-size: 28px; font-weight: bold; margin-top: 4px; }
.tab-badge { margin-left: 4px; }
.tab-badge :deep(.el-badge__content) { font-size: 12px; }

/* 审批效率统计条 */
.efficiency-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 20px; background: #f7f9fc; border: 1px solid #e4e7ed; border-radius: 6px; padding: 8px 14px; font-size: 13px; color: #606266; }
.eb-label { font-weight: 600; color: #409eff; margin-right: 2px; }
.eb-item b { color: #303133; margin: 0 2px; }
.eb-item .eb-warn { color: #f56c6c; }

/* 明细弹窗 */
.detail-scroll { max-height: 65vh; overflow-y: auto; padding-right: 8px; }

/* 单元格批注面板 */
.comment-panel { max-height: 200px; overflow-y: auto; }
.comment-item { border: 1px solid #ebeef5; border-left: 3px solid #409eff; border-radius: 4px; padding: 8px 12px; margin-bottom: 10px; background: #fafbfc; }
.cm-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cm-name { font-weight: 600; color: #303133; }
.cm-time { font-size: 12px; color: #909399; }
.cm-status { margin-left: auto; }
.cm-content { margin-top: 6px; color: #303133; line-height: 1.6; font-size: 13px; }
.cm-reply { margin-top: 6px; padding: 6px 10px; background: #ecf5ff; border-radius: 4px; font-size: 13px; color: #303133; }
.cm-reply-label { color: #409eff; font-weight: 600; }
.cm-form { display: flex; flex-wrap: wrap; gap: 0; }
.cm-form .el-form-item { margin-bottom: 8px; }
.cm-hint { display: flex; align-items: center; gap: 6px; color: #e6a23c; font-size: 13px; margin-bottom: 10px; padding: 6px 10px; background: #fdf6ec; border-radius: 4px; }
.cm-readonly-hint { display: flex; align-items: center; gap: 6px; color: #909399; font-size: 12px; margin-top: 8px; padding: 6px 10px; background: #f4f4f5; border-radius: 4px; }

/* 审批轨迹 */
.tl-content { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tl-icon { margin-right: 2px; }
.tl-label { font-size: 14px; color: #303133; }
.tl-operator { font-size: 13px; color: #606266; }
.tl-remark { margin-top: 6px; padding: 6px 10px; background: #f7f9fc; border-radius: 4px; font-size: 13px; color: #606266; line-height: 1.5; }
.trace-toolbar { margin-bottom: 8px; }

/* 多级审批链 */
.chain-hint { font-size: 12px; color: #909399; margin-bottom: 10px; line-height: 1.6; }
.chain-nodes { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 2px; }
.chain-node { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
.cn-dot { width: 9px; height: 9px; border-radius: 50%; background: #c0c4cc; display: inline-block; flex-shrink: 0; }
.cn-dot.cn-done { background: #67c23a; }
.cn-dot.cn-reject { background: #f56c6c; }
.cn-dot.cn-pending { background: #e6a23c; box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2); }
.cn-name { font-size: 12px; color: #606266; }
.cn-name.cn-active { color: #e6a23c; font-weight: 700; }
.cn-arrow { color: #c0c4cc; margin: 0 2px; font-size: 12px; }

/* 审批操作区 */
.approval-action-area { background: #f7f9fc; border: 1px solid #e4e7ed; border-radius: 6px; padding: 16px; }
.approval-action-area .el-form-item { margin-bottom: 12px; }
.approval-action-area .el-button { min-width: 80px; }

/* ===== 审批意见弹窗 - 按轮次分组样式 ===== */
.comment-round-card {
  background: #fff;
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #e8ecf1;
}

.round-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.round-header.round-approved {
  background: linear-gradient(135deg, #f0f9eb 0%, #e8f5e0 100%);
  border-bottom: 1px solid #c2e7b0;
}

.round-header.round-rejected {
  background: linear-gradient(135deg, #fef0f0 0%, #fde8e8 100%);
  border-bottom: 1px solid #f5c1c1;
}

.round-header.round-pending {
  background: linear-gradient(135deg, #fdf6ec 0%, #fcf0e0 100%);
  border-bottom: 1px solid #f5dab1;
}

.round-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.round-badge {
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}

.round-status-tag {
  font-weight: 600;
}

.round-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.round-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.round-approver {
  font-weight: 500;
  color: #606266;
}

.round-comments {
  padding: 12px 16px;
}

.comment-card {
  background: #fafbfc;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  border: 1px solid #eef0f3;
  transition: all 0.2s;
}

.comment-card:last-child {
  margin-bottom: 0;
}

.comment-card:hover {
  border-color: #d9e2ec;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.comment-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-type-tag {
  font-weight: 600;
}

.comment-subject-tag {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-time {
  font-size: 12px;
  color: #a0a4ab;
  flex-shrink: 0;
}

.comment-card-body .comment-msg {
  font-size: 13px;
  color: #303133;
  line-height: 1.6;
  padding: 4px 0;
}

.comment-reply-box {
  margin-top: 10px;
  padding: 10px 12px;
  background: #f0f7ff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.reply-label {
  font-size: 12px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 4px;
}

.reply-content {
  font-size: 13px;
  color: #303133;
  line-height: 1.5;
}

.reply-meta {
  font-size: 11px;
  color: #909399;
  margin-top: 6px;
}
</style>
