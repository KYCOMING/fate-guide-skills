#!/usr/bin/env node
/**
 * 生成 skill 的数据快照：`skills/fateguide-tarot/references/cards.json`
 *
 * 数据源 = FateGuide 站点仓库的权威静态数据
 *   <fate-guide>/src/data/generated/tarot-meanings.ts
 * （78 张牌六语牌意，由站点 scripts/build-tarot-meanings.mjs 生成）。
 * 本脚本只做「抽取精简切片」——每张牌保留 zh / en 两语的名称、正/逆位关键词与
 * 正/逆位核心牌意，让 skill 的 references 自包含、可离线查牌，而不必读站点源码。
 *
 * 用法（在本 skills 仓库根目录）：
 *   node --experimental-strip-types scripts/build-skill-data.mjs           # 生成
 *   node --experimental-strip-types scripts/build-skill-data.mjs --check   # 仅校验是否漂移
 *
 * 站点仓库路径自动探测：先找与本仓库同级的 ../fate-guide（独立仓库情形），
 * 再回退到上一级目录（嵌套在 fate-guide/fate-guide-skills 的情形）；
 * 可用环境变量 FATEGUIDE_SITE 覆盖：
 *   FATEGUIDE_SITE=/path/to/fate-guide node --experimental-strip-types scripts/build-skill-data.mjs
 *
 * Node 22 用 --experimental-strip-types 直接 import .ts（纯数据、无 import）。
 * --check 若发现产物与当前数据不一致，退出码 1。
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const SITE_DATA_REL = "src/data/generated/tarot-meanings.ts";

function resolveSiteRoot() {
  if (process.env.FATEGUIDE_SITE) return path.resolve(process.env.FATEGUIDE_SITE);
  const candidates = [
    path.resolve(ROOT, "../fate-guide"), // 独立仓库：与本仓库同级
    path.resolve(ROOT, ".."), // 嵌套：本包位于 fate-guide/fate-guide-skills
  ];
  for (const c of candidates) {
    if (existsSync(path.join(c, SITE_DATA_REL))) return c;
  }
  return candidates[0];
}

const SITE_ROOT = resolveSiteRoot();
const SRC = path.join(SITE_ROOT, SITE_DATA_REL);
const OUT_PATH = path.join(ROOT, "skills/fateguide-tarot/references/cards.json");

/** 六语 content 里只抽 zh / en 两语（skill 面向中文用户，英文作对照）。 */
const LOCALES = ["zh", "en"];

function pickLocale(entry) {
  return {
    name: entry.name,
    keywordsUpright: entry.keywordsUpright,
    keywordsReversed: entry.keywordsReversed,
    meaningUpright: entry.meaningUpright,
    meaningReversed: entry.meaningReversed,
  };
}

function build(tarotMeanings) {
  const cards = tarotMeanings.map((card) => {
    const slice = {
      slug: card.slug,
      nameEn: card.nameEn,
      arcana: card.arcana,
      suit: card.suit,
      rank: card.rank,
    };
    for (const locale of LOCALES) {
      slice[locale] = pickLocale(card.content[locale]);
    }
    return slice;
  });

  return {
    generatedBy: "scripts/build-skill-data.mjs",
    source: "fate-guide/src/data/generated/tarot-meanings.ts",
    cardCount: cards.length,
    locales: LOCALES,
    note: "只含 zh/en 两语的名称、正逆位关键词与正逆位核心牌意；完整六语与感情/事业/情绪/灵性解读请访问 https://fateguide.asia/cards/<slug>。",
    cards,
  };
}

function serialize(data) {
  return JSON.stringify(data, null, 2) + "\n";
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(
      `[build-skill-data] 找不到站点数据源：${SRC}\n` +
        `请确认 FateGuide 站点仓库位置，或用 FATEGUIDE_SITE=/path/to/fate-guide 指定。`,
    );
    process.exit(1);
  }

  const mod = await import(pathToFileURL(SRC).href);
  const tarotMeanings = mod.tarotMeanings;
  if (!Array.isArray(tarotMeanings) || tarotMeanings.length === 0) {
    console.error(`[build-skill-data] ${SRC} 未导出有效的 tarotMeanings 数组`);
    process.exit(1);
  }

  const isCheck = process.argv.includes("--check");
  const payload = serialize(build(tarotMeanings));

  if (isCheck) {
    let existing = "";
    try {
      existing = readFileSync(OUT_PATH, "utf8");
    } catch {
      existing = "";
    }
    if (existing !== payload) {
      console.error(
        "[build-skill-data] cards.json 已漂移：请重新运行 node --experimental-strip-types scripts/build-skill-data.mjs",
      );
      process.exit(1);
    }
    console.log("[build-skill-data] OK — cards.json 与站点数据源一致");
    return;
  }

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, payload, "utf8");
  const kb = (Buffer.byteLength(payload, "utf8") / 1024).toFixed(1);
  console.log(
    `[build-skill-data] 已写出 ${OUT_PATH}（${kb} KB，${tarotMeanings.length} 张牌）`,
  );
}

main();
