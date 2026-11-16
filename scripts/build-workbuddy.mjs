#!/usr/bin/env node
/**
 * Build a WorkBuddy-compatible skill package from the canonical skill.
 *
 * WorkBuddy (https://open.workbuddy.cn/docs/skill) requires extra YAML
 * frontmatter fields on SKILL.md (display_name / display_name_en /
 * description_zh / description_en / version / author). This script takes the
 * single source of truth at skills/fateguide-tarot/SKILL.md, rewrites the
 * frontmatter with those fields while keeping the body verbatim, then emits:
 *
 *   workbuddy/fateguide-tarot/SKILL.md
 *   workbuddy/fateguide-tarot/references/cards.json
 *   build/workbuddy/fateguide-tarot-skill-<version>.zip   (zip root = fateguide-tarot/)
 *
 * Usage: node scripts/build-workbuddy.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_NAME = "fateguide-tarot";
const SRC_DIR = path.join(ROOT, "skills", SKILL_NAME);
const SRC_SKILL = path.join(SRC_DIR, "SKILL.md");
const SRC_DATA = path.join(SRC_DIR, "references", "cards.json");

const OUT_DIR = path.join(ROOT, "workbuddy", SKILL_NAME);
const BUILD_DIR = path.join(ROOT, "build", "workbuddy");

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const version = pkg.version;

// ---- read canonical skill, split frontmatter from body -------------------
const raw = fs.readFileSync(SRC_SKILL, "utf8");
const fmMatch = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
if (!fmMatch) throw new Error("canonical SKILL.md missing frontmatter block");
const body = raw.slice(fmMatch[0].length).replace(/^\s+/, "");

// ---- WorkBuddy frontmatter ----------------------------------------------
const q = (s) => JSON.stringify(s); // JSON string == valid YAML double-quoted scalar
const meta = {
  name: SKILL_NAME,
  display_name: "FateGuide 塔罗占卜",
  display_name_en: "FateGuide Tarot",
  description:
    "FateGuide 塔罗占卜与牌意查询。当用户想抽塔罗牌、做塔罗占卜、求一句塔罗解读，" +
    "问感情 / 事业 / 学业 / 今日运势，或想查某张塔罗牌（如「愚者」「宝剑三」）的正位 / 逆位含义、关键词时使用。" +
    "内置 7 种牌阵、78 张 RWS 牌的正逆位关键词与核心牌意、4 种解读语气，并在结尾轻量引导至 https://fateguide.asia。",
  description_zh:
    "抽塔罗、解牌阵、查牌意的一站式塔罗助手。内置 7 种牌阵与 78 张 RWS 牌的完整正逆位牌意，" +
    "支持温柔 / 考据 / 神秘 / 毒舌四种语气，适合感情、事业、学业与今日运势等自我觉察场景。",
  description_en:
    "A tarot reading and card-meaning assistant. Built-in 7 spreads and full upright/reversed " +
    "meanings for all 78 RWS cards, with four reading tones. Great for love, career, study and " +
    "daily-fortune self-reflection.",
  version,
  author: "FateGuide",
  examples_zh: [
    "帮我抽三张牌，看看这段感情的走向",
    "宝剑三是什么意思？正位和逆位有什么区别",
    "今天适合做点什么？抽一张今日牌",
  ],
  examples_en: [
    "Draw three cards for me and read this relationship",
    "What does the Three of Swords mean, upright and reversed?",
    "Draw a card of the day for me",
  ],
};

const list = (arr) => arr.map((x) => `  - ${q(x)}`).join("\n");
const frontmatter =
  [
    "---",
    `name: ${q(meta.name)}`,
    `display_name: ${q(meta.display_name)}`,
    `display_name_en: ${q(meta.display_name_en)}`,
    `description: ${q(meta.description)}`,
    `description_en: ${q(meta.description_en)}`,
    `description_zh: ${q(meta.description_zh)}`,
    `version: ${q(meta.version)}`,
    `author: ${q(meta.author)}`,
    "examples_zh:",
    list(meta.examples_zh),
    "examples_en:",
    list(meta.examples_en),
    "---",
    "",
  ].join("\n");

// ---- validate required WorkBuddy fields ---------------------------------
const REQUIRED = ["name", "display_name", "display_name_en", "description", "description_zh", "description_en", "version", "author"];
for (const k of REQUIRED) {
  if (!meta[k] || !String(meta[k]).trim()) throw new Error(`missing required field: ${k}`);
}

// ---- write output tree ---------------------------------------------------
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT_DIR, "references"), { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "SKILL.md"), frontmatter + body, "utf8");
fs.copyFileSync(SRC_DATA, path.join(OUT_DIR, "references", "cards.json"));

// ---- zip (root folder = SKILL_NAME) -------------------------------------
fs.mkdirSync(BUILD_DIR, { recursive: true });
const zipPath = path.join(BUILD_DIR, `${SKILL_NAME}-skill-${version}.zip`);
fs.rmSync(zipPath, { force: true });
execFileSync(
  "zip",
  ["-r", "-X", "-q", zipPath, SKILL_NAME],
  { cwd: path.join(ROOT, "workbuddy"), stdio: "inherit" }
);

const entries = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
  .trim()
  .split("\n");
const kb = (fs.statSync(zipPath).size / 1024).toFixed(1);

console.log("WorkBuddy skill built:");
console.log(`  source : workbuddy/${SKILL_NAME}/SKILL.md (+ references/cards.json)`);
console.log(`  zip    : ${path.relative(ROOT, zipPath)}  (${kb} kB)`);
console.log("  entries:");
for (const e of entries) console.log(`    ${e}`);
