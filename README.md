# career-puzzle-calendar

2027 生涯解谜日历生成器（离线单页 Skill）。

输入是一份结构化的生涯题库（365 天），输出是可离线打开的 HTML 单页：全年一页 / 四季四页 / 十二月十二页 + 索引页，均为单文件、零外部依赖、可打印。

> 说明：本项目题目面向高校社团生涯教育场景，供社团课、班会、新生破冰使用。

## 目录结构

```
career-puzzle-calendar/
├─ SKILL.md                      # Skill 主说明（触发场景、数据字典、版式契约、硬约束）
├─ assets/
│  ├─ template.html              # 单文件模板（内联 CSS/JS/SVG，唯一注入位 __DATA_JSON__）
│  └─ data/calendar_2027.json    # 全年 365 天题库数据
├─ scripts/
│  └─ build_calendar.mjs         # 生成脚本（Node ≥ 18，零依赖）
└─ pages/                        # 生成的页面（可提交，也可由脚本重建）
   ├─ 2027生涯解谜日历_全年版.html
   ├─ 2027生涯解谜日历_Q1.html … _Q4.html
   ├─ 2027生涯解谜日历_01月.html … _12月.html
   └─ index.html
```

## 使用

```bash
# 全年页 + 索引（默认）
node scripts/build_calendar.mjs --out pages

# 分季度
node scripts/build_calendar.mjs --out pages --scope Q1 --scope Q2 --scope Q3 --scope Q4

# 单月 / 全部月份
node scripts/build_calendar.mjs --out pages --scope month:4
node scripts/build_calendar.mjs --out pages --scope months

# 换数据
node scripts/build_calendar.mjs --data assets/data/calendar_2027.json --out pages
```

脚本结束打印 JSON：`ok`、`data_days`、`duplicate_dates`、`levels`、`files`。`ok: true` 且 `data_days: 365`、`duplicate_dates: []` 视为通过。

## 数据概览

| 项目 | 数量 |
|---|---|
| 总天数 | 365 |
| L1 通用题 | 307 |
| L3 专业日 | 24（一专业一天，不合并） |
| L2 职业题 | 23（完整题 4 + 一问 19） |
| L4 生活谜题 | 8 |
| 复盘日 | 4（3/31、6/30、9/30、12/31；其中 9/30 与 L3 专业日叠加） |

全年密码字连成主题句：**看见自己，澄清价值，探索世界，走出一步**。

字段说明见 `SKILL.md` 第二节。

## 安装为本地 Skill

在支持本地 Skill 的环境（如 Marvis）中，把本仓库根目录作为 Skill 目录安装即可：

```
skill_install(local_paths=["<本仓库根目录>"])
```

安装后可用 `career-puzzle-calendar` 触发，直接生成全年 / 季度 / 月度页面。

## 约束

- 题目、答案、数字只能来自 `assets/data/calendar_2027.json`，不得编造。
- 星期以数据字段为准，不做推算。
- 24 个专业日不合并；同周非 L1 节点不超过 2 个；同题型相邻三日不重复。
- 页面不写效果承诺（不出现"保证提升"类表述）。

## License

MIT，见 `LICENSE`。
