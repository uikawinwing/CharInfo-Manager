<template>
  <section class="illustrated-default-divinity">
    <header class="default-divinity-hero">
      <span class="default-divinity-kicker">Divinity Path</span>
      <h3>{{ vm.divinityGodTitle || '登神长阶' }}</h3>
      <p v-if="vm.divinityKingdom">{{ vm.divinityKingdom.name }}</p>
    </header>

    <div class="default-divinity-list">
      <article
        v-for="(section, index) in sections"
        :key="`${section.kind}-${section.title}-${index}`"
        class="default-divinity-card"
      >
        <div class="default-divinity-card-head">
          <span>{{ section.kind }}</span>
          <small>{{ section.typeLabel }}</small>
        </div>
        <strong>{{ section.title }}</strong>
        <div v-if="section.details?.length" class="default-divinity-card-details">
          <p v-for="detail in section.details" :key="detail.label">
            <span class="default-divinity-card-detail-label">{{ detail.label }}</span>
            <span>{{ detail.body }}</span>
          </p>
        </div>
        <p v-else>{{ section.body || '无' }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { CharacterViewModel } from '../../services/characterViewModel';
import { buildDivinitySections } from './divinitySections';

const props = defineProps<{ vm: CharacterViewModel }>();
const sections = computed(() => buildDivinitySections(props.vm));
</script>

<style scoped>
.illustrated-default-divinity {
  display: grid;
  flex: 1 1 auto;
  align-content: start;
  gap: 18px;
  width: min(100%, 560px);
  min-height: 0;
  margin: 0 auto;
  padding-bottom: 18px;
  overflow-y: auto;
  overscroll-behavior: contain;
  color: rgba(255, 252, 242, 0.94);
  scrollbar-color: rgba(var(--illustrated-tier-accent-rgb), 0.34) transparent;
  scrollbar-width: thin;
}

.default-divinity-hero {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 26px 22px;
  border-top: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.62);
  border-bottom: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.32);
  background:
    radial-gradient(ellipse at 50% 0, rgba(var(--illustrated-tier-accent-rgb), 0.18), transparent 62%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(0, 0, 0, 0.12));
  text-align: center;
}

.default-divinity-kicker {
  color: rgba(var(--illustrated-tier-accent-rgb), 0.86);
  font-family: Cinzel, Georgia, serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.default-divinity-hero h3 {
  margin: 0;
  color: #fffdf5;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: clamp(26px, 4vw, 34px);
  letter-spacing: 0.08em;
  text-shadow: 0 3px 14px rgba(0, 0, 0, 0.55);
}

.default-divinity-hero p {
  margin: 0;
  color: rgba(255, 252, 242, 0.72);
  font-size: 13px;
}

.default-divinity-list {
  display: grid;
  gap: 14px;
}

.default-divinity-card {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.2);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.01)), rgba(5, 15, 32, 0.44);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.default-divinity-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(var(--illustrated-tier-accent-rgb), 0.92);
  font-weight: 800;
}

.default-divinity-card-head small {
  color: rgba(216, 228, 236, 0.58);
  font-family: Cinzel, Georgia, serif;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.default-divinity-card strong {
  color: #fffdf5;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 18px;
  letter-spacing: 0.04em;
}

.default-divinity-card p {
  margin: 0;
  color: rgba(255, 252, 242, 0.88);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.72;
  white-space: pre-line;
}

.default-divinity-card-details {
  display: grid;
  gap: 12px;
}

.default-divinity-card-details p {
  display: grid;
  gap: 4px;
}

.default-divinity-card-detail-label {
  color: rgba(var(--illustrated-tier-accent-rgb), 0.92);
  font-size: 12px;
  font-weight: 800;
}
</style>
