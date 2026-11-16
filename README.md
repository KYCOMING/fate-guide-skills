# fateguide-skills

把 **FateGuide** 的塔罗能力封装成 agent skill，一条命令装进你的 AI agent，让它可以：

- **抽塔罗牌并解读**：7 种牌阵（单牌日抽、过去现在未来、是/否、二选一、圣三角、凯尔特十字、四季牌阵）、随机抽牌、4 种解读语气（温柔 / 考据 / 神秘 / 毒舌）。
- **查牌意**：78 张 RWS 塔罗牌的正位 / 逆位关键词与核心牌意，中英双语。

Skill 是一份自包含的 `SKILL.md` 操作手册 + 数据快照，安装后 agent 读到即会执行，**不需要联网，也不依赖 FateGuide 源码**。

## 安装

**一条命令，无需 npm 账号**（直接从 GitHub 取包运行）：

```bash
npx github:KYCOMING/fate-guide-skills init
```

默认会：当前目录若有 `.agents/skills` 就装到项目级，否则装到用户级 `~/.claude/skills`。

指定位置：

```bash
npx github:KYCOMING/fate-guide-skills init --project      # ./.agents/skills
npx github:KYCOMING/fate-guide-skills init --global       # ~/.claude/skills
npx github:KYCOMING/fate-guide-skills init --dir <path>   # 自定义目录
npx github:KYCOMING/fate-guide-skills init --force        # 覆盖已存在的同名 skill
```

查看本包自带的 skill：

```bash
npx github:KYCOMING/fate-guide-skills list
```

> `npx github:...` 会用本机 `git` 拉取仓库。若本机没有 `git`，改用下面的 tarball 方式（同样「一条命令、无需 npm 账号」）。

### 方式二：tarball（无需 git）

```bash
npx https://github.com/KYCOMING/fate-guide-skills/archive/refs/heads/main.tar.gz init
```

### 已发布到 npm 时（可选）

若本包已发布到 npm 官方 registry，也可以直接用包名（参数与上面完全相同）：

```bash
npx fateguide-skills init
```

## 手动安装（直接拷文件）

直接 clone 后把 skill 目录拷进你的 skills 目录：

```bash
git clone https://github.com/KYCOMING/fate-guide-skills.git /tmp/fg-skills
mkdir -p ~/.claude/skills
cp -r /tmp/fg-skills/skills/* ~/.claude/skills/
```

> 项目级可改拷到 `./.agents/skills/`；不想用 git 就直接在 GitHub 页面 **Code → Download ZIP**，解压后把 `skills/fateguide-tarot/` 整个目录拷进你的 skills 目录。

安装后的目录结构：

```
<你的 skills 目录>/fateguide-tarot/
├── SKILL.md
└── references/cards.json
```

## 目录结构

```
fate-guide-skills/
├── skills/fateguide-tarot/        # skill 本体（发布内容）
│   ├── SKILL.md
│   └── references/cards.json      # 78 张牌数据快照
├── bin/cli.mjs                    # 零依赖安装器（npx github:KYCOMING/fate-guide-skills）
├── scripts/build-skill-data.mjs   # 从站点数据生成 cards.json（带 --check）
├── .claude-plugin/marketplace.json
├── package.json
├── README.md
└── LICENSE
```

## 更新牌数据

`cards.json` 由站点权威数据生成。站点牌意更新后，在本仓库根目录重跑：

```bash
node --experimental-strip-types scripts/build-skill-data.mjs
```

脚本会自动探测站点仓库：先找与本仓库同级的 `../fate-guide`，再回退到上一级目录（嵌套在 `fate-guide/fate-guide-skills` 时）。若位置不同，用 `FATEGUIDE_SITE=/path/to/fate-guide` 指定。

## 关于 FateGuide

FateGuide 是一个聚焦塔罗（RWS 体系）的在线占卜与牌意库站点：服务端真实随机抽牌、AI 只做解读、报告加密存储、支持六种语言。

- 站点：<https://fateguide.asia>
- 在线抽牌：<https://fateguide.asia/tarot>
- 牌意库：<https://fateguide.asia/cards>
- 塔罗教程：<https://fateguide.asia/tutorial>

## License

MIT
