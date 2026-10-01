# Idea Parking V0.2.1 验收记录

更新时间：2026-10-01 13:50，Asia/Shanghai。

## 当前状态

**V0.2.1 已完成并验收通过。** 前端与数据库升级已发布，正式网址为 https://idea-parking.vercel.app/ 。用户在本聊天明确回复“确认开启”后，七日清理任务已启用，数据库结果确认 **active=true**。2026-10-01 13:50，项目作者针对“手机与电脑的删除、恢复交叉验收”明确回复“验收成功”，人工验收已通过。

## 已实现

- 最近停车与已开走分别留存；已开走仍可编辑或重新停车。
- 详情页面内确认删除；未保存时要求先保存，失败保留内容。
- 七日废纸篓展示完整内容、原状态、删除时间和剩余恢复时间。
- 恢复保留 ID、内容、原状态及创建时间。
- 删除时间由数据库生成；重复删除不延长期限；满 168 小时拒绝恢复。
- 按账号隔离；客户端无永久删除、修改删除时间或编辑废纸篓记录的权限。
- 首页滚动位置恢复、原有数据异常保护、现有邮件登录继续保留。

## 验证结果与限制

| 检查 | 结果 |
| --- | --- |
| npm run build | 2026-10-01 成功；原有大于 500kB 的构建提示，不阻塞发布 |
| 独立 PostgreSQL | 18 项通过：升级保留数据、RLS、软删恢复、禁止越权、七日边界、到期清理条件 |
| 客户端回归 | 9 项通过：旧本地数据保护、日期、API 映射、过滤及失败处理 |
| 真实 Supabase 事务验证 | 2026-09-30 已通过，临时更改全部回滚 |
| 真实页面恢复/删除 | 2026-10-01 通过；只操作标记的验收样本，恢复至已开走后再次移入废纸篓 |
| 刷新后保留删除结果 | 2026-10-01 新本地页面成功从云端读取 |
| 390px 真实页面 | clientWidth=375，scrollWidth=375，废纸篓展开无横向溢出 |
| 失败/取消/未保存/键盘焦点 | 前次真实页面与独立 UI 验证通过；测试材料仍保存在验证目录 |
| Vercel 构建及 promote | 成功，版本 0.2.1 |
| 正式首页、详情直达 | HTTP 200；JS/CSS 与本地生产构建一致；浏览器登录页正常 |
| 手机与电脑删除/恢复交叉验收 | 2026-10-01 项目作者明确确认“验收成功”；已有 V0.2 创建/编辑/状态同步验收继续有效 |
| 真实任务启用 | jobid=1、active=true、计划 0 * * * *、清理条件完整核验；未手动触发即时清理，也没有声称已完成真实七日等待验证 |

定时清理使用云端时钟，每小时整点运行，只清理 `deleted_at <= statement_timestamp() - interval '168 hours'`。恢复期限为严格 168 小时；实际删除在到期后下一次成功运行发生。数据库暂停/任务失败会延后清理，正常及已恢复记录不满足条件。

启用记录：2026-10-01 13:37，项目 `jxrfzotpbxbtqevauvpc`，具名任务 `idea-parking-trash-cleanup`。用户明确确认后，使用匹配 jobid、任务名、角色、计划及完整清理 SQL 的启用语句修改现有任务；未创建第二个任务。证据为验证目录的 `enable-existing-cleanup.sql` 和 `evidence/cron-active.png`。

## 修改文件

| 文件 | 改动 |
| --- | --- |
| src/types/idea.ts | 保留原 Idea，增加云端删除时间类型 |
| src/lib/ideas.ts | 读取删除时间；普通保存排除废纸篓；删除恢复只发送 ID |
| src/lib/trash.ts | 七日期限及剩余时间显示 |
| src/components/TrashList.tsx | 废纸篓展示与恢复、失败提示 |
| src/pages/Home.tsx | 最近停车、已开走、废纸篓分区 |
| src/pages/IdeaDetail.tsx | 草稿保护、页面内删除确认 |
| src/App.tsx | 连接删除恢复请求及废纸篓展开状态 |
| src/index.css | summary 键盘焦点 |
| supabase/schema.sql | 可重复的保留数据升级、RLS/列权限、服务器删除恢复函数 |
| supabase/enable-trash-cleanup.sql | 具名每小时清理任务；现有云端任务已获确认并启用 |
| package.json / package-lock.json | 版本 0.2.1，无新增应用依赖 |
| README.md / NEXT_VERSION.md | 本版说明及路线图；Future Ideas 保留 |
| .vercelignore | 排除内部进度文件 |
| PROGRESS.md / ACCEPTANCE.md | 恢复开发进度与验收记录 |

## 学习说明

这版“删除”先把 `deleted_at` 从空值改成云端时间，原记录仍在表里，所以能够恢复。七天后，定时任务才真正删除记录。

页面上的剩余时间只帮助阅读；数据库最终决定是否能恢复。即使电脑时间不准确，或者有人绕过按钮直接发请求，也不能延长期限或操作其他账号的想法。

登录体验留待下一轮确定，不在本版切换认证方式。

## 本地验证材料

应用依赖未增加。临时验证脚本与证据位于 `D:/Codex/idea-parking-verification/`：`database.mjs`、`client.mjs`、`remote-check.sql`、`enable-existing-cleanup.sql`、`evidence/ui-checks.json`、`evidence/mobile-trash.png`、`evidence/live-mobile-trash.png`、`evidence/cron-inactive.png`、`evidence/cron-active.png`。
