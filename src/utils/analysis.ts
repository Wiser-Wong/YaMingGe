import type { BaziResult, BoostMode, CharInfo, DimensionScore, ExpectKey, GridInfo, NameAnalysis, SchemeKey, SurnameInfo, WuXing } from '../types';
import { numerology, numberWx, luckScore, type Luck } from '../data/numerology';
import { pingZe, splitPinyin, toneMark, TONE_NAMES } from './pinyin';
import { wxRelation, ZODIAC_FAVOR } from './bazi';

export const EXPECT_LABEL: Record<ExpectKey, string> = {
  study: '学业有成', career: '事业腾达', health: '健康平安', virtue: '品德高尚', wisdom: '聪明智慧',
  gentle: '温柔善良', brave: '勇敢坚强', art: '艺术才华', wealth: '富足丰盈', happy: '幸福美满',
};

const EXPECT_PHRASE: Record<ExpectKey, string> = {
  study: '学业精进、博学多识', career: '事业通达、功成名就', health: '身体康健、一生平安', virtue: '品性高洁、德行出众',
  wisdom: '聪慧过人、明理通达', gentle: '温良恭俭、待人以善', brave: '坚毅果敢、勇于担当', art: '才情横溢、风雅有致',
  wealth: '衣食丰足、财运亨通', happy: '家庭和乐、幸福圆满',
};

export interface AnalyzeContext {
  bazi: BaziResult | null;
  expectations?: ExpectKey[];
  scheme?: SchemeKey;
  boostWx?: WuXing[]; // 用户指定需要补充的五行
  boostMode?: BoostMode; // 组合 / 任一
  natural?: string; // 浑然天成的连读说明
}

/** 用户指定五行补充的命中情况：combo 需二字各属一行 */
function boostMatch(chars: CharInfo[], boost: WuXing[], mode: BoostMode | undefined) {
  const hit = chars.filter((c) => boost.includes(c.wx));
  const isCombo = mode === 'combo' && boost.length === 2 && chars.length === 2;
  const full = isCombo ? hit.length === 2 && chars[0].wx !== chars[1].wx : hit.length === chars.length;
  const label = isCombo ? `${boost[0]}+${boost[1]}组合` : `补${boost.join('、')}`;
  return { hit, isCombo, full, label };
}

/** 方案对应的权重 */
export const SCHEME_WEIGHTS: Record<SchemeKey, Record<string, number>> = {
  balanced: { phonetic: 0.2, glyph: 0.1, wuxing: 0.2, meaning: 0.2, unique: 0.1, culture: 0.1, numerology: 0.1 },
  wuxing: { phonetic: 0.15, glyph: 0.08, wuxing: 0.4, meaning: 0.15, unique: 0.07, culture: 0.07, numerology: 0.08 },
  phonetic: { phonetic: 0.4, glyph: 0.12, wuxing: 0.12, meaning: 0.15, unique: 0.08, culture: 0.06, numerology: 0.07 },
  classic: { phonetic: 0.15, glyph: 0.08, wuxing: 0.12, meaning: 0.2, unique: 0.08, culture: 0.3, numerology: 0.07 },
  numerology: { phonetic: 0.12, glyph: 0.12, wuxing: 0.15, meaning: 0.15, unique: 0.06, culture: 0.05, numerology: 0.35 },
  zodiac: { phonetic: 0.15, glyph: 0.1, wuxing: 0.35, meaning: 0.15, unique: 0.08, culture: 0.07, numerology: 0.1 },
  unique: { phonetic: 0.15, glyph: 0.1, wuxing: 0.12, meaning: 0.18, unique: 0.3, culture: 0.08, numerology: 0.07 },
  natural: { phonetic: 0.2, glyph: 0.1, wuxing: 0.15, meaning: 0.3, unique: 0.08, culture: 0.1, numerology: 0.07 },
};

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));

/** 基于字符串的稳定伪随机（用于寓意分微调，让分数不至于千篇一律） */
function hashJitter(s: string, range = 4): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % (range * 2 + 1)) - range;
}

// ---------- 音律 ----------
function scorePhonetic(surname: SurnameInfo, chars: CharInfo[]): DimensionScore {
  const parts = [splitPinyin(surname.py.split(' ').pop() ?? ''), ...chars.map((c) => splitPinyin(c.py))];
  const tones = parts.map((p) => p.tone);
  let score = 72;
  const notes: string[] = [];

  // 相邻声调变化
  let sameToneAdj = 0;
  for (let i = 1; i < tones.length; i++) {
    if (tones[i] && tones[i - 1]) {
      if (tones[i] === tones[i - 1]) sameToneAdj++;
      else score += 8;
    }
  }
  if (sameToneAdj > 0) {
    score -= sameToneAdj * 8;
    notes.push('存在相邻同调，读来略平');
  }
  // 平仄错落
  const pz = tones.map(pingZe).filter((p) => p !== '?');
  if (pz.length >= 2 && new Set(pz).size > 1) {
    score += 8;
    notes.push(`平仄「${pz.join('')}」错落有致`);
  } else if (pz.length >= 2) {
    notes.push(`全为${pz[0]}声，起伏稍弱`);
  }
  // 三声连读（变调）
  if (tones.filter((t) => t === 3).length >= 2) {
    score -= 4;
    notes.push('含多个上声，连读会变调');
  }
  // 双声叠韵
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].initial && parts[i].initial === parts[i - 1].initial) {
      score -= 8;
      notes.push('相邻声母相同（双声），略显拗口');
    }
    if (parts[i].final && parts[i].final === parts[i - 1].final) {
      score -= 8;
      notes.push('相邻韵母相同（叠韵），略显拗口');
    }
    if (parts[i].plain && parts[i].plain === parts[i - 1].plain) score -= 10;
  }
  // 尾字为去声/阳平更响亮
  const last = tones[tones.length - 1];
  if (last === 4 || last === 2) score += 4;
  // 开口音尾字
  const lastFinal = parts[parts.length - 1].final;
  if (/^(a|ang|ao|ai|an|ong|eng|ing)$/.test(lastFinal)) {
    score += 3;
    notes.push('尾字开口音，响亮悦耳');
  }
  const toneText = parts.map((p) => (p.tone ? TONE_NAMES[p.tone] : '?')).join('·');
  const comment = `声调为「${toneText}」。${notes.length ? notes.join('；') + '。' : '声韵搭配和谐。'}`;
  return { key: 'phonetic', label: '音律', score: clamp(score, 45, 100), comment };
}

// ---------- 字型 ----------
function scoreGlyph(surname: SurnameInfo, chars: CharInfo[]): DimensionScore {
  let score = 80;
  const notes: string[] = [];
  const strokes = chars.map((c) => c.strokes);
  strokes.forEach((s, i) => {
    if (s >= 20) { score -= 10; notes.push(`「${chars[i].ch}」笔画较多，书写稍繁`); }
    else if (s <= 3) { score -= 4; notes.push(`「${chars[i].ch}」笔画极简，与姓氏搭配需注意平衡`); }
    else if (s >= 6 && s <= 15) score += 4;
  });
  if (strokes.length === 2) {
    const diff = Math.abs(strokes[0] - strokes[1]);
    if (diff > 10) { score -= 8; notes.push('两字笔画悬殊，视觉略失衡'); }
    else if (diff <= 4) { score += 5; notes.push('两字繁简相近，结构匀称'); }
  }
  const all = [surname.strokes, ...strokes];
  const avg = all.reduce((a, b) => a + b, 0) / all.length;
  if (avg >= 7 && avg <= 14) { score += 5; notes.push('整体繁简适中，书写美观'); }
  if (chars.some((c) => c.ch === surname.ch)) { score -= 15; notes.push('名字与姓氏重复用字'); }
  const comment = `笔画为 ${surname.strokes}${strokes.map((s) => '·' + s).join('')}。${notes.length ? notes.join('；') + '。' : '字形搭配协调。'}`;
  return { key: 'glyph', label: '字型', score: clamp(score, 45, 100), comment };
}

// ---------- 五行调和 ----------
function scoreWuxing(surname: SurnameInfo, chars: CharInfo[], ctx: AnalyzeContext): DimensionScore {
  let score = 62;
  const notes: string[] = [];
  const chain: WuXing[] = [surname.wx, ...chars.map((c) => c.wx)];
  for (let i = 1; i < chain.length; i++) {
    const rel = wxRelation(chain[i - 1], chain[i]);
    if (rel === '相生') { score += 10; notes.push(`${chain[i - 1]}生${chain[i]}，承接有情`); }
    else if (rel === '被生') { score += 6; notes.push(`${chain[i]}生${chain[i - 1]}，反哺有力`); }
    else if (rel === '相同') { score += 3; notes.push(`${chain[i - 1]}${chain[i]}同气，稍显单一`); }
    else if (rel === '相克') { score -= 8; notes.push(`${chain[i - 1]}克${chain[i]}，略有冲突`); }
    else { score -= 6; notes.push(`${chain[i]}克${chain[i - 1]}，略有冲突`); }
  }
  const bazi = ctx.bazi;
  if (bazi) {
    chars.forEach((c) => {
      if (bazi.primary.includes(c.wx)) {
        const why = bazi.missing.includes(c.wx) ? `补八字所缺之${c.wx}` : `属${c.wx}，克制偏旺以求平衡`;
        score += 16; notes.push(`「${c.ch}」${why}`);
      } else if (bazi.assist.includes(c.wx)) { score += 10; notes.push(`「${c.ch}」属${c.wx}，为命局辅用`); }
      else if (bazi.caution.includes(c.wx)) { score += 3; notes.push(`「${c.ch}」属${c.wx}，虽补所缺但会助旺，适度为宜`); }
      else if (bazi.unfavorable.includes(c.wx)) { score -= 12; notes.push(`「${c.ch}」属${c.wx}，命局已偏旺，不宜再补`); }
    });
    // 双字同属一旺五行，失衡更重
    if (chars.length === 2 && chars[0].wx === chars[1].wx && bazi.unfavorable.includes(chars[0].wx)) { score -= 6; notes.push('二字同属偏旺之五行，有失平衡'); }
    if (ctx.scheme === 'zodiac') {
      const fav = ZODIAC_FAVOR[bazi.zodiac] ?? [];
      chars.forEach((c) => { if (fav.includes(c.wx)) { score += 6; notes.push(`「${c.ch}」合属${bazi.zodiac}宜用`); } });
    }
  } else {
    notes.push('未提供生辰，仅评估姓名内部五行流转');
  }
  // 用户指定的五行补充
  const boost = ctx.boostWx ?? [];
  if (boost.length) {
    const m = boostMatch(chars, boost, ctx.boostMode);
    if (m.isCombo) {
      if (m.full) { score += 18; notes.push(`「${chars[0].ch}」属${chars[0].wx}、「${chars[1].ch}」属${chars[1].wx}，恰成您指定的${m.label}`); }
      else if (m.hit.length) { score += 4; notes.push(`仅${m.hit.map((c) => `「${c.ch}」`).join('')}命中${m.label}之一，未成完整组合`); }
      else { score -= 8; notes.push(`未含您指定的${m.label}`); }
    } else if (m.hit.length) { score += m.hit.length * 8; notes.push(`${m.hit.map((c) => `「${c.ch}」`).join('')}契合您指定的${m.label}`); }
    else { score -= 8; notes.push(`未含您指定补充的${boost.join('、')}`); }
  }
  const comment = `五行为「${chain.join('→')}」。${notes.join('；')}。`;
  return { key: 'wuxing', label: '五行', score: clamp(score, 40, 100), comment };
}

// ---------- 寓意 ----------
function scoreMeaning(chars: CharInfo[], ctx: AnalyzeContext, fullName: string): DimensionScore {
  let score = 76;
  const tags = new Set<ExpectKey>();
  chars.forEach((c) => c.tags.forEach((t) => tags.add(t)));
  score += Math.min(12, tags.size * 4);
  const exp = ctx.expectations ?? [];
  const hit = exp.filter((e) => tags.has(e));
  if (exp.length) score += hit.length * 6;
  if (chars.some((c) => c.unknown)) score -= 15;
  if (ctx.natural) score += 12;
  score += hashJitter(fullName, 3);
  const words = Array.from(tags).slice(0, 3).map((t) => EXPECT_LABEL[t]);
  let comment = words.length
    ? `寓意涵盖「${words.join('、')}」${hit.length ? `，契合您对孩子「${hit.map((h) => EXPECT_LABEL[h]).join('、')}」的期望` : ''}。`
    : '字义平和，寓意含蓄。';
  if (ctx.natural) comment = `姓名连读${ctx.natural}，浑然天成。` + comment;
  return { key: 'meaning', label: '寓意', score: clamp(score, 50, 100), comment };
}

// ---------- 独特性 ----------
function scoreUnique(surname: SurnameInfo, chars: CharInfo[]): { dim: DimensionScore; rate: string; level: NameAnalysis['duplicateLevel'] } {
  const pops = chars.map((c) => c.pop);
  const prod = pops.reduce((a, b) => a * b, 1);
  const surnameFactor = surname.rank <= 5 ? 1.6 : surname.rank <= 20 ? 1.3 : surname.rank <= 60 ? 1.0 : 0.7;
  // 每万人同名人数估算
  const per10k = chars.length === 1 ? pops[0] * 2.6 * surnameFactor : prod * 0.36 * surnameFactor;
  let level: NameAnalysis['duplicateLevel'] = '极低';
  if (per10k >= 6) level = '较高';
  else if (per10k >= 2.5) level = '中等';
  else if (per10k >= 0.8) level = '较低';
  const score = clamp(100 - per10k * 7 - (chars.length === 1 ? 6 : 0), 40, 99);
  const rate = per10k >= 1 ? `约 ${per10k.toFixed(1)} 人/万人` : `约 ${(per10k * 10).toFixed(1)} 人/十万人`;
  const comment = `预估重名率${level}（${rate}）。${level === '较高' ? '用字较为流行，若追求独特可换一批。' : level === '极低' ? '用字新颖不俗，辨识度高。' : '兼顾辨识度与亲和力。'}`;
  return { dim: { key: 'unique', label: '独特', score, comment }, rate, level };
}

// ---------- 文化底蕴 ----------
function scoreCulture(chars: CharInfo[]): DimensionScore {
  let score = 64;
  const sources = chars.filter((c) => c.source);
  score += sources.length * 16;
  chars.forEach((c) => { if (c.styles.includes('poetic') || c.styles.includes('scholar')) score += 5; });
  const comment = sources.length
    ? `典出：${sources.map((c) => `「${c.ch}」${c.source}`).join('；')}。`
    : chars.some((c) => c.styles.includes('poetic') || c.styles.includes('scholar'))
      ? '用字雅致，颇具书卷气息。'
      : '用字通俗易懂，亲切自然。';
  return { key: 'culture', label: '文化', score: clamp(score, 50, 100), comment };
}

// ---------- 三才五格 ----------
function computeGrids(surname: SurnameInfo, chars: CharInfo[]) {
  const s = surname.strokes;
  const isCompound = surname.ch.length > 1;
  const c1 = chars[0].strokes;
  const c2 = chars[1]?.strokes ?? 0;
  const single = chars.length === 1;
  const tian = isCompound ? s : s + 1;
  const ren = (isCompound ? Math.round(s / 2) : s) + c1;
  const di = single ? c1 + 1 : c1 + c2;
  const zong = s + c1 + c2;
  const wai = single ? (isCompound ? tian - ren + 1 : 2) : zong - ren + (isCompound ? 0 : 1);
  const mk = (name: string, value: number): GridInfo => {
    const n = numerology(value);
    return { name, value, wx: numberWx(value), luck: n.luck, desc: `${n.title}：${n.desc}` };
  };
  const grids = [mk('天格', tian), mk('人格', ren), mk('地格', di), mk('外格', Math.max(1, wai)), mk('总格', zong)];
  const [t, r, d] = grids;
  const rel1 = wxRelation(t.wx, r.wx);
  const rel2 = wxRelation(r.wx, d.wx);
  const good = (rel: string) => rel === '相生' || rel === '被生' || rel === '相同';
  let luck: Luck = '凶';
  if (good(rel1) && good(rel2)) luck = '吉';
  else if (good(rel1) || good(rel2)) luck = '半吉';
  const desc = luck === '吉'
    ? '天人地三才相生相合，基础稳固，成功运佳，人际关系和顺。'
    : luck === '半吉'
      ? '三才一处相合一处相冲，中年之后运势渐稳，宜持之以恒。'
      : '三才配置相克，需以后天努力化解，宜配合数理吉数调和。';
  return { grids, sancai: { text: `${t.wx}${r.wx}${d.wx}`, luck, desc } };
}

function scoreNumerology(grids: GridInfo[], sancai: { luck: Luck }): DimensionScore {
  // 人格、总格、地格权重高
  const w: Record<string, number> = { 天格: 0.08, 人格: 0.3, 地格: 0.2, 外格: 0.12, 总格: 0.3 };
  let s = 0;
  grids.forEach((g) => { s += luckScore(g.luck) * (w[g.name] ?? 0.2); });
  s = s * 0.75 + luckScore(sancai.luck) * 0.25;
  const bad = grids.filter((g) => g.luck === '凶').map((g) => g.name);
  const comment = `三才「${grids[0].wx}${grids[1].wx}${grids[2].wx}」为${sancai.luck}；五格中${bad.length ? `${bad.join('、')}数理偏弱，其余为吉` : '各格数理皆吉'}。`;
  return { key: 'numerology', label: '数理', score: clamp(s, 40, 100), comment };
}

// ---------- 寓意文本 & 建议 ----------
function buildMeaningText(surname: SurnameInfo, chars: CharInfo[], expectations: ExpectKey[], natural?: string): string {
  const parts = chars.map((c) => `「${c.ch}」${c.unknown ? '字义待考' : c.meaning}`);
  const tags = new Set<ExpectKey>();
  chars.forEach((c) => c.tags.forEach((t) => tags.add(t)));
  const focus = expectations.filter((e) => tags.has(e));
  const pick = (focus.length ? focus : Array.from(tags)).slice(0, 2);
  const wish = pick.length ? `寄望孩子${pick.map((t) => EXPECT_PHRASE[t]).join('，')}。` : '';
  const join = chars.length === 2 ? '二字相合，' : '单字为名，简洁有力，';
  const nat = natural ? `姓与名连读${natural}，姓名一体、浑然天成，这是可遇而不可求的妙处。` : '';
  return `${parts.join('；')}。${nat}${join}姓名「${surname.ch}${chars.map((c) => c.ch).join('')}」整体${describeTone(chars)}，${wish}`;
}

function describeTone(chars: CharInfo[]): string {
  const st = chars.flatMap((c) => c.styles);
  const has = (k: string) => st.includes(k as never);
  if (has('grand')) return '气象开阔、稳重有力';
  if (has('poetic')) return '古韵悠然、意境隽永';
  if (has('gentle')) return '温婉柔和、亲切动人';
  if (has('bright')) return '明朗向上、朝气十足';
  if (has('scholar')) return '书卷盈盈、儒雅清正';
  if (has('lucky')) return '吉庆祥和、福泽满盈';
  if (has('nature')) return '清新自然、生机盎然';
  return '简洁大方、朗朗上口';
}

function buildAdvice(a: Omit<NameAnalysis, 'advice'>): string {
  const dims = Object.values(a.dims);
  const best = [...dims].sort((x, y) => y.score - x.score)[0];
  const worst = [...dims].sort((x, y) => x.score - y.score)[0];
  const grade = a.score >= 92 ? '上上之选' : a.score >= 85 ? '佳名' : a.score >= 75 ? '良名' : '可用之名';
  let tip = '';
  switch (worst.key) {
    case 'phonetic': tip = '若追求更佳的朗读效果，可考虑调整声调搭配，使平仄错落。'; break;
    case 'glyph': tip = '可留意姓名整体笔画的繁简平衡，便于书写。'; break;
    case 'wuxing': tip = !a.baziFit.startsWith('命局') ? '补充出生日期与时辰后，可获得更精确的五行平衡建议。' : '可优先选择能制衡偏旺、补足所缺的五行用字，以求命局平衡。'; break;
    case 'meaning': tip = '可结合家风与期望，选择寓意更具针对性的用字。'; break;
    case 'unique': tip = '该名用字较为常见，若在意重名可尝试「独特脱俗」方案。'; break;
    case 'culture': tip = '若希望更具文化底蕴，可尝试「诗词典故」方案。'; break;
    case 'numerology': tip = '数理仅供参考，可微调用字笔画以优化五格配置。'; break;
  }
  return `综合评定 ${a.score} 分，属${grade}。最突出的优势在于${best.label}（${best.score}分），${best.comment.split('。')[0]}。${tip}`;
}

function buildBaziFit(chars: CharInfo[], bazi: BaziResult | null, boost: WuXing[] = [], mode?: BoostMode): string {
  const m = boost.length ? boostMatch(chars, boost, mode) : null;
  const boostText = m
    ? `您指定${m.label}，此名${m.full ? `${chars.map((c) => `「${c.ch}」属${c.wx}`).join('、')}，${m.isCombo ? '二字各居一行，组合完整' : '已予补充'}` : m.hit.length ? `${m.hit.map((c) => `「${c.ch}」属${c.wx}`).join('、')}${m.isCombo ? '，仅居其一' : '，已予补充'}` : '未含所指定五行'}。`
    : '';
  if (!bazi) {
    if (boostText) return `未提供生辰八字。${boostText}`;
    return '未提供生辰八字，建议补充出生日期以获得五行平衡分析。';
  }
  const desc = (c: CharInfo) => {
    if (bazi.missing.includes(c.wx) && bazi.primary.includes(c.wx)) return `「${c.ch}」补所缺之${c.wx}`;
    if (bazi.primary.includes(c.wx)) return `「${c.ch}」以${c.wx}制衡旺气`;
    if (bazi.assist.includes(c.wx)) return `「${c.ch}」以${c.wx}辅助调和`;
    if (bazi.caution.includes(c.wx)) return `「${c.ch}」属${c.wx}适度点补`;
    if (bazi.unfavorable.includes(c.wx)) return `「${c.ch}」属${c.wx}，为命局所忌`;
    return '';
  };
  const parts = chars.map(desc).filter(Boolean);
  const plan = `${bazi.strong.length ? `${bazi.strong.join('、')}偏旺，` : ''}${bazi.missing.length ? `缺${bazi.missing.join('、')}，` : ''}宜以${bazi.primary.length ? bazi.primary.join('、') : bazi.assist.join('、')}平衡${bazi.assist.length && bazi.primary.length ? `，${bazi.assist.join('、')}辅助` : ''}${bazi.unfavorable.length ? `，忌${bazi.unfavorable.join('、')}` : ''}`;
  const base = `命局${bazi.strength}，${plan}。`;
  return base + (parts.length ? `此名${parts.join('；')}。` : '此名五行中性，未直接补益亦无冲克。') + boostText;
}

/** 完整分析 */
export function analyzeName(surname: SurnameInfo, chars: CharInfo[], ctx: AnalyzeContext): NameAnalysis {
  const fullName = surname.ch + chars.map((c) => c.ch).join('');
  const phonetic = scorePhonetic(surname, chars);
  const glyph = scoreGlyph(surname, chars);
  const wuxing = scoreWuxing(surname, chars, ctx);
  const meaning = scoreMeaning(chars, ctx, fullName);
  const uniq = scoreUnique(surname, chars);
  const culture = scoreCulture(chars);
  const { grids, sancai } = computeGrids(surname, chars);
  const numer = scoreNumerology(grids, sancai);

  const weights = SCHEME_WEIGHTS[ctx.scheme ?? 'balanced'];
  const dims = { phonetic, glyph, wuxing, meaning, unique: uniq.dim, culture, numerology: numer };
  let score = 0;
  (Object.keys(dims) as (keyof typeof dims)[]).forEach((k) => { score += dims[k].score * weights[k]; });
  const finalScore = clamp(score, 50, 99);

  const pinyin = [surname.py.split(' ').map(toneMark).join(' '), ...chars.map((c) => toneMark(c.py) || '?')].join(' ');
  const partial: Omit<NameAnalysis, 'advice'> = {
    surname,
    chars,
    fullName,
    pinyin,
    score: finalScore,
    dims,
    grids,
    sancai,
    duplicateRate: uniq.rate,
    duplicateLevel: uniq.level,
    meaningText: buildMeaningText(surname, chars, ctx.expectations ?? [], ctx.natural),
    baziFit: buildBaziFit(chars, ctx.bazi, ctx.boostWx, ctx.boostMode),
    natural: ctx.natural,
  };
  return { ...partial, advice: buildAdvice(partial) };
}
