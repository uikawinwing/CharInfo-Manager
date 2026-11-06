# CharInfo Manager × ImgBed：编辑器内上传协议 v1

本文是两仓库维护者的接口契约。CharInfo 实现位于 `src/char_info_profile_editor/services/imgbedUploadBridge.ts`，旧窗口协议仍见 [imgbed-bridge.md](imgbed-bridge.md)。配套 ImgBed 实现见其 `docs/charinfo-upload.md`。ImgBed 配套提交 `bed995cb` 已发布到 staging，真实 ST 已验证能在无 opener 情况下打开 Discord；完整账号授权及上传仍需人工完成验收。

## 边界与现状

CharInfo 是角色姓名与档案文本的编辑来源。ImgBed 只管理账号、文件及图库成员；不接收角色正文、配色或 metadata。完整编辑第 4 步分为「普通图片直链」和「直接上传 ImgBed」两种入口。ImgBed 入口支持在编辑器选文件、改名、调整顺序，然后由用户明确点击「上传并保存图库」；成功后回填公开图库 API URL。第 5 步单独保存角色档案，不自动上传。旧窗口必须由用户明确选择，不自动回退。

ImgBed 旧 `/account/` 使用 `charinfo-imgbed-bridge`，只能选已有图库。实际用户登录 Cookie 在 `functions/utils/auth/sessionManager.js:214` 使用 `HttpOnly; SameSite=Strict; Secure`；`SameSite=Lax` 是 OAuth 临时 Cookie。当前跨站写入保护必须保留。新接受方提供独立配对、授权及保存操作账本，不直接放开旧建库和上传 API。

固定信任源是 `https://imgbed-staging.uika.cc.cd`，不能由导入的档案或 URL 改写。新页面：

- 隐藏 iframe：`/charinfo-upload/?parent_origin=<ST origin>&connection_id=<随机连接编号>`。
- 编辑器检查并复用有效授权；无授权时显示「连接 ImgBed」按钮，只有明确点击后才准备专用按钮 iframe：`/charinfo-upload/launcher?parent_origin=<ST origin>&connection_id=<同一编号>`。用户直接点击唯一的“连接 ImgBed”，由 ImgBed 同源表单 POST 打开顶层授权页；未登录会自动前往 Discord，再返回核对与明确同意。不从 ST 传递私有票据或打开完整后台。

上传 iframe 挂载于**实际执行桥接代码的酒馆助手脚本窗口**，其父窗口必须与真实消息来源一致；不能把它挂在 ST 顶层，再从脚本 iframe 代发消息。脚本的 `about:srcdoc` URL 本身不提供 HTTP origin，因此由同源 ST 宿主显式传入真实 origin。上传 iframe sandbox 为 `allow-scripts allow-same-origin`。可见 launcher 挂在编辑器 iframe 内；固定公开 hello 通过该可见父窗口 realm 的函数发送，launcher 仍严格核对真实 parent/source/origin。它的 sandbox 另含 `allow-forms allow-popups allow-popups-to-escape-sandbox`，仅授权新窗口可脱离 sandbox。两者不依赖 popup.opener。

`connection_id`、`requestId`、`sessionId`、`accountId` 都是公开关联标识，**绝不具有凭证效力**。尤其不能凭连接编号轮询取得身份或授权。HTTP/HTTPS origin、随机数、来源窗口正确，只表示通信匹配，不表示允许上传。

## ImgBed 必须实现的授权边界

1. iframe 通过实际 `message` 的 `event.origin`、`event.source === parent` 确认精确父源，再向同源服务端登记连接；查询参数只是期望值，必须与实际来源一致。每个 iframe 持有独立私有配对证明，证明不离开 ImgBed。
2. 顶层授权页必须根据服务端配对记录显示准确 ST 源，让已登录玩家明确同意连接。未登录先 Discord 登录。不能仅凭查询参数声称某站已获授权，不能静默把顶层登录身份授予任意 iframe。
3. 私有配对证明用于 iframe 内部轮询授权。会话、刷新证明、Cookie、Discord Token 永不进入消息、ST 存储、地址栏或日志。服务端绑定真实父源、账号、连接上下文、权限、期限与撤销状态；同源内部请求继续验证身份及范围，不放宽一般用户 API 的 CSRF 或 CORS。
4. 最小权限限于上传文件、建立角色图库、读取本人图库成员、调整成员及顺序。没有任意 URL 请求、读取私有账号资料、删除原文件或改写角色文本的能力。
5. 保存账号及授权的有效期，支持续期与主动撤销；过期或浏览器存储不可用时回复 `auth.required`，保留 ST 草稿后重新授权。持久化放在 ImgBed origin 内，并按确认的 ST 源绑定；不能保证任意浏览器永久免登录。
6. 账号切换必须改变公开 `accountId`；授权会话改变必须更新公开 `sessionId`。这两个字段只用于 ST 拒绝过期结果。后端仍从真实凭证确定文件/图库属主，不能信任客户端 owner 字段。

launcher 通过实际可见父窗口返回严格的 `launcher.ready` 公共信封，仅包含协议、版本、连接编号和类型；脚本在该可见窗口注册专用监听，不能误以为消息会到达隐藏脚本窗口。握手成功前保留位置但隐藏内容，15 秒无确认则报登录入口不可用，防止未部署路径回退到完整首页。OAuth returnTo 只增加公开 `login_attempted=1` 标记，返回后仍无会话时显示重试链接，避免自动跳转循环。

同源内部 `launch.request/proof` 挑战绑定同顶层 WindowProxy、已挑战的精确窗口引用、随机挑战、连接编号及双方实测父源。私有配对证明直接在两个 ImgBed iframe 间传递。用户真实点击 launcher 后，以 `{connectionId,proof}` 表单 POST `/api/charinfo-upload/launch`。服务端要求 ImgBed Origin 及浏览器 Fetch Metadata 为 same-origin/navigate/document，签发十分钟、按连接隔离的 HttpOnly/Secure/SameSite=Lax Cookie，再 303 到仅含公开字段的授权页。GET/query/fragment 不能兑换授权上下文。授权页 inspect/approve/deny 必须使用该 Cookie；inspect 绑定真实账号，approve 同时提交此前展示的公开 accountId 并再次验证身份，原子消费上下文。上传／续接仍使用 iframe 私有证明，Cookie 不经 ST。

launcher 响应使用 `Referrer-Policy: same-origin`，表单仅 `rel=noopener`；不能加入 noreferrer 或继承 no-referrer 后放宽 Origin 校验。Chrome 原生表单在这些策略下会发送 Origin:null。OAuth returnTo 只保留公开连接字段，授权 Cookie 自行保留短期上下文。

## 消息信封与约束

所有消息通过 `postMessage` 结构化克隆发送，`File` 不做 JSON/Base64 编码。双方只向精确 `targetOrigin` 发送；ST 只收当前 iframe 的精确窗口引用及固定 ImgBed 源。

```ts
type Envelope = {
  protocol: 'charinfo-imgbed-upload';
  version: 1;
  connectionId: string; // 24 字节 getRandomValues，48 位十六进制
  type: string;
};
```

ST 对返回消息拒绝未列出的字段、数组信封、错误版本、错误请求编号和会话。ID 是 1–128 位 ASCII 字母/数字/下划线/短横线；相册 UUID 只接受小写标准 `8-4-4-4-12` 形式。姓名 trim 后 1–80 字符（沿用现有图库 API），标题至多 500 字符，显示名至多 100 字符。每次至多 100 个新文件、500 个最终成员；允许 `image/png,image/jpeg,image/gif,image/webp,image/avif,video/mp4,video/webm`，与现有上传 API 一致。服务端仍执行自身文件签名、类型、大小（现有 95 MiB 限额）与配额校验。

下表只列信封以外字段。`requestId` 均由 ST 生成，响应必须逐字回显。

| 方向 | type | 字段 / 含义 |
|---|---|---|
| ST → iframe | `bridge.hello` | 无；每 500 ms 发送直到 ready，总握手时限 15 秒 |
| iframe → ST | `bridge.ready` | 无；只证明协议就绪，不授予身份 |
| ST → iframe | `auth.status` | `requestId`；检查当前已获授权会话，可返回 required 或 connected |
| ST → iframe | `auth.connect` | `requestId`；等待顶层登录及明确授权，iframe 自行安全轮询 |
| ST → iframe | `auth.resume` | `requestId`；ST 重新聚焦时催促尚未完成的 auth.connect 核验，不授予身份 |
| iframe → ST | `auth.connected` | `requestId, sessionId, accountId, accountName`；仅响应 status/connect |
| iframe → ST | `auth.required` | `requestId`；无有效授权，或 disconnect 撤销已完成 |
| iframe → ST | `auth.failed` | `requestId, code: string`；授权/撤销失败，不允许暗示已成功退出 |
| iframe → ST | `auth.cancelled` | `requestId`；服务端已撤销当前授权上下文，父端收到后才结束取消或超时等待并移除 iframe |
| ST → iframe | `auth.disconnect` | `requestId`，已有会话时附 `sessionId`；服务端撤销当前 ST 连接及 iframe 会话后才回 required |
| ST → iframe | `gallery.read` | `requestId, sessionId, albumId, characterName`；读本人且准确同名的目标图库 |
| iframe → ST | `gallery.loaded` | `requestId, sessionId, albumId, characterName, items` |
| ST → iframe | `gallery.save` | `requestId, sessionId, albumId: string \| null, characterName, files, order` |
| iframe → ST | `gallery.progress` | `requestId, sessionId, completed, total, phase: 'uploading' \| 'saving', fileId?`；整数 `0 ≤ completed ≤ total`，total 等于新文件数，fileId 属于本次新文件 |
| iframe → ST | `gallery.saved` | `requestId, sessionId, albumId, characterName, remoteGalleryUrl, items`；items 数量等于 order 数量 |
| iframe → ST | `gallery.error` | `requestId, sessionId, code: string, fileId?`；fileId 必须属于本次新文件。`AUTH_REQUIRED` 将连接设为失效；`INPUT_REJECTED` 保证整个操作无副作用，允许修改文件后以新请求重试；其他错误保留不可变请求 |
| ST → iframe | `bridge.cancel` | `requestId`；停止继续执行并停止等待；不保证撤回已经完成的副作用，不删除文件 |

```ts
type Item = { id: string; title: string; url: string; kind: 'image' | 'video' };
type FileInput = { id: string; title: string; file: File };
type OrderItem = { itemId: string } | { uploadId: string };
```

`Item.id` 是稳定图库成员标识；URL 必须 HTTPS 且不含用户名/密码。`files` 只包含新增文件。`order` 是最终完整顺序，每项引用已有 `itemId` 或新增 `uploadId`，不重复、不漏掉本次新文件。省略的旧成员仅解除图库关联，原文件保留。空 files 允许仅排序/移除成员；现有 albumId 必须原样复用，不能按姓名查找并合并其他角色。

`remoteGalleryUrl` 必须逐字等于 `https://imgbed-staging.uika.cc.cd/api/public/album-gallery/{albumId}`，不允许查询、片段或其他路径。服务端在保存成功后返回最终 items 顺序及与公开包 sources 一致的规范媒体 URL。ST 核对公开包成员数量及逐项顺序，并要求至少一个可在角色卡展示的媒体；不能以旧缓存或缺少新文件的半成品作为保存成功。ST 不把远程图片复制到本地备用图库。

ImgBed 网站管理入口为 `https://imgbed-staging.uika.cc.cd/account/?view=albums`，可在其他浏览器登录对应 Discord 账号后管理相册。此地址不是写入角色档案的公开图库 URL，不得与 `/api/public/album-gallery/<UUID>` 混淆。

## 保存、重试与取消

- 单连接同一时间只处理一个操作，授权及读写总时限 12 分钟；不因进度无限延时。尚未握手/授权时不发送文件。
- ST 在首次保存时冻结 requestId、文件 ID、角色名、目标图库与顺序，网络错误或取消后重试同一快照。换账号不能重试原账号操作；不能给同一 requestId 发送不同内容。
- ImgBed 应在任何建库或上传之前检查完整输入、文件签名及配额。只有确定整个操作尚无副作用的终止拒绝才能返回 `INPUT_REJECTED`；ST 将解除文件编辑锁，让玩家更换错误文件。部分上传失败或结果不确定绝不能使用此错误码。
- **ImgBed 服务端必须持久记录 `(真实账号, requestId)` 及不可变请求摘要、已建立的 albumId、逐文件结果与最终成员版本。** 首次新建以该操作唯一标识确定，不能按角色姓名合并。重复请求返回已完成结果或继续未完成步骤。跨连接重新授权也必须能恢复同一账号的原操作。每个文件 ID 只扣一次配额。不能直接无条件重发当前建库/上传 API。
- 成员最终更新须避免并发覆盖（图库版本/冲突检查由 ImgBed 内部负责）；部分失败返回 error，保留恢复记录，不返回半成品 saved。取消只能停后续步骤，已经上传文件留在账号中供恢复。
- ST 收到 saved 后匿名刷新公开包，通过现有 v1 解析器，并在写共享缓存前核对 packId/profileId 都是相册 UUID、人物姓名与当前档案一致。公开验证失败保留完成结果，重试只重新验证；世界书写入失败保留已经回填的 URL，重试不重新上传。
- 取消、切换档案/角色、编辑目标 URL、关闭或卸载后，迟到结果不得写入新档案。关闭时清理 iframe、监听、计时器和预览 Object URL。
- 可控授权取消／超时先发送 bridge.cancel，保留 iframe 等服务端撤销确认，最多再等 15 秒；撤销失败明确报“尚未确认撤销”，不声称成功。取消后重连使用新的连接编号，旧页不能批准新连接。浏览器关闭或断网无法保证立即完成撤销，服务端短期上下文到期后不可批准。

## 验证范围与待联调项

自动化覆盖消息来源/窗口/请求/会话/字段校验、File 直接传递、HTTP 来源、握手不等于授权、失败/取消/重试、公开包核验、原图库复用及成员顺序。模拟消息不证明 ImgBed 的授权边界或真实浏览器 OAuth 正确。

当前只保留打开的编辑器中的草稿与 File；刷新 ST、关闭编辑器或切换聊天会卸载并丢弃未保存草稿，不具备磁盘草稿恢复能力。快速模式仍采用原有直链流程，新上传接完整编辑的“相册与头像”。

已连接用户现有的 `http://127.0.0.1:8000/` ST 标签页，不刷新编辑器或改动安全配置。配套发布后，原 srcdoc 脚本窗口已完成真实 iframe 配对、显示正确连接按钮并打开 Discord 登录页，且 opener 为 null。完整真实账号登录／同意／上传、实际私网／Tailscale 部署、持久登录、大文件和 Android 仍待验收，不能把模拟结果当作全部通过。

### 根因与回归

- 本机 `http://localhost:8000/` 实际返回 `Cross-Origin-Opener-Policy: same-origin`。Chrome 会切断跨站授权弹窗的 opener；旧实现的 `pairWithDirectFrame` 因此显示“无法保留 ST 窗口连接”，并保持“允许连接”禁用。授权页的 `frame-ancestors 'none'` 只禁止它被嵌入，不是这个 popup 问题的原因。新实现保留这些安全限制，通过同源表单启动完成授权。
- 此前 CharInfo 将上传 iframe 挂在 ST 顶层，但发送函数实际运行于脚本 iframe，真实 `event.source !== parent`，握手被拒绝。现在保留 `createImgbedUploadBridge(window, hostWindow.location.origin)` 修复。ST 不再打开或轮询 popup.closed，而是等服务端授权结果。
- Chrome 回归：`node --require ./tests/register-ts-node.cjs --test tests/char_info_profile_editor/imgbed-window-ownership.browser.ts`。`CHARINFO_PLAYWRIGHT_MODULE` 可指向现有 Playwright。它执行真实 overlay/bridge，所有来源均断言模拟同意后授权成功；另保留独立用例记录浏览器仍会切断 opener。
- ImgBed 双仓库回归：`node --test test/browser/charinfoUpload.mjs`。真实双方前端与 Worker D1/R2 覆盖上传、重复保存、图库复用、取消和撤销；OAuth 与 HTTPS 传输是隔离模拟。独立原生 HTTP 服务检查 Chrome 实际导航头、HttpOnly Cookie 和 COOP 下的成功授权。路由拦截发生在 Fetch Metadata 添加前，HTTPS 测试代理补入导航头；该部分不冒充真实 HTTPS 部署验收。

规范依据：[WHATWG 跨文档消息与 File/Blob](https://html.spec.whatwg.org/dev/web-messaging.html)、[W3C 安全上下文祖先规则](https://www.w3.org/TR/secure-contexts/)、[Chrome 存储分区](https://privacysandbox.google.com/cookies/storage-partitioning)。据此判断结构化克隆可用；真实设备的大文件开销仍需实测。HTTP 私网祖先下的 HTTPS iframe 不可假定是安全上下文，随机值仅使用 getRandomValues；登录及敏感密码学留在 ImgBed 服务端。
