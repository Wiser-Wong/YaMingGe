import type { BaziResult, BirthInput, Pillar, WuXing } from '../types';

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
export const GAN_WX: WuXing[] = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
export const ZHI_WX: WuXing[] = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
export const WX_LIST: WuXing[] = ['金', '木', '水', '火', '土'];

/** 五行相生：key 生 value */
export const SHENG: Record<WuXing, WuXing> = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
/** 五行相克：key 克 value */
export const KE: Record<WuXing, WuXing> = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };

export function wxRelation(a: WuXing, b: WuXing): '相生' | '被生' | '相同' | '相克' | '被克' {
  if (a === b) return '相同';
  if (SHENG[a] === b) return '相生';
  if (SHENG[b] === a) return '被生';
  if (KE[a] === b) return '相克';
  return '被克';
}

/** 生肖对应的宜用五行（基于三合六合简化） */
export const ZODIAC_FAVOR: Record<string, WuXing[]> = {
  鼠: ['金', '水'], 牛: ['土', '金', '水'], 虎: ['木', '火', '水'], 兔: ['木', '水', '火'],
  龙: ['土', '水', '金'], 蛇: ['火', '土', '金'], 马: ['火', '木', '土'], 羊: ['土', '火', '木'],
  猴: ['金', '土', '水'], 鸡: ['金', '土', '水'], 狗: ['土', '火', '金'], 猪: ['水', '木', '金'],
};

const WX_TRAIT: Record<WuXing, string> = {
  金: '主义，刚毅果断、重信守诺',
  木: '主仁，温和仁厚、生机勃发',
  水: '主智，聪慧灵动、善于变通',
  火: '主礼，热情开朗、光明磊落',
  土: '主信，稳重厚实、诚信包容',
};

function makePillar(ganIdx: number, zhiIdx: number): Pillar {
  const g = ((ganIdx % 10) + 10) % 10;
  const z = ((zhiIdx % 12) + 12) % 12;
  return { gan: GAN[g], zhi: ZHI[z], ganWx: GAN_WX[g], zhiWx: ZHI_WX[z] };
}

/** 儒略日数 */
function julianDay(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/**
 * 节气日期（寿星公式），返回该年指定“节”的公历日
 * idx: 0小寒 1立春 2惊蛰 3清明 4立夏 5芒种 6小暑 7立秋 8白露 9寒露 10立冬 11大雪
 */
function jieDay(year: number, idx: number): number {
  const C21 = [5.4055, 3.87, 5.63, 4.81, 5.52, 5.678, 7.108, 7.5, 7.646, 8.318, 7.438, 7.18];
  const C20 = [6.11, 4.6295, 6.5, 5.59, 6.318, 6.5, 7.928, 8.35, 8.44, 9.098, 8.218, 7.9];
  const C = year >= 2000 ? C21 : C20;
  const Y = year % 100;
  const D = 0.2422;
  // 1、2月使用上一年的闰年计数
  const L = idx <= 1 ? Math.floor((Y - 1) / 4) : Math.floor(Y / 4);
  return Math.floor(Y * D + C[idx]) - L;
}

/** 计算八字 */
export function computeBazi(input: BirthInput): BaziResult | null {
  if (!input.date) return null;
  const [ys, ms, ds] = input.date.split('-');
  const y = Number(ys), m = Number(ms), d = Number(ds);
  if (!y || !m || !d) return null;

  // 年柱：以立春为界
  let year = y;
  const lichun = jieDay(y, 1);
  if (m < 2 || (m === 2 && d < lichun)) year = y - 1;
  const yearGan = (year - 4) % 10;
  const yearZhi = (year - 4) % 12;
  const yearPillar = makePillar(yearGan, yearZhi);

  // 月柱：以节令为界。寅月从立春起
  // monthIdx: 0=寅 ... 11=丑
  const jd = jieDay(y, m - 1); // m=1 -> 小寒(0)，m=2 -> 立春(1) ...
  // 若在当月节令前，属于上一个节令月
  let jieMonth = m; // 1..12 对应 小寒月(丑)…大雪月(子)
  if (d < jd) jieMonth = m - 1 === 0 ? 12 : m - 1;
  // 小寒(1月)->丑=11, 立春(2月)->寅=0, 惊蛰(3)->卯=1 ...
  const monthIdx = (jieMonth + 10) % 12; // 2->0, 3->1, ..., 12->10, 1->11
  const yg = ((yearGan % 10) + 10) % 10;
  const monthGan = ((yg % 5) * 2 + 2 + monthIdx) % 10;
  const monthPillar = makePillar(monthGan, monthIdx + 2);

  // 日柱
  const jdn = julianDay(y, m, d);
  const dayIdx = (jdn + 49) % 60;
  const dayGan = dayIdx % 10;
  const dayPillar = makePillar(dayGan, dayIdx % 12);

  // 时柱
  let hourPillar: Pillar | null = null;
  if (input.hour !== null && input.hour !== undefined) {
    const h = input.hour;
    const hourZhi = Math.floor(((h + 1) % 24) / 2);
    const hourGan = ((dayGan % 5) * 2 + hourZhi) % 10;
    hourPillar = makePillar(hourGan, hourZhi);
  }

  // 五行统计
  const counts: Record<WuXing, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar].filter(Boolean) as Pillar[];
  pillars.forEach((p) => {
    counts[p.ganWx] += 1;
    counts[p.zhiWx] += 1;
  });
  const total = pillars.length * 2;

  const missing = WX_LIST.filter((w) => counts[w] === 0);
  const weak = WX_LIST.filter((w) => counts[w] === 1);
  const strong = WX_LIST.filter((w) => counts[w] >= Math.max(3, Math.ceil(total * 0.35)));

  // 日主强弱：同类（同我、生我）vs 异类
  const dm = dayPillar.ganWx;
  const helper = WX_LIST.find((w) => SHENG[w] === dm)!;
  const sameSide = counts[dm] + counts[helper] - 1; // 扣除日主自身
  const otherSide = total - 1 - sameSide;
  let strength: BaziResult['strength'] = '中和';
  if (sameSide - otherSide >= 2) strength = '偏强';
  else if (otherSide - sameSide >= 2) strength = '偏弱';

  // 喜用：以“平衡”为纲 —— 旺者制之、缺者补之、弱者扶之
  const killer = (w: WuXing) => WX_LIST.find((x) => KE[x] === w)!; // 克 w 者
  const feeder = (w: WuXing) => WX_LIST.find((x) => SHENG[x] === w)!; // 生 w 者
  const primary = new Set<WuXing>();
  const assist = new Set<WuXing>();
  const bad = new Set<WuXing>();
  const caution = new Set<WuXing>();
  const notes: string[] = [];

  // 1. 抑旺：偏旺之五行忌用，用其所克者制衡为主，以其所生、所克者泄耗为辅
  strong.forEach((s) => {
    bad.add(s);
    if (!missing.includes(feeder(s))) bad.add(feeder(s));
    primary.add(killer(s));
    assist.add(SHENG[s]);
    assist.add(KE[s]);
    notes.push(`${s}偏旺，宜用${killer(s)}克制以求平衡，辅以${SHENG[s]}泄其气、${KE[s]}耗其势；${s}与生${s}之${feeder(s)}不宜再补`);
  });
  // 2. 补缺：所缺之五行直接补足；若所缺者会生旺偏旺之气，则只宜适度点补
  missing.forEach((m) => {
    if (strong.includes(SHENG[m])) {
      caution.add(m);
      notes.push(`五行缺${m}，但${m}生${SHENG[m]}恐助旺气，宜适度点补而不宜重用`);
    } else {
      primary.add(m);
      notes.push(`五行缺${m}，宜直接补${m}以全五行`);
    }
  });
  // 3. 扶弱：偏弱且不助旺者，作为辅用
  const weakHelp = weak.filter((w) => !bad.has(w) && !strong.includes(SHENG[w]));
  weakHelp.forEach((w) => assist.add(w));
  if (weakHelp.length) notes.push(`${weakHelp.join('、')}偏弱，可适当扶助`);
  // 4. 日主强弱
  if (strength === '偏弱') {
    if (!bad.has(helper)) assist.add(helper);
    if (!bad.has(dm)) assist.add(dm);
    notes.push(`日主${dm}偏弱，宜以${helper}生扶、${dm}同气相助`);
  } else if (strength === '偏强') {
    primary.add(killer(dm));
    assist.add(SHENG[dm]);
    assist.add(KE[dm]);
    if (!missing.includes(dm)) bad.add(dm);
    if (!missing.includes(helper)) bad.add(helper);
    notes.push(`日主${dm}偏强，宜以${killer(dm)}制之，${SHENG[dm]}、${KE[dm]}泄耗之，不宜再用${dm}、${helper}`);
  }
  // 主用与忌用冲突时，以制衡为先；辅用去除忌用与主用
  primary.forEach((p) => bad.delete(p));
  bad.forEach((b) => assist.delete(b));
  primary.forEach((p) => assist.delete(p));
  caution.forEach((c) => { primary.delete(c); assist.delete(c); });
  if (primary.size + assist.size === 0) {
    // 五行均衡：取数量最少者略作补益
    const min = Math.min(...WX_LIST.map((w) => counts[w]));
    WX_LIST.filter((w) => counts[w] === min).forEach((w) => primary.add(w));
    notes.push(`五行分布均衡，可略补${Array.from(primary).join('、')}以求圆满`);
  }
  const primaryList = WX_LIST.filter((w) => primary.has(w));
  const assistList = WX_LIST.filter((w) => assist.has(w));
  const favorable = WX_LIST.filter((w) => primary.has(w) || assist.has(w));
  const unfavorable = WX_LIST.filter((w) => bad.has(w));
  const cautionList = WX_LIST.filter((w) => caution.has(w));

  const zodiac = ZODIAC[((yearZhi % 12) + 12) % 12];
  const missText = missing.length ? `五行缺${missing.join('、')}` : '五行俱全';
  const plan = primaryList.length
    ? `取名以补${primaryList.join('、')}为主${assistList.length ? `，辅以${assistList.join('、')}` : ''}`
    : `取名宜补${assistList.join('、')}`;
  const planTail = `${cautionList.length ? `，${cautionList.join('、')}宜适度` : ''}${unfavorable.length ? `，忌用${unfavorable.join('、')}` : ''}`;
  const summary = `日主${dayPillar.gan}${dm}，${WX_TRAIT[dm]}。命局${strength}，${missText}${weak.length ? `，${weak.join('、')}偏弱` : ''}${strong.length ? `，${strong.join('、')}偏旺` : ''}。${plan}${planTail}。`;

  const hourText = hourPillar ? `${ZHI[Math.floor(((input.hour! + 1) % 24) / 2)]}时` : '时辰不详';
  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    zodiac,
    dayMaster: dayPillar.gan,
    dayMasterWx: dm,
    counts,
    missing,
    weak,
    strong,
    primary: primaryList,
    assist: assistList,
    favorable,
    unfavorable,
    caution: cautionList,
    balanceNotes: notes,
    strength,
    summary,
    solarText: `公历 ${y}年${m}月${d}日 ${hourText}`,
  };
}

export const HOUR_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: '时辰不详' },
  { value: 0, label: '子时 23:00-01:00' },
  { value: 2, label: '丑时 01:00-03:00' },
  { value: 4, label: '寅时 03:00-05:00' },
  { value: 6, label: '卯时 05:00-07:00' },
  { value: 8, label: '辰时 07:00-09:00' },
  { value: 10, label: '巳时 09:00-11:00' },
  { value: 12, label: '午时 11:00-13:00' },
  { value: 14, label: '未时 13:00-15:00' },
  { value: 16, label: '申时 15:00-17:00' },
  { value: 18, label: '酉时 17:00-19:00' },
  { value: 20, label: '戌时 19:00-21:00' },
  { value: 22, label: '亥时 21:00-23:00' },
];
