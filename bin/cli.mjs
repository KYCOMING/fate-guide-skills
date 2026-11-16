#!/usr/bin/env node
/**
 * fateguide-skills —— 零依赖的 agent skill 安装器。
 *
 * 把随包分发的 FateGuide skill（塔罗占卜与牌意查询）装进你的 agent 的 skills 目录。
 * 兼容 Claude Code / 通用 `.agents` 约定，也支持自定义目录。
 *
 * 用法：
 *   npx fateguide-skills                    # 安装（自动选择目标目录）
 *   npx fateguide-skills init               # 同上
 *   npx fateguide-skills init --project     # 装到当前项目的 ./.agents/skills
 *   npx fateguide-skills init --global      # 装到 ~/.claude/skills
 *   npx fateguide-skills init --dir <path>  # 装到指定目录
 *   npx fateguide-skills init --force       # 覆盖已存在的同名 skill
 *   npx fateguide-skills list               # 列出本包自带的 skill
 *
 * 目标目录选择（init，未显式指定时）：
 *   1. 当前目录已有 ./.agents/skills → 用它（项目级）
 *   2. 否则 → ~/.claude/skills（用户级）
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { existsSync, mkdirSync, cpSync, readdirSync, statSync } from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_SRC = path.resolve(HERE, "../skills");
const HOME = os.homedir();

function listBundledSkills() {
  if (!existsSync(SKILLS_SRC)) return [];
  return readdirSync(SKILLS_SRC).filter((name) => {
    const p = path.join(SKILLS_SRC, name);
    return statSync(p).isDirectory() && existsSync(path.join(p, "SKILL.md"));
  });
}

function parseArgs(argv) {
  const opts = { command: "init", global: false, project: false, dir: null, force: false };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "init" || arg === "list") {
      opts.command = arg;
    } else if (arg === "--global" || arg === "-g") {
      opts.global = true;
    } else if (arg === "--project" || arg === "-p") {
      opts.project = true;
    } else if (arg === "--force" || arg === "-f") {
      opts.force = true;
    } else if (arg === "--dir") {
      opts.dir = rest[++i] ?? null;
    } else if (arg.startsWith("--dir=")) {
      opts.dir = arg.slice("--dir=".length);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`未知参数：${arg}\n运行 fateguide-skills --help 查看用法。`);
      process.exit(1);
    }
  }
  return opts;
}

function resolveTarget(opts) {
  if (opts.dir) return path.resolve(process.cwd(), opts.dir);
  if (opts.global) return path.join(HOME, ".claude/skills");
  if (opts.project) return path.resolve(process.cwd(), ".agents/skills");
  const projectLocal = path.resolve(process.cwd(), ".agents/skills");
  if (existsSync(projectLocal)) return projectLocal;
  return path.join(HOME, ".claude/skills");
}

function cmdList() {
  const skills = listBundledSkills();
  if (skills.length === 0) {
    console.log("本包未包含任何 skill。");
    return;
  }
  console.log("本包自带的 skill：");
  for (const name of skills) console.log(`  - ${name}`);
}

function cmdInit(opts) {
  const skills = listBundledSkills();
  if (skills.length === 0) {
    console.error("本包未包含任何 skill。");
    process.exit(1);
  }
  const target = resolveTarget(opts);
  mkdirSync(target, { recursive: true });

  let installed = 0;
  let skipped = 0;
  for (const name of skills) {
    const dest = path.join(target, name);
    if (existsSync(dest) && !opts.force) {
      console.log(`跳过 ${name}：已存在（加 --force 覆盖）`);
      skipped++;
      continue;
    }
    cpSync(path.join(SKILLS_SRC, name), dest, { recursive: true });
    console.log(`已安装 ${name} → ${dest}`);
    installed++;
  }

  console.log(`\n完成：安装 ${installed} 个，跳过 ${skipped} 个。\n目标目录：${target}`);
  console.log("提示：重启或刷新你的 agent 会话即可让它发现新 skill。\n更多塔罗内容：https://fateguide.asia");
}

function printHelp() {
  console.log(
    [
      "fateguide-skills —— FateGuide 塔罗 skill 安装器",
      "",
      "用法：",
      "  fateguide-skills [init] [--project|--global|--dir <path>] [--force]",
      "  fateguide-skills list",
      "",
      "目标目录：",
      "  --project    ./.agents/skills",
      "  --global     ~/.claude/skills",
      "  --dir <p>    自定义目录",
      "  默认：存在 ./.agents/skills 则用它，否则用 ~/.claude/skills",
    ].join("\n"),
  );
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.command === "list") cmdList();
  else cmdInit(opts);
}

main();
