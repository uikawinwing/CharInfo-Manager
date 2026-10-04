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
import type { ViewerSavePhase } from '../../../char_info_shared/viewerSaveUi';
import type { AttributeView, IllustratedRendererOverrides } from './types';
import IllustratedDefaultSheet from './default/IllustratedDefaultSheet.vue';

defineProps<{
  vm: CharacterViewModel;
  attributes: AttributeView[];
  savePhase: ViewerSavePhase;
  showImportMenu: boolean;
  readOnly: boolean;
  debugEnabled: boolean;
  forceMobileLayout: boolean;
  specialNpc: boolean;
  /**
   * DX module override 入口。
   *
   * 必须在这里**显式声明**，不能依赖单根 component 的 `$attrs` fallthrough：
   * 历史 DX 正是通过本 wrapper 进入渲染器，seam 建在隐式行为上等于没有 seam。
   * 仍然只用现有的 `v-bind="$props"` 转发，不引入额外 adapter。
   */
  overrides?: IllustratedRendererOverrides;
}>();

const emit = defineEmits<{
  toggleAttributeFormula: [key: string];
  toggleImportMenu: [];
  importMvu: [];
  importWorldbook: [];
  fallbackToDefault: [];
}>();
</script>
