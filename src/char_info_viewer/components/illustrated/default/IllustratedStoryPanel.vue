<template>
  <article class="illustrated-story-block">
    <p>{{ text || '暂无故事' }}</p>
  </article>
</template>

<script setup lang="ts">
/**
 * 默认立绘的兜底故事块，只负责「怎么画」。
 *
 * 它不解析 VM / YAML / Worldbook，只接收已经取好的纯文本：
 * 背景故事的来源与「有没有自定义故事章节」的判定归 core controller，
 * 展示层不做第二次数据解析。
 *
 * 保留的 `h3` 样式目前没有对应标题节点——拆分前模板里就没有标题，
 * 样式属于历史残留。本模块原样搬运，不借机改动视觉。
 */
const props = defineProps<{
  text: string;
}>();
</script>

<style scoped lang="scss">
.illustrated-story-block {
  padding: 28px 36px;
  /* 原为 `1px solid rgba(255, 255, 255, 0.05)`，与 --illustrated-border-faint 同值。 */
  border: 1px solid var(--illustrated-border-faint);
  background: var(--illustrated-story-block-background);
  box-shadow: var(--illustrated-story-block-shadow);
}

.illustrated-story-block h3 {
  margin: 0 0 16px;
  color: var(--illustrated-tier-accent);
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: calc(22px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
  text-align: center;
  text-shadow: 0 0 12px rgba(var(--illustrated-tier-accent-rgb), 0.26);
}

.illustrated-story-block p {
  margin: 0;
  /* 原为硬编码 #e2e8f0，与 --illustrated-fg-soft 同值。 */
  color: var(--illustrated-fg-soft);
  line-height: 1.8;
  white-space: pre-line;
}
</style>
