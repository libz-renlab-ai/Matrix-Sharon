# Matrix-Sharon

**团队技能集市** —— 给团队用的 Claude Code skills / plugins / workflows 共享平台。

> 这是从 [TeamBrain](https://github.com/libz-renlab-ai/TeamBrain) 拆分出来的项目，思想上参考 [skills.vote](https://skills.vote/)，但更面向**团队**：
> - 明确的 **leader / member** 角色与权限
> - 上传走 **leader 审批门**，过滤掉 AI 生成的垃圾
> - 本地 scanner 自动发现"你刚写完的 skill"，进个人中心"待我决定"
> - 一键 Web 安装到本地 `~/.claude/skills/`

## 当前状态

🚧 仓库刚启动。已有：

- ✅ [前端原型](./prototype/index.html) —— 全部主流程的可点击 demo（单 HTML 文件，零依赖）
- ⏳ 设计文档（待写）
- ⏳ 后端 / CLI / Astro 站点（待造）

## 先看原型

```
# Windows
start prototype/index.html

# macOS / Linux
open prototype/index.html
```

详见 [prototype/README.md](./prototype/README.md)。

## v1 范围（已对齐的决策）

| 维度 | 决策 |
|------|------|
| 部署形态 | 单团队自托（公司内部一份） |
| 团队结构 | 不划队，只有用户 + 角色 |
| 角色 | leader（Curator + Gatekeeper + Owner 全能）+ member |
| 资源类型 v1 | Claude Code 原生 skill（plugin / workflow v1.x 加） |
| 认证 | GitHub OAuth |
| 安装路径 | Web 一键（底层走本地 sharon CLI/daemon） |
| 提交路径 | 个人中心"待我决定"候选模式（底层走 `sharon publish`） |
| 版本模型 | 每次审批通过自动生不可变版本，`latest` + pin 都支持 |
| 审批 | 上传 → `pending`，leader 批准才公开 |
| 技术栈 | pnpm monorepo · Fastify + SQLite · Astro · 复用 TeamBrain skill-compiler |

## 与 sibling 项目的关系

- [Matrix-Riven](https://github.com/libz-renlab-ai/Matrix-Riven) —— 用户日志上传子系统（TeamBrain 拆分）
- [Matrix-Viki](https://github.com/libz-renlab-ai/Matrix-Viki) —— 个人 AI 规则学习引擎（TeamBrain 拆分）
- [Matrix-Plugin-memory](https://github.com/libz-renlab-ai/Matrix-Plugin-memory) —— 插件市场雏形
- **Matrix-Sharon（本仓）** —— 团队技能集市

## License

MIT（待加 LICENSE 文件）
