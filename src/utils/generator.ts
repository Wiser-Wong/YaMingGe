import type { CharInfo, GenerateOptions, NameAnalysis, StyleKey } from '../types';
import { CHARACTERS, lookupChar } from '../data/characters';
import { naturalFor } from '../data/natural';
import { lookupSurname } from '../data/surnames';
import { analyzeName } from './analysis';
import { ZODIAC_FAVOR } from './bazi';
import { splitPinyin } from './pinyin';

/** 可复现的伪随机数（mulberry32） */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STYLE_LABEL: Record<StyleKey, string> = {
  poetic: '诗意古风', grand: '大气稳重', gentle: '温婉柔美', bright: '阳光活力',
  scholar: '儒雅书香', modern: '简约现代', lucky: '吉祥富贵', nature: '自然清新',
};

export const SCHEME_LABEL: Record<GenerateOptions['scheme'], { label: string; desc: string }> = {
  balanced: { label: '综合均衡', desc: '音形义、五行、数理全面兼顾' },
  wuxing: { label: '五行补益', desc: '优先补足八字所缺、所喜五行' },
  phonetic: { label: '音韵优美', desc: '平仄错落、读音响亮悦耳' },
  classic: { label: '诗词典故', desc: '取自诗经楚辞、唐诗宋词' },
  numerology: { label: '数理吉祥', desc: '三才五格数理配置为吉' },
  zodiac: { label: '生肖宜用', desc: '结合出生生肖的宜用五行' },
  unique: { label: '独特脱俗', desc: '用字少见，降低重名率' },
  natural: { label: '浑然天成', desc: '姓与名连读成词，如袁满（圆满）' },
};

/** 构建候选字池 */
function buildPool(opts: GenerateOptions): CharInfo[] {
  const avoid = new Set(Array.from(opts.avoid.replace(/[\s,，、;；]/g, '')));
  const surnameChars = new Set(Array.from(opts.surname));
  let pool = CHARACTERS.filter((c) => !avoid.has(c.ch) && !surnameChars.has(c.ch));

  // 性别：中性字 + 匹配性别字
  const byGender = pool.filter((c) => c.gender === 'N' || c.gender === opts.gender);
  if (byGender.length >= 60) pool = byGender;

  // 风格偏好
  if (opts.styles.length) {
    const styled = pool.filter((c) => c.styles.some((s) => opts.styles.includes(s)));
    if (styled.length >= 40) pool = styled;
  }

  // 用户指定补充的五行：字池优先收缩到这些五行（双字名允许另一字自由搭配，见 generateNames）
  const boost = opts.boostWx ?? [];
  if (boost.length && opts.single) {
    const b = pool.filter((c) => boost.includes(c.wx));
    if (b.length >= 20) pool = b;
  }

  // 方案相关的字池收缩
  const bazi = opts.bazi;
  if (opts.scheme === 'wuxing' && bazi) {
    const fav = pool.filter((c) => bazi.favorable.includes(c.wx));
    if (fav.length >= 30) pool = fav;
  }
  if (opts.scheme === 'zodiac' && bazi) {
    const favWx = ZODIAC_FAVOR[bazi.zodiac] ?? [];
    const fav = pool.filter((c) => favWx.includes(c.wx));
    if (fav.length >= 30) pool = fav;
  }
  if (opts.scheme === 'classic') {
    const cls = pool.filter((c) => c.source || c.styles.includes('poetic') || c.styles.includes('scholar'));
    if (cls.length >= 40) pool = cls;
  }
  if (opts.scheme === 'unique') {
    const uq = pool.filter((c) => c.pop <= 3);
    if (uq.length >= 40) pool = uq;
  }
  // 大师模式：排除偏旺五行、偏好命中期望的字
  if (opts.strict && bazi && bazi.unfavorable.length) {
    const filtered = pool.filter((c) => !bazi.unfavorable.includes(c.wx));
    if (filtered.length >= 40) pool = filtered;
  }
  return pool;
}

/** 生成并评分一批名字 */
export function generateNames(opts: GenerateOptions): NameAnalysis[] {
  const rng = makeRng(opts.seed);
  const surname = lookupSurname(opts.surname);
  const pool = buildPool(opts);
  if (!pool.length) return [];

  const ctx = { bazi: opts.bazi, expectations: opts.expectations, scheme: opts.scheme, boostWx: opts.boostWx, boostMode: opts.boostMode };
  const seen = new Set<string>(opts.exclude);
  const results: NameAnalysis[] = [];
  const surnameLast = splitPinyin(surname.py.split(' ').pop() ?? '');
  const avoid = new Set(Array.from(opts.avoid.replace(/[\s,，、;；]/g, '')));
  const boost = opts.boostWx ?? [];
  const boostPool = boost.length ? pool.filter((c) => boost.includes(c.wx)) : [];
  // 组合模式：二字各属一行，分别建池
  const comboPools = opts.boostMode === 'combo' && boost.length === 2 && !opts.single
    ? boost.map((w) => pool.filter((c) => c.wx === w))
    : null;
  const useCombo = !!comboPools && comboPools.every((p) => p.length >= 8);
  const pick = (arr: CharInfo[]) => arr[Math.floor(rng() * arr.length)];
  // 浑然天成排序优先级：2 = 直接成词，1 = 成词字 + 搭配字，0 = 常规生成
  const naturalRank = new Map<string, number>();

  // 浑然天成：优先使用姓名连读成词的候选
  if (opts.scheme === 'natural') {
    const naturals = naturalFor(opts.surname, opts.gender).filter((n) => !Array.from(n.given).some((ch) => avoid.has(ch)));
    for (const n of naturals) {
      const chars = Array.from(n.given).map(lookupChar);
      const isSingle = chars.length === 1;
      if (isSingle === opts.single) {
        if (seen.has(n.given)) continue;
        seen.add(n.given);
        const r = analyzeName(surname, chars, { ...ctx, natural: n.note });
        naturalRank.set(r.fullName, 2);
        results.push(r);
      } else if (isSingle && !opts.single) {
        // 单字成词 + 池中一字组合成双字名，连读之妙保留在前字
        const a = chars[0];
        const pa = splitPinyin(a.py);
        // 组合模式下，搭配字取另一行；否则优先取补充五行
        const other = useCombo && comboPools ? comboPools[boost.indexOf(a.wx) === 0 ? 1 : 0] : null;
        const src = other && other.length >= 8 ? other : boostPool.length >= 10 ? boostPool : pool;
        const cands = [...src].sort(() => rng() - 0.5).slice(0, 6);
        for (const b of cands) {
          if (b.ch === a.ch) continue;
          const pb = splitPinyin(b.py);
          if (pa.plain === pb.plain || pb.plain === surnameLast.plain) continue;
          const key = a.ch + b.ch;
          if (seen.has(key)) continue;
          seen.add(key);
          const r = analyzeName(surname, [a, b], { ...ctx, natural: `前二字「${opts.surname}${a.ch}」${n.note}` });
          naturalRank.set(r.fullName, 1);
          results.push(r);
        }
      }
    }
  }

  if (opts.single) {
    const shuffled = [...pool].sort(() => rng() - 0.5);
    for (const c of shuffled) {
      const key = c.ch;
      if (seen.has(key)) continue;
      // 避免与姓同音
      if (c.py && splitPinyin(c.py).plain === surnameLast.plain) continue;
      seen.add(key);
      results.push(analyzeName(surname, [c], ctx));
    }
  } else {
    const attempts = Math.min(opts.count * 25, 9000);
    const n = pool.length;
    // 期望匹配优先池：大师模式下加大命中率
    const expPool = opts.expectations.length ? pool.filter((c) => c.tags.some((t) => opts.expectations.includes(t))) : [];
    for (let i = 0; i < attempts && results.length < opts.count * 3; i++) {
      let a: CharInfo;
      let b: CharInfo;
      if (useCombo && comboPools) {
        // 五行组合：一字属前者、一字属后者，前后顺序随机
        const [p1, p2] = rng() < 0.5 ? comboPools : [comboPools[1], comboPools[0]];
        const e1 = expPool.filter((c) => c.wx === p1[0].wx);
        a = e1.length >= 6 && rng() < (opts.strict ? 0.8 : 0.45) ? pick(e1) : pick(p1);
        b = pick(p2);
      } else if (expPool.length >= 10 && rng() < (opts.strict ? 0.8 : 0.45)) {
        a = expPool[Math.floor(rng() * expPool.length)];
        b = rng() < 0.5 && expPool.length >= 10 ? expPool[Math.floor(rng() * expPool.length)] : pool[Math.floor(rng() * n)];
      } else {
        a = pool[Math.floor(rng() * n)];
        b = pool[Math.floor(rng() * n)];
      }
      // 指定补充五行（任一模式）：保证至少一字命中，且多数情况下两字皆命中
      if (!useCombo && boostPool.length >= 10) {
        if (!boost.includes(a.wx) && !boost.includes(b.wx)) {
          if (rng() < 0.5) a = boostPool[Math.floor(rng() * boostPool.length)];
          else b = boostPool[Math.floor(rng() * boostPool.length)];
        }
        if (rng() < 0.55 && !(boost.includes(a.wx) && boost.includes(b.wx))) {
          if (boost.includes(a.wx)) b = boostPool[Math.floor(rng() * boostPool.length)];
          else a = boostPool[Math.floor(rng() * boostPool.length)];
        }
      }
      if (a.ch === b.ch) continue;
      const pa = splitPinyin(a.py), pb = splitPinyin(b.py);
      if (pa.plain === pb.plain) continue; // 同音
      if (pa.plain === surnameLast.plain || pb.plain === surnameLast.plain) continue;
      // 性别倾向：双字不能同时是相反性别（池中已过滤，此处保险）
      const key = a.ch + b.ch;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(analyzeName(surname, [a, b], ctx));
    }
  }

  // 严格模式阈值
  let list = results;
  if (opts.strict) {
    const strictList = results.filter((r) => r.score >= 84 && r.dims.wuxing.score >= 70 && r.dims.phonetic.score >= 70);
    if (strictList.length >= Math.min(opts.count, 6)) list = strictList;
  }

  // 排序：浑然天成优先，其后分数为主，加入轻微随机扰动避免固定顺序
  const rank = (r: NameAnalysis) => (naturalRank.get(r.fullName) ?? 0) * 1000;
  list.sort((x, y) => (rank(y) + y.score + hash01(y.fullName, opts.seed) * 3) - (rank(x) + x.score + hash01(x.fullName, opts.seed) * 3));
  return list.slice(0, opts.count);
}

function hash01(s: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}
