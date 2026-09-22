/** 拼音工具：数字声调 -> 声调符号，声母/韵母拆分 */

const TONE_MARKS: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  v: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];

export interface PinyinParts {
  initial: string;
  final: string;
  tone: number; // 1-4，0 表示未知
  plain: string; // 无声调字母
}

export function splitPinyin(py: string): PinyinParts {
  if (!py) return { initial: '', final: '', tone: 0, plain: '' };
  const m = py.match(/^([a-zv]+)([1-5])?$/i);
  const plain = m ? m[1].toLowerCase() : py.toLowerCase();
  const tone = m && m[2] ? Number(m[2]) : 0;
  const initial = INITIALS.find((i) => plain.startsWith(i)) ?? '';
  const final = plain.slice(initial.length);
  return { initial, final, tone: tone > 4 ? 0 : tone, plain };
}

/** yu3 -> yǔ */
export function toneMark(py: string): string {
  const { plain, tone } = splitPinyin(py);
  if (!plain) return '';
  if (!tone) return plain.replace('v', 'ü');
  let idx = -1;
  if (plain.includes('a')) idx = plain.indexOf('a');
  else if (plain.includes('o')) idx = plain.indexOf('o');
  else if (plain.includes('e')) idx = plain.indexOf('e');
  else if (plain.includes('iu')) idx = plain.indexOf('u');
  else if (plain.includes('ui')) idx = plain.indexOf('i');
  else {
    for (let i = plain.length - 1; i >= 0; i--) {
      if ('iuv'.includes(plain[i])) { idx = i; break; }
    }
  }
  if (idx < 0) return plain.replace('v', 'ü');
  const ch = plain[idx];
  const marked = TONE_MARKS[ch]?.[tone] ?? ch;
  return (plain.slice(0, idx) + marked + plain.slice(idx + 1)).replace('v', 'ü');
}

/** 平仄：1、2 声为平，3、4 声为仄 */
export function pingZe(tone: number): '平' | '仄' | '?' {
  if (tone === 1 || tone === 2) return '平';
  if (tone === 3 || tone === 4) return '仄';
  return '?';
}

export const TONE_NAMES = ['', '阴平', '阳平', '上声', '去声'];
