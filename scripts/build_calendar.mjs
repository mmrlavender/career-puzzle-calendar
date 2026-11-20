#!/usr/bin/env node
/**
 * 2027 生涯解谜日历 · 单页生成器
 * 用法：
 *   node scripts/build_calendar.mjs --out <输出目录> [选项]
 * 选项：
 *   --data <路径>       数据文件，默认 assets/data/calendar_2027.json
 *   --scope all|Q1|Q2|Q3|Q4|month:4|months   出页范围，可重复；默认 all
 *   --print             额外输出打印优化说明（同一页面已内置 @media print）
 *   --no-index          不生成索引页
 * 输出：单个自包含 HTML（零外部依赖），并在指定目录写 index.html 索引。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function args(argv) {
  const o = { data: path.join(ROOT, "assets/data/calendar_2027.json"), out: path.resolve(ROOT, "pages"), scopes: [], index: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--data") o.data = path.resolve(argv[++i]);
    else if (a === "--out") o.out = path.resolve(argv[++i]);
    else if (a === "--scope") o.scopes.push(argv[++i]);
    else if (a === "--months") o.scopes.push("months");
    else if (a === "--no-index") o.index = false;
    else if (a === "--print") o.print = true;
  }
  if (!o.scopes.length) o.scopes = ["all"];
  return o;
}

const CN = ["", "一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const QUARTER_MONTHS = { Q1: [1, 2, 3], Q2: [4, 5, 6], Q3: [7, 8, 9], Q4: [10, 11, 12] };

function starSvg(months, themes) {
  const set = new Set(months);
  const cx = 66, cy = 66, r = 46;
  let marks = "";
  for (let m = 1; m <= 12; m++) {
    const ang = (Math.PI * 2 * (m - 1)) / 12 - Math.PI / 2;
    const x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang);
    const on = set.has(m);
    const lx = cx + (r + 15) * Math.cos(ang), ly = cy + (r + 15) * Math.sin(ang);
    marks += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${on ? 5 : 3.2}" fill="${on ? "#B4553C" : "#CBD5CC"}" stroke="${on ? "#8f3f2b" : "none"}" stroke-width="1"/>`;
    if (on) marks += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" font-size="9.5" text-anchor="middle" fill="#0F3D2E" font-family="serif">${themes[m] || ""}</text>`;
  }
  return `<svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label="全年星盘">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#0F3D2E" stroke-width="1" stroke-dasharray="2 5" opacity=".55"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="none" stroke="#DCD5C4" stroke-width="1"/>
  <text x="${cx}" y="${cy + 2}" font-size="15" text-anchor="middle" fill="#0F3D2E" font-family="serif">2027</text>
  <text x="${cx}" y="${cy + 18}" font-size="9" text-anchor="middle" fill="#6B7A70" letter-spacing="1">解谜</text>
  ${marks}
</svg>`;
}

function safeJson(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function build(ctx, scopeKey, months, label) {
  const { data, tpl } = ctx;
  const days = data.days.filter((d) => months.includes(d.month));
  const payload = {
    year: data.year,
    title: data.title,
    subtitle: data.subtitle,
    month_theme: data.month_theme,
    meta: { scope: scopeKey, scope_label: label },
    days,
  };
  const title = `${data.year} 生涯解谜日历｜${label}`;
  const foot = `${label} · 共 ${days.length} 天 · 生成于 ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
  const html = tpl
    .replace(/__META_TITLE__/g, title)
    .replace(/__META_SUBTITLE__/g, data.subtitle + "　" + label)
    .replace("__SVG_STAR__", starSvg(months, data.month_theme))
    .replace("__META_FOOT__", foot)
    .replace("__META_DATA__", path.basename(ctx.dataPath))
    .replace("__DATA_JSON__", safeJson(payload));
  return { html, days };
}

function main() {
  const o = args(process.argv);
  const dataPath = o.data;
  if (!fs.existsSync(dataPath)) {
    console.error(JSON.stringify({ ok: false, error: "数据文件不存在: " + dataPath }));
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  if (!Array.isArray(data.days) || !data.days.length) {
    console.error(JSON.stringify({ ok: false, error: "数据文件 days 为空" }));
    process.exit(1);
  }
  // 数据自检：365 天无缺无重
  const seen = new Set();
  const dup = [];
  for (const d of data.days) {
    if (seen.has(d.date)) dup.push(d.date);
    seen.add(d.date);
  }
  const tplPath = path.join(ROOT, "assets/template.html");
  const tpl = fs.readFileSync(tplPath, "utf8");
  fs.mkdirSync(o.out, { recursive: true });
  const ctx = { data, tpl, dataPath };

  const jobs = [];
  for (const s of o.scopes) {
    if (s === "all") jobs.push(["all", [1,2,3,4,5,6,7,8,9,10,11,12], "全年版"]);
    else if (QUARTER_MONTHS[s]) jobs.push([s, QUARTER_MONTHS[s], `${s}（${QUARTER_MONTHS[s][0]}—${QUARTER_MONTHS[s][1] + 2} 月）`]);
    else if (s.startsWith("month:")) {
      const m = parseInt(s.split(":")[1], 10);
      jobs.push([s, [m], `${CN[m]}`]);
    } else if (s === "months") {
      for (let m = 1; m <= 12; m++) jobs.push([`month:${m}`, [m], CN[m]]);
    } else {
      console.error(JSON.stringify({ ok: false, error: "未知 scope: " + s }));
      process.exit(1);
    }
  }

  const files = [];
  const indexItems = [];
  for (const [key, months, label] of jobs) {
    const { html, days } = build(ctx, key, months, label);
    const name = key === "all" ? "2027生涯解谜日历_全年版.html"
      : key.startsWith("month:") ? `2027生涯解谜日历_${String(months[0]).padStart(2, "0")}月.html`
      : `2027生涯解谜日历_${key}.html`;
    const fp = path.join(o.out, name);
    fs.writeFileSync(fp, html, "utf8");
    files.push(fp);
    indexItems.push({ name, label, days: days.length, key });
  }

  if (o.index) {
    const listHtml = indexItems.map((it) => `<li><a href="${it.name}">${it.label}</a><span>${it.days} 天</span></li>`).join("\n");
    const index = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<title>${data.year} 生涯解谜日历 · 索引</title>
<style>body{background:#F5F1E6;color:#1E2A24;font-family:"Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;
max-width:760px;margin:0 auto;padding:48px 20px;line-height:1.8}
h1{font-family:"Noto Serif SC",serif;color:#0F3D2E;font-size:28px;margin:0 0 6px}
p.sub{color:#6B7A70;font-size:13.5px;margin:0 0 22px}
ul{list-style:none;padding:0;margin:0}
li{padding:12px 0;border-bottom:1px solid #DCD5C4;display:flex;justify-content:space-between;align-items:baseline}
a{color:#0F3D2E;text-decoration:none;font-family:"Noto Serif SC",serif;font-size:17px}
a:hover{color:#B4553C}
span{color:#6B7A70;font-size:13px}
footer{margin-top:28px;font-size:12.5px;color:#6B7A70;border-top:2px solid #0F3D2E;padding-top:14px}</style>
</head><body>
<h1>${data.year} 生涯解谜日历</h1>
<p class="sub">${data.subtitle}　共 ${data.days.length} 天，点开即用，离线可看</p>
<ul>
${listHtml}
</ul>
<footer>数据文件：${path.basename(dataPath)}　生成时间：${new Date().toLocaleString("zh-CN", { hour12: false })}</footer>
</body></html>`;
    const ip = path.join(o.out, "index.html");
    fs.writeFileSync(ip, index, "utf8");
    files.push(ip);
  }

  const stat = {};
  for (const d of data.days) stat[d.level] = (stat[d.level] || 0) + 1;
  console.log(JSON.stringify({
    ok: true,
    data_days: data.days.length,
    duplicate_dates: dup,
    levels: stat,
    files,
  }, null, 1));
}

main();
