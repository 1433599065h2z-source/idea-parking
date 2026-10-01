# V0.2.1 开发进度

更新时间：2026-10-01 13:50（Asia/Shanghai）。七日自动清理已获确认、启用并核验；项目作者已确认 iPhone/电脑删除恢复交叉验收成功。V0.2.1 开发、发布和验收完成，停在本版，不继续增加功能。

## 本次范围

“已开走”独立分区、删除确认、七日废纸篓、恢复、云端定时清理。登录方式继续沿用邮件链接；不增加 AI、搜索、PWA 等功能。

## 已完成

- 前端与 API 代码已实现，版本号更新为 0.2.1；README、NEXT_VERSION 已更新，Future Ideas 保留。
- 首页分区和低调废纸篓入口；恢复保留 ID、内容、原状态和创建时间。
- 详情使用页面内两步删除确认。有未保存修改时要求先保存，失败时保留内容；保持保存返回首页及滚动位置恢复。
- 云端新增 `deleted_at`，删除/恢复函数使用云端时间和 `auth.uid()`；普通客户端不能直接改删除时间或永久删除，不能编辑废纸篓记录；重复删除不重置七天。
- `supabase/schema.sql` 已在 Supabase 项目 `jxrfzotpbxbtqevauvpc` 成功执行。原有 2 条想法的校验值前后均为 `a879a7323f36bcbe9ecbb2c0682d4dee`，未被改动。
- `npm run build` 成功，仅有现有的包体大小提示。
- 独立 PostgreSQL 验证 18 项、客户端回归 9 项全部通过。
- 假数据 UI 验证通过：取消删除、删除/保存/恢复失败保留内容、成功删除恢复、原状态分区、到期禁用、键盘 ring/outline。
- 390px 生产 CSS 检查：viewport=390，clientWidth=375，scrollWidth=375，无横向溢出。
- 真实本地页面已验证新建、编辑/状态保存、第二页面云端复读、未保存离开提示；返回滚动位置 467→470px。
- 线上事务验收已成功：完整核对的 `remote-check.sql`（末尾只到 ROLLBACK）在 SQL Editor 执行，显示 `Success. No rows returned`。软删除、重复删除、废纸篓禁止旧写入、恢复、七日边界、跨账号和匿名权限全部通过；临时改动已回滚。
- Vercel 云端构建也已成功，部署状态 `READY`，版本 0.2.1。命令使用 `deploy --prod --skip-domain --yes`；部署地址为 https://idea-parking-7lyqbzi4x-ryan-c1d9.vercel.app ，检查页为 https://vercel.com/ryan-c1d9/idea-parking/3fwcdrak5mKZucGorqhhhchau6EH 。CLI 同时返回次级别名 https://idea-parking-ryan-c1d9.vercel.app 。这些地址有 Vercel 登录保护，不能当作最终手机公开验收地址。
- 保存时已核对版本号和关键代码、SQL、临时验证脚本、截图/结果文件均在磁盘上。没有删除原有想法，没有运行永久清理。
- 2026-10-01：修正后的停用准备脚本线上执行成功。Cron jobid=1、jobname=`idea-parking-trash-cleanup`、active=false、schedule=`0 * * * *`；清理条件为 `deleted_at <= statement_timestamp() - interval '168 hours'`。
- 2026-10-01：Vercel promote 成功。正式 https://idea-parking.vercel.app/ 及 `/idea/18c83343-9fcf-4c8f-9b76-f8fb2709cb86` 均 HTTP 200，资源与本地构建一致：`index-DLE0ODRh.js`、`index-C31eqh7v.css`。正式页面登录界面正常；本轮尚未在正式域名重新登录。
- 2026-10-01：重新运行 build、18 项数据库验证、9 项客户端验证，全部通过。Node 直接 fetch 曾因本机网络连接超时失败；使用系统网络设置的 PowerShell Invoke-WebRequest 已成功完成正式地址验证。
- 2026-10-01：真实云端验收样本恢复成功，回到原来的“已开走”，ID、内容、创建时间正确；随后通过页面内确认重新移入废纸篓，刷新新页面仍正确。样本已在废纸篓，原有两条记录未操作。
- 2026-10-01：真实云端页面 390px 验证 clientWidth=375、scrollWidth=375。截图为 `D:/Codex/idea-parking-verification/evidence/live-mobile-trash.png`，已嵌入用户进度回复。
- 验收说明见 `ACCEPTANCE.md`。现有登录方式保持不变，本轮没有新增应用依赖。
- 2026-10-01 13:37：收到本聊天中针对永久清理的明确确认，执行 `D:/Codex/idea-parking-verification/enable-existing-cleanup.sql`，只启用 jobid=1 且名称、角色、计划和清理 SQL 都匹配的既有任务。SQL 全文与本地脚本核对一致后执行。数据库结果确认 jobid=1、active=true、schedule=`0 * * * *`，清理条件未改变；截图为 `evidence/cron-active.png`。未手动触发立即清理，不能把启用状态当作已经等待七天并观察实际删除的证据。
- 2026-10-01 13:50：项目作者引用“手机与电脑的删除、恢复交叉验收仍待你确认”并回复“验收成功”，已将这项人工验收记为通过。V0.2.1 正式完成。

## 交付状态与人工验收

1. 清理任务已经启用，active=true。不要重新执行临时停用准备脚本；这会把任务停用。首次准备时的角色错误已经解决。
2. 每小时整点清理 `deleted_at <= 云端时间 - 168小时`，恢复期限为严格 168 小时。用户已确认这项永久清理；不要重复请求同一操作的确认。下一次整点起由云端调度运行，实际运行结果可在 Cron 历史中查看。数据库暂停或任务失败会延后清理。
3. V0.2.1 已发布并核验正式网址；无需再次部署或 promote。应用代码、数据库升级、27 项回归验证、构建及任务启用全部完成。
4. 真实验收样本 ID `18c83343-9fcf-4c8f-9b76-f8fb2709cb86`（内容以“V0.2.1 验收样本（可删除）”开头）已重新移入废纸篓，无需另行删除。保留原有两条想法。
5. 本轮删除/恢复的真实 iPhone 和电脑交叉验收已由项目作者确认成功，无待确认的本版验收项。这项结果来自用户确认，与代理的两页面验证分别记录。

## 浏览器与测试续接

- 当前 CUA 浏览器 id `2` 为 IAB；Supabase SQL Editor 标签页 id `2`、正式站点 id `3`、真实本地新预览 id `4`。旧本地标签页 id `1` 停在本地服务未启动时的错误页，不是数据损坏；原先卡住的删除弹窗已经不存在。
- 2026-10-01 CUA 曾因首次加载正式站点超时重置内核，已重新绑定。当前变量为 `browser`、`sqlTab`、`productionTab`、`localTab`、`viewport`、`fileio`。恢复会话按 CUA 文档初始化，先读取当前 UI；不要沿用旧标签 id 或隐藏登录数据。
- Monaco 编辑必须先通过编辑器 Ctrl+A 选全模型，再替换/粘贴；普通 textarea fill 不保证替换完整 SQL。执行前 Ctrl+A/C 并读取剪贴板核对完整脚本，Run 按钮选中状态下名为“Run selected”。
- 临时测试目录 `D:/Codex/idea-parking-verification`，没有添加应用依赖。`node database.mjs`、`node client.mjs` 可复跑。
- UI 记录与截图在该目录 `evidence/ui-checks.json`、`evidence/mobile-trash.png`。使用的是生产构建 CSS；重建后 CSS 文件名变化时更新临时 harness 的 import。
- 本地预览已用隐藏后台 Node 重新启动（启动时 PID=11580），端口 4173，新页面已成功读云端。日志为临时验证目录的 `preview-4173.log` / `preview-4173-error.log`。旧会话 91185/87667 不再作为有效进程依据；不要误停用户预览。390×844 验证后 viewport 已 reset。
- 本轮 SQL 标签页与正式网站已 markDeliverable，供用户查看已启用结果。原本地预览标签 id=4 在收尾时已不可用；需要本地页面时先重新查询标签库存，不要使用旧 localTab 对象。代理未在正式域名重新登录；项目作者后续已确认真机删除/恢复成功。
- Vercel 部署会话 75558 已结束，exit code 0，无需再轮询。已有登录已确认有效。缓存 CLI 路径为 `C:/Users/lenovo/AppData/Local/npm-cache/_npx/69f9afb961c37556/node_modules/vercel/dist/index.js`，可用 Node 执行，避免再次下载。`.vercelignore` 已排除本进度文件。
- 代理收尾及作者人工验收均已完成。本版停止，不自动进入后续视觉或登录改造；新版本由项目作者另行指定范围。真实七日等待清理的观察状态仍按验收报告如实保留，不将本次跨设备确认扩展为该项验证。
- 不读取或输出 `.env.local` 密钥/会话令牌，不将临时验证目录加入前端产品。

## 修改文件

`src/types/idea.ts`、`src/lib/ideas.ts`、新增 `src/lib/trash.ts`、新增 `src/components/TrashList.tsx`、`src/pages/Home.tsx`、`src/pages/IdeaDetail.tsx`、`src/App.tsx`、`src/index.css`、`supabase/schema.sql`、新增 `supabase/enable-trash-cleanup.sql`、`package.json`、`package-lock.json`、`README.md`、`NEXT_VERSION.md`、`.vercelignore`、新增 `ACCEPTANCE.md`、本进度文件。
