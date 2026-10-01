# Idea Parking

把暂时没时间处理的想法，先停在这里。它不是待办清单；重点是先记下念头，以后再回来修改或开始行动。

当前版本：**V0.2.1 — 想法整理与七日废纸篓**

| 版本 | 内容 |
| --- | --- |
| V0.1 | Local prototype：浏览器本地保存想法 |
| V0.1.1 | Data Safety & UX Fixes：异常数据保护、校验、未保存提醒、可访问性 |
| V0.2 | Mobile Capture & Cloud Sync：邮箱登录、Supabase 云端保存、旧数据迁移 |
| V0.2.1 | “已开走”分区、删除确认、七日废纸篓、恢复与云端定时清理 |

后续版本方向与下一轮候选需求见 [NEXT_VERSION.md](NEXT_VERSION.md)。

## 技术栈

React、TypeScript、Vite、Tailwind CSS、React Router、Supabase Auth 和 PostgreSQL。V0.2 登录后的想法以 Supabase 为唯一主要数据源；`localStorage` 只保留 V0.1 旧数据和迁移完成标记。
Supabase Auth 仍会在浏览器中保存登录会话，这不是想法数据库。

## 本地开发与 Supabase 配置

1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 创建项目。
2. 打开项目的 **SQL Editor**，执行 [supabase/schema.sql](supabase/schema.sql)。这会创建 `public.ideas`、字段约束、索引、按 `user_id` 隔离数据的 RLS 策略及删除/恢复函数。已有 V0.2 项目也执行同一脚本：新增可为空的 `deleted_at`，保留原来的想法与时间，不清空数据。
3. 在 **Authentication → Sign In / Providers** 确认 Email 登录已启用，并将 **Email OTP expiration** 设为 `300` 秒。应用使用邮件 Magic Link，不需要密码页面；链接 5 分钟内有效，重新发送后请只使用最新邮件。
4. 从项目的 **Connect** 面板复制 Project URL 和 publishable key；也可在 **Project Settings → API Keys** 找到 key。旧的 anon key 也可用。**绝不能把 secret 或 service_role key 放进前端。**
5. 复制 `.env.example` 为 `.env.local`，填写：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的_publishable_或_anon_key
```

6. 在 **Authentication → URL Configuration** 把本地使用的完整来源加入 Redirect URLs。例如 `http://localhost:5173/`。如果要迁移原先保存在 `http://127.0.0.1:4173/` 的数据，还要加入该地址。Site URL 可以先填本地实际使用的地址；上线后改为正式 Vercel 地址。
7. 运行：

```bash
npm install
npm run dev
```

打开终端显示的地址，输入邮箱并在**当前浏览器**打开邮件中的登录链接。登录后才会读取和写入云端想法。生产构建运行 `npm run build`。

## 旧数据迁移

登录后，如果当前网页来源的 `localStorage` 中有合法的 `idea-parking-data`，页面会询问是否同步。点击“同步到云端”会保留原来的 ID、内容、状态和两个时间；已有同 ID 的云端记录不会被覆盖。成功后原始本地数据仍保留。

**浏览器存储按来源和浏览器分别隔离。** Codex 内的浏览器与 Chrome 即使打开相同地址，也看不到彼此的旧数据；`localhost:5173`、`127.0.0.1:4173` 和 Vercel 域名同样彼此隔离。如果 V0.1 是在 Codex 浏览器中的 `http://127.0.0.1:4173/` 使用的，请在**那个原浏览器**打开同一地址、登录并点击“同步到云端”。之后在 Chrome、手机或 Vercel 上用同一邮箱登录，即可看到已同步的数据。不要手动清除旧站点的浏览器数据。

若旧 JSON 损坏或字段无效，页面会提示，**不会上传也不会删除**原始数据。同步中断时可重试；不会重复创建同 ID 的想法。

## 部署到 Vercel

1. 把这个目录作为 Vercel 项目的根目录导入。
2. Framework Preset 选 Vite；Build Command 为 `npm run build`，Output Directory 为 `dist`。
3. 在 Vercel 项目 **Settings → Environment Variables** 配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，然后重新部署。`vercel.json` 已将 `/idea/:id` 等直接访问的地址改写到 SPA 入口。
4. 回到 Supabase **Authentication → URL Configuration**，将 Site URL 设置为正式 `https://你的域名/`，并将同一个完整地址加入 Redirect URLs。若使用 Vercel 预览域名，也按需加入其回调地址。
5. 在手机浏览器打开部署后的 HTTPS 地址，使用同一邮箱登录。手机和电脑会读取同一个 Supabase 账号的数据。

## 数据与当前限制

- 云端请求成功后，页面才显示保存成功或清空输入；失败时保留草稿并提示重试。
- 数据由 Supabase Auth 用户身份及 PostgreSQL RLS 隔离。前端 publishable/anon key 可公开，但用户数据必须依靠 RLS 保护。
- 当前没有离线写入或自动双向同步；断网时不能保存。
- 当前没有 PWA、推送、搜索、标签、AI 或原生手机 App；登录方式仍使用现有邮件链接。
- 邮件登录、跨设备同步及 RLS 的真实联调，需要先完成上面的 Supabase 配置。

## V0.2.1：整理与七日废纸篓

- 首页“最近停车”只显示停车中的想法；“已开走”独立留存，仍可编辑或重新停车。
- 在详情点击“删除想法”并确认后，记录移入废纸篓。存在未保存修改时先提示保存；删除失败时保留页面内容。
- 首页下方展开“废纸篓”，可查看完整内容、原状态、删除时间及剩余恢复时间。恢复会保留原 ID、内容、状态和创建时间。
- 删除时间由数据库生成。重复删除不会重置七日期限；普通客户端不能修改 `deleted_at`、编辑废纸篓内容或永久删除记录。
- 满七天（168 小时）后，数据库拒绝恢复。前端剩余时间仅为提示，实际期限以云端时间为准。

### 启用云端清理

执行 `schema.sql` 后，在 SQL Editor 中执行 [supabase/enable-trash-cleanup.sql](supabase/enable-trash-cleanup.sql)。这会启用 Supabase Cron，创建名为 `idea-parking-trash-cleanup` 的任务，每小时整点永久删除已在废纸篓满七天的记录。重复执行会更新同名任务。

清理条件仅使用 `deleted_at`；正常想法、已恢复想法，以及未满七天的废纸篓记录不会被删除。关闭浏览器不影响任务；实际永久删除发生在到期后的下一次成功运行。数据库暂停或任务失败时，清理会延后；可在 **Integrations → Cron** 查看任务及运行历史。

V0.2 升级顺序：先执行数据库升级和清理脚本，再部署 V0.2.1 前端。升级 SQL 不会把旧想法移入废纸篓。

## Future Ideas

以下只记录未来方向，当前版本不实现：

- AI Interpretation：帮助理解旧想法，但不替作者决定。
- Idea Connections：建立想法之间的联系。
- Resurfacing：让旧想法在合适时机重新浮出。
- Dreaming Mode：从不同时间和主题的旧想法中发现意外联系。
- PWA / Add to Home Screen：可在后续 V0.2.x 或 V0.3 探索。
