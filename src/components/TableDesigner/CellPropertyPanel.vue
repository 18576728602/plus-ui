<template>
  <div class="cell-prop-panel" :class="{ 'is-readonly': readonly }">
    <div class="cpp-header">
      <span>单元格配置</span>
      <el-tag v-if="position" size="small" type="info"> R{{ position.row + 1 }}C{{ position.col + 1 }} </el-tag>
    </div>

    <div v-if="!position" class="cpp-empty">请在画布中选中一个单元格</div>

    <template v-else>
      <el-form label-position="top" size="small" class="cpp-form" :disabled="readonly">
        <!-- 值域类型（Univer 工具栏无法提供：业务级下拉/日期/动态数据源） -->
        <el-form-item label="值域类型">
          <el-select v-model="local.valueDomainType" @change="onValueDomainChange">
            <el-option label="无（普通输入）" value="none" />
            <el-option label="固定下拉" value="fixedSelect" />
            <el-option label="动态数据源下拉" value="dynamicSelect" />
            <el-option label="日期选择" value="date" />
          </el-select>
        </el-form-item>

        <!-- 固定下拉选项 -->
        <el-form-item v-if="local.valueDomainType === 'fixedSelect'" label="下拉选项">
          <el-select
            v-model="local.options"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入后回车添加"
            style="width: 100%"
            @change="commit"
          >
            <el-option v-for="opt in local.options || []" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <div class="cpp-tip">输入选项值后按回车添加，支持删除</div>
        </el-form-item>

        <!-- 动态数据源 -->
        <el-form-item v-if="local.valueDomainType === 'dynamicSelect'" label="数据源">
          <el-select
            v-model="local.dataSourceId"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入数据源标识"
            style="width: 100%"
            @change="commit"
          >
            <el-option v-for="ds in availableDataSources" :key="ds" :label="dataSourceLabelMap[ds] || ds" :value="ds" />
          </el-select>
          <div class="cpp-tip">标识由业务层注入，组件不内置数据源</div>
        </el-form-item>

        <el-divider content-position="left">填报控制</el-divider>

        <!-- 读写权限（Univer 工具栏无法提供：填报态单元格锁定） -->
        <el-form-item label="读写权限">
          <el-switch v-model="local.readOnly" active-text="只读" inactive-text="可编辑" @change="commit" />
        </el-form-item>

        <!-- 校验规则（Univer 工具栏无法提供：业务必填校验） -->
        <el-form-item label="校验规则">
          <el-switch v-model="local.required" active-text="必填" @change="commit" />
        </el-form-item>
      </el-form>

      <div class="cpp-actions">
        <el-button size="small" :disabled="readonly" @click="clearMeta">清除配置</el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { DEFAULT_CELL_META, type CellMeta } from './types';

const props = withDefaults(
  defineProps<{
    meta: CellMeta | null;
    position: { row: number; col: number } | null;
    /** 业务层注入的可用数据源标识列表 */
    availableDataSources?: string[];
    /** 只读模式：面板全部置灰，不允许编辑 */
    readonly?: boolean;
  }>(),
  {
    availableDataSources: () => [],
    readonly: false
  }
);

const emit = defineEmits<{
  (e: 'update:meta', meta: CellMeta): void;
  (e: 'clear'): void;
}>();

const local = reactive<CellMeta>({ ...DEFAULT_CELL_META });

// 监听外部 meta 变化，同步到本地表单（切换单元格时完全重置，避免残留上一个单元格的配置）
watch(
  () => props.meta,
  (val) => {
    // 先清空所有字段再赋默认值，确保切换到无配置单元格时彻底重置
    Object.keys(local).forEach((k) => delete (local as any)[k]);
    Object.assign(local, DEFAULT_CELL_META, val ?? {});
  },
  { immediate: true }
);

const dataSourceLabelMap: Record<string, string> = {
  budget_subject: '科目明细'
};

const availableDataSources = computed(() => props.availableDataSources ?? []);

const commit = () => {
  emit('update:meta', { ...local });
};

const onValueDomainChange = () => {
  // 切换值域类型时清理不相关字段
  if (local.valueDomainType !== 'fixedSelect') local.options = undefined;
  if (local.valueDomainType !== 'dynamicSelect') local.dataSourceId = undefined;
  commit();
};

const clearMeta = () => {
  Object.assign(local, DEFAULT_CELL_META);
  emit('clear');
};
</script>

<style scoped>
.cell-prop-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}
.cell-prop-panel.is-readonly {
  opacity: 0.7;
}
.cpp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
  font-size: 14px;
}
.cpp-form {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.cpp-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 13px;
}
.cpp-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}
.cpp-actions {
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
}
</style>
