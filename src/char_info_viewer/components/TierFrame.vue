<template>
  <div class="frame-layer" :class="[`frame-tier-${frameTier}`, { show: showFrame }]" aria-hidden="true">
    <!-- 塔罗边框横轴：双层塔罗精细线与中段星符刻度 -->
    <svg class="frame-svg frame-rail frame-rail-top" viewBox="0 0 400 24" preserveAspectRatio="none">
      <path d="M0 6 H400" class="tarot-line-outer" stroke-width="1.3" />
      <path d="M0 13 H400" class="tarot-line-inner" stroke-width="0.7" opacity="0.6" />
      <!-- 刻度线 -->
      <path v-if="frameTier === 5" d="M100 6 V13 M300 6 V13 M70 6 V10 M330 6 V10" stroke-width="0.8" opacity="0.75" />
      <path v-else-if="frameTier === 6" d="M80 6 V13 M320 6 V13 M120 10 H130 M270 10 H280" stroke-width="0.9" opacity="0.8" />
      <path v-else d="M90 6 V13 M310 6 V13 M50 6 V10 M350 6 V10 M120 6 V13 M280 6 V13" stroke-width="0.8" opacity="0.85" />
    </svg>

    <svg class="frame-svg frame-rail frame-rail-bottom" viewBox="0 0 400 24" preserveAspectRatio="none">
      <path d="M0 6 H400" class="tarot-line-outer" stroke-width="1.3" />
      <path d="M0 13 H400" class="tarot-line-inner" stroke-width="0.7" opacity="0.6" />
      <path v-if="frameTier === 5" d="M100 6 V13 M300 6 V13 M70 6 V10 M330 6 V10" stroke-width="0.8" opacity="0.75" />
      <path v-else-if="frameTier === 6" d="M80 6 V13 M320 6 V13 M120 10 H130 M270 10 H280" stroke-width="0.9" opacity="0.8" />
      <path v-else d="M90 6 V13 M310 6 V13 M50 6 V10 M350 6 V10 M120 6 V13 M280 6 V13" stroke-width="0.8" opacity="0.85" />
    </svg>

    <!-- 塔罗边框纵轴：双细线与微型几何槽 -->
    <svg class="frame-svg frame-rail frame-rail-left" viewBox="0 0 24 400" preserveAspectRatio="none">
      <path d="M6 0 V400" class="tarot-line-outer" stroke-width="1.3" />
      <path d="M13 0 V400" class="tarot-line-inner" stroke-width="0.7" opacity="0.6" />
      <path v-if="frameTier === 5" d="M6 100 H13 M6 300 H13" stroke-width="0.8" opacity="0.75" />
      <path v-else-if="frameTier === 6" d="M6 80 H13 M6 320 H13" stroke-width="0.9" opacity="0.8" />
      <path v-else d="M6 90 H13 M6 310 H13 M6 50 H10 M6 350 H10" stroke-width="0.8" opacity="0.85" />
    </svg>

    <svg class="frame-svg frame-rail frame-rail-right" viewBox="0 0 24 400" preserveAspectRatio="none">
      <path d="M6 0 V400" class="tarot-line-outer" stroke-width="1.3" />
      <path d="M13 0 V400" class="tarot-line-inner" stroke-width="0.7" opacity="0.6" />
      <path v-if="frameTier === 5" d="M6 100 H13 M6 300 H13" stroke-width="0.8" opacity="0.75" />
      <path v-else-if="frameTier === 6" d="M6 80 H13 M6 320 H13" stroke-width="0.9" opacity="0.8" />
      <path v-else d="M6 90 H13 M6 310 H13 M6 50 H10 M6 350 H10" stroke-width="0.8" opacity="0.85" />
    </svg>

    <!-- 塔罗卡片两侧神秘学竖排注记 (Tarot Side Script) -->
    <div class="tarot-side-script left" aria-hidden="true">
      <span v-if="frameTier === 5">HEX·LATTICE // SOLAR·SIGIL // TIER·5</span>
      <span v-else-if="frameTier === 6">METATRON·CUBE // OCCULT·HEXAGRAM // TIER·6</span>
      <span v-else>ASTRAL·MANDALA // CELESTIAL·TRUTH // TIER·7</span>
    </div>
    <div class="tarot-side-script right" aria-hidden="true">
      <span v-if="frameTier === 5">AIRP TAROT SIGIL LAB // KNIGHT</span>
      <span v-else-if="frameTier === 6">SACRED GEOMETRY // EXECUTIONER</span>
      <span v-else>SACRED GEOMETRY // ASCENDED DEITY</span>
    </div>

    <!-- 四角神圣几何塔罗角标 (Tarot Sacred Geometry Corner Motifs) -->
    <template v-for="pos in ['tl', 'tr', 'bl', 'br']" :key="pos">
      <svg class="frame-svg frame-corner" :class="`frame-corner-${pos}`" viewBox="0 0 80 80">
        <!-- 外层内折直角框线 (Tarot Notched Corner) -->
        <path d="M6 80 V22 L22 6 H80" stroke-width="1.3" />
        <path d="M13 80 V26 L26 13 H80" stroke-width="0.7" opacity="0.6" />

        <!-- T5: 六角神圣晶格与三位一体圆环 (Hex-Lattice & Trinity Rings) -->
        <g v-if="frameTier === 5">
          <!-- 塔罗六角晶格符印 -->
          <polygon points="34,14 50,23 50,41 34,50 18,41 18,23" stroke-width="1.2" />
          <polygon points="34,19 45,25 45,39 34,45 23,39 23,25" stroke-width="0.7" opacity="0.6" />
          <line x1="34" y1="14" x2="34" y2="50" stroke-width="0.7" opacity="0.6" />
          <line x1="18" y1="23" x2="50" y2="41" stroke-width="0.7" opacity="0.6" />
          <line x1="50" y1="23" x2="18" y2="41" stroke-width="0.7" opacity="0.6" />
          <!-- 核心与顶点发光节点 -->
          <circle cx="34" cy="32" r="2.2" class="frame-solid" />
          <circle cx="34" cy="32" r="5" stroke-width="0.7" opacity="0.7" />
          <circle cx="34" cy="14" r="1.3" class="frame-solid" />
          <circle cx="34" cy="50" r="1.3" class="frame-solid" />
          <circle cx="18" cy="23" r="1.3" class="frame-solid" />
          <circle cx="50" cy="41" r="1.3" class="frame-solid" />
          <!-- 角落斜向光轴 -->
          <line x1="6" y1="6" x2="22" y2="22" stroke-width="0.9" opacity="0.8" />
          <circle cx="14" cy="14" r="1.8" class="frame-solid" />
        </g>

        <!-- T6: 梅塔特隆三维投影立方与六芒深渊印 (Metatron Cube & Occult Star) -->
        <g v-else-if="frameTier === 6">
          <!-- 梅塔特隆立方六边形外框 -->
          <polygon points="36,12 52,21 52,43 36,52 20,43 20,21" stroke-width="1.3" />
          <!-- 立方体三轴交叉线与内切菱形 -->
          <polyline points="36,12 36,32 52,21" stroke-width="0.8" opacity="0.85" />
          <polyline points="36,32 20,21" stroke-width="0.8" opacity="0.85" />
          <polyline points="36,32 36,52" stroke-width="0.8" opacity="0.85" />
          <!-- 内切六角星芒 -->
          <polygon points="36,17 48,39 24,39" stroke-width="0.7" opacity="0.6" />
          <polygon points="36,47 24,25 48,25" stroke-width="0.7" opacity="0.6" />
          <!-- 节点血晶 -->
          <circle cx="36" cy="32" r="2.4" class="frame-solid" />
          <circle cx="36" cy="12" r="1.5" class="frame-solid" />
          <circle cx="52" cy="21" r="1.5" class="frame-solid" />
          <circle cx="52" cy="43" r="1.5" class="frame-solid" />
          <circle cx="36" cy="52" r="1.5" class="frame-solid" />
          <circle cx="20" cy="43" r="1.5" class="frame-solid" />
          <circle cx="20" cy="21" r="1.5" class="frame-solid" />
          <!-- 倒角破魔刺 -->
          <line x1="8" y1="8" x2="24" y2="24" stroke-width="1.2" />
          <polygon points="12,12 18,9 15,15 9,18" class="frame-solid" />
        </g>

        <!-- T7: 八芒星仪神圣天穹与天象刻度环 (Octagram & Astrolabe Quadrant) -->
        <g v-else>
          <!-- 同心象限刻度弧 -->
          <circle cx="6" cy="6" r="38" stroke-width="1.1" fill="none" />
          <circle cx="6" cy="6" r="32" stroke-width="0.6" stroke-dasharray="2 3" opacity="0.7" fill="none" />
          <circle cx="6" cy="6" r="22" stroke-width="0.8" opacity="0.75" fill="none" />
          <!-- 八芒星宿印 -->
          <g transform="translate(36, 36)">
            <polygon points="0,-18 5,-5 18,0 5,5 0,18 -5,5 -18,0 -5,-5" stroke-width="1.2" />
            <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" stroke-width="0.6" transform="rotate(45)" opacity="0.65" />
            <circle cx="0" cy="0" r="2.2" class="frame-solid" />
            <circle cx="0" cy="0" r="5" stroke-width="0.7" opacity="0.7" />
          </g>
          <!-- 刻度射线 -->
          <line x1="32" y1="6" x2="36" y2="6" stroke-width="1" />
          <line x1="6" y1="32" x2="6" y2="36" stroke-width="1" />
          <line x1="26" y1="18" x2="29" y2="21" stroke-width="1" />
          <circle cx="16" cy="16" r="1.8" class="frame-solid" />
        </g>
      </svg>
    </template>

    <!-- 顶部中央徽饰：塔罗神圣几何主符印 (Central Tarot Sigil Mandala) -->
    <svg class="frame-svg frame-crest frame-crest-top" viewBox="0 0 160 80">
      <!-- T5: 太阳六角神圣符印与经纬双环 (Solar Hexagonal Sigil Mandala) -->
      <g v-if="frameTier === 5">
        <!-- 左右横向引力星轨 -->
        <line x1="8" y1="40" x2="48" y2="40" stroke-width="1.1" opacity="0.7" />
        <line x1="112" y1="40" x2="152" y2="40" stroke-width="1.1" opacity="0.7" />
        <circle cx="28" cy="40" r="2.2" class="frame-solid" />
        <circle cx="28" cy="40" r="6" stroke-width="0.7" opacity="0.6" />
        <circle cx="132" cy="40" r="2.2" class="frame-solid" />
        <circle cx="132" cy="40" r="6" stroke-width="0.7" opacity="0.6" />
        <!-- 中央双层六边形框架 (Hexagon Frame) -->
        <polygon points="80,8 108,24 108,56 80,72 52,56 52,24" stroke-width="1.4" />
        <polygon points="80,16 101,28 101,52 80,64 59,52 59,28" stroke-width="0.7" opacity="0.6" />
        <!-- 六芒正反双三角形 (Solomon Star Interlock) -->
        <polygon points="80,12 104,54 56,54" stroke-width="0.8" opacity="0.85" />
        <polygon points="80,68 56,26 104,26" stroke-width="0.8" opacity="0.85" />
        <!-- 同心内圆与太阳节点 (Solar Circle & Nodes) -->
        <circle cx="80" cy="40" r="20" stroke-width="0.8" opacity="0.6" />
        <circle cx="80" cy="40" r="8" stroke-width="1" opacity="0.8" />
        <circle cx="80" cy="40" r="3.2" class="frame-solid" />
        <!-- 六向主节点 -->
        <circle cx="80" cy="8" r="1.8" class="frame-solid" />
        <circle cx="108" cy="24" r="1.8" class="frame-solid" />
        <circle cx="108" cy="56" r="1.8" class="frame-solid" />
        <circle cx="80" cy="72" r="1.8" class="frame-solid" />
        <circle cx="52" cy="56" r="1.8" class="frame-solid" />
        <circle cx="52" cy="24" r="1.8" class="frame-solid" />
      </g>

      <!-- T6: 深渊六芒星环与梅塔特隆立方阵 (Metatron Cube & Six-Star Occult Sigil) -->
      <g v-else-if="frameTier === 6">
        <!-- 左右锋锐光刃弦 -->
        <line x1="6" y1="40" x2="44" y2="40" stroke-width="1.2" opacity="0.75" />
        <line x1="116" y1="40" x2="154" y2="40" stroke-width="1.2" opacity="0.75" />
        <polygon points="26,36 34,40 26,44 18,40" class="frame-solid" opacity="0.8" />
        <polygon points="134,36 142,40 134,44 126,40" class="frame-solid" opacity="0.8" />
        <!-- 六芒破魔星主阵 (Six-pointed Star Outer) -->
        <polygon points="80,4 88,26 112,26 92,40 100,62 80,48 60,62 68,40 48,26 72,26" stroke-width="1.4" />
        <!-- 同心圆形与内嵌梅塔特隆立方 (Concentric Ring & Cube Lattice) -->
        <circle cx="80" cy="40" r="24" stroke-width="0.8" opacity="0.7" />
        <circle cx="80" cy="40" r="16" stroke-width="0.6" stroke-dasharray="3 3" opacity="0.6" />
        <polygon points="80,24 94,32 94,48 80,56 66,48 66,32" stroke-width="1" />
        <polyline points="80,24 80,40 94,32" stroke-width="0.8" opacity="0.8" />
        <polyline points="80,40 66,32" stroke-width="0.8" opacity="0.8" />
        <polyline points="80,40 80,56" stroke-width="0.8" opacity="0.8" />
        <!-- 核心真眼血核 -->
        <circle cx="80" cy="40" r="3.5" class="frame-solid" />
        <!-- 星芒尖端发光球 -->
        <circle cx="80" cy="4" r="1.8" class="frame-solid" />
        <circle cx="112" cy="26" r="1.8" class="frame-solid" />
        <circle cx="100" cy="62" r="1.8" class="frame-solid" />
        <circle cx="60" cy="62" r="1.8" class="frame-solid" />
        <circle cx="48" cy="26" r="1.8" class="frame-solid" />
      </g>

      <!-- T7: 创世八芒极星天体星盘真理法阵 (Grand Octagram Celestial Astrolabe Mandala) -->
      <g v-else>
        <!-- 左右天体黄道带切线 -->
        <path d="M6 40 H42 M118 40 H154" stroke-width="1.2" opacity="0.8" />
        <circle cx="24" cy="40" r="3" class="frame-solid" />
        <circle cx="24" cy="40" r="7" stroke-width="0.7" opacity="0.6" />
        <circle cx="136" cy="40" r="3" class="frame-solid" />
        <circle cx="136" cy="40" r="7" stroke-width="0.7" opacity="0.6" />
        <!-- 外层同心刻度星盘 (Outer Astrolabe Circle with Ticks) -->
        <circle cx="80" cy="40" r="36" stroke-width="1.4" />
        <circle cx="80" cy="40" r="32" stroke-width="0.7" stroke-dasharray="2 4" opacity="0.8" />
        <circle cx="80" cy="40" r="22" stroke-width="1" opacity="0.75" />
        <!-- 八角天冠神圣星印 (Octagonal Sacred Star) -->
        <polygon points="80,6 84,28 104,24 88,36 114,40 88,44 104,56 84,52 80,74 76,52 56,56 72,44 46,40 72,36 56,24 76,28" stroke-width="1.2" />
        <!-- 内核旋转十字与神格天心 -->
        <circle cx="80" cy="40" r="12" stroke-width="0.7" stroke-dasharray="1 3" opacity="0.6" />
        <circle cx="80" cy="40" r="4.2" class="frame-solid" />
        <!-- 八方经纬指针 -->
        <line x1="80" y1="4" x2="80" y2="76" stroke-width="0.8" opacity="0.8" />
        <line x1="44" y1="40" x2="116" y2="40" stroke-width="0.8" opacity="0.8" />
      </g>
    </svg>

    <!-- 底部中央徽饰：与顶部呼应的底部神秘学星符锚点 -->
    <svg class="frame-svg frame-crest frame-crest-bottom" viewBox="0 0 160 80">
      <g v-if="frameTier === 5">
        <line x1="18" y1="40" x2="52" y2="40" stroke-width="1.1" opacity="0.7" />
        <line x1="108" y1="40" x2="142" y2="40" stroke-width="1.1" opacity="0.7" />
        <polygon points="80,12 104,26 104,54 80,68 56,54 56,26" stroke-width="1.3" />
        <circle cx="80" cy="40" r="14" stroke-width="0.8" opacity="0.7" />
        <circle cx="80" cy="40" r="3" class="frame-solid" />
      </g>
      <g v-else-if="frameTier === 6">
        <line x1="16" y1="40" x2="50" y2="40" stroke-width="1.2" opacity="0.75" />
        <line x1="110" y1="40" x2="144" y2="40" stroke-width="1.2" opacity="0.75" />
        <polygon points="80,10 98,40 80,70 62,40" stroke-width="1.3" />
        <polygon points="80,22 92,40 80,58 68,40" stroke-width="0.7" opacity="0.6" />
        <circle cx="80" cy="40" r="3.2" class="frame-solid" />
      </g>
      <g v-else>
        <line x1="16" y1="40" x2="48" y2="40" stroke-width="1.2" opacity="0.8" />
        <line x1="112" y1="40" x2="144" y2="40" stroke-width="1.2" opacity="0.8" />
        <circle cx="80" cy="40" r="28" stroke-width="1.3" />
        <circle cx="80" cy="40" r="22" stroke-width="0.7" stroke-dasharray="2 3" opacity="0.7" />
        <polygon points="80,18 84,34 100,34 88,44 94,60 80,50 66,60 72,44 60,34 76,34" stroke-width="1" />
        <circle cx="80" cy="40" r="3.2" class="frame-solid" />
      </g>
    </svg>

    <!-- 边缘小巧神圣几何符标节点 (Mini Tarot Motifs) -->
    <template v-for="slot in ['top-a', 'top-b', 'bottom-a', 'bottom-b', 'left-a', 'left-b', 'right-a', 'right-b']" :key="slot">
      <svg class="frame-svg frame-node" :class="`frame-node-${slot}`" viewBox="0 0 24 24">
        <!-- T5: 六角晶核 / 太阳环 -->
        <g v-if="frameTier === 5">
          <circle cx="12" cy="12" r="7.5" stroke-width="1" opacity="0.75" />
          <polygon points="12,4 19,8 19,16 12,20 5,16 5,8" stroke-width="0.8" />
          <circle cx="12" cy="12" r="1.8" class="frame-solid" />
        </g>
        <!-- T6: 菱晶魔标 / 梅塔特隆小立方 -->
        <g v-else-if="frameTier === 6">
          <polygon points="12,3 20,12 12,21 4,12" stroke-width="1.1" />
          <polyline points="12,3 12,12 20,12" stroke-width="0.7" opacity="0.7" />
          <polyline points="12,12 4,12" stroke-width="0.7" opacity="0.7" />
          <polyline points="12,12 12,21" stroke-width="0.7" opacity="0.7" />
          <circle cx="12" cy="12" r="1.8" class="frame-solid" />
        </g>
        <!-- T7: 星盘轨道球 / 八芒微星 -->
        <g v-else>
          <circle cx="12" cy="12" r="8" stroke-width="0.9" opacity="0.7" />
          <polygon points="12,5 14,10 19,12 14,14 12,19 10,14 5,12 10,10" stroke-width="0.8" />
          <circle cx="12" cy="12" r="1.8" class="frame-solid" />
        </g>
      </svg>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  tier: number;
}>();

const showFrame = computed(() => props.tier >= 5);
const frameTier = computed(() => Math.min(Math.max(props.tier, 5), 7));
</script>

<style scoped>
.frame-layer {
  /* 贴合卡片四边，塔罗外框双细线环抱主体 */
  --frame-inset-x: 5px;
  --frame-inset-y: 10px;
  --frame-corner-size: 60px;
  --frame-crest-w: 120px;
  --frame-crest-h: 60px;
  --frame-node-size: 16px;
  position: absolute;
  inset: calc(var(--frame-inset-y) * -1) calc(var(--frame-inset-x) * -1);
  z-index: 4;
  pointer-events: none;
  display: none;
}

.frame-layer.show {
  display: block;
}

.frame-svg {
  position: absolute;
  overflow: visible;
  fill: none;
  stroke: var(--tier-color);
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  /* 塔罗几何符印专属质感：高对比深色底投 + 核心发光 + 柔和魔导光晕 */
  filter:
    drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 3px rgba(var(--tier-color-rgb), 0.65))
    drop-shadow(0 0 10px rgba(var(--tier-color-rgb), 0.25));
}

.frame-svg .frame-solid {
  fill: var(--tier-color);
  stroke: none;
}

/* 横向导轨 */
.frame-rail-top {
  top: 0;
  left: 0;
  width: 100%;
  height: 24px;
}

.frame-rail-bottom {
  bottom: 0;
  left: 0;
  width: 100%;
  height: 24px;
  transform: scaleY(-1);
}

/* 纵向导轨 */
.frame-rail-left {
  top: 0;
  left: 0;
  width: 24px;
  height: 100%;
}

.frame-rail-right {
  top: 0;
  right: 0;
  width: 24px;
  height: 100%;
  transform: scaleX(-1);
}

/* 塔罗四角折角 */
.frame-corner {
  width: var(--frame-corner-size);
  height: var(--frame-corner-size);
}

.frame-corner-tl {
  top: 0;
  left: 0;
}

.frame-corner-tr {
  top: 0;
  right: 0;
  transform: scaleX(-1);
}

.frame-corner-bl {
  bottom: 0;
  left: 0;
  transform: scaleY(-1);
}

.frame-corner-br {
  bottom: 0;
  right: 0;
  transform: scale(-1, -1);
}

/* 中央塔罗主神印 */
.frame-crest {
  width: var(--frame-crest-w);
  height: var(--frame-crest-h);
  left: 50%;
}

.frame-crest-top {
  top: 0;
  transform: translate(-50%, -46%);
}

.frame-crest-bottom {
  bottom: 0;
  transform: translate(-50%, 46%) scaleY(-1);
}

/* 塔罗两侧竖排文字 (Side Script) */
.tarot-side-script {
  position: absolute;
  top: 70px;
  bottom: 70px;
  display: flex;
  align-items: center;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--tier-color);
  opacity: 0.38;
  writing-mode: vertical-rl;
  text-transform: uppercase;
  pointer-events: none;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
  user-select: none;
}

.tarot-side-script.left {
  left: -2px;
}

.tarot-side-script.right {
  right: -2px;
}

/* 侧边点缀节点 */
.frame-node {
  width: var(--frame-node-size);
  height: var(--frame-node-size);
}

.frame-node-top-a,
.frame-node-top-b {
  top: 6px;
  transform: translate(-50%, -50%);
}
.frame-node-top-a { left: 24%; }
.frame-node-top-b { left: 76%; }

.frame-node-bottom-a,
.frame-node-bottom-b {
  bottom: 6px;
  transform: translate(-50%, 50%);
}
.frame-node-bottom-a { left: 24%; }
.frame-node-bottom-b { left: 76%; }

.frame-node-left-a,
.frame-node-left-b {
  left: 6px;
  transform: translate(-50%, -50%);
}
.frame-node-left-a { top: 32%; }
.frame-node-left-b { top: 68%; }

.frame-node-right-a,
.frame-node-right-b {
  right: 6px;
  transform: translate(50%, -50%);
}
.frame-node-right-a { top: 32%; }
.frame-node-right-b { top: 68%; }

/* 移动端与窄屏适配 */
@media (max-width: 820px) {
  .frame-layer {
    --frame-inset-x: 4px;
    --frame-inset-y: 8px;
    --frame-corner-size: 50px;
    --frame-crest-w: 104px;
    --frame-crest-h: 52px;
    --frame-node-size: 13px;
  }

  .tarot-side-script {
    font-size: 7.5px;
    letter-spacing: 0.16em;
    opacity: 0.28;
  }
}

@media (max-width: 640px) {
  .frame-layer {
    --frame-inset-x: 3px;
    --frame-inset-y: 6px;
    --frame-corner-size: 42px;
    --frame-crest-w: 86px;
    --frame-crest-h: 44px;
    --frame-node-size: 11px;
  }

  .tarot-side-script {
    display: none; /* 移动端超窄屏隐藏侧面字样，保持清爽 */
  }

  .frame-svg {
    filter:
      drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))
      drop-shadow(0 0 2px rgba(var(--tier-color-rgb), 0.6));
  }
}
</style>