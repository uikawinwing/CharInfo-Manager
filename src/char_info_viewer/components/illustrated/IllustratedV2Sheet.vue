<template>
  <IllustratedCharacterSheet v-bind="$attrs" />
</template>

<script setup lang="ts">
import IllustratedCharacterSheet from './IllustratedCharacterSheet.vue';

defineOptions({
  inheritAttrs: false,
});
</script>
