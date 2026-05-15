# Matrix-Sharon · 前端原型

单文件可交付前端原型。打开 `index.html` 即可看，**不需要任何构建/依赖**。

> v1 已实现：leader 推送给成员（成员可自行卸载，leader 看到留存率）
> · 多资源类型预留架构（v1 仅 skill 可用，Viki 规则 / workflow / prompt 模板路线图可见但 disabled）

## 怎么看

```
# 直接双击打开
prototype/index.html

# 或在 PowerShell 里
start prototype/index.html
```

## 包含的页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `#/login` | 登录 | GitHub OAuth 入口 |
| `#/browse` | 浏览（首页） | 全部已批准 skill，搜索 + 排序 + trending banner |
| `#/skill/<slug>` | skill 详情 | README 预览、版本历史、一键安装、投票、作者卡片 |
| `#/me` | 个人中心 | 三个 tab：**待我决定（候选模式 C）** · 我发布的 · 我已安装 |
| `#/leader/queue` | 审批队列 | 仅 leader 可见。pending 列表 + diff 预览 + 一键批/拒 |
| `#/settings` | 设置 | 账号、本地 CLI、leader 团队管理（角色 gated） |

## 怎么逛

1. 落地后默认进 `#/browse`
2. 点任何 skill 卡片 → 详情页 → "一键安装" → 看到模拟的 4 步安装流程
3. 投票按钮可点（计数会动）
4. 进"个人中心" → "待我决定" → 看到本地候选 + diff，点"发布候选 →"会塞进 leader 队列
5. **右上角"原型角色"切到 Leader** → 导航栏出现"审批队列"，进去能批/拒，操作会即时影响候选数

## 这是什么 / 不是什么

✅ **是**：v1 的视觉 + 信息架构 + 全部主流程的可点击表达。给团队/老板看"做完长这样"。
✅ **是**：后续真实 `packages/web/` (Astro) 的视觉参考来源。
❌ **不是**：真的会连后端。所有数据都是 hardcoded JS object，刷新会重置。
❌ **不是**：响应式完美。在 ≥1100px 桌面浏览器看最佳。

## 关键 UI 决策

- **配色**：靛紫主色 (`#5b5bd6`)，叶绿强调 (`#00a47c`)，琥珀警告 (`#c67a00`)，朱红危险 (`#c33d3d`)。中性灰阶克制。
- **字体**：系统字体栈，含 PingFang SC / Microsoft YaHei，零字体加载。
- **节奏**：所有间距 4/8/12/16/20/24/32px 倍数，文字层级 11/12/13/14/15/16/20/22/26/28/30。
- **角色 gate**：`body[data-role]` CSS hook 控制 leader-only 元素显隐——切角色无延迟。
- **mock 后端动效**：安装走 4 步带计时；投票/审批立即生效；toast 2.2s 自隐。

## 下一步（这次先不做）

按你"先前端后内容"的安排，下一步会：

1. 复盘原型反馈、敲定视觉
2. 把这份单文件转成 `packages/web/`（Astro）骨架
3. 同步把 spec 文档 `docs/superpowers/specs/2026-05-15-matrix-sharon-design.md` 反推写出来
4. 进 `superpowers:writing-plans` 出实现计划，开始造后端
