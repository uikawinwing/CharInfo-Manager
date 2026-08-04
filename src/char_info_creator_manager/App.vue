<template>
  <div
    class="manager-root"
    :class="{
      'library-mode': viewMode === 'library',
      'library-detail-open': viewMode === 'library' && detailCharacter,
    }"
    @keydown.esc="onEscape"
  >
    <button
      v-if="viewMode !== 'library'"
      class="backdrop"
      type="button"
      aria-label="关闭管理器"
      @click="emit('close')"
    ></button>

    <main
      class="manager-dialog"
      :class="{ 'library-dialog': viewMode === 'library' }"
      role="dialog"
      :aria-modal="viewMode === 'library' ? 'false' : 'true'"
      aria-labelledby="manager-title"
      :aria-hidden="detailCharacter && viewMode !== 'library' ? 'true' : undefined"
      :inert="detailCharacter && viewMode !== 'library' ? true : undefined"
    >
      <header class="dialog-header" :class="{ 'library-header': viewMode === 'library' }">
        <div class="header-title">
          <svg v-if="viewMode === 'library'" class="library-title-icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 5.5 10.4 7v12L4 17.4V5.5Zm16 0L13.6 7v12l6.4-1.6V5.5ZM12 8.6v10.3" />
            <path d="M6.5 9.2 9 10m6.5 0 2.5-.8m-11.5 4 2.5.8m6.5 0 2.5-.8" />
          </svg>
          <h1 id="manager-title">{{ viewMode === 'library' ? '世界书角色库' : '角色视觉编辑器' }}</h1>
          <span class="phase-badge">
            {{ viewMode === 'library' ? worldbookCharacterEntries.length : `${activeStep}/${steps.length}` }}
          </span>
        </div>

        <div v-if="viewMode === 'library'" class="character-source-switch" role="group" aria-label="选择角色资料来源">
          <button type="button" aria-pressed="false" @click="props.onOpenCurrentChatLibrary?.()">
            当前聊天角色
          </button>
          <button type="button" class="active" aria-pressed="true">世界书角色</button>
        </div>

        <div v-if="viewMode === 'library'" class="library-header-worldbook">
          <label>
            <span>世界书</span>
            <select v-model="selectedWorldbookName" :disabled="loadingWorldbooks || worldbooks.length === 0">
              <option v-for="worldbook in worldbooks" :key="worldbook" :value="worldbook">
                {{ worldbook }}{{ isCharacterWorldbook(worldbook) ? '（当前角色）' : '' }}
              </option>
            </select>
          </label>
          <button
            class="icon-button library-refresh-button"
            type="button"
            title="重新读取角色库"
            aria-label="重新读取角色库"
            :disabled="loadingWorldbooks || loadingEntries"
            @click="loadWorldbooks"
          >
            ↻
          </button>
        </div>

        <div class="header-actions">
          <div class="manager-view-switch" role="group" aria-label="切换角色管理工具">
            <button
              type="button"
              :class="{ active: viewMode === 'library' }"
              :aria-pressed="viewMode === 'library'"
              @click="switchManagerView('library')"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 5h6v6H4V5Zm10 0h6v6h-6V5ZM4 15h6v4H4v-4Zm10 0h6v4h-6v-4Z" />
              </svg>
              <span>角色库</span>
            </button>
            <button
              type="button"
              :class="{ active: viewMode === 'editor' }"
              :aria-pressed="viewMode === 'editor'"
              @click="switchManagerView('editor')"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="m4 16 9.8-9.8 4 4L8 20H4v-4Zm11.2-11.2 1.4-1.4a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2l-1.4 1.4-4-4Z"
                />
              </svg>
              <span>视觉编辑</span>
            </button>
          </div>
          <button class="close-button" type="button" aria-label="关闭" @click="emit('close')">×</button>
        </div>
      </header>

      <div v-if="viewMode === 'editor'" class="dialog-body">
        <nav class="wizard-step-nav" aria-label="角色视觉配置步骤">
          <div class="wizard-nav-header">
            <span>配置流程</span>
            <strong>{{ activeStep }} / {{ steps.length }}</strong>
          </div>

          <button
            v-for="step in steps"
            :key="step.id"
            type="button"
            :class="{ active: activeStep === step.id, complete: isStepComplete(step.id) }"
            :disabled="!canVisitStep(step.id)"
            :aria-current="activeStep === step.id ? 'step' : undefined"
            @click="goToStep(step.id)"
          >
            <span class="wizard-step-index">{{ isStepComplete(step.id) ? '✓' : step.id }}</span>
            <span class="wizard-step-copy">
              <strong>{{ step.title }}</strong>
            </span>
            <small class="wizard-step-short-label">{{ step.shortLabel }}</small>
          </button>

          <div class="wizard-nav-context">
            <strong>{{ profile.characterName || selectedEntry?.name || '尚未选择角色' }}</strong>
          </div>
        </nav>

        <aside
          id="manager-step-1"
          class="target-panel wizard-step-section"
          :class="{ 'is-collapsed': activeStep !== 1 }"
        >
          <div class="mobile-section-toggle mobile-target-toggle">
            <span class="step-number">1</span>
            <span class="mobile-section-copy">
              <strong>选择写入目标</strong>
              <small>{{ selectedEntry?.name || '尚未选择角色条目' }}</small>
            </span>
          </div>

          <div id="target-panel-content" class="target-panel-content">
            <section class="target-section">
              <div class="section-title-row">
                <div>
                  <span class="step-label">步骤 1</span>
                  <h2>选择写入目标</h2>
                </div>
                <button
                  class="icon-button"
                  type="button"
                  title="重新读取"
                  :disabled="loadingWorldbooks"
                  @click="loadWorldbooks"
                >
                  ↻
                </button>
              </div>

              <div class="current-character">
                <span>当前角色卡</span>
                <strong>{{ currentCharacterName || '未打开角色卡' }}</strong>
              </div>

              <div class="field">
                <span class="field-label">搜索并选择世界书</span>
                <div class="entry-combobox" @focusout="onWorldbookPickerFocusout">
                  <input
                    v-model="worldbookSearch"
                    type="search"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="worldbook-options"
                    :aria-expanded="worldbookPickerOpen"
                    placeholder="输入世界书名称或点击选择"
                    :disabled="loadingWorldbooks || worldbooks.length === 0"
                    @focus="openWorldbookPicker"
                    @input="onWorldbookSearchInput"
                    @keydown.down.prevent="moveWorldbookHighlight(1)"
                    @keydown.up.prevent="moveWorldbookHighlight(-1)"
                    @keydown.enter.prevent="selectHighlightedWorldbook"
                    @keydown.esc.stop="worldbookPickerOpen = false"
                  />
                  <button
                    class="entry-picker-button"
                    type="button"
                    tabindex="-1"
                    aria-label="展开世界书列表"
                    :disabled="loadingWorldbooks || worldbooks.length === 0"
                    @mousedown.prevent
                    @click="toggleWorldbookPicker"
                  >
                    ⌄
                  </button>

                  <div v-if="worldbookPickerOpen" id="worldbook-options" class="entry-options" role="listbox">
                    <button
                      v-for="(worldbook, index) in filteredWorldbooks"
                      :key="worldbook"
                      type="button"
                      role="option"
                      :aria-selected="worldbook === selectedWorldbookName"
                      :class="{ highlighted: index === highlightedWorldbookIndex }"
                      @mousedown.prevent
                      @mouseenter="highlightedWorldbookIndex = index"
                      @click="selectWorldbook(worldbook)"
                    >
                      <span>{{ worldbook }}</span>
                      <small v-if="isCharacterWorldbook(worldbook)">当前角色</small>
                    </button>
                    <p v-if="filteredWorldbooks.length === 0" class="entry-empty">没有符合条件的世界书</p>
                  </div>
                </div>
              </div>

              <div class="field">
                <span class="field-label">搜索并选择角色条目</span>
                <div class="entry-combobox" @focusout="onEntryPickerFocusout">
                  <input
                    v-model="entrySearch"
                    type="search"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="entry-options"
                    :aria-expanded="entryPickerOpen"
                    placeholder="输入名称或点击选择"
                    :disabled="entries.length === 0"
                    @focus="openEntryPicker"
                    @input="onEntrySearchInput"
                    @keydown.down.prevent="moveEntryHighlight(1)"
                    @keydown.up.prevent="moveEntryHighlight(-1)"
                    @keydown.enter.prevent="selectHighlightedEntry"
                    @keydown.esc.stop="entryPickerOpen = false"
                  />
                  <button
                    class="entry-picker-button"
                    type="button"
                    tabindex="-1"
                    aria-label="展开角色条目列表"
                    :disabled="entries.length === 0"
                    @mousedown.prevent
                    @click="toggleEntryPicker"
                  >
                    ⌄
                  </button>

                  <div v-if="entryPickerOpen" id="entry-options" class="entry-options" role="listbox">
                    <button
                      v-for="(entry, index) in filteredEntries"
                      :key="entry.uid"
                      type="button"
                      role="option"
                      :aria-selected="entry.uid === selectedEntryUid"
                      :class="{ highlighted: index === highlightedEntryIndex }"
                      @mousedown.prevent
                      @mouseenter="highlightedEntryIndex = index"
                      @click="selectEntry(entry)"
                    >
                      <span>{{ entry.name || `未命名条目 #${entry.uid}` }}</span>
                      <small v-if="!entry.enabled">已禁用</small>
                    </button>
                    <p v-if="filteredEntries.length === 0" class="entry-empty">没有符合条件的条目</p>
                  </div>
                </div>
              </div>

              <div v-if="selectedEntry" class="target-summary">
                <span class="status-dot" :class="entryStateClass"></span>
                <div>
                  <strong>{{ entryStateTitle }}</strong>
                  <p>{{ entryStateDescription }}</p>
                </div>
              </div>

              <p v-if="loadError" class="message error">{{ loadError }}</p>
            </section>

            <section class="safety-note">
              <strong>🔒 只更新角色视觉资料</strong>
            </section>

            <div class="wizard-step-actions">
              <span></span>
              <button type="button" class="primary-button" :disabled="!selectedEntry" @click="goToStep(2)">
                下一步：角色资料
              </button>
            </div>
          </div>
        </aside>

        <form v-show="activeStep !== 1" class="editor-panel" novalidate @submit.prevent="saveToEntry">
          <section
            id="manager-step-2"
            class="form-section wizard-step-section"
            :class="{ 'is-collapsed': activeStep !== 2 }"
          >
            <div class="mobile-section-toggle">
              <span class="step-number">2</span>
              <span class="mobile-section-copy">
                <strong>角色资料</strong>
                <small>{{ profile.characterName || '填写姓名、头像与登场台词' }}</small>
              </span>
            </div>

            <div class="section-heading">
              <span class="step-number">2</span>
              <div>
                <h2>角色资料</h2>
                <p>填写角色姓名；头像和登场台词可按需补充。</p>
              </div>
            </div>

            <div id="manager-step-2-content" class="mobile-step-content">
              <div class="field-grid">
                <label class="field">
                  <span class="field-label">角色姓名 <b>*</b></span>
                  <input
                    v-model="profile.characterName"
                    type="text"
                    maxlength="80"
                    autocomplete="off"
                    placeholder="例如：傲雪"
                  />
                </label>

                <label class="field">
                  <span class="field-label">状态栏头像 URL <small>选填</small></span>
                  <input
                    v-model="profile.avatarUrl"
                    type="url"
                    inputmode="url"
                    autocomplete="off"
                    placeholder="https://…/avatar.webp"
                  />
                </label>

                <label class="field field-full">
                  <span class="field-label">
                    登场台词
                    <small>{{ profile.entranceQuote.length }}/60</small>
                  </span>
                  <textarea
                    v-model="profile.entranceQuote"
                    maxlength="60"
                    rows="2"
                    placeholder="例如：霜雪会记住每一道剑痕。"
                  ></textarea>
                </label>
              </div>

              <div class="wizard-step-actions">
                <button type="button" class="secondary-button" @click="goToStep(1)">上一步</button>
                <button
                  type="button"
                  class="primary-button"
                  :disabled="!profile.characterName.trim()"
                  @click="goToStep(3)"
                >
                  下一步：主题颜色
                </button>
              </div>
            </div>
          </section>

          <section
            id="manager-step-3"
            class="form-section wizard-step-section"
            :class="{ 'is-collapsed': activeStep !== 3 }"
          >
            <div class="mobile-section-toggle">
              <span class="step-number">3</span>
              <span class="mobile-section-copy">
                <strong>主题颜色</strong>
                    <small>{{ customizeColors ? '已启用自定义配色' : '使用默认配色' }}</small>
              </span>
            </div>

            <div class="section-heading">
              <span class="step-number">3</span>
              <div>
                <h2>主题颜色</h2>
              </div>
            </div>

            <div id="manager-step-3-content" class="mobile-step-content">
              <label class="color-custom-toggle">
                <input v-model="customizeColors" type="checkbox" @change="onCustomizeColorsChange" />
                <span>
                  <strong>启用自定义主题颜色</strong>
                    <small>{{ customizeColors ? '正在使用自定义颜色' : '使用默认配色' }}</small>
                </span>
              </label>

              <div v-if="customizeColors" class="color-grid">
                <label class="color-field">
                  <span>种族颜色</span>
                  <div class="color-control">
                    <input v-model="profile.raceColor" type="color" aria-label="选择种族颜色" />
                    <input v-model="profile.raceColor" type="text" maxlength="7" spellcheck="false" />
                  </div>
                </label>

                <label class="color-field">
                  <span>阶层颜色</span>
                  <div class="color-control">
                    <input v-model="profile.tierColor" type="color" aria-label="选择阶层颜色" />
                    <input v-model="profile.tierColor" type="text" maxlength="7" spellcheck="false" />
                  </div>
                </label>
              </div>

              <div class="wizard-step-actions">
                <button type="button" class="secondary-button" @click="goToStep(2)">上一步</button>
                <button type="button" class="primary-button" @click="goToStep(4)">下一步：角色相册</button>
              </div>
            </div>
          </section>

          <section
            id="manager-step-4"
            class="form-section wizard-step-section"
            :class="{ 'is-collapsed': activeStep !== 4 }"
          >
            <div class="mobile-section-toggle">
              <span class="step-number">4</span>
              <span class="mobile-section-copy">
                <strong>角色相册</strong>
                <small>{{ configuredGalleryCount }} 张已填写图片</small>
              </span>
            </div>

            <div class="section-heading">
              <span class="step-number">4</span>
              <div>
                <h2>角色相册</h2>
                <p>第一张图片会作为主立绘；同一张图片可按顺序添加备用图片地址。</p>
              </div>
            </div>

            <div id="manager-step-4-content" class="mobile-step-content">
              <section class="gallery-storage-panel">
                <label class="gallery-storage-toggle">
                  <input v-model="useExtendedGallery" type="checkbox" @change="onExtendedGalleryChange" />
                  <span>
                    <strong>使用独立扩展图库</strong>
                    <small>
                      {{
                        useExtendedGallery
                          ? `前 ${DEFAULT_EMBEDDED_GALLERY_LIMIT} 张随角色条目保存，其余图片进入独立图库世界书`
                          : '默认：全部图片随角色资料保存'
                      }}
                    </small>
                  </span>
                </label>

                <div v-if="useExtendedGallery" class="gallery-storage-fields">
                  <label class="field field-full">
                    <span class="field-label">扩展图库世界书</span>
                    <input
                      v-model="galleryPackWorldbookName"
                      type="text"
                      maxlength="128"
                      autocomplete="off"
                      placeholder="例如：命定之诗-CharInfo图库"
                    />
                  </label>
                  <label class="field">
                    <span class="field-label">图库包 ID</span>
                    <input
                      v-model="galleryPackId"
                      type="text"
                      maxlength="64"
                      spellcheck="false"
                      placeholder="creator-project"
                    />
                  </label>
                  <label class="field">
                    <span class="field-label">图库角色 ID</span>
                    <input
                      v-model="galleryProfileId"
                      type="text"
                      maxlength="64"
                      spellcheck="false"
                      placeholder="character-id"
                    />
                  </label>
                </div>
                <ul
                  v-if="useExtendedGallery && validationErrors.length"
                  class="gallery-storage-errors"
                  aria-live="polite"
                >
                  <li v-for="error in validationErrors" :key="error">{{ error }}</li>
                </ul>
                <p v-if="galleryExtensionMessage" class="gallery-storage-message" aria-live="polite">
                  {{ loadingGalleryExtension ? '读取中：' : '' }}{{ galleryExtensionMessage }}
                </p>
              </section>

              <div class="image-host-links">
                <div>
                  <strong>需要上传图片？</strong>
                  <small>在图片托管网站上传后，请复制 HTTPS 原图直链并粘贴到下方。</small>
                </div>
                <a href="https://catbox.moe/" target="_blank" rel="noopener noreferrer">打开 Catbox</a>
                <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer">打开 ImgBB</a>
              </div>

              <div class="gallery-list">
                <article v-for="(image, index) in profile.gallery" :key="image.id" class="gallery-card">
                  <div class="image-preview">
                    <img
                      v-if="resolveGalleryPreviewUrl(image)"
                      :src="resolveGalleryPreviewUrl(image)"
                      :alt="image.title || `第 ${index + 1} 张立绘`"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                      @error="onGalleryPreviewError(image)"
                    />
                    <span v-else aria-hidden="true">▧</span>
                    <b v-if="index === 0">主立绘</b>
                    <b v-else-if="isExtendedGalleryImage(index)" class="gallery-location-badge is-extension">
                      扩展图库
                    </b>
                    <b v-else-if="useExtendedGallery" class="gallery-location-badge">随角色保存</b>
                  </div>

                  <div class="gallery-fields">
                    <label class="field">
                      <span class="field-label">图片标题</span>
                      <input v-model="image.title" type="text" autocomplete="off" />
                    </label>
                    <div class="source-list">
                      <label v-for="(_source, sourceIndex) in image.sources" :key="sourceIndex" class="field">
                        <span class="field-label">
                          图片地址 {{ sourceIndex + 1 }}
                          <small>{{ sourceIndex === 0 ? '首选' : '加载失败时备用' }}</small>
                        </span>
                        <span class="source-input-row">
                          <input
                            v-model="image.sources[sourceIndex]"
                            type="url"
                            inputmode="url"
                            autocomplete="off"
                            placeholder="https://…/portrait.webp"
                            @input="image.previewSourceIndex = 0"
                          />
                          <button
                            type="button"
                            class="remove-source-button"
                            :disabled="image.sources.length === 1"
                            :aria-label="`删除第 ${sourceIndex + 1} 个图片地址`"
                            @click="removeImageSource(image, sourceIndex)"
                          >
                            ×
                          </button>
                        </span>
                      </label>
                      <button type="button" class="add-source-button" @click="addImageSource(image)">
                        ＋ 添加备用图片地址
                      </button>
                    </div>
                  </div>

                  <div class="gallery-actions">
                    <button type="button" title="上移" :disabled="index === 0" @click="moveImage(index, -1)">↑</button>
                    <button
                      type="button"
                      title="下移"
                      :disabled="index === profile.gallery.length - 1"
                      @click="moveImage(index, 1)"
                    >
                      ↓
                    </button>
                    <button
                      class="danger"
                      type="button"
                      title="删除"
                      :disabled="profile.gallery.length === 1"
                      @click="removeImage(index)"
                    >
                      ×
                    </button>
                  </div>
                </article>
              </div>

              <button class="add-image-button" type="button" @click="addImage">＋ 添加一张图片</button>

              <div class="wizard-step-actions">
                <button type="button" class="secondary-button" @click="goToStep(3)">上一步</button>
                <button type="button" class="primary-button" @click="goToStep(5)">下一步：确认写入</button>
              </div>
            </div>
          </section>

          <section
            id="manager-step-5"
            class="output-section wizard-step-section"
            :class="{ 'is-collapsed': activeStep !== 5 }"
          >
            <div class="mobile-section-toggle">
              <span class="step-number">5</span>
              <span class="mobile-section-copy">
                <strong>确认写入</strong>
              </span>
            </div>

            <div class="output-heading">
              <div>
                <h2>写入预览</h2>
                <p>{{ generatedCode ? `${generatedCode.split('\n').length} 行内容` : '填写完整后生成' }}</p>
              </div>
              <button type="button" class="secondary-button" :disabled="!generatedCode" @click="copyEjs">
                复制写入内容
              </button>
            </div>

            <details>
              <summary>查看写入内容</summary>
              <pre>{{ generatedCode || '尚未生成可写入内容。' }}</pre>
            </details>

            <section v-if="useExtendedGallery" class="gallery-pack-download-panel">
              <div>
                <h3>独立扩展图库世界书包</h3>
                <p>只包含第 {{ DEFAULT_EMBEDDED_GALLERY_LIMIT + 1 }} 张起的扩展图片，可单独发布、订阅或更新。</p>
              </div>
              <div class="gallery-pack-download-actions">
                <button
                  type="button"
                  class="secondary-button"
                  :disabled="!generatedGalleryPackJson"
                  @click="downloadGalleryPackJson"
                >
                  下载独立图库世界书包
                </button>
              </div>
              <p v-if="validationErrors.length" class="gallery-pack-download-status error" aria-live="polite">
                暂时无法生成，请先修正：{{ validationErrors[0] }}
              </p>
              <p v-else class="gallery-pack-download-status">资料有效，可以下载独立扩展图库世界书包。</p>
              <p v-if="galleryPackDownloadMessage" class="gallery-pack-download-message" aria-live="polite">
                {{ galleryPackDownloadMessage }}
              </p>
            </section>

            <div class="wizard-step-actions wizard-step-actions-final">
              <button type="button" class="secondary-button" @click="goToStep(4)">上一步</button>
            </div>

            <div class="save-bar">
              <div class="save-feedback" aria-live="polite">
                <strong :class="{ success: saveState === 'success', error: saveState === 'error' }">
                  {{ saveMessage }}
                </strong>
                <span v-if="validationErrors.length">{{ validationErrors[0] }}</span>
              </div>
              <button class="primary-button" type="submit" :disabled="!canSave">
                {{ saving ? '正在写入…' : '保存并写入所选条目' }}
              </button>
            </div>
          </section>
        </form>
      </div>

      <section v-else class="library-page">
        <div v-if="worldbookCharacterEntries.length > 0" class="character-library">
          <div class="character-library-toolbar">
            <label class="library-search-field">
              <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.7" cy="10.7" r="6.4" /><path d="m16 16 4 4" /></svg>
              <input
                v-model="characterSearch"
                type="search"
                autocomplete="off"
                placeholder="搜索角色、条目名或种族"
                aria-label="搜索角色封面库"
              />
            </label>

            <div class="character-library-control-row">
              <div class="mobile-character-library-filter">
                <button
                  class="mobile-character-library-filter-trigger"
                  type="button"
                  aria-haspopup="menu"
                  :aria-expanded="mobileCharacterLibraryFilterOpen"
                  @click="mobileCharacterLibraryFilterOpen = !mobileCharacterLibraryFilterOpen"
                >
                  <span>状态</span>
                  <strong>{{ activeCharacterLibraryFilterLabel }}</strong>
                  <span aria-hidden="true">⌄</span>
                </button>
                <div v-if="mobileCharacterLibraryFilterOpen" class="mobile-character-library-filter-menu" role="menu">
                  <button
                    v-for="option in characterLibraryFilterOptions"
                    :key="option.value"
                    type="button"
                    role="menuitemradio"
                    :aria-checked="characterLibraryFilter === option.value"
                    @click="setMobileCharacterLibraryFilter(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div class="character-library-filter-buttons" role="group" aria-label="筛选角色状态">
                <span class="character-library-control-label">状态</span>
                <button
                  v-for="option in characterLibraryFilterOptions"
                  :key="option.value"
                  type="button"
                  :aria-pressed="characterLibraryFilter === option.value"
                  @click="characterLibraryFilter = option.value"
                >
                  {{ option.label }}
                </button>
              </div>

              <label class="character-race-filter">
                <span>种族</span>
                <select v-model="characterRaceFilter">
                  <option value="all">全部种族</option>
                  <option v-for="race in availableCharacterRaces" :key="race" :value="race">{{ race }}</option>
                </select>
              </label>
              <div class="character-library-view-options">
                <div class="character-library-layout-switch" role="group" aria-label="选择角色库显示方式">
                  <button
                    type="button"
                    :aria-pressed="characterLibraryLayout === 'compact'"
                    @click="characterLibraryLayout = 'compact'"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>
                    <span>紧凑列表</span>
                  </button>
                  <button
                    type="button"
                    :aria-pressed="characterLibraryLayout === 'cards'"
                    @click="characterLibraryLayout = 'cards'"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx=".8" /><rect x="14" y="4" width="6" height="6" rx=".8" /><rect x="4" y="14" width="6" height="6" rx=".8" /><rect x="14" y="14" width="6" height="6" rx=".8" /></svg>
                    <span>图片卡片</span>
                  </button>
                </div>

              <label v-if="characterLibraryLayout === 'cards'" class="character-card-columns">
                <span>每行显示</span>
                <select v-model="characterLibraryCardColumns" aria-label="每行显示卡片数">
                  <option value="auto">自动适应</option>
                  <option v-for="column in characterLibraryCardColumnOptions" :key="column" :value="column">
                    {{ column }} 列
                  </option>
                </select>
              </label>
              </div>

              <div class="character-library-summary" aria-live="polite">
                找到 {{ visibleCharacterEntries.length }} 个角色
                <span v-if="loadingEncounteredCharacters" aria-label="正在读取角色资料">…</span>
              </div>
            </div>
          </div>

          <div
            class="character-library-grid"
            :class="[
              { 'image-card-view': characterLibraryLayout === 'cards' },
              characterLibraryCardColumns === 'auto' ? '' : `card-columns-${characterLibraryCardColumns}`,
            ]"
          >
            <article
              v-for="character in visibleCharacterEntries"
              :key="character.entry.uid"
              class="character-library-card"
              :class="{
                selected: character.entry.uid === selectedEntryUid,
                disabled: !character.entry.enabled,
                encountered: character.encountered,
                unconfigured: !character.hasVisualProfile,
              }"
            >
              <button
                class="character-cover-button"
                type="button"
                :aria-label="`查看 ${character.profile.characterName || character.entry.name}${
                  resolveCharacterCoverUrl(character) ? '' : '（未配置图片）'
                }`"
                @click="openCharacterDetails(character)"
              >
                <img
                  v-if="resolveCharacterCoverUrl(character)"
                  :src="resolveCharacterCoverUrl(character)"
                  :alt="character.profile.characterName || character.entry.name"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  @error="onCharacterCoverError(character)"
                />
                <span v-else class="character-cover-placeholder" aria-hidden="true">
                  <svg class="character-cover-silhouette" viewBox="0 0 80 96">
                    <path d="M40 48c12.4 0 22-10.2 22-22.8S52.4 2.5 40 2.5 18 12.7 18 25.2 27.6 48 40 48Z" />
                    <path d="M8.5 94v-8.1c0-19.9 14.1-32.7 31.5-32.7s31.5 12.8 31.5 32.7V94H8.5Z" />
                  </svg>
                </span>
              </button>

              <div
                class="character-library-card-copy"
                role="button"
                tabindex="0"
                :aria-label="`查看 ${character.profile.characterName || character.entry.name}`"
                @click="openCharacterDetails(character)"
                @keydown.enter.prevent="openCharacterDetails(character)"
                @keydown.space.prevent="openCharacterDetails(character)"
              >
                <strong>{{ character.profile.characterName || character.entry.name }}</strong>
                <span class="character-library-card-meta">
                  <i>{{ character.race || '种族未知' }}</i>
                  <i v-if="characterLibraryLayout === 'cards'" class="entry-status">
                    {{ character.entry.enabled ? '已启用' : '已禁用' }}
                  </i>
                  <i v-if="character.encountered" class="encountered">已遇到</i>
                  <i v-if="!character.hasVisualProfile" class="visual-missing">未配置图片</i>
                </span>
              </div>

              <button
                class="character-entry-toggle"
                type="button"
                role="switch"
                :aria-checked="character.entry.enabled"
                :aria-label="`${character.entry.enabled ? '禁用' : '启用'} ${
                  character.profile.characterName || character.entry.name
                }`"
                :disabled="togglingEntryUids.has(character.entry.uid)"
                @click="toggleCharacterEntry(character)"
              >
                <span></span>
              </button>
            </article>
          </div>

          <p v-if="visibleCharacterEntries.length === 0" class="character-library-no-results">
            当前筛选条件下没有角色。
          </p>
          <p v-if="characterToggleMessage" class="character-library-feedback" aria-live="polite">
            {{ characterToggleMessage }}
          </p>
        </div>

        <div v-else-if="selectedWorldbookName && !loadingEntries" class="character-library-empty library-page-empty">
          <strong>这个世界书暂时没有可显示的角色。</strong>
        </div>
        <p v-if="loadError" class="message error">{{ loadError }}</p>
      </section>
    </main>

    <section
      v-if="detailCharacter"
      class="character-detail-layer"
      role="dialog"
      :aria-modal="viewMode === 'library' ? 'false' : 'true'"
      aria-labelledby="character-detail-title"
      @click.self="closeCharacterDetails"
    >
      <article ref="detailDialogRef" class="character-detail-dialog" tabindex="-1">
        <header class="character-detail-header">
          <div>
            <span class="character-detail-status" :class="{ disabled: !detailCharacter.entry.enabled }">
              {{ detailCharacter.entry.enabled ? '已启用' : '已禁用' }}
            </span>
            <h2 id="character-detail-title">
              {{ detailCharacter.profile.characterName || detailCharacter.entry.name }}
            </h2>
            <p>世界书：{{ selectedWorldbookName }} · 条目：{{ detailCharacter.entry.name }}</p>
          </div>
          <button class="close-button" type="button" aria-label="关闭角色详情" @click="closeCharacterDetails">×</button>
        </header>

        <div class="character-detail-body">
          <section class="character-detail-gallery" aria-labelledby="character-detail-gallery-title">
            <div class="character-detail-section-heading">
              <div>
              <span>图片资料</span>
                <h3 id="character-detail-gallery-title">角色图库</h3>
              </div>
              <b>{{ detailGalleryItems.length }} 张</b>
            </div>

            <div class="character-detail-gallery-grid">
              <figure v-for="(item, index) in detailGalleryItems" :key="`${item.title}:${index}`">
                <div class="character-detail-media">
                  <video
                    v-if="item.media?.kind === 'video'"
                    :src="item.media.url"
                    controls
                    muted
                    loop
                    playsinline
                    preload="metadata"
                    @error="onDetailGalleryMediaError(index)"
                  ></video>
                  <img
                    v-else-if="item.media"
                    :src="item.media.url"
                    :alt="item.title || `第 ${index + 1} 张角色图片`"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    @error="onDetailGalleryMediaError(index)"
                  />
                  <span v-else>图片暂时无法读取</span>
                </div>
                <figcaption>
                  <strong>{{ item.title || `角色图片 ${index + 1}` }}</strong>
              <small v-if="item.sourceCount > 1">{{ item.sourceCount }} 个备用地址</small>
                </figcaption>
              </figure>
            </div>
            <p v-if="detailGalleryItems.length === 0" class="character-detail-gallery-empty">
              这个角色尚未配置图库；仍可查看和管理其世界书条目。
            </p>
          </section>

          <section class="character-detail-content" aria-labelledby="character-detail-content-title">
            <div class="character-detail-section-heading">
              <div>
              <span>角色设定</span>
                <h3 id="character-detail-content-title">角色条目内容</h3>
              </div>
              <b>{{ editingDetailBody ? '编辑中' : '只读' }}</b>
            </div>
            <p class="character-detail-content-note">
              {{ editingDetailBody ? '只修改设定正文；视觉资料与其他设置不变。' : '设定正文（只读）' }}
            </p>
            <textarea
              v-if="editingDetailBody"
              v-model="detailEntryDraft"
              class="character-detail-editor"
              aria-label="角色世界书条目正文"
              spellcheck="false"
            ></textarea>
            <pre v-else>{{ detailEntryBody || '该角色暂时没有其他设定内容。' }}</pre>
            <p v-if="detailEntryMessage" class="character-detail-editor-message" aria-live="polite">
              {{ detailEntryMessage }}
            </p>
          </section>
        </div>

        <footer class="character-detail-footer">
          <template v-if="editingDetailBody">
            <button class="secondary-button" type="button" :disabled="savingDetailBody" @click="cancelDetailBodyEdit">
              取消正文修改
            </button>
            <button class="primary-button" type="button" :disabled="savingDetailBody" @click="saveDetailEntryBody">
              {{ savingDetailBody ? '正在保存…' : '保存设定正文' }}
            </button>
          </template>
          <template v-else>
            <button class="secondary-button" type="button" @click="closeCharacterDetails">返回角色库</button>
            <button class="secondary-button" type="button" @click="startDetailBodyEdit">编辑设定正文</button>
            <button class="primary-button" type="button" @click="editDetailCharacter">编辑视觉资料</button>
          </template>
        </footer>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { normalizePortraitMediaUrlForBrowser } from '../char_info_viewer/services/imageUrl';
import {
  createStableGalleryId,
  DEFAULT_EMBEDDED_GALLERY_LIMIT,
  validateGalleryExtensionReference,
  type GalleryExtensionReference,
} from '../char_info_shared/galleryPack';
import { copyTextWithDocumentSelection, copyTextWithFallback } from './clipboard';
import {
  collectEncounteredCharacters,
  collectWorldbookCharacterEntries,
  inferCharacterRace,
  parseWorldbookCharacterDisplayName,
  readCharacterEntryBody,
  replaceCharacterEntryBody,
  setCharacterEntryEnabled,
  type EncounteredCharacterRecord,
  type WorldbookCharacterEntry,
} from './characterEntryLibrary';
import {
  buildManagedEjsBlock,
  createEmptyProfile,
  DEFAULT_RACE_COLOR,
  DEFAULT_TIER_COLOR,
  hasUnmanagedVisualEjs,
  inspectManagedBlock,
  isHttpsUrl,
  normalizeProfile,
  upsertManagedEjsBlock,
  validateProfile,
  type CharacterVisualProfile,
  type GalleryImage,
} from './ejsProfile';
import {
  deleteGalleryPackProfile,
  readGalleryPackProfile,
  saveGalleryPackProfile,
  serializeGalleryPackWorkshopSource,
} from './galleryPackStorage';
import { buildWorldbookList } from './worldbookList';

interface EditableGalleryImage {
  id: number;
  title: string;
  sources: string[];
  previewSourceIndex: number;
}

interface EditableProfile extends Omit<CharacterVisualProfile, 'gallery'> {
  gallery: EditableGalleryImage[];
}

type WorldbookCharacterLibraryEntry = WorldbookCharacterEntry<WorldbookEntry, CharacterVisualProfile>;
type CharacterLibraryItem = WorldbookCharacterLibraryEntry & {
  encountered: boolean;
  race: string;
};
type DetailGalleryMedia = NonNullable<ReturnType<typeof normalizePortraitMediaUrlForBrowser>>;
type CharacterLibraryFilter = 'all' | 'encountered' | 'enabled' | 'disabled';
type CharacterLibraryLayout = 'compact' | 'cards';
type StepId = 1 | 2 | 3 | 4 | 5;
type ManagerView = 'editor' | 'library';

const props = withDefaults(
  defineProps<{
    initialView?: ManagerView;
    onOpenCurrentChatLibrary?: () => void;
  }>(),
  { initialView: 'editor', onOpenCurrentChatLibrary: undefined },
);
const emit = defineEmits<{ close: [] }>();
const viewMode = ref<ManagerView>(props.initialView);
const steps: { id: StepId; shortLabel: string; title: string }[] = [
  { id: 1, shortLabel: '目标', title: '选择写入目标' },
  { id: 2, shortLabel: '资料', title: '填写角色资料' },
  { id: 3, shortLabel: '配色', title: '设置主题颜色' },
  { id: 4, shortLabel: '相册', title: '整理角色相册' },
  { id: 5, shortLabel: '生成', title: '生成并写入' },
];
const characterLibraryFilterOptions: Array<{ value: CharacterLibraryFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'encountered', label: '当前聊天已遇到' },
  { value: 'enabled', label: '已启用' },
  { value: 'disabled', label: '已禁用' },
];

const currentCharacterName = ref('');
const worldbooks = ref<string[]>([]);
const characterWorldbooks = ref<string[]>([]);
const entries = ref<WorldbookEntry[]>([]);
const selectedWorldbookName = ref('');
const worldbookSearch = ref('');
const worldbookPickerOpen = ref(false);
const highlightedWorldbookIndex = ref(-1);
const selectedEntryUid = ref<number | null>(null);
const entrySearch = ref('');
const entryPickerOpen = ref(false);
const highlightedEntryIndex = ref(-1);
const loadingWorldbooks = ref(false);
const loadingEntries = ref(false);
let selectedWorldbookEntriesLoad: Promise<void> = Promise.resolve();
let entriesLoadRevision = 0;
const loadError = ref('');
const characterToggleMessage = ref('');
const characterCoverSourceIndexes = reactive<Record<number, number>>({});
const togglingEntryUids = reactive(new Set<number>());
const encounteredCharacters = ref<EncounteredCharacterRecord[]>([]);
const loadingEncounteredCharacters = ref(false);
const characterSearch = ref('');
const characterLibraryFilter = ref<CharacterLibraryFilter>('all');
const mobileCharacterLibraryFilterOpen = ref(false);
const characterRaceFilter = ref('all');
const characterLibraryLayout = ref<CharacterLibraryLayout>('compact');
const characterLibraryCardColumns = ref<'auto' | number>('auto');
const characterLibraryCardColumnOptions = [2, 3, 4, 5, 6];
const detailCharacterUid = ref<number | null>(null);
const detailGallerySourceIndexes = reactive<Record<string, number>>({});
const detailExtensionGallery = reactive<Record<number, GalleryImage[]>>({});
const detailDialogRef = ref<HTMLElement | null>(null);
const editingDetailBody = ref(false);
const detailEntryDraft = ref('');
const savingDetailBody = ref(false);
const detailEntryMessage = ref('');
const activeStep = ref<StepId>(1);
const furthestStep = ref<StepId>(1);
const customizeColors = ref(false);
const useExtendedGallery = ref(false);
const galleryPackWorldbookName = ref('');
const galleryPackId = ref('');
const galleryProfileId = ref('');
const loadingGalleryExtension = ref(false);
const galleryExtensionMessage = ref('');
const saving = ref(false);
const saveState = ref<'idle' | 'success' | 'error'>('idle');
const saveMessage = ref('选择世界书条目后即可写入。');
const galleryPackDownloadMessage = ref('');
let nextImageId = 1;
let chatChangedListener: EventOnReturn | null = null;
let mvuUpdatedListener: EventOnReturn | null = null;
let encounteredLoadRevision = 0;

const profile = reactive<EditableProfile>(toEditableProfile(createEmptyProfile()));

function defaultGalleryReference(): GalleryExtensionReference {
  return {
    worldbookName: `${selectedWorldbookName.value || 'CharInfo'}-CharInfo图库`,
    packId: createStableGalleryId(selectedWorldbookName.value, 'char-info-gallery'),
    profileId: createStableGalleryId(profile.characterName, 'character'),
  };
}

function currentGalleryReference(): GalleryExtensionReference | null {
  if (!useExtendedGallery.value) return null;
  return {
    worldbookName: galleryPackWorldbookName.value.trim(),
    packId: galleryPackId.value.trim().toLocaleLowerCase(),
    profileId: galleryProfileId.value.trim().toLocaleLowerCase(),
  };
}

function applyGalleryReference(reference?: GalleryExtensionReference) {
  useExtendedGallery.value = !!reference;
  if (reference) {
    galleryPackWorldbookName.value = reference.worldbookName;
    galleryPackId.value = reference.packId;
    galleryProfileId.value = reference.profileId;
  } else {
    galleryPackWorldbookName.value = '';
    galleryPackId.value = '';
    galleryProfileId.value = '';
  }
  galleryExtensionMessage.value = '';
}

function toEditableProfile(value: CharacterVisualProfile): EditableProfile {
  return {
    ...value,
    gallery: value.gallery.map(image => ({
      ...image,
      sources: [...image.sources],
      id: nextImageId++,
      previewSourceIndex: 0,
    })),
  };
}

function toFullSerializableProfile(): CharacterVisualProfile {
  return {
    characterName: profile.characterName,
    avatarUrl: profile.avatarUrl,
    raceColor: profile.raceColor,
    tierColor: profile.tierColor,
    entranceQuote: profile.entranceQuote,
    gallery: profile.gallery.map(({ title, sources }) => ({ title, sources: [...sources] })),
  };
}

function toSerializableProfile(): CharacterVisualProfile {
  const fullProfile = toFullSerializableProfile();
  const reference = currentGalleryReference();
  if (!reference) return fullProfile;
  return {
    ...fullProfile,
    gallery: fullProfile.gallery.slice(0, DEFAULT_EMBEDDED_GALLERY_LIMIT),
    galleryExtension: reference,
  };
}

function replaceProfile(value: CharacterVisualProfile) {
  const editable = toEditableProfile(value);
  profile.characterName = editable.characterName;
  profile.avatarUrl = editable.avatarUrl;
  profile.raceColor = editable.raceColor;
  profile.tierColor = editable.tierColor;
  customizeColors.value = !!(editable.raceColor || editable.tierColor);
  profile.entranceQuote = editable.entranceQuote;
  profile.gallery.splice(0, profile.gallery.length, ...editable.gallery);
  applyGalleryReference(value.galleryExtension);
}

const selectedEntry = computed(() => entries.value.find(entry => entry.uid === selectedEntryUid.value) ?? null);
const encounteredCharacterMap = computed(
  () => new Map(encounteredCharacters.value.map(character => [character.name, character])),
);
const worldbookCharacterEntries = computed<CharacterLibraryItem[]>(() =>
  collectWorldbookCharacterEntries(
    entries.value,
    content => {
      const inspection = inspectManagedBlock(content);
      return inspection.state === 'valid' ? inspection.profile : null;
    },
    entry => createEmptyProfile(parseWorldbookCharacterDisplayName(entry.name)),
  ).map(character => {
    const encountered = encounteredCharacterMap.value.get(character.profile.characterName);
    const inspection = inspectManagedBlock(character.entry.content);
    const entryBody = readCharacterEntryBody(
      character.entry.content,
      inspection.state === 'valid' ? { start: inspection.start, end: inspection.end } : null,
    );
    return {
      ...character,
      encountered: !!encountered,
      race: encountered?.race || inferCharacterRace(entryBody),
    };
  }),
);
const enabledCharacterCount = computed(
  () => worldbookCharacterEntries.value.filter(character => character.entry.enabled).length,
);
const encounteredCharacterCount = computed(
  () => worldbookCharacterEntries.value.filter(character => character.encountered).length,
);
const availableCharacterRaces = computed(() =>
  [...new Set(worldbookCharacterEntries.value.map(character => character.race).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, 'zh-Hans-CN'),
  ),
);
const visibleCharacterEntries = computed(() => {
  const query = characterSearch.value.trim().toLocaleLowerCase();
  return worldbookCharacterEntries.value.filter(character => {
    if (characterLibraryFilter.value === 'encountered' && !character.encountered) return false;
    if (characterLibraryFilter.value === 'enabled' && !character.entry.enabled) return false;
    if (characterLibraryFilter.value === 'disabled' && character.entry.enabled) return false;
    if (characterRaceFilter.value !== 'all' && character.race !== characterRaceFilter.value) return false;
    if (!query) return true;
    return [character.profile.characterName, character.entry.name, character.race].some(value =>
      value.toLocaleLowerCase().includes(query),
    );
  });
});
const detailCharacter = computed(
  () => worldbookCharacterEntries.value.find(character => character.entry.uid === detailCharacterUid.value) ?? null,
);
const detailEntryBody = computed(() => {
  const character = detailCharacter.value;
  if (!character) return '';
  const inspection = inspectManagedBlock(character.entry.content);
  return readCharacterEntryBody(
    character.entry.content,
    inspection.state === 'valid' ? { start: inspection.start, end: inspection.end } : null,
  );
});
const detailCharacterGallery = computed(() => {
  const character = detailCharacter.value;
  if (!character) return [];
  return [...character.profile.gallery, ...(detailExtensionGallery[character.entry.uid] ?? [])];
});
const detailGalleryItems = computed(() => {
  const character = detailCharacter.value;
  if (!character) return [];
  return detailCharacterGallery.value
    .filter(image => resolveDetailGallerySources(image).length > 0)
    .map((image, index) => {
      const sources = resolveDetailGallerySources(image);
      const sourceIndex = detailGallerySourceIndexes[detailGalleryKey(character.entry.uid, index)] ?? 0;
      return {
        title: image.title,
        media: sources[sourceIndex] ?? null,
        sourceCount: sources.length,
      };
    });
});
const configuredGalleryCount = computed(
  () => profile.gallery.filter(image => image.sources.some(source => isHttpsUrl(source))).length,
);
const embeddedGalleryCount = computed(() =>
  useExtendedGallery.value ? Math.min(DEFAULT_EMBEDDED_GALLERY_LIMIT, profile.gallery.length) : profile.gallery.length,
);
const extendedGalleryImages = computed<GalleryImage[]>(() =>
  useExtendedGallery.value
    ? profile.gallery
        .slice(DEFAULT_EMBEDDED_GALLERY_LIMIT)
        .map(({ title, sources }) => ({ title, sources: [...sources] }))
    : [],
);
const filteredWorldbooks = computed(() => {
  const query = worldbookSearch.value.trim().toLocaleLowerCase();
  const isShowingSelectedName = !!selectedWorldbookName.value && worldbookSearch.value === selectedWorldbookName.value;
  if (!query || isShowingSelectedName) return worldbooks.value;
  return worldbooks.value.filter(worldbook => worldbook.toLocaleLowerCase().includes(query));
});

function resolveGalleryPreviewSources(image: EditableGalleryImage): string[] {
  return image.sources.reduce<string[]>((sources, value) => {
    const media = normalizePortraitMediaUrlForBrowser(value);
    if (media?.kind === 'image' && !sources.includes(media.url)) sources.push(media.url);
    return sources;
  }, []);
}

function resolveGalleryPreviewUrl(image: EditableGalleryImage): string {
  const sources = resolveGalleryPreviewSources(image);
  return sources[Math.min(image.previewSourceIndex, Math.max(0, sources.length - 1))] ?? '';
}

function onGalleryPreviewError(image: EditableGalleryImage) {
  const sources = resolveGalleryPreviewSources(image);
  if (image.previewSourceIndex < sources.length - 1) image.previewSourceIndex += 1;
}

function resolveCharacterCoverSources(character: WorldbookCharacterLibraryEntry): string[] {
  return [character.profile.avatarUrl, ...(character.profile.gallery[0]?.sources ?? [])].reduce<string[]>(
    (sources, value) => {
      const media = normalizePortraitMediaUrlForBrowser(value);
      if (media?.kind === 'image' && !sources.includes(media.url)) sources.push(media.url);
      return sources;
    },
    [],
  );
}

function resolveCharacterCoverUrl(character: WorldbookCharacterLibraryEntry): string {
  const sources = resolveCharacterCoverSources(character);
  const sourceIndex = characterCoverSourceIndexes[character.entry.uid] ?? 0;
  return sources[sourceIndex] ?? '';
}

function onCharacterCoverError(character: WorldbookCharacterLibraryEntry) {
  const sources = resolveCharacterCoverSources(character);
  const sourceIndex = characterCoverSourceIndexes[character.entry.uid] ?? 0;
  if (sourceIndex < sources.length) characterCoverSourceIndexes[character.entry.uid] = sourceIndex + 1;
}

function detailGalleryKey(entryUid: number, imageIndex: number): string {
  return `${entryUid}:${imageIndex}`;
}

function resolveDetailGallerySources(image: GalleryImage): DetailGalleryMedia[] {
  return image.sources.reduce<DetailGalleryMedia[]>((sources, value) => {
    const media = normalizePortraitMediaUrlForBrowser(value);
    if (media && !sources.some(source => source.kind === media.kind && source.url === media.url)) {
      sources.push(media);
    }
    return sources;
  }, []);
}

function onDetailGalleryMediaError(imageIndex: number) {
  const character = detailCharacter.value;
  const image = detailCharacterGallery.value[imageIndex];
  if (!character || !image) return;

  const sources = resolveDetailGallerySources(image);
  const key = detailGalleryKey(character.entry.uid, imageIndex);
  const sourceIndex = detailGallerySourceIndexes[key] ?? 0;
  if (sourceIndex < sources.length) detailGallerySourceIndexes[key] = sourceIndex + 1;
}

function openCharacterDetails(character: WorldbookCharacterLibraryEntry) {
  Object.keys(detailGallerySourceIndexes).forEach(key => delete detailGallerySourceIndexes[key]);
  editingDetailBody.value = false;
  detailEntryDraft.value = '';
  detailEntryMessage.value = '';
  detailCharacterUid.value = character.entry.uid;
  delete detailExtensionGallery[character.entry.uid];
  if (character.profile.galleryExtension) {
    const expectedUid = character.entry.uid;
    void readGalleryPackProfile(character.profile.galleryExtension)
      .then(payload => {
        if (detailCharacterUid.value !== expectedUid || !payload) return;
        detailExtensionGallery[expectedUid] = payload.gallery;
      })
      .catch(error => {
        console.warn('[CharInfo Creator Manager] 角色详情扩展图库读取失败：', error);
      });
  }
  void nextTick(() => detailDialogRef.value?.focus());
}

function closeCharacterDetails() {
  editingDetailBody.value = false;
  detailEntryDraft.value = '';
  detailEntryMessage.value = '';
  detailCharacterUid.value = null;
  Object.keys(detailGallerySourceIndexes).forEach(key => delete detailGallerySourceIndexes[key]);
}

function startDetailBodyEdit() {
  if (!detailCharacter.value) return;
  detailEntryDraft.value = detailEntryBody.value;
  detailEntryMessage.value = '';
  editingDetailBody.value = true;
}

function cancelDetailBodyEdit() {
  editingDetailBody.value = false;
  detailEntryDraft.value = '';
  detailEntryMessage.value = '';
}

async function saveDetailEntryBody() {
  const character = detailCharacter.value;
  const worldbookName = selectedWorldbookName.value;
  if (!character || !worldbookName || savingDetailBody.value) return;

  savingDetailBody.value = true;
  detailEntryMessage.value = '正在保存目标条目的设定正文…';
  let expectedContent = '';
  try {
    const updatedWorldbook = await updateWorldbookWith(
      worldbookName,
      latestEntries => {
        const target = latestEntries.find(entry => entry.uid === character.entry.uid);
        if (!target) throw new Error(`找不到世界书条目 #${character.entry.uid}。`);

        const inspection = inspectManagedBlock(target.content);
        if (inspection.state === 'malformed' || inspection.state === 'multiple') throw new Error(inspection.reason);

        expectedContent = replaceCharacterEntryBody(
          target.content,
          inspection.state === 'valid' ? { start: inspection.start, end: inspection.end } : null,
          detailEntryDraft.value,
        );
        return latestEntries.map(entry =>
          entry.uid === character.entry.uid ? { ...entry, content: expectedContent } : entry,
        );
      },
      { render: 'immediate' },
    );
    const savedEntry = updatedWorldbook.find(entry => entry.uid === character.entry.uid);
    if (!savedEntry || savedEntry.content !== expectedContent) {
      throw new Error('条目正文保存后的读回验证失败。');
    }

    entries.value = updatedWorldbook;
    editingDetailBody.value = false;
    detailEntryDraft.value = '';
    detailEntryMessage.value = character.hasVisualProfile
      ? '设定正文已保存；视觉资料和条目参数保持不变。'
      : '设定正文已保存；条目 UID、启用状态和其他世界书参数保持不变。';
  } catch (error) {
    detailEntryMessage.value = `保存失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    savingDetailBody.value = false;
  }
}

function editDetailCharacter() {
  const character = detailCharacter.value;
  if (!character) return;

  closeCharacterDetails();
  viewMode.value = 'editor';
  selectEntry(character.entry);
  void nextTick(() => {
    void loadSelectedEntryProfile();
    goToStep(2);
  });
}

function switchManagerView(view: ManagerView) {
  if (viewMode.value === view) return;
  mobileCharacterLibraryFilterOpen.value = false;
  closeCharacterDetails();
  viewMode.value = view;
}

function onEscape() {
  if (mobileCharacterLibraryFilterOpen.value) {
    mobileCharacterLibraryFilterOpen.value = false;
    return;
  }
  if (detailCharacter.value) {
    if (editingDetailBody.value) {
      cancelDetailBodyEdit();
      return;
    }
    closeCharacterDetails();
    return;
  }
  emit('close');
}

const activeCharacterLibraryFilterLabel = computed(
  () => characterLibraryFilterOptions.find(option => option.value === characterLibraryFilter.value)?.label ?? '全部',
);

function setMobileCharacterLibraryFilter(filter: CharacterLibraryFilter) {
  characterLibraryFilter.value = filter;
  mobileCharacterLibraryFilterOpen.value = false;
}

const filteredEntries = computed(() => {
  const query = entrySearch.value.trim().toLocaleLowerCase();
  const selectedName = selectedEntry.value?.name || '';
  const isShowingSelectedName = selectedEntryUid.value !== null && entrySearch.value === selectedName;
  const matches =
    !query || isShowingSelectedName
      ? entries.value
      : entries.value.filter(entry => (entry.name || '').toLocaleLowerCase().includes(query));

  return matches
    .map((entry, originalIndex) => ({
      entry,
      originalIndex,
      preferred: /^\s*\[DLC\]\[角色\]/i.test(entry.name || ''),
    }))
    .sort((left, right) => Number(right.preferred) - Number(left.preferred) || left.originalIndex - right.originalIndex)
    .map(item => item.entry);
});

const entryInspection = computed(() =>
  selectedEntry.value ? inspectManagedBlock(selectedEntry.value.content) : { state: 'absent' as const },
);

const hasLegacyVisualEjs = computed(() => !!selectedEntry.value && hasUnmanagedVisualEjs(selectedEntry.value.content));

const entryStateClass = computed(() => {
  if (entryInspection.value.state === 'valid') return 'managed';
  if (entryInspection.value.state === 'malformed' || entryInspection.value.state === 'multiple') return 'blocked';
  if (hasLegacyVisualEjs.value) return 'blocked';
  return 'new';
});

const entryStateTitle = computed(() => {
  if (entryInspection.value.state === 'valid') return '已有视觉配置';
  if (entryInspection.value.state === 'malformed' || entryInspection.value.state === 'multiple')
    return '视觉配置需要修复';
  if (hasLegacyVisualEjs.value) return '检测到旧版视觉配置';
  return '可以添加视觉配置';
});

const entryStateDescription = computed(() => {
  if (entryInspection.value.state === 'valid') return '保存时只更新现有视觉配置。';
  if (entryInspection.value.state === 'malformed' || entryInspection.value.state === 'multiple') {
    return entryInspection.value.reason;
  }
  if (hasLegacyVisualEjs.value) return '暂时无法自动保存；请先备份并移除旧版视觉配置。';
  return '保存后不会改动角色原有设定。';
});

const validationErrors = computed(() => {
  const errors = validateProfile(toFullSerializableProfile());
  const reference = currentGalleryReference();
  if (useExtendedGallery.value) {
    if (reference) errors.push(...validateGalleryExtensionReference(reference));
    if (extendedGalleryImages.value.length === 0) {
      errors.push(`扩展图库模式至少需要 ${DEFAULT_EMBEDDED_GALLERY_LIMIT + 1} 张图片。`);
    }
  }
  return [...new Set(errors)];
});

const generatedCode = computed(() => {
  if (validationErrors.value.length > 0) return '';
  try {
    return buildManagedEjsBlock(toSerializableProfile());
  } catch {
    return '';
  }
});

const generatedGalleryPackJson = computed(() => {
  const reference = currentGalleryReference();
  if (!reference || validationErrors.value.length > 0 || extendedGalleryImages.value.length === 0) return '';
  try {
    return serializeGalleryPackWorkshopSource(reference, profile.characterName, extendedGalleryImages.value);
  } catch {
    return '';
  }
});

const writeBlocked = computed(
  () =>
    entryInspection.value.state === 'malformed' ||
    entryInspection.value.state === 'multiple' ||
    hasLegacyVisualEjs.value,
);

const canSave = computed(
  () =>
    !!selectedWorldbookName.value &&
    !!selectedEntry.value &&
    !writeBlocked.value &&
    validationErrors.value.length === 0 &&
    !saving.value,
);

function isCharacterWorldbook(worldbookName: string): boolean {
  return characterWorldbooks.value.includes(worldbookName);
}

function openWorldbookPicker() {
  worldbookPickerOpen.value = true;
  const selectedIndex = filteredWorldbooks.value.indexOf(selectedWorldbookName.value);
  highlightedWorldbookIndex.value = selectedIndex >= 0 ? selectedIndex : filteredWorldbooks.value.length > 0 ? 0 : -1;
}

function toggleWorldbookPicker() {
  if (worldbookPickerOpen.value) {
    worldbookPickerOpen.value = false;
    return;
  }
  openWorldbookPicker();
}

function onWorldbookSearchInput() {
  if (selectedWorldbookName.value && worldbookSearch.value !== selectedWorldbookName.value) {
    selectedWorldbookName.value = '';
  }
  worldbookPickerOpen.value = true;
  highlightedWorldbookIndex.value = filteredWorldbooks.value.length > 0 ? 0 : -1;
}

function onWorldbookPickerFocusout(event: FocusEvent) {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as Node | null;
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) worldbookPickerOpen.value = false;
}

function selectWorldbook(worldbookName: string) {
  selectedWorldbookName.value = worldbookName;
  worldbookSearch.value = worldbookName;
  worldbookPickerOpen.value = false;
}

function moveWorldbookHighlight(offset: -1 | 1) {
  if (!worldbookPickerOpen.value) openWorldbookPicker();
  const count = filteredWorldbooks.value.length;
  if (count === 0) return;
  highlightedWorldbookIndex.value = (highlightedWorldbookIndex.value + offset + count) % count;
}

function selectHighlightedWorldbook() {
  const worldbook = filteredWorldbooks.value[highlightedWorldbookIndex.value];
  if (worldbook) selectWorldbook(worldbook);
}

function openEntryPicker() {
  entryPickerOpen.value = true;
  const selectedIndex = filteredEntries.value.findIndex(entry => entry.uid === selectedEntryUid.value);
  highlightedEntryIndex.value = selectedIndex >= 0 ? selectedIndex : filteredEntries.value.length > 0 ? 0 : -1;
}

function toggleEntryPicker() {
  if (entryPickerOpen.value) {
    entryPickerOpen.value = false;
    return;
  }
  openEntryPicker();
}

function onEntrySearchInput() {
  if (selectedEntry.value && entrySearch.value !== (selectedEntry.value.name || '')) {
    selectedEntryUid.value = null;
  }
  entryPickerOpen.value = true;
  highlightedEntryIndex.value = filteredEntries.value.length > 0 ? 0 : -1;
}

function onEntryPickerFocusout(event: FocusEvent) {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as Node | null;
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) entryPickerOpen.value = false;
}

function selectEntry(entry: WorldbookEntry) {
  selectedEntryUid.value = entry.uid;
  entrySearch.value = entry.name || `未命名条目 #${entry.uid}`;
  entryPickerOpen.value = false;
}

async function toggleCharacterEntry(character: WorldbookCharacterLibraryEntry) {
  const worldbookName = selectedWorldbookName.value;
  const entryUid = character.entry.uid;
  if (!worldbookName || togglingEntryUids.has(entryUid)) return;

  const nextEnabled = !character.entry.enabled;
  togglingEntryUids.add(entryUid);
  characterToggleMessage.value = `正在${nextEnabled ? '启用' : '禁用'} ${
    character.profile.characterName || character.entry.name
  }…`;

  try {
    const updatedWorldbook = await updateWorldbookWith(
      worldbookName,
      latestEntries => setCharacterEntryEnabled(latestEntries, entryUid, nextEnabled),
      { render: 'immediate' },
    );
    const savedEntry = updatedWorldbook.find(entry => entry.uid === entryUid);
    if (!savedEntry || savedEntry.enabled !== nextEnabled) {
      throw new Error('条目开关后的读回验证失败。');
    }

    entries.value = updatedWorldbook;
    characterToggleMessage.value = `${character.profile.characterName || character.entry.name} 已${
      nextEnabled ? '启用' : '禁用'
    }。`;
  } catch (error) {
    characterToggleMessage.value = `切换失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    togglingEntryUids.delete(entryUid);
  }
}

function moveEntryHighlight(offset: -1 | 1) {
  if (!entryPickerOpen.value) openEntryPicker();
  const count = filteredEntries.value.length;
  if (count === 0) return;
  highlightedEntryIndex.value = (highlightedEntryIndex.value + offset + count) % count;
}

function selectHighlightedEntry() {
  const entry = filteredEntries.value[highlightedEntryIndex.value];
  if (entry) selectEntry(entry);
}

function onCustomizeColorsChange() {
  if (customizeColors.value) {
    profile.raceColor ||= DEFAULT_RACE_COLOR;
    profile.tierColor ||= DEFAULT_TIER_COLOR;
    return;
  }
  profile.raceColor = '';
  profile.tierColor = '';
}

function onExtendedGalleryChange() {
  galleryExtensionMessage.value = '';
  if (!useExtendedGallery.value) return;
  const defaults = defaultGalleryReference();
  galleryPackWorldbookName.value ||= defaults.worldbookName;
  galleryPackId.value ||= defaults.packId;
  galleryProfileId.value ||= defaults.profileId;
}

function isExtendedGalleryImage(index: number): boolean {
  return useExtendedGallery.value && index >= DEFAULT_EMBEDDED_GALLERY_LIMIT;
}

function applyEncounteredCharacterData(mvuData: unknown) {
  encounteredCharacters.value = collectEncounteredCharacters(mvuData);
}

async function loadEncounteredCharacterData() {
  const loadRevision = ++encounteredLoadRevision;
  const chatId = SillyTavern.getCurrentChatId();
  if (typeof Mvu === 'undefined') {
    if (loadRevision === encounteredLoadRevision) encounteredCharacters.value = [];
    return;
  }

  loadingEncounteredCharacters.value = true;
  try {
    await waitGlobalInitialized('Mvu');
    if (loadRevision !== encounteredLoadRevision || SillyTavern.getCurrentChatId() !== chatId) return;
    applyEncounteredCharacterData(Mvu.getMvuData({ type: 'message', message_id: 'latest' }));
  } catch (error) {
    if (loadRevision !== encounteredLoadRevision || SillyTavern.getCurrentChatId() !== chatId) return;
    encounteredCharacters.value = [];
    console.warn('[CharInfo Creator Manager] 无法读取当前聊天 MVU 角色资料：', error);
  } finally {
    if (loadRevision === encounteredLoadRevision) loadingEncounteredCharacters.value = false;
  }
}

async function loadWorldbooks() {
  loadingWorldbooks.value = true;
  loadError.value = '';
  saveState.value = 'idle';
  let initialEntriesLoaded = false;
  try {
    currentCharacterName.value = getCurrentCharacterName() || '';
    if (!currentCharacterName.value) throw new Error('请先在 SillyTavern 打开一张角色卡。');

    const binding = getCharWorldbookNames('current');
    characterWorldbooks.value = buildWorldbookList([binding.primary, ...binding.additional], []);
    worldbooks.value = buildWorldbookList(characterWorldbooks.value, getWorldbookNames());
    if (worldbooks.value.length === 0) throw new Error('酒馆中没有可用的世界书。');

    if (!worldbooks.value.includes(selectedWorldbookName.value)) {
      selectWorldbook(worldbooks.value[0]);
      await nextTick();
      await selectedWorldbookEntriesLoad;
    } else {
      worldbookSearch.value = selectedWorldbookName.value;
      await loadEntries(selectedWorldbookName.value);
    }
    initialEntriesLoaded = true;
  } catch (error) {
    worldbooks.value = [];
    characterWorldbooks.value = [];
    entries.value = [];
    selectedWorldbookName.value = '';
    worldbookSearch.value = '';
    worldbookPickerOpen.value = false;
    selectedEntryUid.value = null;
    loadError.value = error instanceof Error ? error.message : String(error);
  } finally {
    loadingWorldbooks.value = false;
  }

  if (!initialEntriesLoaded) return;
  await nextTick();
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
  void loadEncounteredCharacterData();
}

async function loadEntries(worldbookName: string) {
  const loadRevision = ++entriesLoadRevision;
  if (!worldbookName) {
    entries.value = [];
    selectedEntryUid.value = null;
    entrySearch.value = '';
    entryPickerOpen.value = false;
    loadingEntries.value = false;
    return;
  }

  loadingEntries.value = true;
  loadError.value = '';
  characterToggleMessage.value = '';
  Object.keys(characterCoverSourceIndexes).forEach(uid => delete characterCoverSourceIndexes[Number(uid)]);
  try {
    const loadedEntries = await getWorldbook(worldbookName);
    if (loadRevision !== entriesLoadRevision || selectedWorldbookName.value !== worldbookName) return;
    entries.value = loadedEntries;
    if (!entries.value.some(entry => entry.uid === selectedEntryUid.value)) {
      selectedEntryUid.value = null;
      entrySearch.value = '';
    }
  } catch (error) {
    if (loadRevision !== entriesLoadRevision || selectedWorldbookName.value !== worldbookName) return;
    entries.value = [];
    selectedEntryUid.value = null;
    loadError.value = `无法读取世界书：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    if (loadRevision === entriesLoadRevision) loadingEntries.value = false;
  }
}

async function loadSelectedEntryProfile() {
  saveState.value = 'idle';
  const entry = selectedEntry.value;
  if (!entry) {
    replaceProfile(createEmptyProfile());
    saveMessage.value = '选择世界书条目后即可写入。';
    return;
  }

  const inspection = inspectManagedBlock(entry.content);
  if (inspection.state === 'valid') {
    replaceProfile(inspection.profile);
    saveMessage.value = '已读取该条目的现有视觉配置。';
    const reference = inspection.profile.galleryExtension;
    if (reference) {
      const expectedWorldbook = selectedWorldbookName.value;
      const expectedUid = entry.uid;
      loadingGalleryExtension.value = true;
      galleryExtensionMessage.value = '正在读取扩展图库…';
      try {
        const payload = await readGalleryPackProfile(reference);
        if (selectedWorldbookName.value !== expectedWorldbook || selectedEntryUid.value !== expectedUid) return;
        if (!payload) {
          galleryExtensionMessage.value = '扩展图库尚未安装或对应条目不存在；基础图片仍可正常使用。';
        } else {
          profile.gallery.push(...toEditableProfile({ ...createEmptyProfile(), gallery: payload.gallery }).gallery);
          galleryExtensionMessage.value = `已读取 ${payload.gallery.length} 张扩展图库图片。`;
        }
      } catch (error) {
        if (selectedWorldbookName.value === expectedWorldbook && selectedEntryUid.value === expectedUid) {
          galleryExtensionMessage.value = `扩展图库读取失败：${error instanceof Error ? error.message : String(error)}`;
        }
      } finally {
        if (selectedWorldbookName.value === expectedWorldbook && selectedEntryUid.value === expectedUid) {
          loadingGalleryExtension.value = false;
        }
      }
    }
    return;
  }

  replaceProfile(createEmptyProfile(parseWorldbookCharacterDisplayName(entry.name)));
  saveMessage.value =
    inspection.state === 'malformed' || inspection.state === 'multiple'
      ? inspection.reason
      : hasUnmanagedVisualEjs(entry.content)
        ? '检测到旧版视觉配置，暂时无法自动保存。'
        : '该角色尚未配置视觉资料；已从条目名称预填姓名。';
}

function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
}

function canVisitStep(step: StepId): boolean {
  if (step === 1) return true;
  if (!selectedEntry.value) return false;
  if (step === 2) return true;
  return profile.characterName.trim().length > 0;
}

function isStepComplete(step: StepId): boolean {
  if (step === 1) return !!selectedEntry.value;
  if (step === 2) return profile.characterName.trim().length > 0;
  if (step === 3) return furthestStep.value > 3;
  if (step === 4) return configuredGalleryCount.value > 0 && furthestStep.value > 4;
  return saveState.value === 'success';
}

function goToStep(step: StepId) {
  if (!canVisitStep(step)) return;
  activeStep.value = step;
  furthestStep.value = Math.max(furthestStep.value, step) as StepId;
  if (!isNarrowViewport()) return;

  void nextTick(() => {
    document.getElementById(`manager-step-${step}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });
}

function addImage() {
  const number = profile.gallery.length + 1;
  profile.gallery.push({
    id: nextImageId++,
    title: number === 1 ? '主立绘' : `备用立绘 ${number}`,
    sources: [''],
    previewSourceIndex: 0,
  });
}

function addImageSource(image: EditableGalleryImage) {
  image.sources.push('');
}

function removeImageSource(image: EditableGalleryImage, sourceIndex: number) {
  if (image.sources.length <= 1) return;
  image.sources.splice(sourceIndex, 1);
  image.previewSourceIndex = 0;
}

function removeImage(index: number) {
  if (profile.gallery.length <= 1) return;
  profile.gallery.splice(index, 1);
}

function moveImage(index: number, offset: -1 | 1) {
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= profile.gallery.length) return;
  const [image] = profile.gallery.splice(index, 1);
  profile.gallery.splice(targetIndex, 0, image);
}

async function copyEjs() {
  if (!generatedCode.value) return;
  try {
    const method = await copyTextWithFallback(generatedCode.value, {
      writeText: text => navigator.clipboard.writeText(text),
      fallbackCopy: copyTextWithDocumentSelection,
    });
    saveState.value = 'success';
    saveMessage.value = method === 'fallback' ? '写入内容已复制。' : '写入内容已复制到剪贴板。';
  } catch {
    saveState.value = 'error';
    saveMessage.value = '浏览器阻止了自动复制，请展开上方内容后手动复制，或直接保存。';
  }
}

function galleryPackFileName(): string {
  const replaceUnsafeFileNameCharacter = (character: string) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f || '<>:"/\\|?*'.includes(character) ? '-' : character;
  };
  const safeName =
    Array.from(profile.characterName.trim())
      .map(replaceUnsafeFileNameCharacter)
      .join('')
      .replace(/\s+/g, '_')
      .slice(0, 64) || 'character';
  return `${safeName}.char-info-gallery-workshop.json`;
}

function downloadGalleryPackJson() {
  if (!generatedGalleryPackJson.value) return;
  const blob = new Blob([generatedGalleryPackJson.value], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = galleryPackFileName();
  anchor.click();
  URL.revokeObjectURL(url);
  galleryPackDownloadMessage.value = `已下载 ${anchor.download}；其中只有禁用的扩展图库条目，不会注入提示词。`;
}

async function saveToEntry() {
  const worldbookName = selectedWorldbookName.value;
  const entry = selectedEntry.value;
  if (!canSave.value || !entry) return;

  const confirmed = window.confirm(
      useExtendedGallery.value
      ? `确定保存角色视觉资料和扩展图库？\n\n角色世界书：${worldbookName}\n角色条目：${entry.name || `#${entry.uid}`}\n图库世界书：${galleryPackWorldbookName.value}`
      : `确定将角色视觉资料写入以下条目？\n\n世界书：${worldbookName}\n条目：${entry.name || `#${entry.uid}`}`,
  );
  if (!confirmed) return;

  saving.value = true;
  saveState.value = 'idle';
    saveMessage.value = '正在读取条目并安全写入…';

  try {
    const normalizedProfile = normalizeProfile(toSerializableProfile());
    const galleryReference = currentGalleryReference();
    const latestEntries = await getWorldbook(worldbookName);
    const latestEntry = latestEntries.find(item => item.uid === entry.uid);
    if (!latestEntry) throw new Error(`找不到世界书条目 #${entry.uid}。`);
    upsertManagedEjsBlock(latestEntry.content, normalizedProfile);

    const previousGallery = galleryReference ? await readGalleryPackProfile(galleryReference) : null;
    let galleryWriteAttempted = false;
    let updatedWorldbook: WorldbookEntry[];
    try {
      if (galleryReference) {
        saveMessage.value = '正在保存独立扩展图库…';
        galleryWriteAttempted = true;
        await saveGalleryPackProfile(galleryReference, normalizedProfile.characterName, extendedGalleryImages.value);
        galleryExtensionMessage.value = `扩展图库已保存到“${galleryReference.worldbookName}”。`;
      }

      saveMessage.value = '正在读取角色条目并安全写入…';
      updatedWorldbook = await updateWorldbookWith(
        worldbookName,
        entries => {
          const target = entries.find(item => item.uid === entry.uid);
          if (!target) throw new Error(`找不到世界书条目 #${entry.uid}。`);
          return entries.map(item =>
            item.uid === entry.uid ? { ...item, content: upsertManagedEjsBlock(item.content, normalizedProfile) } : item,
          );
        },
        { render: 'immediate' },
      );
    } catch (error) {
      if (galleryReference && galleryWriteAttempted) {
        try {
          if (previousGallery) {
            await saveGalleryPackProfile(galleryReference, previousGallery.characterName, previousGallery.gallery);
          } else {
            await deleteGalleryPackProfile(galleryReference);
          }
        } catch (rollbackError) {
          throw new Error(
            `${error instanceof Error ? error.message : String(error)}；扩展图库恢复失败：${
              rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
            }`,
          );
        }
      }
      throw error;
    }

    entries.value = updatedWorldbook;
    const savedEntry = updatedWorldbook.find(item => item.uid === entry.uid);
    if (!savedEntry || inspectManagedBlock(savedEntry.content).state !== 'valid') {
      throw new Error('写入后的读回验证失败。');
    }

    saveState.value = 'success';
    saveMessage.value = galleryReference
      ? `保存成功：角色条目保留 ${embeddedGalleryCount.value} 张基础图片，${extendedGalleryImages.value.length} 张图片已写入独立图库世界书。`
      : '保存成功：角色视觉资料已写入，原条目其余内容保持不变。';
    console.info('[CharInfo Creator Manager] Managed EJS saved', {
      worldbook: worldbookName,
      entryUid: entry.uid,
      entryName: entry.name,
    });
  } catch (error) {
    console.error('[CharInfo Creator Manager] Failed to save managed EJS:', error);
    saveState.value = 'error';
    saveMessage.value = `保存失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    saving.value = false;
  }
}

watch(selectedWorldbookName, worldbookName => {
  closeCharacterDetails();
  characterSearch.value = '';
  characterLibraryFilter.value = 'all';
  mobileCharacterLibraryFilterOpen.value = false;
  characterRaceFilter.value = 'all';
  entrySearch.value = '';
  entryPickerOpen.value = false;
  selectedWorldbookEntriesLoad = loadEntries(worldbookName);
});
watch(selectedEntryUid, uid => {
  if (uid === null) {
    void loadSelectedEntryProfile();
    furthestStep.value = 1;
    goToStep(1);
    return;
  }

  void loadSelectedEntryProfile();
  furthestStep.value = 2;
  goToStep(2);
});

onMounted(() => {
  void loadWorldbooks();
  chatChangedListener = eventOn(tavern_events.CHAT_CHANGED, () => {
    emit('close');
  });
  if (typeof Mvu !== 'undefined') {
    mvuUpdatedListener = eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
      void loadEncounteredCharacterData();
    });
  }
});

onBeforeUnmount(() => {
  encounteredLoadRevision += 1;
  chatChangedListener?.stop();
  chatChangedListener = null;
  mvuUpdatedListener?.stop();
  mvuUpdatedListener = null;
});
</script>

<style scoped>
:global(#char-info-creator-manager) {
  width: 100%;
  height: 100%;
}

:global(#char-info-creator-manager),
:global(#char-info-creator-manager *) {
  box-sizing: border-box;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  color: inherit;
}

.manager-root {
  --bg: #0b0e13;
  --surface: #131720;
  --surface-raised: #1a202b;
  --surface-soft: #202735;
  --border: #30394a;
  --border-strong: #445169;
  --text: #f4f7fb;
  --text-secondary: #b8c1d0;
  --text-muted: #7f8ba0;
  --primary: #77d6c7;
  --primary-strong: #4fb8a8;
  --primary-soft: rgb(119 214 199 / 12%);
  --danger: #ff8491;
  --danger-soft: rgb(255 132 145 / 12%);
  --warning: #f4c36a;
  --success: #78d59c;

  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  padding: 24px;
  overflow: auto;
  place-items: center;
  color: var(--text);
  font-family:
    Inter,
    'Noto Sans SC',
    'Microsoft YaHei',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.backdrop {
  position: fixed;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  background: rgb(3 5 8 / 78%);
  border: 0;
  backdrop-filter: blur(9px);
  cursor: default;
}

.character-detail-layer {
  position: fixed;
  z-index: 3;
  inset: 0;
  display: grid;
  padding: 24px;
  overflow: auto;
  place-items: center;
  background: rgb(3 5 8 / 86%);
  backdrop-filter: blur(12px);
}

.character-detail-dialog {
  display: flex;
  width: min(1240px, 100%);
  max-height: min(900px, calc(100vh - 48px));
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  background: radial-gradient(circle at 0 0, rgb(119 214 199 / 9%), transparent 30rem), var(--bg);
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  outline: none;
  box-shadow: 0 30px 90px rgb(0 0 0 / 62%);
}

.character-detail-header {
  display: flex;
  padding: 20px 24px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  background: rgb(19 23 32 / 96%);
  border-bottom: 1px solid var(--border);
}

.character-detail-header h2,
.character-detail-header p {
  margin: 0;
}

.character-detail-header h2 {
  margin-top: 7px;
  font-size: clamp(24px, 3.5vw, 36px);
}

.character-detail-header p {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 11px;
}

.character-detail-status {
  display: inline-flex;
  padding: 4px 8px;
  color: var(--success);
  background: rgb(120 213 156 / 10%);
  border: 1px solid rgb(120 213 156 / 25%);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
}

.character-detail-status.disabled {
  color: var(--text-muted);
  background: rgb(127 139 160 / 10%);
  border-color: rgb(127 139 160 / 24%);
}

.character-detail-body {
  display: grid;
  min-height: 0;
  overflow: hidden;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
}

.character-detail-gallery,
.character-detail-content {
  min-height: 0;
  padding: 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.character-detail-content {
  background: rgb(19 23 32 / 70%);
  border-left: 1px solid var(--border);
}

.character-detail-section-heading {
  display: flex;
  margin-bottom: 14px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.character-detail-section-heading span {
  color: var(--primary);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.character-detail-section-heading h3 {
  margin: 3px 0 0;
  font-size: 18px;
}

.character-detail-section-heading b {
  color: var(--text-muted);
  font-size: 10px;
}

.character-detail-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.character-detail-gallery-grid figure {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.character-detail-media {
  display: grid;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  place-items: center;
  color: var(--text-muted);
  background: var(--surface-soft);
  font-size: 11px;
}

.character-detail-media img,
.character-detail-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.character-detail-gallery-grid figcaption {
  display: flex;
  padding: 9px 10px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.character-detail-gallery-grid figcaption strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-detail-gallery-grid figcaption small {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 9px;
}

.character-detail-gallery-empty {
  margin: 0;
  padding: 18px;
  color: var(--text-muted);
  text-align: center;
  background: var(--surface-raised);
  border: 1px dashed var(--border);
  border-radius: 10px;
  font-size: 11px;
}

.character-detail-content-note {
  margin: 0 0 12px;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.6;
}

.character-detail-content pre {
  min-height: 260px;
  margin: 0;
  padding: 15px;
  overflow: auto;
  color: var(--text-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #0b0e13;
  border: 1px solid var(--border);
  border-radius: 11px;
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  line-height: 1.65;
}

.character-detail-editor {
  width: 100%;
  min-height: 300px;
  padding: 15px;
  resize: vertical;
  outline: none;
  color: var(--text-secondary);
  background: #0b0e13;
  border: 1px solid var(--border-strong);
  border-radius: 11px;
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  line-height: 1.65;
}

.character-detail-editor:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-soft);
}

.character-detail-editor-message {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.5;
}

.character-detail-footer {
  display: flex;
  padding: 14px 20px;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  background: rgb(19 23 32 / 96%);
  border-top: 1px solid var(--border);
}

.manager-dialog {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(1420px, 100%);
  max-height: calc(100% - 8px);
  overflow: hidden;
  flex-direction: column;
  background: radial-gradient(circle at 0 0, rgb(119 214 199 / 8%), transparent 28rem), var(--bg);
  border: 1px solid var(--border-strong);
  border-radius: 20px;
  box-shadow: 0 28px 90px rgb(0 0 0 / 55%);
}

.dialog-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 26px;
  background: rgb(19 23 32 / 94%);
  border-bottom: 1px solid var(--border);
}

.dialog-header h1 {
  margin: 0;
}

.header-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.dialog-header h1 {
  font-size: clamp(22px, 3vw, 31px);
  line-height: 1.2;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.phase-badge {
  padding: 5px 8px;
  color: var(--primary);
  background: var(--primary-soft);
  border: 1px solid rgb(119 214 199 / 25%);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.manager-view-switch {
  display: flex;
  padding: 3px;
  gap: 3px;
  background: rgb(8 11 16 / 72%);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.manager-view-switch button {
  display: inline-flex;
  min-height: 34px;
  padding: 6px 10px;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.manager-view-switch button:hover,
.manager-view-switch button.active {
  color: var(--text);
  background: var(--primary-soft);
}

.manager-view-switch button.active {
  box-shadow: inset 0 0 0 1px rgb(119 214 199 / 34%);
}

.manager-view-switch svg {
  width: 16px;
  height: 16px;
  fill: currentcolor;
}

.close-button,
.icon-button {
  display: grid;
  width: 40px;
  height: 40px;
  padding: 0;
  place-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
}

.close-button {
  font-size: 25px;
  line-height: 1;
}

.dialog-body {
  display: grid;
  min-height: 0;
  overflow: hidden;
  grid-template-columns: 272px minmax(0, 1fr);
}

.library-page {
  min-height: 0;
  padding: 12px 22px 28px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: rgb(74 90 112 / 88%) rgb(10 15 23 / 76%);
  scrollbar-width: thin;
}

.library-page::-webkit-scrollbar {
  width: 8px;
}

.library-page::-webkit-scrollbar-track {
  background: rgb(10 15 23 / 76%);
}

.library-page::-webkit-scrollbar-thumb {
  background: rgb(74 90 112 / 88%);
  border: 2px solid rgb(10 15 23 / 76%);
  border-radius: 999px;
}

.library-header {
  display: grid;
  min-height: 84px;
  padding: 12px 28px;
  grid-template-columns: minmax(250px, 1fr) minmax(320px, 430px) minmax(290px, 1fr);
  gap: 26px;
}

.library-title-icon {
  width: 31px;
  height: 31px;
  flex: 0 0 auto;
  fill: none;
  stroke: var(--primary);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.library-header-worldbook {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  gap: 8px;
}

.library-header-worldbook label {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.library-header-worldbook label > span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
}

.library-header-worldbook select {
  width: 100%;
  min-height: 40px;
  font-size: 13px;
  font-weight: 700;
}

.library-header .header-actions {
  grid-column: 3;
  grid-row: 1;
  justify-content: flex-end;
}

.library-header .character-source-switch {
  grid-column: 1 / -1;
  grid-row: 2;
}

.library-header .library-header-worldbook {
  grid-column: 2;
  grid-row: 1;
}

.library-header .manager-view-switch button {
  min-width: 112px;
  min-height: 40px;
  justify-content: center;
}

.library-header .close-button,
.library-refresh-button {
  width: 42px;
  height: 42px;
}

.library-worldbook-actions {
  display: flex;
  width: min(100%, 560px);
  margin: 0 0 18px auto;
  align-items: flex-end;
  gap: 8px;
}

.library-worldbook-actions .field {
  flex: 1;
}

.library-page > .character-library {
  margin: 0;
}

.library-page-empty {
  display: flex;
  min-height: 220px;
  margin: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  text-align: center;
}

.library-page-empty strong {
  color: var(--text-secondary);
  font-size: 15px;
}

.library-page-empty span {
  color: var(--text-muted);
  font-size: 11px;
}

.target-panel,
.editor-panel {
  min-height: 0;
  overflow-y: auto;
}

.wizard-step-nav {
  display: flex;
  min-height: 0;
  padding: 22px 16px 18px;
  overflow-y: auto;
  flex-direction: column;
  gap: 8px;
  background: rgb(19 23 32 / 78%);
  border-right: 1px solid var(--border);
}

.wizard-nav-header {
  display: flex;
  margin-bottom: 7px;
  padding: 0 7px 12px;
  align-items: center;
  justify-content: space-between;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.wizard-nav-header strong {
  color: var(--primary);
}

.wizard-step-nav button {
  display: grid;
  width: 100%;
  min-height: 66px;
  padding: 10px;
  align-items: center;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 11px;
  color: var(--text-secondary);
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
}

.wizard-step-nav button:hover:not(:disabled) {
  background: rgb(255 255 255 / 4%);
  border-color: var(--border);
}

.wizard-step-nav button.active {
  color: var(--text);
  background: linear-gradient(110deg, var(--primary-soft), rgb(119 214 199 / 4%));
  border-color: rgb(119 214 199 / 35%);
  box-shadow: inset 3px 0 0 var(--primary);
}

.wizard-step-index {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--text-muted);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 9px;
  font-size: 12px;
  font-weight: 900;
}

.wizard-step-nav button.active .wizard-step-index {
  color: #071310;
  background: var(--primary);
  border-color: var(--primary);
}

.wizard-step-nav button.complete:not(.active) .wizard-step-index {
  color: var(--success);
  background: rgb(120 213 156 / 9%);
  border-color: rgb(120 213 156 / 30%);
}

.wizard-step-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.wizard-step-copy strong,
.wizard-step-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wizard-step-copy strong {
  font-size: 13px;
}

.wizard-step-copy small {
  color: var(--text-muted);
  font-size: 10px;
}

.wizard-step-short-label {
  display: none;
}

.wizard-nav-context {
  display: flex;
  margin-top: auto;
  padding: 13px;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.wizard-nav-context small,
.wizard-nav-context span {
  color: var(--text-muted);
  font-size: 10px;
}

.wizard-nav-context strong {
  overflow: hidden;
  color: var(--text);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-section-toggle {
  display: none;
}

.wizard-step-section.is-collapsed {
  display: none;
}

.target-panel,
.editor-panel {
  grid-column: 2;
  grid-row: 1;
}

.target-panel {
  padding: 32px 40px 36px;
  background: transparent;
  border-right: 0;
}

.target-panel-content {
  width: min(100%, 820px);
  margin: 0 auto;
}

.editor-panel {
  padding: 0;
}

.editor-panel > .wizard-step-section {
  width: min(100%, 1080px);
  min-height: 100%;
  margin: 0 auto;
  padding: 32px 40px 0;
}

.wizard-step-actions {
  display: flex;
  margin-top: 30px;
  padding-top: 20px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border);
}

.wizard-step-actions > span {
  flex: 1;
}

.section-title-row,
.output-heading,
.save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.step-label {
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

h2 {
  margin: 0;
  font-size: 17px;
}

.section-title-row h2,
.section-heading h2,
.output-heading h2 {
  font-size: 22px;
}

.current-character,
.target-summary,
.safety-note {
  padding: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.current-character {
  display: flex;
  margin: 18px 0;
  flex-direction: column;
  gap: 3px;
}

.current-character span {
  color: var(--text-muted);
  font-size: 11px;
}

.current-character strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-library {
  margin: 0;
}

.character-library-toolbar {
  display: flex;
  position: sticky;
  z-index: 2;
  top: 0;
  margin: -12px 0 18px;
  padding: 12px 0 18px;
  flex-direction: column;
  gap: 18px;
  background: var(--bg);
}

.library-search-field {
  display: flex;
  min-height: 48px;
  padding: 0 13px;
  align-items: center;
  gap: 10px;
  background: linear-gradient(90deg, rgb(23 33 49 / 96%), rgb(20 28 42 / 92%));
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.library-search-field:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-soft);
}

.library-search-field svg {
  width: 21px;
  height: 21px;
  flex: 0 0 auto;
  fill: none;
  stroke: var(--text-muted);
  stroke-linecap: round;
  stroke-width: 1.8;
}

.library-search-field input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  color: var(--text);
  background: transparent;
  border: 0;
  outline: 0;
  font-size: 14px;
}

.library-search-field input::placeholder {
  color: #7d8799;
}

.character-library-control-row {
  display: grid;
  align-items: center;
  grid-template-columns: minmax(360px, 1fr) minmax(220px, 290px) auto minmax(132px, auto);
  gap: 18px;
}

.mobile-character-library-filter {
  display: none;
}

.character-library-filter-buttons {
  display: flex;
  min-width: 0;
  padding: 6px 10px;
  align-items: center;
  gap: 8px;
  background: rgb(18 28 43 / 70%);
  border: 1px solid rgb(40 57 81 / 58%);
  border-radius: 8px;
}

.character-library-control-label {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.character-library-filter-buttons button {
  min-height: 32px;
  padding: 6px 15px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: 12px;
  cursor: pointer;
}

.character-library-filter-buttons button[aria-pressed='true'] {
  color: #071310;
  background: var(--primary);
  border-color: var(--primary);
  font-weight: 800;
}

.character-library-view-options {
  display: flex;
  align-items: center;
  gap: 8px;
}

.character-library-layout-switch {
  display: flex;
  padding: 4px;
  gap: 2px;
  background: rgb(18 28 43 / 72%);
  border: 1px solid rgb(40 57 81 / 58%);
  border-radius: 8px;
}

.character-library-layout-switch button {
  display: inline-flex;
  min-height: 34px;
  padding: 7px 13px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.character-library-layout-switch svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.character-library-layout-switch button[aria-pressed='true'] {
  color: var(--primary);
  background: rgb(27 61 65 / 62%);
  border-color: rgb(65 207 198 / 58%);
  box-shadow: inset 0 0 0 1px rgb(65 207 198 / 15%);
  font-weight: 800;
}

.character-card-columns {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-muted);
  font-size: 10px;
}

.character-card-columns select {
  width: auto;
  min-width: 100px;
  min-height: 34px;
  padding: 6px 28px 6px 9px;
  font-size: 10px;
}

.character-race-filter {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: var(--text-muted);
  font-size: 12px;
}

.character-race-filter > span {
  white-space: nowrap;
}

.character-race-filter select {
  width: 100%;
  min-height: 40px;
  padding: 7px 32px 7px 12px;
  font-size: 12px;
}

.character-library-summary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.character-library-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.character-library-card {
  display: grid;
  min-width: 0;
  min-height: 104px;
  padding: 10px;
  align-items: center;
  grid-template-columns: 74px minmax(0, 1fr) auto;
  gap: 10px;
  background: linear-gradient(145deg, rgb(22 34 50 / 96%), rgb(18 28 43 / 96%));
  border: 1px solid rgb(42 59 83 / 80%);
  border-radius: 8px;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
}

.character-library-card.selected {
  border-color: var(--primary-strong);
  box-shadow: 0 0 0 2px var(--primary-soft);
}

.character-library-card.encountered:not(.selected) {
  border-color: rgb(65 207 198 / 38%);
}

.character-library-card.disabled {
  opacity: 0.62;
}

.character-cover-button {
  display: grid;
  width: 74px;
  height: 82px;
  padding: 0;
  overflow: hidden;
  place-items: center;
  color: var(--text-muted);
  background: linear-gradient(145deg, #26364b, #1b283a);
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.character-cover-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.character-cover-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  padding: 6px;
  place-items: center;
  align-content: center;
  gap: 2px;
  color: #abb5c3;
  background: linear-gradient(145deg, #2a3a4f, #1d2b3d);
}

.character-cover-silhouette {
  width: 51px;
  height: 61px;
  fill: #b7c0cc;
  filter: drop-shadow(0 5px 7px rgb(0 0 0 / 24%));
}

.character-library-card-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
}

.character-library-card-copy:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
  border-radius: 5px;
}

.character-library-card-copy strong,
.character-library-card-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-library-card-copy strong {
  color: #e4eaf1;
  font-size: 14px;
  font-weight: 800;
}

.character-library-card-copy small {
  color: var(--text-muted);
  font-size: 10px;
}

.character-library-card-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 4px;
}

.character-library-card-meta i {
  padding: 2px 5px;
  overflow: hidden;
  color: var(--text-muted);
  background: rgb(11 19 31 / 52%);
  border-radius: 5px;
  font-size: 9px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-library-card-meta i.encountered {
  color: var(--success);
  background: rgb(120 213 156 / 10%);
}

.character-library-card-meta i.visual-missing {
  color: #a4afbe;
  background: rgb(142 157 179 / 10%);
}

.character-entry-toggle {
  position: relative;
  width: 38px;
  height: 22px;
  padding: 2px;
  background: #313846;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  cursor: pointer;
  transition: background 160ms ease;
}

.character-entry-toggle span {
  display: block;
  width: 16px;
  height: 16px;
  background: var(--text-secondary);
  border-radius: 50%;
  transition:
    transform 160ms ease,
    background 160ms ease;
}

.character-entry-toggle[aria-checked='true'] {
  background: var(--primary-strong);
  border-color: var(--primary);
}

.character-entry-toggle[aria-checked='true'] span {
  background: #f4fffd;
  transform: translateX(16px);
}

.character-library-feedback:empty {
  display: none;
}

.character-library-no-results {
  margin: 12px 0 0;
  padding: 14px;
  color: var(--text-muted);
  text-align: center;
  background: var(--surface-raised);
  border-radius: 9px;
  font-size: 11px;
}

.character-library-empty {
  margin: 18px 0;
  padding: 13px 15px;
  color: var(--text-muted);
  background: var(--surface-raised);
  border: 1px dashed var(--border);
  border-radius: 11px;
  font-size: 11px;
}

.character-library-grid.image-card-view {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.character-library-grid.image-card-view.card-columns-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.character-library-grid.image-card-view.card-columns-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.character-library-grid.image-card-view.card-columns-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.character-library-grid.image-card-view.card-columns-5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.character-library-grid.image-card-view.card-columns-6 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.image-card-view .character-library-card {
  position: relative;
  display: grid;
  padding: 0;
  align-items: stretch;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0;
  overflow: hidden;
}

.image-card-view .character-cover-button {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 5;
  border-radius: 0;
}

.image-card-view .character-cover-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  background: linear-gradient(145deg, var(--surface-soft), var(--surface-raised));
}

.image-card-view .character-library-card-copy {
  padding: 10px 11px 12px;
}

.image-card-view .character-library-card-copy strong {
  white-space: normal;
}

.image-card-view .character-entry-toggle {
  position: absolute;
  z-index: 1;
  top: 9px;
  right: 9px;
  background: rgb(15 23 42 / 88%);
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.target-panel .field + .field {
  margin-top: 15px;
}

.field-label {
  display: flex;
  min-height: 18px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.field-label b {
  color: var(--danger);
}

.field-label small {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
}

input,
select,
textarea {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  color: var(--text);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 10px;
  outline: none;
}

textarea {
  resize: vertical;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--primary-strong);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.entry-combobox {
  position: relative;
}

.entry-combobox > input {
  padding-right: 44px;
}

.entry-picker-button {
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  width: 40px;
  height: 40px;
  padding: 0;
  place-items: center;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.entry-options {
  position: absolute;
  z-index: 10;
  top: calc(100% + 7px);
  right: 0;
  left: 0;
  max-height: min(42vh, 360px);
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #151a23;
  border: 1px solid var(--border-strong);
  border-radius: 11px;
  box-shadow: 0 18px 44px rgb(0 0 0 / 48%);
}

.entry-options button {
  display: flex;
  width: 100%;
  min-height: 44px;
  padding: 9px 10px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.entry-options button:hover,
.entry-options button.highlighted,
.entry-options button[aria-selected='true'] {
  background: var(--primary-soft);
}

.entry-options button[aria-selected='true'] {
  color: var(--primary);
}

.entry-options button span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-options button small {
  flex: 0 0 auto;
  padding: 2px 5px;
  color: var(--warning);
  background: rgb(244 195 106 / 10%);
  border-radius: 5px;
  font-size: 9px;
}

.entry-empty {
  margin: 0;
  padding: 18px 10px;
  color: var(--text-muted);
  text-align: center;
  font-size: 12px;
}

button:disabled,
input:disabled,
select:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.target-summary {
  display: flex;
  margin-top: 18px;
  align-items: flex-start;
  gap: 10px;
}

.target-summary p,
.safety-note p,
.section-heading p,
.output-heading p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.status-dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-top: 5px;
  background: var(--text-muted);
  border-radius: 50%;
}

.status-dot.managed {
  background: var(--success);
  box-shadow: 0 0 10px rgb(120 213 156 / 55%);
}

.status-dot.new {
  background: var(--primary);
}

.status-dot.blocked {
  background: var(--danger);
}

.safety-note {
  margin-top: 16px;
  border-color: rgb(119 214 199 / 22%);
}

.safety-note strong {
  color: var(--primary);
  font-size: 12px;
}

.message.error,
.save-feedback .error {
  color: var(--danger);
}

.form-section + .form-section,
.output-section {
  margin-top: 0;
  padding-top: 32px;
  border-top: 0;
}

.section-heading {
  display: flex;
  margin-bottom: 17px;
  align-items: flex-start;
  gap: 12px;
}

.step-number {
  display: grid;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #071310;
  background: var(--primary);
  border-radius: 9px;
  font-size: 12px;
  font-weight: 900;
}

.section-heading p {
  margin-top: 2px;
}

code {
  color: var(--primary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.field-grid,
.color-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-full {
  grid-column: 1 / -1;
}

.color-custom-toggle {
  display: flex;
  min-height: 58px;
  margin-bottom: 14px;
  padding: 11px 13px;
  align-items: center;
  gap: 11px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 11px;
  cursor: pointer;
}

.color-custom-toggle input {
  width: 19px;
  min-height: 19px;
  height: 19px;
  margin: 0;
  padding: 0;
  accent-color: var(--primary-strong);
}

.color-custom-toggle span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.color-custom-toggle strong {
  color: var(--text-secondary);
  font-size: 12px;
}

.color-custom-toggle small {
  color: var(--text-muted);
  font-size: 11px;
}

.color-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.color-control {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 9px;
}

.color-control input[type='color'] {
  padding: 5px;
  cursor: pointer;
}

.gallery-storage-panel {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
}

.gallery-storage-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.gallery-storage-toggle input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--primary);
}

.gallery-storage-toggle span {
  display: grid;
  gap: 3px;
}

.gallery-storage-toggle strong {
  color: var(--text-secondary);
  font-size: 12px;
}

.gallery-storage-toggle small,
.gallery-storage-message {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.gallery-storage-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.gallery-storage-fields .field-full {
  grid-column: 1 / -1;
}

.gallery-storage-message {
  margin: 0;
}

.gallery-storage-errors {
  margin: 0;
  padding: 10px 12px 10px 30px;
  border: 1px solid color-mix(in srgb, #ef8585 48%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, #ef8585 9%, transparent);
  color: #f2a2a2;
  font-size: 11px;
  line-height: 1.55;
}

.image-host-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
}

.image-host-links > div {
  display: grid;
  flex: 1 1 260px;
  gap: 2px;
}

.image-host-links strong {
  color: var(--text);
  font-size: 0.82rem;
}

.image-host-links small {
  color: var(--muted);
  font-size: 0.7rem;
}

.image-host-links a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 7px 11px;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  color: var(--primary);
  font-size: 0.75rem;
  text-decoration: none;
}

.image-host-links a:hover,
.image-host-links a:focus-visible {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.gallery-list {
  display: grid;
  gap: 12px;
}

.gallery-card {
  display: grid;
  padding: 12px;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  gap: 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 13px;
}

.image-preview {
  position: relative;
  display: grid;
  min-height: 104px;
  overflow: hidden;
  place-items: center;
  color: var(--text-muted);
  background: var(--surface-soft);
  border-radius: 9px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  min-height: 104px;
  object-fit: cover;
}

.image-preview b {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 3px 6px;
  color: #071310;
  background: var(--primary);
  border-radius: 999px;
  font-size: 9px;
}

.image-preview .gallery-location-badge {
  color: var(--text);
  background: rgba(15, 23, 42, 0.82);
}

.image-preview .gallery-location-badge.is-extension {
  color: #071310;
  background: var(--primary);
}

.gallery-fields {
  display: grid;
  grid-template-columns: minmax(140px, 0.42fr) minmax(220px, 1fr);
  gap: 10px;
}

.source-list {
  display: grid;
  gap: 9px;
}

.source-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  gap: 7px;
}

.remove-source-button,
.add-source-button {
  color: var(--text-secondary);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.remove-source-button {
  min-height: 42px;
  color: var(--danger);
}

.add-source-button {
  min-height: 36px;
  padding: 7px 10px;
  justify-self: start;
  color: var(--primary);
}

.gallery-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gallery-actions button {
  width: 38px;
  height: 32px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.gallery-actions .danger {
  color: var(--danger);
}

.add-image-button,
.secondary-button,
.primary-button {
  min-height: 42px;
  padding: 9px 15px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
}

.add-image-button {
  width: 100%;
  margin-top: 11px;
  color: var(--primary);
  background: transparent;
  border: 1px dashed var(--border-strong);
}

.secondary-button {
  background: var(--surface-soft);
  border: 1px solid var(--border);
}

.primary-button {
  color: #071310;
  background: var(--primary);
  border: 1px solid var(--primary);
}

.primary-button:hover:not(:disabled),
.add-image-button:hover {
  background: var(--primary-strong);
}

.output-section {
  padding-bottom: 20px;
}

.output-heading p {
  margin-top: 1px;
}

details {
  margin-top: 12px;
  overflow: hidden;
  background: #080a0f;
  border: 1px solid var(--border);
  border-radius: 11px;
}

summary {
  padding: 11px 13px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

pre {
  max-height: 280px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  color: #cfe8e2;
  border-top: 1px solid var(--border);
  font:
    11px/1.65 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  white-space: pre;
}

.gallery-pack-download-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  margin-top: 14px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: linear-gradient(120deg, var(--primary-soft), rgb(255 255 255 / 2%));
}

.gallery-pack-download-panel h3,
.gallery-pack-download-panel p {
  margin: 0;
}

.gallery-pack-download-panel h3 {
  margin-top: 3px;
  font-size: 15px;
}

.gallery-pack-download-panel p {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.6;
}

.gallery-pack-download-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.gallery-pack-download-status,
.gallery-pack-download-message {
  grid-column: 1 / -1;
  margin: 0 !important;
  border-radius: 8px;
  padding: 9px 11px;
  font-weight: 700;
}

.gallery-pack-download-status {
  border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
  background: color-mix(in srgb, var(--primary) 9%, transparent);
  color: var(--primary) !important;
}

.gallery-pack-download-status.error {
  border: 1px solid color-mix(in srgb, #ef8585 48%, transparent);
  background: color-mix(in srgb, #ef8585 9%, transparent);
  color: #f2a2a2 !important;
}

.gallery-pack-download-message {
  color: var(--primary) !important;
}

.save-bar {
  position: sticky;
  bottom: 0;
  margin: 28px -40px 0;
  padding: 15px 40px;
  background: rgb(11 14 19 / 96%);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(14px);
}

.save-feedback {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  color: var(--text-muted);
  font-size: 11px;
}

.save-feedback strong {
  overflow: hidden;
  color: var(--text-secondary);
  text-overflow: ellipsis;
}

.save-feedback .success {
  color: var(--success);
}

@media (max-width: 900px) {
  .manager-root {
    padding: 10px;
    overflow: hidden;
  }

  .character-detail-layer {
    padding: 10px;
  }

  .character-detail-dialog {
    height: calc(100% - 2px);
    max-height: calc(100% - 2px);
  }

  .character-detail-body {
    display: block;
    overflow-y: auto;
  }

  .character-detail-gallery,
  .character-detail-content {
    overflow: visible;
  }

  .gallery-pack-download-panel {
    grid-template-columns: 1fr;
  }

  .gallery-pack-download-actions {
    justify-content: flex-start;
  }

  .character-detail-content {
    border-top: 1px solid var(--border);
    border-left: 0;
  }

  .manager-dialog {
    height: calc(100% - 2px);
    max-height: calc(100% - 2px);
    border-radius: 14px;
  }

  .dialog-header {
    padding: 17px;
  }

  .library-header {
    grid-template-columns: minmax(170px, 1fr) minmax(230px, 330px) auto;
    gap: 14px;
  }

  .library-header .manager-view-switch button {
    min-width: auto;
  }

  .character-library-control-row {
    grid-template-columns: minmax(300px, 1fr) minmax(190px, 240px) auto;
    gap: 12px;
  }

  .character-library-summary {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }

  .character-library-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .phase-badge {
    display: none;
  }

  .dialog-body {
    display: block;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .library-page {
    padding: 20px;
  }

  .library-worldbook-actions {
    width: 100%;
    min-width: 0;
  }

  .wizard-step-nav {
    position: sticky;
    z-index: 5;
    top: 0;
    display: grid;
    padding: 8px 10px;
    background: rgb(11 14 19 / 96%);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 8px 24px rgb(0 0 0 / 24%);
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .wizard-nav-header,
  .wizard-step-copy,
  .wizard-nav-context {
    display: none;
  }

  .wizard-step-nav button {
    display: flex;
    min-width: 0;
    min-height: 48px;
    padding: 5px 2px;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    color: var(--text-muted);
    background: transparent;
    border: 0;
    border-radius: 9px;
    cursor: pointer;
  }

  .wizard-step-index {
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: 7px;
    font-size: 11px;
    font-weight: 900;
  }

  .wizard-step-short-label {
    display: block;
    overflow: hidden;
    max-width: 100%;
    font-size: 10px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wizard-step-nav button.active {
    color: var(--primary);
    background: var(--primary-soft);
  }

  .wizard-step-nav button.active .wizard-step-index {
    color: #07110f;
    background: var(--primary);
    border-color: var(--primary);
  }

  .target-panel,
  .editor-panel {
    overflow: visible;
  }

  .target-panel {
    padding: 0;
    border-right: 0;
  }

  .wizard-step-section {
    scroll-margin-top: 65px;
  }

  .wizard-step-section.is-collapsed {
    display: none;
  }

  .mobile-section-toggle {
    display: flex;
    width: 100%;
    min-height: 76px;
    padding: 16px 17px 12px;
    align-items: center;
    gap: 12px;
    text-align: left;
    background: linear-gradient(180deg, rgb(119 214 199 / 8%), transparent);
    border-bottom: 1px solid var(--border);
  }

  .mobile-section-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }

  .mobile-section-copy strong {
    overflow: hidden;
    color: var(--text);
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-section-copy small {
    overflow: hidden;
    color: var(--text-muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .target-panel-content {
    padding: 17px;
  }

  .target-panel .section-title-row,
  .form-section > .section-heading {
    display: none;
  }

  .entry-options {
    max-height: min(46vh, 320px);
  }

  .editor-panel {
    padding: 0;
  }

  .editor-panel > .wizard-step-section {
    width: 100%;
    min-height: 0;
    padding: 0;
  }

  .form-section + .form-section,
  .output-section {
    margin-top: 0;
    padding-top: 0;
    border-top: 0;
  }

  .mobile-step-content,
  .output-section details {
    margin-right: 17px;
    margin-left: 17px;
  }

  .output-section > .output-heading {
    margin: 17px;
  }

  .output-section > .output-heading h2 {
    font-size: 15px;
  }

  .mobile-step-content {
    padding-top: 17px;
    padding-bottom: 18px;
  }

  .wizard-step-actions {
    display: flex;
    margin-top: 22px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .wizard-step-actions > span {
    flex: 1;
  }

  .wizard-step-actions .primary-button,
  .wizard-step-actions .secondary-button {
    min-height: 44px;
  }

  .wizard-step-actions-final {
    margin: 20px 17px 0;
  }

  .save-bar {
    position: static;
    margin: 16px 0 0;
    padding: 16px 17px;
    background: var(--surface);
    backdrop-filter: none;
  }
}

@media (max-width: 620px) {
  .manager-root {
    padding: 0;
  }

  .character-detail-layer {
    padding: 0;
  }

  .character-detail-dialog {
    width: 100%;
    height: 100%;
    max-height: 100%;
    border-width: 0;
    border-radius: 0;
  }

  .character-detail-header {
    padding: 14px;
  }

  .character-detail-header h2 {
    font-size: 23px;
  }

  .character-detail-gallery,
  .character-detail-content {
    padding: 15px;
  }

  .character-detail-gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .character-detail-footer {
    align-items: stretch;
    flex-direction: column-reverse;
  }

  .character-detail-footer button {
    width: 100%;
  }

  .library-page {
    padding: 14px;
  }

  .library-header {
    display: flex;
    min-height: 0;
    padding: 13px 14px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .library-header .header-title {
    flex: 1 1 auto;
  }

  .library-header-worldbook {
    order: 3;
    width: 100%;
  }

  .character-source-switch {
    order: 2;
    width: 100%;
  }

  .library-header .header-actions {
    flex: 0 0 auto;
  }

  .library-header .manager-view-switch button {
    min-width: 0;
    padding: 6px 8px;
  }

  .library-header .manager-view-switch svg {
    display: none;
  }

  .library-header .manager-view-switch button:first-child {
    display: none;
  }

  .library-header .manager-view-switch button:nth-child(2) svg {
    display: block;
  }

  .character-library-control-row {
    grid-template-columns: 96px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .character-library-filter-buttons {
    display: none;
  }

  .mobile-character-library-filter {
    position: relative;
    display: block;
    min-width: 0;
  }

  .mobile-character-library-filter-trigger {
    display: grid;
    width: 100%;
    min-height: 40px;
    padding: 6px 9px;
    align-items: center;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 5px;
    color: var(--text-secondary);
    background: rgb(18 28 43 / 70%);
    border: 1px solid rgb(40 57 81 / 58%);
    border-radius: 8px;
    font-size: 11px;
    text-align: left;
  }

  .mobile-character-library-filter-trigger > span:first-child {
    color: var(--text-muted);
  }

  .mobile-character-library-filter-trigger strong {
    overflow: hidden;
    color: var(--primary);
    font-size: 12px;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-character-library-filter-menu {
    position: absolute;
    z-index: 5;
    top: calc(100% + 6px);
    left: 0;
    display: grid;
    min-width: 170px;
    padding: 5px;
    gap: 2px;
    background: #121c2b;
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    box-shadow: 0 10px 24px rgb(0 0 0 / 36%);
  }

  .mobile-character-library-filter-menu button {
    min-height: 34px;
    padding: 6px 9px;
    color: var(--text-secondary);
    background: transparent;
    border: 0;
    border-radius: 5px;
    font-size: 12px;
    text-align: left;
  }

  .mobile-character-library-filter-menu button[aria-checked='true'] {
    color: #071310;
    background: var(--primary);
    font-weight: 800;
  }

  .character-race-filter {
    grid-column: 2;
  }

  .character-library-view-options {
    grid-column: 3;
    justify-content: flex-end;
  }

  .character-library-summary {
    display: none;
  }

  .character-library-view-options {
    align-items: stretch;
    flex-direction: row;
  }

  .character-card-columns {
    display: none;
  }

  .character-library-layout-switch button {
    min-width: 36px;
    padding: 7px;
  }

  .character-library-layout-switch span {
    display: none;
  }

  .character-library-grid.image-card-view,
  .character-library-grid.image-card-view.card-columns-2,
  .character-library-grid.image-card-view.card-columns-3,
  .character-library-grid.image-card-view.card-columns-4,
  .character-library-grid.image-card-view.card-columns-5,
  .character-library-grid.image-card-view.card-columns-6 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .character-library-grid {
    grid-template-columns: 1fr;
  }

  .character-library-card {
    min-height: 82px;
    padding: 8px;
    grid-template-columns: 58px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .character-cover-button {
    width: 58px;
    height: 64px;
  }

  .character-cover-silhouette {
    width: 40px;
    height: 49px;
  }

  .character-race-filter {
    justify-content: space-between;
  }

  .character-race-filter select {
    flex: 1;
  }

  .manager-dialog {
    width: 100%;
    height: 100%;
    max-height: 100%;
    border-width: 0;
    border-radius: 0;
  }

  .dialog-header {
    position: sticky;
    z-index: 3;
    top: 0;
    align-items: center;
    padding: 12px 14px;
  }

  .dialog-header h1 {
    font-size: 19px;
  }

  .manager-view-switch button {
    min-width: 38px;
    padding: 6px;
    justify-content: center;
  }

  .manager-view-switch span {
    display: none;
  }

  .field-grid,
  .color-grid,
  .gallery-storage-fields,
  .gallery-fields {
    grid-template-columns: 1fr;
  }

  .gallery-card {
    grid-template-columns: 76px minmax(0, 1fr);
  }

  .image-preview,
  .image-preview img {
    min-height: 112px;
  }

  .gallery-actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
  }

  .gallery-actions button {
    width: 44px;
    height: 44px;
  }

  .save-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .output-heading {
    align-items: flex-start;
  }

  .primary-button {
    width: 100%;
  }
}

.manager-root.library-detail-open {
  padding: 8px;
  overflow: hidden;
  background: transparent;
}

.library-detail-open .manager-dialog.library-dialog {
  width: min(390px, calc(100% - 16px));
  height: min(680px, calc(100% - 16px));
  max-height: none;
  border-radius: 18px;
  transition:
    left 180ms ease,
    transform 180ms ease;
}

.library-detail-open .library-dialog .library-header {
  display: flex;
  min-height: 0;
  padding: 13px 14px;
  flex-wrap: wrap;
  gap: 10px;
}

.library-detail-open .library-dialog .header-title {
  order: 1;
  flex: 1 1 auto;
}

.library-detail-open .library-dialog .header-title h1 {
  font-size: 20px;
}

.library-detail-open .library-dialog .library-title-icon {
  width: 24px;
  height: 24px;
}

.library-detail-open .library-dialog .header-actions {
  order: 1;
  flex: 0 0 auto;
}

.library-detail-open .library-dialog .manager-view-switch button:first-child {
  display: none;
}

.library-detail-open .library-dialog .manager-view-switch button {
  min-width: 0;
  min-height: 36px;
  padding: 6px 9px;
}

.library-detail-open .library-dialog .close-button,
.library-detail-open .library-dialog .library-refresh-button {
  width: 38px;
  height: 38px;
}

.character-source-switch {
  display: grid;
  padding: 3px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px;
  background: rgb(8 11 16 / 72%);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.character-source-switch button {
  min-height: 34px;
  padding: 6px 8px;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}

.character-source-switch button:hover,
.character-source-switch button.active {
  color: var(--primary);
  background: var(--primary-soft);
  border-color: rgb(119 214 199 / 34%);
}

.library-detail-open .library-dialog .library-header-worldbook {
  order: 3;
  width: 100%;
}

.library-detail-open .library-dialog .library-page {
  display: grid;
  min-height: 0;
  padding: 12px;
  grid-template-columns: 1fr;
  overflow-y: auto;
}

.library-detail-open .library-dialog .character-library-toolbar {
  margin-bottom: 12px;
  gap: 10px;
}

.library-detail-open .library-dialog .library-search-field {
  min-height: 42px;
}

.library-detail-open .library-dialog .character-library-control-row {
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 8px;
}

.library-detail-open .library-dialog .character-library-filter-buttons {
  padding: 5px;
  flex-wrap: wrap;
}

.library-detail-open .library-dialog .character-library-filter-buttons button {
  min-height: 30px;
  padding: 5px 9px;
}

.library-detail-open .library-dialog .character-race-filter select {
  flex: 1;
}

.library-detail-open .library-dialog .character-library-view-options {
  justify-content: space-between;
}

.library-detail-open .library-dialog .character-library-summary {
  justify-content: flex-start;
}

.library-detail-open .library-dialog .character-library-grid {
  grid-template-columns: 1fr;
}

.library-detail-open .library-dialog .character-library-card {
  min-height: 82px;
  padding: 8px;
  grid-template-columns: 58px minmax(0, 1fr) auto;
}

.library-detail-open .library-dialog .character-cover-button {
  width: 58px;
  height: 64px;
}

.library-detail-open .library-dialog .character-cover-silhouette {
  width: 40px;
  height: 49px;
}

.library-detail-open .manager-dialog.library-dialog {
  position: absolute;
  top: 50%;
  left: max(12px, calc(50% - 810px));
  transform: translateY(-50%);
}

.library-detail-open .character-detail-layer {
  padding: 12px 12px 12px 422px;
  overflow: hidden;
  background: transparent;
  backdrop-filter: none;
  pointer-events: none;
}

.library-detail-open .character-detail-dialog {
  width: min(1100px, 100%);
  max-height: min(820px, calc(100% - 24px));
  pointer-events: auto;
}

@media (max-width: 900px) {
  .manager-root.library-detail-open {
    overflow: auto;
  }

  .library-detail-open .manager-dialog.library-dialog {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
  }

  .library-detail-open .character-detail-layer {
    padding: 8px;
    background: rgb(3 5 8 / 82%);
    backdrop-filter: blur(10px);
    pointer-events: auto;
  }

  .library-detail-open .character-detail-dialog {
    width: 100%;
    max-height: calc(100% - 16px);
  }
}
</style>
