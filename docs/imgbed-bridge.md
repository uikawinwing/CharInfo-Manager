# ImgBed 弹窗连接：跨仓库集成约定

本文保留旧窗口兼容协议。编辑器内选图和上传的新入口见 [编辑器内上传协议](imgbed-upload-protocol.md)；新协议仍待 ImgBed 接受方实现和 Staging 联调。

本文面向维护 CharInfo Manager 与 CloudFlare-ImgBed 的开发者。CharInfo 侧已实现 v1 协议；ImgBed 对应页面由另一仓库负责，本地模拟测试不表示其部署和 OAuth 跳转已通过联调。

## 信任边界与协议

唯一可信 ImgBed 源为 `https://imgbed-staging.uika.cc.cd`，定义在 `src/char_info_profile_editor/services/imgbedBridge.ts`。导入的角色档案不能改变可信源。

酒馆宿主窗口在点击时同步打开：

```text
https://imgbed-staging.uika.cc.cd/account/?view=albums&bridge=charinfo&bridge_version=1&bridge_nonce=<随机值>&opener_origin=<编码后的酒馆源>[&album=<小写UUID>]
```

弹窗应保留 `window.opener`，并在登录及页面跳转中保留桥接参数。管理时携带当前相册 UUID，连接或切换时不携带。双方消息使用以下信封：

```ts
{
  protocol: 'charinfo-imgbed-bridge',
  version: 1,
  type: 'bridge.hello' | 'bridge.ready' | 'album.selected' | 'bridge.cancelled',
  nonce: string,
  albumId?: string,
  remoteGalleryUrl?: string,
}
```

CharInfo 每 500 毫秒向精确的 ImgBed 源发送 `bridge.hello`，收到 `bridge.ready` 后停止重试；操作总时限为点击起 12 分钟（`IMG_BED_CONNECTION_TIMEOUT_MS`），握手完成不会重新计时。不另设更短的握手时限，避免打断首次登录；该总时限低于 ImgBed 从首次到达起计的 15 分钟会话期限。界面会提示时限并提供“取消操作”。ImgBed 必须验证消息的实际 `event.origin`、`event.source === window.opener`、协议、版本和随机值，再向精确酒馆源回复。查询参数 `opener_origin` 只是提示。

酒馆可来自普通 HTTP localhost、LAN 或 VPN 地址，例如 `http://localhost:8000`、`http://192.168.1.41:8000`、`http://100.75.12.3:8000`，也可来自自定义 HTTPS 源。酒馆侧使用普通 HTTP 环境也可用的 `crypto.getRandomValues()`，不依赖安全上下文、`crypto.randomUUID()` 或剪贴板 API，无需浏览器不安全来源参数、证书或逐玩家登记来源。ImgBed 侧须部署按会话动态验证并绑定 HTTP/HTTPS 来源的实现；这不改变酒馆只信任固定 ImgBed 源的规则。

弹窗被拦截、关闭、因登录跳转丢失 opener 或最终超时时，界面会引导玩家将 ImgBed 的公开图库 API URL 粘贴到现有“远程图库 URL”字段，不改动原档案。酒馆不能读取跨源窗口的 opener 来确认其是否丢失；此类中断可能表现为窗口关闭或在总时限结束后才提示超时。手动 URL 应使用上面的 `/api/public/album-gallery/<UUID>` 地址，而非相册管理页地址。

CharInfo 只接受当前弹窗的精确窗口引用、精确源和一次性随机值；握手前不接收选择结果。`album.selected` 只允许小写 UUID，且 URL 必须逐字等于 `https://imgbed-staging.uika.cc.cd/api/public/album-gallery/<UUID>`，不能带凭据、查询或片段。旧 `/api/public/charinfo/` 和 `?view=gallery` 不作为新连接入口。

选择后匿名读取公开 URL（`credentials: 'omit'`，10 秒超时），通过既有 v1 解析器，并在共享缓存更新前确认 `packId`、`profileId` 均等于所选 UUID。姓名不同需在编辑器明确确认；不改角色姓名或正文。图片、视频、账户认证与所有私有写入由 ImgBed 管理。

## 编辑和刷新行为

连接、切换、断开只修改 `profile.remoteGalleryUrl`，不会导入远程图片到本地列表，也不写世界书或聊天变量。只有原有保存流程负责持久化。本地备用图片、头像、Metadata 和配色保持现有数据归属；快速模式维持图片直链流程。

显式刷新只重新验证对应 URL，带原 ETag 并支持 304，绕过五分钟内存缓存和浏览器的新鲜缓存；失败显示错误并保留原缓存。普通查看器的缓存回退行为保留。取消、关闭、换档案、切换聊天或卸载均清理桥接监听和计时器，旧结果不能回写。

## 联调步骤

1. 在酒馆已启用酒馆助手实时监听的环境载入当前构建，进入角色档案编辑器专业模式的“相册与头像”。
2. 分别通过 HTTP LAN、HTTP VPN 和自定义 HTTPS 地址访问酒馆并点击“连接 ImgBed”，确认新窗口的 opener 是酒馆宿主；如需登录，在 ImgBed 完成 Discord 登录，检查桥接参数保留。保持浏览器默认安全设置，不添加不安全来源参数。
3. 选择同名相册并点击 ImgBed 的“使用此图库 / 返回 ST”。确认姓名、数量、缩略图预览出现，远程 URL 更新，本地图片未变，世界书尚未写入。
4. 切换到不同姓名相册，确认必须选择“仍然使用”才改变 URL；取消、错误 UUID 或读取失败均保留原档案。
5. 手动保存到世界书或写入聊天，再查看角色卡；检查原世界书受管理区块以外的正文未变。
6. 在 ImgBed 管理并调整图片，返回点击“刷新图库”，检查立即发起请求、携带 ETag、200/304 均正确，断网时提示失败且本地备用图片未变。
7. 验证等待超过两分钟仍可选择、12 分钟总超时、“取消操作”、弹窗拦截、关闭、登录后 opener 丢失、打开后切换档案/聊天，以及 Catbox/ImgBB 手动图片与快速模式；自动连接不可用时，在“远程图库 URL”粘贴公开图库 API URL，确认本地备用图片未变。

目前没有已确认的跨仓库协议差异。真实 OAuth、部署路由、浏览器跨源 opener 保持及 CORS/ETag 仍需两仓库共同完成上述联调。
