import { createApp } from 'vue';

import App from './App.vue';
import './lab.css';

/**
 * Portable Offline DX Lab 入口。
 *
 * 刻意不 import 任何 ST / TavernHelper / MVU 运行时：Lab 必须能离线单文件启动。
 * 真实 renderer 通过 @/char_info_viewer/... 引入，那是纯 Vue 组件，不依赖宿主。
 */
createApp(App).mount('#dx-lab-root');
