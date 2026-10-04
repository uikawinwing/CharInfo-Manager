<template>
  <IllustratedDefaultSheet
    v-bind="$props"
    @toggle-attribute-formula="emit('toggleAttributeFormula', $event)"
    @toggle-import-menu="emit('toggleImportMenu')"
    @import-mvu="emit('importMvu')"
    @import-worldbook="emit('importWorldbook')"
    @fallback-to-default="emit('fallbackToDefault')"
  />
</template>

<script setup lang="ts">
/**
 * 兼容入口：保留旧路径 `illustrated/IllustratedCharacterSheet.vue`。
 *
 * 真正的默认立绘角色卡 renderer 现在是 `default/IllustratedDefaultSheet.vue`。
 * 本文件只做转发，不持有任何样式、状态或行为，等 DX seam 完成后再决定是否删除。
 * 组件名不再用内部路由名 `special_npc` 命名——它是「默认稳定 renderer」，
 * 不是「special_npc 版式」。
 */
import type { CharacterViewModel } from '../../services/characterViewModel';
import type { AttributeView } from './types';
import IllustratedDefaultSheet from './default/IllustratedDefaultSheet.vue';

defineProps<{
  vm: CharacterViewModel;
  attributes: AttributeView[];
  importing: boolean;
  importButtonText: string;
  showImportMenu: boolean;
  readOnly: boolean;
  debugEnabled: boolean;
  forceMobileLayout: boolean;
  specialNpc: boolean;
}>();

const emit = defineEmits<{
  toggleAttributeFormula: [key: string];
  toggleImportMenu: [];
  importMvu: [];
  importWorldbook: [];
  fallbackToDefault: [];
}>();
</script>
