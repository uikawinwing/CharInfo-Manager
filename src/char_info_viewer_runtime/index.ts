import { registerRuntimeEntry } from './runtimeEntry';
import { createCharInfoRuntime } from './runtime';
import { CHAR_INFO_RELEASE_VERSION } from './releaseVersion';
import './mobileViewerScroll.css';

registerRuntimeEntry({
  version: CHAR_INFO_RELEASE_VERSION,
  createRuntime: updates => createCharInfoRuntime(updates),
});
