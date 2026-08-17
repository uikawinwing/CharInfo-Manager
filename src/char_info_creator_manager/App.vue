<template>
  <div class="manager-root" @keydown.esc="onEscape">
    <button class="backdrop" type="button" aria-label="关闭管理器" @click="emit('close')"></button>

    <main class="manager-dialog" role="dialog" aria-modal="true" aria-labelledby="manager-title">
      <header class="dialog-header">
        <div class="header-title">
          <h1 id="manager-title">角色视觉编辑器</h1>
          <span class="phase-badge">{{ activeStep }}/{{ steps.length }}</span>
        </div>

        <div class="header-actions">
          <button
            v-if="props.onReturnToWorldbookLibrary"
            class="secondary-button return-library-button"
            type="button"
            @click="props.onReturnToWorldbookLibrary"
          >
            ← 返回角色库
          </button>
          <button class="secondary-button viewer-preview-trigger" type="button" :disabled="!canPreviewViewer" @click="openViewerPreview">
            预览
          </button>
          <button class="close-button" type="button" aria-label="关闭" @click="emit('close')">×</button>
        </div>
      </header>

      <div class="dialog-body">
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

              <div v-if="legacyVisualInspection.state === 'importable'" class="migration-banner">
                <strong>检测到可迁移的旧版 CharInfo 视觉配置</strong>
                <p>已自动预填到新版编辑器；当前世界书尚未修改。</p>
                <p>保存时会精确移除已识别的 {{ legacyVisualInspection.sourceRoot }} 写入，并升级为 char_info.profiles v2。</p>
                <ul v-if="legacyVisualInspection.warnings.length > 0">
                  <li v-for="warning in legacyVisualInspection.warnings" :key="warning">{{ warning }}</li>
                </ul>
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
                <small>{{ profile.characterName || '填写姓名、性别与种族' }}</small>
              </span>
            </div>

            <div class="section-heading">
              <span class="step-number">2</span>
              <div>
                <h2>角色资料</h2>
              </div>
            </div>

            <div id="manager-step-2-content" class="mobile-step-content">
              <section class="metadata-editor-panel basic-profile-panel">
                <div class="metadata-editor-heading">
                  <div>
                    <h3>基本资料</h3>
                  </div>
                </div>

                <div class="metadata-field-grid">
                  <label class="field">
                    <span class="field-label">
                      角色姓名 <b>*</b>
                      <small :class="{ warning: profile.characterName.length > 12 }">
                        {{ profile.characterName.length }} 字
                      </small>
                    </span>
                    <input
                      v-model="profile.characterName"
                      type="text"
                      maxlength="80"
                      autocomplete="off"
                      aria-describedby="character-name-guidance"
                      placeholder="例如：傲雪"
                    />
                    <small
                      id="character-name-guidance"
                      class="field-guidance"
                      :class="{ warning: profile.characterName.length > 12 }"
                    >
                      建议中文姓名不超过 12 字；英文姓名可适当放宽。
                    </small>
                  </label>
                  <label class="field">
                    <span class="field-label">性别 <small>选填</small></span>
                    <input v-model="profile.metadata.sex" type="text" autocomplete="off" placeholder="例如：女" />
                  </label>
                  <label class="field">
                    <span class="field-label">种族 <small>选填</small></span>
                    <input v-model="profile.metadata.race" type="text" autocomplete="off" placeholder="例如：东方龙裔" />
                  </label>
                </div>
              </section>

              <section class="metadata-editor-panel presentation-editor-panel">
                <div class="metadata-editor-heading">
                  <div>
                    <h3>角色展示文案</h3>
                  </div>
                </div>
                <label class="field">
                  <span class="field-label">
                    登场台词
                    <small :class="{ warning: profile.entranceQuote.length > 48 }">
                      {{ profile.entranceQuote.length }} 字
                    </small>
                  </span>
                  <textarea
                    v-model="profile.entranceQuote"
                    rows="2"
                    aria-describedby="entrance-quote-guidance"
                    placeholder="例如：霜雪会记住每一道剑痕。"
                  ></textarea>
                  <small
                    id="entrance-quote-guidance"
                    class="field-guidance"
                    :class="{ warning: profile.entranceQuote.length > 48 }"
                  >
                    建议 12–32 字；超过 48 字时，首页最多显示三行，完整内容仍会保存。
                  </small>
                </label>
              </section>

              <section class="story-editor-panel">
                <div class="story-editor-heading">
                  <div>
                    <h3>角色故事</h3>
                  </div>
                  <button type="button" class="secondary-button story-add-button" @click="addStorySection">＋ 添加故事段落</button>
                </div>

                <p v-if="profile.metadata.storySections.length === 0" class="story-editor-empty">
                  尚未添加故事段落。
                </p>

                <div v-else class="story-section-list">
                  <article
                    v-for="(section, index) in profile.metadata.storySections"
                    :key="section.id"
                    class="story-section-card"
                  >
                    <header class="story-section-card-header">
                      <strong>故事段落 {{ index + 1 }}</strong>
                      <div class="story-section-actions">
                        <button type="button" title="上移" :disabled="index === 0" @click="moveStorySection(index, -1)">↑</button>
                        <button
                          type="button"
                          title="下移"
                          :disabled="index === profile.metadata.storySections.length - 1"
                          @click="moveStorySection(index, 1)"
                        >
                          ↓
                        </button>
                        <button type="button" class="danger" title="删除" @click="removeStorySection(index)">×</button>
                      </div>
                    </header>
                    <label class="field">
                      <span class="field-label">段落标题</span>
                      <input v-model="section.title" type="text" autocomplete="off" placeholder="例如：初遇 · 雪夜" />
                    </label>
                    <label class="field">
                      <span class="field-label">故事内容</span>
                      <textarea v-model="section.content" rows="6" placeholder="填写故事内容。"></textarea>
                    </label>
                    <small class="field-guidance">标题和内容需同时填写。</small>
                  </article>
                </div>
              </section>

              <section class="metadata-editor-panel author-editor-panel">
                <div class="metadata-editor-heading">
                  <div>
                    <h3>作者署名</h3>
                  </div>
                </div>

                <div class="metadata-field-grid author-metadata-grid">
                  <label class="field">
                    <span class="field-label">作者 <small>选填</small></span>
                    <input v-model="profile.metadata.author" type="text" autocomplete="off" placeholder="例如：作者名 / 社团名" />
                  </label>
                  <label class="field">
                    <span class="field-label">版本 / 更新标记 <small>选填</small></span>
                    <input v-model="profile.metadata.version" type="text" autocomplete="off" placeholder="例如：v0.0.3 / 0816" />
                  </label>
                  <label class="field field-full">
                    <span class="field-label">作者说明 <small>选填</small></span>
                    <textarea
                      v-model="profile.metadata.authorNote"
                      rows="3"
                      placeholder="简单介绍这个角色、创作重点、版本备注或推荐阅读方式。"
                    ></textarea>
                  </label>
                </div>
              </section>

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
                <button type="button" class="primary-button" @click="goToStep(4)">下一步：相册与头像</button>
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
                <strong>相册与头像</strong>
                <small>{{ configuredGalleryCount }} 张已填写图片</small>
              </span>
            </div>

            <div class="section-heading">
              <span class="step-number">4</span>
              <div>
                <h2>相册与头像</h2>
                <p>第一张图片会作为主立绘；状态栏头像可直接从相册选择，或单独使用一张头像图片。</p>
              </div>
            </div>

            <div id="manager-step-4-content" class="mobile-step-content">
              <section class="avatar-source-panel">
                <div class="metadata-editor-heading">
                  <div>
                    <h3>状态栏头像</h3>
                    <p>通常直接复用一张相册图片；只有需要单独头像时才填写专用 URL。</p>
                  </div>
                </div>

                <div class="avatar-source-options" role="radiogroup" aria-label="状态栏头像来源">
                  <label class="avatar-source-option" :class="{ active: avatarSourceMode === 'gallery' }">
                    <input
                      :checked="avatarSourceMode === 'gallery'"
                      type="radio"
                      name="avatar-source-mode"
                      value="gallery"
                      @change="setAvatarSourceMode('gallery')"
                    />
                    <span>
                      <strong>从相册选择</strong>
                      <small>推荐；所选图片的首选地址会作为状态栏头像。</small>
                    </span>
                  </label>
                  <label class="avatar-source-option" :class="{ active: avatarSourceMode === 'custom' }">
                    <input
                      :checked="avatarSourceMode === 'custom'"
                      type="radio"
                      name="avatar-source-mode"
                      value="custom"
                      @change="setAvatarSourceMode('custom')"
                    />
                    <span>
                      <strong>使用独立头像</strong>
                      <small>适合专门裁切的头像图标。</small>
                    </span>
                  </label>
                </div>

                <label v-if="avatarSourceMode === 'gallery'" class="field avatar-gallery-picker">
                  <span class="field-label">选择相册图片</span>
                  <select v-model.number="avatarGalleryImageId" @change="syncAvatarUrlFromGallery">
                    <option v-for="(image, index) in profile.gallery" :key="image.id" :value="image.id">
                      第 {{ index + 1 }} 张 · {{ image.title || `图片 ${index + 1}` }}
                    </option>
                  </select>
                  <small class="field-guidance">如果这张图片的首选地址之后修改，头像会同步更新。</small>
                </label>

                <label v-else class="field avatar-custom-url">
                  <span class="field-label">独立头像 URL <small>选填</small></span>
                  <input
                    v-model="profile.avatarUrl"
                    type="url"
                    inputmode="url"
                    autocomplete="off"
                    placeholder="https://…/avatar.webp"
                  />
                </label>
              </section>

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
                    <video
                      v-if="galleryPreviewMediaKind(image) === 'video'"
                      :key="`${image.id}:${image.previewSourceIndex}:${resolveGalleryPreviewUrl(image)}`"
                      :ref="element => setGalleryPreviewElement(image, element)"
                      :data-gallery-image-id="image.id"
                      :src="resolveGalleryPreviewUrl(image)"
                      autoplay
                      muted
                      loop
                      playsinline
                      preload="auto"
                      @loadeddata="onGalleryPreviewLoad(image)"
                      @error="onGalleryPreviewError(image)"
                    ></video>
                    <img
                      v-else-if="resolveGalleryPreviewUrl(image)"
                      :key="`${image.id}:${image.previewSourceIndex}:${resolveGalleryPreviewUrl(image)}`"
                      :ref="element => setGalleryPreviewElement(image, element)"
                      :data-gallery-image-id="image.id"
                      :src="resolveGalleryPreviewUrl(image)"
                      :alt="image.title || `第 ${index + 1} 张立绘`"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                      @load="onGalleryPreviewLoad(image)"
                      @error="onGalleryPreviewError(image)"
                    />
                    <span v-else aria-hidden="true">▧</span>
                    <span v-if="galleryPreviewMediaKind(image) === 'video'" class="gallery-media-kind">视频</span>
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
                            @input="onGallerySourceInput(image)"
                          />
                          <span class="source-order-actions">
                            <button
                              type="button"
                              class="source-order-button"
                              :disabled="sourceIndex === 0"
                              :aria-label="`上移第 ${sourceIndex + 1} 个图片地址`"
                              title="提高优先级"
                              @click="moveImageSource(image, sourceIndex, -1)"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              class="source-order-button"
                              :disabled="sourceIndex === image.sources.length - 1"
                              :aria-label="`下移第 ${sourceIndex + 1} 个图片地址`"
                              title="降低优先级"
                              @click="moveImageSource(image, sourceIndex, 1)"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              class="remove-source-button"
                              :disabled="image.sources.length === 1"
                              :aria-label="`删除第 ${sourceIndex + 1} 个图片地址`"
                              title="删除"
                              @click="removeImageSource(image, sourceIndex)"
                            >
                              ×
                            </button>
                          </span>
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
                <span v-if="applyMessage">{{ applyMessage }}</span>
              </div>
              <div class="save-actions">
                <button
                  v-if="saveState === 'success'"
                  class="secondary-button"
                  type="button"
                  :disabled="applyingSavedProfile"
                  @click="applySavedProfileToCurrentChat"
                >
                  {{ applyingSavedProfile ? '正在应用…' : '应用已保存版本到当前聊天' }}
                </button>
                <button class="primary-button" type="submit" :disabled="!canSave">
                  {{
                    saving
                      ? '正在写入…'
                      : legacyVisualInspection.state === 'importable'
                        ? '升级并保存新版配置'
                        : '保存并写入所选条目'
                  }}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>

      <section v-if="viewerPreviewOpen" class="creator-viewer-preview" role="dialog" aria-modal="true" aria-label="角色卡预览">
        <header class="dialog-header creator-viewer-preview-header">
          <strong>角色卡预览 · {{ profile.characterName || '未命名角色' }}</strong>
          <div class="creator-viewer-preview-toolbar">
            <div class="creator-viewer-preview-source-state" aria-live="polite">
              <span>预览资料</span>
              <strong>{{ viewerPreviewSource === 'pasted' ? '自定义 CharInfo' : '示例资料' }}</strong>
            </div>
            <button class="secondary-button creator-viewer-preview-source-toggle" type="button" @click="toggleViewerPreviewSource">
              {{ viewerPreviewSource === 'pasted' ? '使用示例资料' : '粘贴自己的 CharInfo' }}
            </button>
            <button class="close-button" type="button" aria-label="关闭预览" @click="closeViewerPreview">×</button>
          </div>
        </header>
        <div v-if="viewerPreviewSource === 'pasted'" class="creator-viewer-preview-source">
          <label class="creator-viewer-preview-input">
            <span class="field-label">预览资料（完整 &lt;char_info&gt; 或纯 YAML）</span>
            <textarea
              v-model="viewerPreviewPastedText"
              rows="7"
              spellcheck="false"
              placeholder="<char_info>\n姓名: ...\n...\n</char_info>"
            ></textarea>
            <small class="field-guidance">只用于当前预览；不会写入世界书、聊天变量或执行 EJS。</small>
          </label>
        </div>
        <div ref="viewerPreviewStageRef" class="creator-viewer-preview-stage">
          <div class="creator-viewer-preview-frame" :style="viewerPreviewFrameStyle">
            <div ref="viewerPreviewCanvasRef" class="creator-viewer-preview-canvas" :style="viewerPreviewCanvasStyle">
              <div v-if="viewerPreviewSource === 'pasted' && !viewerPreviewPastedText.trim()" class="creator-viewer-preview-empty">
                粘贴完整 &lt;char_info&gt; 或纯 YAML 后，将在这里显示真实角色卡预览。
              </div>
              <ViewerApp
                v-else
                :key="viewerPreviewKey"
                :yaml-text="viewerPreviewYaml"
                :preview-data="viewerPreviewSource === 'sample' ? viewerPreviewSampleData : undefined"
                :message-id="-1"
                :debug-enabled="props.debugEnabled"
                :visual-config-override="viewerPreviewVisualOverride"
                embedded
                read-only
                preview-mode
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import {
  normalizePortraitMediaUrlForBrowser,
  type NormalizedPortraitMedia,
  type PortraitMediaKind,
} from '../char_info_viewer/services/imageUrl';
import {
  createMediaSourceTimeout,
  nextMediaSourceIndex,
  type MediaSourceTimeout,
} from '../char_info_viewer/services/mediaSourceFallback';
import {
  createStableGalleryId,
  DEFAULT_EMBEDDED_GALLERY_LIMIT,
  validateGalleryExtensionReference,
  type GalleryExtensionReference,
} from '../char_info_shared/galleryPack';
import {
  parseWorldbookCharacterDisplayName,
  parseWorldbookCharacterEntryTitle,
} from '../char_info_shared/characterEntryLibrary';
import { copyTextWithDocumentSelection, copyTextWithFallback } from './clipboard';
import {
  buildManagedEjsBlock,
  createEmptyProfile,
  DEFAULT_RACE_COLOR,
  DEFAULT_TIER_COLOR,
  extractManagedEjsBlock,
  hasUnmanagedVisualEjs,
  inspectManagedBlock,
  isHttpsUrl,
  normalizeProfile,
  validateProfile,
  type CharacterProfileMetadata,
  type CharacterStorySection,
  type CharacterVisualProfile,
  type GalleryImage,
} from '../char_info_shared/characterVisualProfile';
import {
  inspectLegacyVisualProfile,
  upsertManagedEjsBlockWithLegacyMigration,
} from '../char_info_shared/legacyVisualProfile';
import {
  deleteGalleryPackProfile,
  readGalleryPackProfile,
  saveGalleryPackProfile,
  serializeGalleryPackWorkshopSource,
} from './galleryPackStorage';
import { buildWorldbookList } from '../char_info_shared/worldbookList';
import ViewerApp from '../char_info_viewer/App.vue';
import { evaluateManagedEjs } from './ejsRuntime';
import {
  buildCreatorViewerPreviewData,
  buildCreatorViewerVisualOverride,
  resolveCreatorViewerPreviewYaml,
  type CreatorViewerPreviewSource,
} from './viewerPreview';

interface EditableGalleryImage {
  id: number;
  title: string;
  sources: string[];
  previewSourceIndex: number;
}

interface EditableStorySection {
  id: number;
  title: string;
  content: string;
}

interface EditableProfileMetadata {
  author: string;
  version: string;
  authorNote: string;
  sex: string;
  race: string;
  storySections: EditableStorySection[];
}

interface EditableProfile extends Omit<CharacterVisualProfile, 'gallery' | 'metadata'> {
  gallery: EditableGalleryImage[];
  metadata: EditableProfileMetadata;
}

type StepId = 1 | 2 | 3 | 4 | 5;

const props = withDefaults(
  defineProps<{
    initialWorldbookName?: string;
    initialEntryUid?: number;
    debugEnabled?: boolean;
    onForceRefresh?: () => void | Promise<void>;
    onReturnToWorldbookLibrary?: () => void;
  }>(),
  {
    initialWorldbookName: '',
    initialEntryUid: undefined,
    debugEnabled: false,
    onForceRefresh: undefined,
    onReturnToWorldbookLibrary: undefined,
  },
);
const emit = defineEmits<{ close: [] }>();
const steps: { id: StepId; shortLabel: string; title: string }[] = [
  { id: 1, shortLabel: '目标', title: '选择写入目标' },
  { id: 2, shortLabel: '资料', title: '填写角色资料' },
  { id: 3, shortLabel: '配色', title: '设置主题颜色' },
  { id: 4, shortLabel: '相册', title: '整理相册与头像' },
  { id: 5, shortLabel: '生成', title: '生成并写入' },
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
const applyingSavedProfile = ref(false);
const saveState = ref<'idle' | 'success' | 'error'>('idle');
const saveMessage = ref('选择世界书条目后即可写入。');
const applyMessage = ref('');
const galleryPackDownloadMessage = ref('');
let nextImageId = 1;
let nextStorySectionId = 1;
const loadError = ref('');

const viewerPreviewOpen = ref(false);
const viewerPreviewSource = ref<CreatorViewerPreviewSource>('sample');
const viewerPreviewPastedText = ref('');
const viewerPreviewScale = ref(1);
const viewerPreviewMobileLayout = ref(false);
const viewerPreviewCanvasWidth = ref(1200);
const viewerPreviewCanvasHeight = ref(800);
const viewerPreviewStageRef = ref<HTMLElement | null>(null);
const viewerPreviewCanvasRef = ref<HTMLElement | null>(null);
let viewerPreviewResizeObserver: ResizeObserver | null = null;

const profile = reactive<EditableProfile>(toEditableProfile(createEmptyProfile()));
const avatarSourceMode = ref<'gallery' | 'custom'>('gallery');
const avatarGalleryImageId = ref<number | null>(profile.gallery[0]?.id ?? null);

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
    metadata: {
      author: value.metadata?.author ?? '',
      version: value.metadata?.version ?? '',
      authorNote: value.metadata?.author_note ?? '',
      sex: value.metadata?.sex ?? '',
      race: value.metadata?.race ?? '',
      storySections: (value.metadata?.story_sections ?? []).map(section => ({
        id: nextStorySectionId++,
        title: section.title,
        content: section.content,
      })),
    },
    gallery: value.gallery.map(image => ({
      ...image,
      sources: [...image.sources],
      id: nextImageId++,
      previewSourceIndex: 0,
    })),
  };
}

function toSerializableMetadata(): CharacterProfileMetadata | undefined {
  const storySections: CharacterStorySection[] = profile.metadata.storySections.map(({ title, content }) => ({ title, content }));
  return normalizeProfile({
    characterName: profile.characterName,
    avatarUrl: profile.avatarUrl,
    raceColor: profile.raceColor,
    tierColor: profile.tierColor,
    entranceQuote: profile.entranceQuote,
    gallery: profile.gallery.map(({ title, sources }) => ({ title, sources: [...sources] })),
    metadata: {
      author: profile.metadata.author,
      version: profile.metadata.version,
      author_note: profile.metadata.authorNote,
      sex: profile.metadata.sex,
      race: profile.metadata.race,
      story_sections: storySections,
    },
  }).metadata;
}

function toFullSerializableProfile(): CharacterVisualProfile {
  const metadata = toSerializableMetadata();
  return {
    characterName: profile.characterName,
    avatarUrl: profile.avatarUrl,
    raceColor: profile.raceColor,
    tierColor: profile.tierColor,
    entranceQuote: profile.entranceQuote,
    gallery: profile.gallery.map(({ title, sources }) => ({ title, sources: [...sources] })),
    ...(metadata ? { metadata } : {}),
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

function selectedAvatarGalleryImage(): EditableGalleryImage | null {
  if (avatarGalleryImageId.value === null) return null;
  return profile.gallery.find(image => image.id === avatarGalleryImageId.value) ?? null;
}

function galleryAvatarUrl(image: EditableGalleryImage | null): string {
  return image?.sources.find(source => isHttpsUrl(source))?.trim() ?? '';
}

function syncAvatarUrlFromGallery() {
  if (avatarSourceMode.value !== 'gallery') return;
  profile.avatarUrl = galleryAvatarUrl(selectedAvatarGalleryImage());
}

function syncAvatarEditorFromProfile() {
  const avatarUrl = profile.avatarUrl.trim();
  const matchedImage = avatarUrl ? profile.gallery.find(image => galleryAvatarUrl(image) === avatarUrl) : undefined;

  if (matchedImage) {
    avatarSourceMode.value = 'gallery';
    avatarGalleryImageId.value = matchedImage.id;
    return;
  }

  const hasConfiguredGalleryImage = profile.gallery.some(image => !!galleryAvatarUrl(image));
  if (!avatarUrl && !hasConfiguredGalleryImage) {
    avatarSourceMode.value = 'gallery';
    avatarGalleryImageId.value = profile.gallery[0]?.id ?? null;
    return;
  }

  avatarSourceMode.value = 'custom';
  avatarGalleryImageId.value = null;
}

function setAvatarSourceMode(mode: 'gallery' | 'custom') {
  avatarSourceMode.value = mode;
  if (mode === 'gallery') {
    avatarGalleryImageId.value ??= profile.gallery[0]?.id ?? null;
    syncAvatarUrlFromGallery();
  }
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
  profile.metadata.author = editable.metadata.author;
  profile.metadata.version = editable.metadata.version;
  profile.metadata.authorNote = editable.metadata.authorNote;
  profile.metadata.sex = editable.metadata.sex;
  profile.metadata.race = editable.metadata.race;
  profile.metadata.storySections.splice(0, profile.metadata.storySections.length, ...editable.metadata.storySections);
  syncAvatarEditorFromProfile();
  applyGalleryReference(value.galleryExtension);
}

const selectedEntry = computed(() => entries.value.find(entry => entry.uid === selectedEntryUid.value) ?? null);
const canPreviewViewer = computed(() => !!selectedEntry.value && profile.characterName.trim().length > 0);
const viewerPreviewProfile = computed(() => toFullSerializableProfile());
const viewerPreviewSampleData = computed(() => buildCreatorViewerPreviewData(viewerPreviewProfile.value));
const viewerPreviewYaml = computed(() =>
  resolveCreatorViewerPreviewYaml(viewerPreviewProfile.value, viewerPreviewSource.value, viewerPreviewPastedText.value),
);
const viewerPreviewVisualOverride = computed(() => buildCreatorViewerVisualOverride(viewerPreviewProfile.value));
const viewerPreviewKey = computed(
  () => `${selectedEntryUid.value ?? 'none'}:${profile.characterName.trim()}:${viewerPreviewSource.value}`,
);
const viewerPreviewFrameStyle = computed(() =>
  viewerPreviewMobileLayout.value
    ? { width: '100%', height: 'auto' }
    : {
        width: `${Math.max(1, viewerPreviewCanvasWidth.value * viewerPreviewScale.value)}px`,
        height: `${Math.max(1, viewerPreviewCanvasHeight.value * viewerPreviewScale.value)}px`,
      },
);
const viewerPreviewCanvasStyle = computed(() =>
  viewerPreviewMobileLayout.value
    ? { width: '100%', transform: 'none' }
    : {
        transform: `scale(${viewerPreviewScale.value})`,
      },
);
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

function resolveGalleryPreviewSources(image: EditableGalleryImage): NormalizedPortraitMedia[] {
  return image.sources.reduce<NormalizedPortraitMedia[]>((sources, value) => {
    const media = normalizePortraitMediaUrlForBrowser(value);
    if (media && !sources.some(source => source.url === media.url)) sources.push(media);
    return sources;
  }, []);
}

function resolveGalleryPreviewMedia(image: EditableGalleryImage): NormalizedPortraitMedia | null {
  const sources = resolveGalleryPreviewSources(image);
  return sources[Math.min(image.previewSourceIndex, Math.max(0, sources.length - 1))] ?? null;
}

function resolveGalleryPreviewUrl(image: EditableGalleryImage): string {
  return resolveGalleryPreviewMedia(image)?.url ?? '';
}

function galleryPreviewMediaKind(image: EditableGalleryImage): PortraitMediaKind | null {
  return resolveGalleryPreviewMedia(image)?.kind ?? null;
}

function debugGalleryPreview(image: EditableGalleryImage, event: string, details: Record<string, unknown> = {}) {
  if (!props.debugEnabled) return;
  const sources = resolveGalleryPreviewSources(image);
  console.info('[CharInfo][ImageFallback][Creator]', {
    event,
    character: profile.characterName,
    imageTitle: image.title,
    sourceIndex: image.previewSourceIndex,
    url: sources[image.previewSourceIndex]?.url ?? '',
    ...details,
  });
}

const galleryPreviewElements = new Map<number, HTMLImageElement | HTMLVideoElement>();
const galleryPreviewTimeouts = new Map<number, MediaSourceTimeout>();
const visibleGalleryPreviewIds = new Set<number>();
let galleryPreviewObserver: IntersectionObserver | null = null;

function galleryPreviewTimeoutFor(image: EditableGalleryImage): MediaSourceTimeout {
  let timeout = galleryPreviewTimeouts.get(image.id);
  if (timeout) return timeout;
  timeout = createMediaSourceTimeout(() => {
    if (!visibleGalleryPreviewIds.has(image.id)) return;
    debugGalleryPreview(image, 'timeout');
    advanceGalleryPreviewSource(image, 'timeout');
  });
  galleryPreviewTimeouts.set(image.id, timeout);
  return timeout;
}

function clearGalleryPreviewTimeout(image: EditableGalleryImage) {
  galleryPreviewTimeouts.get(image.id)?.clear();
}

function advanceGalleryPreviewSource(image: EditableGalleryImage, reason: 'error' | 'timeout') {
  clearGalleryPreviewTimeout(image);
  const sources = resolveGalleryPreviewSources(image);
  const fromIndex = image.previewSourceIndex;
  const nextIndex = nextMediaSourceIndex(fromIndex, sources.length);
  if (nextIndex !== null) {
    image.previewSourceIndex = nextIndex;
    debugGalleryPreview(image, 'fallback', { reason, fromIndex, toIndex: nextIndex });
    debugGalleryPreview(image, 'try');
    return;
  }
  debugGalleryPreview(image, 'all_failed', { reason, fromIndex });
}

function onGalleryPreviewLoad(image: EditableGalleryImage) {
  clearGalleryPreviewTimeout(image);
  debugGalleryPreview(image, 'loaded');
}

function onGalleryPreviewError(image: EditableGalleryImage) {
  debugGalleryPreview(image, 'error');
  advanceGalleryPreviewSource(image, 'error');
}

function setGalleryPreviewElement(image: EditableGalleryImage, element: unknown) {
  const previous = galleryPreviewElements.get(image.id);
  if (previous) galleryPreviewObserver?.unobserve(previous);

  if (!(element instanceof HTMLImageElement) && !(element instanceof HTMLVideoElement)) {
    galleryPreviewElements.delete(image.id);
    visibleGalleryPreviewIds.delete(image.id);
    clearGalleryPreviewTimeout(image);
    return;
  }

  galleryPreviewElements.set(image.id, element);
  if (galleryPreviewObserver) {
    galleryPreviewObserver.observe(element);
    return;
  }

  visibleGalleryPreviewIds.add(image.id);
  debugGalleryPreview(image, 'try');
  galleryPreviewTimeoutFor(image).arm();
}

function initializeGalleryPreviewObserver() {
  if (typeof IntersectionObserver === 'undefined') return;
  galleryPreviewObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const imageId = Number((entry.target as HTMLImageElement | HTMLVideoElement).dataset.galleryImageId);
      const image = profile.gallery.find(candidate => candidate.id === imageId);
      if (!image) return;
      if (entry.isIntersecting) {
        visibleGalleryPreviewIds.add(imageId);
        debugGalleryPreview(image, 'try');
        galleryPreviewTimeoutFor(image).arm();
      } else {
        visibleGalleryPreviewIds.delete(imageId);
        clearGalleryPreviewTimeout(image);
      }
    });
  });
  galleryPreviewElements.forEach(element => galleryPreviewObserver?.observe(element));
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

const selectedEntryCharacterName = computed(() => {
  const entry = selectedEntry.value;
  if (!entry) return '';
  const title = parseWorldbookCharacterEntryTitle(entry.name, { content: entry.content });
  return title.entryKind === 'character' ? (title.displayName?.trim() ?? '') : '';
});

const legacyVisualInspection = computed(() => {
  const entry = selectedEntry.value;
  if (!entry || entryInspection.value.state !== 'absent') return { state: 'absent' as const };
  return inspectLegacyVisualProfile(entry.content, selectedEntryCharacterName.value || undefined);
});

const hasLegacyVisualEjs = computed(() => !!selectedEntry.value && hasUnmanagedVisualEjs(selectedEntry.value.content));

const entryStateClass = computed(() => {
  if (entryInspection.value.state === 'valid') return 'managed';
  if (entryInspection.value.state === 'malformed' || entryInspection.value.state === 'multiple') return 'blocked';
  if (legacyVisualInspection.value.state === 'importable') return 'legacy-importable';
  if (legacyVisualInspection.value.state === 'unsupported') return 'blocked';
  if (hasLegacyVisualEjs.value) return 'blocked';
  return 'new';
});

const entryStateTitle = computed(() => {
  if (entryInspection.value.state === 'valid') return '已有视觉配置';
  if (entryInspection.value.state === 'malformed' || entryInspection.value.state === 'multiple')
    return '视觉配置需要修复';
  if (legacyVisualInspection.value.state === 'importable') return '可升级旧版视觉配置';
  if (legacyVisualInspection.value.state === 'unsupported') return '旧版视觉配置无法自动读取';
  if (hasLegacyVisualEjs.value) return '检测到旧版视觉配置';
  return '可以添加视觉配置';
});

const entryStateDescription = computed(() => {
  if (entryInspection.value.state === 'valid') return '保存时只更新现有视觉配置。';
  if (entryInspection.value.state === 'malformed' || entryInspection.value.state === 'multiple') {
    return entryInspection.value.reason;
  }
  if (legacyVisualInspection.value.state === 'importable') return '已安全读取并预填；当前世界书尚未修改。';
  if (legacyVisualInspection.value.state === 'unsupported') return legacyVisualInspection.value.reason;
  if (hasLegacyVisualEjs.value) return '旧版视觉代码无法安全自动读取，原内容不会被修改。';
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
    (hasLegacyVisualEjs.value && legacyVisualInspection.value.state !== 'importable'),
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

    const requestedWorldbook = props.initialWorldbookName.trim();
    const nextWorldbook = worldbooks.value.includes(requestedWorldbook)
      ? requestedWorldbook
      : worldbooks.value.includes(selectedWorldbookName.value)
        ? selectedWorldbookName.value
        : worldbooks.value[0];
    if (selectedWorldbookName.value !== nextWorldbook) {
      selectWorldbook(nextWorldbook);
      await nextTick();
      await selectedWorldbookEntriesLoad;
    } else {
      worldbookSearch.value = selectedWorldbookName.value;
      await loadEntries(selectedWorldbookName.value);
    }
    if (props.initialEntryUid !== undefined) {
      const requestedEntry = entries.value.find(entry => entry.uid === props.initialEntryUid);
      if (requestedEntry) selectEntry(requestedEntry);
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

  const legacyInspection = inspection.state === 'absent' ? legacyVisualInspection.value : { state: 'absent' as const };
  if (legacyInspection.state === 'importable') {
    replaceProfile(legacyInspection.profile);
    saveMessage.value = `已从旧版 ${legacyInspection.sourceRoot} 安全预填；当前世界书尚未修改。`;
    return;
  }

  replaceProfile(createEmptyProfile(parseWorldbookCharacterDisplayName(entry.name)));
  saveMessage.value =
    inspection.state === 'malformed' || inspection.state === 'multiple'
      ? inspection.reason
      : legacyInspection.state === 'unsupported'
        ? legacyInspection.reason
        : hasUnmanagedVisualEjs(entry.content)
          ? '检测到旧版视觉代码，但无法安全自动读取；原内容不会被修改。'
          : '该角色尚未配置视觉资料；已从条目名称预填姓名。';
}

function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
}

function updateViewerPreviewScale() {
  const stage = viewerPreviewStageRef.value;
  const canvas = viewerPreviewCanvasRef.value;
  if (!stage || !canvas) return;

  const stageStyle = window.getComputedStyle(stage);
  const horizontalPadding = parseFloat(stageStyle.paddingLeft) + parseFloat(stageStyle.paddingRight);
  const verticalPadding = parseFloat(stageStyle.paddingTop) + parseFloat(stageStyle.paddingBottom);
  const availableWidth = Math.max(1, stage.clientWidth - horizontalPadding);
  const availableHeight = Math.max(1, stage.clientHeight - verticalPadding);
  const mobileLayout = isNarrowViewport();

  viewerPreviewMobileLayout.value = mobileLayout;
  if (mobileLayout) {
    viewerPreviewScale.value = 1;
    viewerPreviewCanvasWidth.value = availableWidth;
    viewerPreviewCanvasHeight.value = Math.max(1, canvas.scrollHeight, canvas.offsetHeight);
    return;
  }

  const naturalWidth = Math.max(1, canvas.scrollWidth, canvas.offsetWidth);
  const naturalHeight = Math.max(1, canvas.scrollHeight, canvas.offsetHeight);

  viewerPreviewCanvasWidth.value = naturalWidth;
  viewerPreviewCanvasHeight.value = naturalHeight;

  const nextScale = Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);
  viewerPreviewScale.value = Number.isFinite(nextScale) ? Math.max(0.1, nextScale) : 1;
}

async function initializeViewerPreviewScale() {
  await nextTick();
  viewerPreviewResizeObserver?.disconnect();
  const stage = viewerPreviewStageRef.value;
  const canvas = viewerPreviewCanvasRef.value;
  if (!stage || !canvas) return;

  viewerPreviewResizeObserver = new ResizeObserver(() => updateViewerPreviewScale());
  viewerPreviewResizeObserver.observe(stage);
  viewerPreviewResizeObserver.observe(canvas);
  updateViewerPreviewScale();
}

function toggleViewerPreviewSource() {
  viewerPreviewSource.value = viewerPreviewSource.value === 'pasted' ? 'sample' : 'pasted';
}

function openViewerPreview() {
  if (!canPreviewViewer.value) return;
  viewerPreviewSource.value = 'sample';
  viewerPreviewOpen.value = true;
  void initializeViewerPreviewScale();
}

function closeViewerPreview() {
  viewerPreviewResizeObserver?.disconnect();
  viewerPreviewResizeObserver = null;
  viewerPreviewOpen.value = false;
}

function onEscape() {
  if (viewerPreviewOpen.value) {
    closeViewerPreview();
    return;
  }
  emit('close');
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

function addStorySection() {
  profile.metadata.storySections.push({
    id: nextStorySectionId++,
    title: '',
    content: '',
  });
}

function removeStorySection(index: number) {
  profile.metadata.storySections.splice(index, 1);
}

function moveStorySection(index: number, offset: -1 | 1) {
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= profile.metadata.storySections.length) return;
  const [section] = profile.metadata.storySections.splice(index, 1);
  profile.metadata.storySections.splice(targetIndex, 0, section);
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

function onGallerySourceInput(image: EditableGalleryImage) {
  image.previewSourceIndex = 0;
  if (avatarSourceMode.value === 'gallery' && avatarGalleryImageId.value === image.id) syncAvatarUrlFromGallery();
}

function removeImageSource(image: EditableGalleryImage, sourceIndex: number) {
  if (image.sources.length <= 1) return;
  image.sources.splice(sourceIndex, 1);
  image.previewSourceIndex = 0;
  if (avatarSourceMode.value === 'gallery' && avatarGalleryImageId.value === image.id) syncAvatarUrlFromGallery();
}

function moveImageSource(image: EditableGalleryImage, sourceIndex: number, offset: -1 | 1) {
  const targetIndex = sourceIndex + offset;
  if (targetIndex < 0 || targetIndex >= image.sources.length) return;
  const [source] = image.sources.splice(sourceIndex, 1);
  image.sources.splice(targetIndex, 0, source);
  image.previewSourceIndex = 0;
  if (avatarSourceMode.value === 'gallery' && avatarGalleryImageId.value === image.id) syncAvatarUrlFromGallery();
}

function removeImage(index: number) {
  if (profile.gallery.length <= 1) return;
  const [removed] = profile.gallery.splice(index, 1);
  if (avatarSourceMode.value === 'gallery' && avatarGalleryImageId.value === removed.id) {
    avatarGalleryImageId.value = profile.gallery[0]?.id ?? null;
    syncAvatarUrlFromGallery();
  }
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

  const legacyMigrationSource =
    legacyVisualInspection.value.state === 'importable' ? legacyVisualInspection.value.sourceRoot : null;
  const migrationNotice = legacyMigrationSource
    ? `\n\n旧版 ${legacyMigrationSource} 写入将被精确移除，并升级为 char_info.profiles v2。`
    : '';
  const confirmed = window.confirm(
    useExtendedGallery.value
      ? `确定保存角色视觉资料和扩展图库？\n\n角色世界书：${worldbookName}\n角色条目：${entry.name || `#${entry.uid}`}\n图库世界书：${galleryPackWorldbookName.value}${migrationNotice}`
      : `确定将角色视觉资料写入以下条目？\n\n世界书：${worldbookName}\n条目：${entry.name || `#${entry.uid}`}${migrationNotice}`,
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
    upsertManagedEjsBlockWithLegacyMigration(latestEntry.content, normalizedProfile);

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
            item.uid === entry.uid
              ? { ...item, content: upsertManagedEjsBlockWithLegacyMigration(item.content, normalizedProfile) }
              : item,
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
    const migrationSummary = legacyMigrationSource
      ? `旧版 ${legacyMigrationSource} 已升级为 char_info.profiles v2；`
      : '';
    saveMessage.value = galleryReference
      ? `保存成功：${migrationSummary}角色条目保留 ${embeddedGalleryCount.value} 张基础图片，${extendedGalleryImages.value.length} 张图片已写入独立图库世界书。`
      : legacyMigrationSource
        ? `升级成功：${migrationSummary}原条目其余内容保持不变。`
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

async function applySavedProfileToCurrentChat() {
  const worldbookName = selectedWorldbookName.value;
  const entry = selectedEntry.value;
  if (!entry || applyingSavedProfile.value) return;

  applyingSavedProfile.value = true;
  applyMessage.value = '正在只执行当前角色的 CharInfo 受管理 EJS…';
  try {
    const latestEntries = await getWorldbook(worldbookName);
    const latestEntry = latestEntries.find(item => item.uid === entry.uid);
    if (!latestEntry) throw new Error(`找不到世界书条目 #${entry.uid}。`);

    const managed = extractManagedEjsBlock(latestEntry.content);
    await evaluateManagedEjs(managed.code, props.debugEnabled);

    const chatVariables = getVariables({ type: 'chat' });
    const charInfo = chatVariables.char_info;
    const profiles = charInfo && typeof charInfo === 'object' ? (charInfo as { profiles?: unknown }).profiles : undefined;
    const appliedProfile =
      profiles && typeof profiles === 'object'
        ? (profiles as Record<string, unknown>)[managed.profile.characterName]
        : undefined;
    if (!appliedProfile || typeof appliedProfile !== 'object') {
      throw new Error('EJS 已执行，但当前聊天变量中没有读回该角色的 CharInfo profile。');
    }

    await props.onForceRefresh?.();
    applyMessage.value = `已把「${managed.profile.characterName}」的已保存视觉资料应用到当前聊天并强制刷新 CharInfo。`;
    console.info('[CharInfo Creator Manager] Managed EJS applied to current chat', {
      worldbook: worldbookName,
      entryUid: entry.uid,
      character: managed.profile.characterName,
    });
  } catch (error) {
    console.error('[CharInfo Creator Manager] Failed to apply managed EJS:', error);
    applyMessage.value = `应用失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    applyingSavedProfile.value = false;
  }
}

watch(selectedWorldbookName, worldbookName => {
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
watch(viewerPreviewSource, () => {
  if (!viewerPreviewOpen.value) return;
  void nextTick(() => updateViewerPreviewScale());
});

onMounted(() => {
  initializeGalleryPreviewObserver();
  void loadWorldbooks();
});

onBeforeUnmount(() => {
  viewerPreviewResizeObserver?.disconnect();
  viewerPreviewResizeObserver = null;
  galleryPreviewObserver?.disconnect();
  galleryPreviewObserver = null;
  galleryPreviewTimeouts.forEach(timeout => timeout.dispose());
  galleryPreviewTimeouts.clear();
  galleryPreviewElements.clear();
  visibleGalleryPreviewIds.clear();
});
</script>

<style scoped lang="scss">
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
.manager-dialog {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(1420px, 100%);
  height: min(720px, calc(100% - 8px));
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

.viewer-preview-trigger,
.return-library-button {
  min-height: 40px;
}

.return-library-button {
  white-space: nowrap;
}

.creator-viewer-preview {
  position: fixed;
  z-index: 20;
  top: 50%;
  left: 50%;
  display: flex;
  width: min(1400px, calc(100vw - 24px));
  height: calc(100dvh - 24px);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  transform: translate(-50%, -50%);
  background: var(--bg);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  box-shadow: 0 24px 70px rgb(0 0 0 / 48%);
}

.creator-viewer-preview-header {
  flex: 0 0 auto;
  gap: 16px;
  padding: 12px 14px 12px 18px;
}

.creator-viewer-preview-toolbar {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.creator-viewer-preview-source-state {
  display: grid;
  min-width: 92px;
  gap: 1px;
  text-align: right;
}

.creator-viewer-preview-source-state span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
}

.creator-viewer-preview-source-state strong {
  color: var(--text);
  font-size: 12px;
}

.creator-viewer-preview-source-toggle {
  min-height: 34px;
  padding: 7px 10px;
}

.creator-viewer-preview-source {
  display: grid;
  flex: 0 0 auto;
  gap: 8px;
  padding: 10px 14px;
  background: var(--surface-soft);
  border-bottom: 1px solid var(--border);
}

.creator-viewer-preview-input {
  display: grid;
  gap: 6px;
}

.creator-viewer-preview-input textarea {
  min-height: 110px;
  max-height: 220px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.creator-viewer-preview-stage {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
}

.creator-viewer-preview-frame {
  position: relative;
  flex: 0 0 auto;
  min-width: 1px;
  min-height: 1px;
}

.creator-viewer-preview-canvas {
  width: 1200px;
  max-width: none;
  transform-origin: top left;
  will-change: transform;
}

.creator-viewer-preview-empty {
  display: grid;
  min-height: 800px;
  place-items: center;
  padding: 32px;
  color: var(--text-muted);
  text-align: center;
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
  flex: 1 1 auto;
  grid-template-columns: 272px minmax(0, 1fr);
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

.save-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
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

.field-label small.warning,
.field-guidance.warning {
  color: var(--warning);
}

.field-guidance {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.metadata-editor-panel,
.story-editor-panel {
  margin-top: 22px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-raised) 74%, transparent);
}

.metadata-editor-heading,
.story-editor-heading,
.story-section-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.metadata-editor-heading h3,
.story-editor-heading h3 {
  margin: 0;
  font-size: 15px;
}

.metadata-editor-heading p,
.story-editor-heading p,
.story-editor-empty {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.metadata-field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.author-metadata-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.avatar-source-panel {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-raised) 74%, transparent);
}

.avatar-source-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.avatar-source-option {
  display: flex;
  min-height: 64px;
  padding: 12px 13px;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
  cursor: pointer;
}

.avatar-source-option.active {
  border-color: var(--primary-strong);
  background: var(--primary-soft);
}

.avatar-source-option input {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  padding: 0;
  accent-color: var(--primary-strong);
}

.avatar-source-option span {
  display: grid;
  gap: 3px;
}

.avatar-source-option strong {
  color: var(--text-secondary);
  font-size: 12px;
}

.avatar-source-option small {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.avatar-gallery-picker,
.avatar-custom-url {
  max-width: 620px;
}

.story-section-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.story-section-card {
  display: grid;
  gap: 13px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-raised);
}

.story-section-card-header strong {
  color: var(--text-secondary);
  font-size: 12px;
}

.story-section-actions {
  display: flex;
  gap: 6px;
}

.story-section-actions button {
  width: 34px;
  min-height: 34px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
}

.story-section-actions button:hover:not(:disabled) {
  border-color: var(--primary-strong);
  color: var(--text);
}

.story-section-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.story-section-actions button.danger {
  color: var(--danger);
}

.story-section-card textarea {
  min-height: 132px;
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

.status-dot.legacy-importable {
  background: var(--primary);
  box-shadow: 0 0 10px rgb(119 214 199 / 45%);
}

.migration-banner {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid rgb(119 214 199 / 24%);
  border-radius: 10px;
  background: rgb(119 214 199 / 7%);
}

.migration-banner strong {
  color: var(--primary);
  font-size: 12px;
}

.migration-banner p,
.migration-banner ul {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.migration-banner ul {
  padding-left: 18px;
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

.image-preview img,
.image-preview video {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 104px;
  object-fit: cover;
}

.image-preview video {
  pointer-events: none;
}

.image-preview .gallery-media-kind {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 3px 6px;
  color: var(--text);
  background: rgba(8, 12, 18, 0.78);
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
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
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px;
}

.source-order-actions {
  display: flex;
  gap: 5px;
}

.source-order-button,
.remove-source-button,
.add-source-button {
  color: var(--text-secondary);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.source-order-button,
.remove-source-button {
  width: 34px;
  min-height: 42px;
}

.source-order-button:disabled,
.remove-source-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.remove-source-button {
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
  .gallery-pack-download-panel {
    grid-template-columns: 1fr;
  }

  .gallery-pack-download-actions {
    justify-content: flex-start;
  }

  .manager-dialog {
    height: calc(100% - 2px);
    max-height: calc(100% - 2px);
    border-radius: 14px;
  }

  .dialog-header {
    padding: 17px;
  }

  .creator-viewer-preview {
    inset: 0;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    max-width: none;
    max-height: none;
    box-sizing: border-box;
    transform: none;
    border: 0;
    border-radius: 0;
  }

  .creator-viewer-preview-header {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
    padding: calc(env(safe-area-inset-top) + 12px) 14px 12px;
  }

  .creator-viewer-preview-toolbar {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 1fr) minmax(126px, auto) 40px;
    gap: 8px;
  }

  .creator-viewer-preview-source-state {
    min-width: 0;
    text-align: left;
  }

  .creator-viewer-preview-source-toggle {
    min-width: 0;
    max-width: 164px;
    white-space: normal;
  }

  .creator-viewer-preview-stage {
    padding: 0;
    overflow-x: hidden;
    overflow-y: auto;
    align-items: flex-start;
    justify-content: flex-start;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .creator-viewer-preview-frame,
  .creator-viewer-preview-canvas {
    max-width: 100%;
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

@mixin mobile-manager-layout($root: '.manager-root') {
  #{$root} {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    max-width: 100%;
    max-height: 100%;
    padding: 0;
    overflow: hidden;
  }
  .manager-dialog {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    max-width: none;
    max-height: none;
    box-sizing: border-box;
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
  .field-grid,
  .metadata-field-grid,
  .color-grid,
  .gallery-storage-fields,
  .gallery-fields {
    grid-template-columns: 1fr;
  }

  .metadata-editor-panel,
  .story-editor-panel,
  .avatar-source-panel {
    padding: 14px;
  }

  .avatar-source-options {
    grid-template-columns: 1fr;
  }

  .story-editor-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .story-add-button {
    width: 100%;
  }

  .story-section-card {
    padding: 14px;
  }

  .story-section-actions button {
    width: 40px;
    min-height: 40px;
  }

  .gallery-card {
    grid-template-columns: 76px minmax(0, 1fr);
  }

  .image-preview,
  .image-preview img,
  .image-preview video {
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

@media (max-width: 720px) {
  @include mobile-manager-layout;
}

.manager-root.force-mobile-layout {
  @include mobile-manager-layout('&');
}
</style>
