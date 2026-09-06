/**
 * 逆算デイリープランナー ── 音声/一言テキストの分解（純粋JS・クライアントとNodeテスト共用）
 * 「LP直し 40分 金曜まで」 → {title:'LP直し', estMin:40, deadline:'2026-09-11', priority:2}
 */
function pt_pad2(n) { return (n < 10 ? '0' : '') + n; }
function pt_fmt(d) { return d.getFullYear() + '-' + pt_pad2(d.getMonth() + 1) + '-' + pt_pad2(d.getDate()); }
function pt_plusDays(now, n) { return new Date(now.getFullYear(), now.getMonth(), now.getDate() + n); }
function pt_toHalf(s) { return s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }); }

function parseTaskText(text, now) {
  now = now || new Date();
  var s = pt_toHalf(String(text || '')).replace(/[、。，．,\.]/g, ' ');
  var estMin = null, deadline = '', priority = 2;

  // ---- 見積時間 ----
  var m;
  if ((m = s.match(/(\d+(?:\.\d+)?)\s*時間\s*半/))) { estMin = Math.round(parseFloat(m[1]) * 60 + 30); s = s.replace(m[0], ' '); }
  else if ((m = s.match(/(\d+(?:\.\d+)?)\s*時間(?:\s*(\d+)\s*分)?/))) { estMin = Math.round(parseFloat(m[1]) * 60 + (m[2] ? parseInt(m[2], 10) : 0)); s = s.replace(m[0], ' '); }
  else if ((m = s.match(/(\d+)\s*分(?:間)?/))) { estMin = parseInt(m[1], 10); s = s.replace(m[0], ' '); }
  else if ((m = s.match(/半日/))) { estMin = 240; s = s.replace(m[0], ' '); }

  // ---- 期限 ----
  var WD = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
  var dow = now.getDay(), mondayOffset = (dow + 6) % 7;            // 今週の月曜までの日数
  var thisMonday = pt_plusDays(now, -mondayOffset);
  function setDl(d, matched) { deadline = pt_fmt(d); s = s.replace(matched, ' '); }
  var rules = [
    [/今日(?:中|まで|までに)?/, function () { return pt_plusDays(now, 0); }],
    [/明後日(?:まで|までに|に)?/, function () { return pt_plusDays(now, 2); }],
    [/明日(?:中|まで|までに|に)?/, function () { return pt_plusDays(now, 1); }],
    [/今週(?:中|末|まで|までに)?/, function () { return new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 6); }],
    [/来週\s*([日月火水木金土])曜(?:日)?(?:まで|までに|に)?/, function (mm) { return new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 7 + (WD[mm[1]] + 6) % 7); }],
    [/来週(?:中|末|まで|までに)?/, function () { return new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 13); }],
    [/(?:今週\s*)?([日月火水木金土])曜(?:日)?(?:まで|までに|に)?/, function (mm) { var diff = (WD[mm[1]] - dow + 7) % 7; return pt_plusDays(now, diff); }],
    [/月末(?:まで|までに)?/, function () { return new Date(now.getFullYear(), now.getMonth() + 1, 0); }],
    [/(\d{1,2})\s*月\s*(\d{1,2})\s*日?(?:まで|までに|に)?/, function (mm) { var y = now.getFullYear(); var d = new Date(y, +mm[1] - 1, +mm[2]); if (d < pt_plusDays(now, 0)) d = new Date(y + 1, +mm[1] - 1, +mm[2]); return d; }],
    [/(?:^|\s)(\d{1,2})\s*日(?:まで|までに|に)?(?=\s|$)/, function (mm) { var d = new Date(now.getFullYear(), now.getMonth(), +mm[1]); if (d < pt_plusDays(now, 0)) d = new Date(now.getFullYear(), now.getMonth() + 1, +mm[1]); return d; }],
  ];
  for (var i = 0; i < rules.length; i++) {
    var mm = s.match(rules[i][0]);
    if (mm) { setDl(rules[i][1](mm), mm[0]); break; }
  }

  // ---- 優先度 ----
  if ((m = s.match(/至急|急ぎ|大至急|最優先|重要|優先度\s*高/))) { priority = 1; s = s.replace(m[0], ' '); }
  else if ((m = s.match(/いつか|後で|あとで|余裕があれば|優先度\s*低|低め/))) { priority = 3; s = s.replace(m[0], ' '); }

  // ---- タイトル ----
  var title = s.replace(/\s+/g, ' ').replace(/^\s*(まで|までに|に|で|を)\s*/g, '').replace(/\s*(まで|までに)\s*$/g, '').trim();
  return { title: title, estMin: estMin, deadline: deadline, priority: priority };
}

if (typeof module !== 'undefined') module.exports = { parseTaskText: parseTaskText };
