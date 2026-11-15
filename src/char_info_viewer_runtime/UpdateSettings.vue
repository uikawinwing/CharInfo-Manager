<template>
  <div class="char-info-settings-rows">
    <label class="char-info-settings-switch">
      <span>
        <strong>自动更新</strong>
        <small>每 24 小时检查正式版更新，下次启动时生效。</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        :checked="autoUpdateEnabled"
        @change="emit('update:autoUpdateEnabled', ($event.target as HTMLInputElement).checked)"
      />
    </label>
  </div>

  <section class="char-info-settings-rows update-version-panel" aria-label="角色管理库版本">
    <dl class="update-version-list">
      <div>
        <dt>当前运行版本</dt>
        <dd>{{ state.currentVersion ?? '开发版' }}</dd>
      </div>
      <div>
        <dt>最新正式版</dt>
        <dd>{{ state.latestVersion ?? '尚未检查到' }}</dd>
      </div>
      <div>
        <dt>上次成功检查</dt>
        <dd>{{ lastCheckedLabel }}</dd>
      </div>
    </dl>
    <div class="update-check-area">
      <button
        class="update-check-button"
        type="button"
        :disabled="state.checking"
        :aria-busy="state.checking"
        aria-describedby="char-info-update-result"
        @click="emit('check')"
      >
        {{ state.checking ? '正在检查…' : '检查更新' }}
      </button>
      <p
        id="char-info-update-result"
        class="update-result"
        :class="{ error: state.error }"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ resultLabel }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { compareVersions, isStableVersion, type UpdateView } from './selfUpdate';

const props = defineProps<{
  state: UpdateView;
  autoUpdateEnabled: boolean;
}>();

const emit = defineEmits<{
  'update:autoUpdateEnabled': [enabled: boolean];
  check: [];
}>();

const lastCheckedLabel = computed(() =>
  props.state.lastCheckedAt === null ? '尚未检查' : new Date(props.state.lastCheckedAt).toLocaleString('zh-CN'),
);

const resultLabel = computed(() => {
  const { checking, error, currentVersion, latestVersion, lastCheckedAt } = props.state;
  if (checking) return '正在检查最新正式版…';
  if (error) return error;
  if (lastCheckedAt === null) return '可手动检查，无需等到每日自动检查；受限时请稍后重试。';
  if (!latestVersion) return '没有查询到可用的正式版本。';
  if (!isStableVersion(currentVersion)) return '已完成检查。开发版不会自动切换到正式版。';
  if (compareVersions(latestVersion, currentVersion) > 0) {
    return props.autoUpdateEnabled ? '发现新版本，将在下次启动时尝试更新。' : '发现新版本，自动更新已关闭。';
  }
  return '已完成检查，目前没有更新的正式版。';
});
</script>

<style scoped>
.update-version-panel {
  min-width: 0;
}

.update-version-list {
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 18px 14px;
}

.update-version-list > div {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(0, 1fr);
  align-items: baseline;
  gap: 12px;
}

.update-version-list dt {
  color: var(--ci-text-muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

.update-version-list dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--ci-text);
  font-size: 0.9rem;
  line-height: 1.5;
}

.update-check-area {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 16px 14px;
  border-top: 1px solid var(--ci-border);
}

.update-check-button {
  min-width: 124px;
  min-height: 44px;
}

.update-check-button:not(:disabled):hover {
  border-color: var(--ci-primary);
  background: var(--ci-primary-soft);
}

.update-check-button:not(:disabled):active {
  background: var(--ci-surface-soft);
}

.update-check-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.update-check-button:focus-visible {
  outline: 2px solid var(--ci-primary);
  outline-offset: 3px;
}

.update-result {
  min-height: 3em;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--ci-text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
}

.update-result.error {
  color: var(--ci-danger);
}

@media (max-width: 480px) {
  .update-version-list > div {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}
</style>
