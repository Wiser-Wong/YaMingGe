import { COMPOUND_SURNAMES } from '../data/surnames';

/** 只保留汉字并限制长度；输入过程中不做过滤，避免打断中文输入法的拼音组合 */
export function cleanHan(v: string, max = 2): string {
  return Array.from(v.replace(/[^\u4e00-\u9fa5]/g, '')).slice(0, max).join('');
}

/** 将完整姓名拆为姓与名：三字及以上且前二字为复姓时取复姓，否则首字为姓 */
export function splitFullName(full: string): { surname: string; given: string } {
  const chars = Array.from(cleanHan(full, 6));
  if (chars.length >= 3 && COMPOUND_SURNAMES.includes(chars[0] + chars[1])) {
    return { surname: chars[0] + chars[1], given: chars.slice(2).join('') };
  }
  return { surname: chars[0] ?? '', given: chars.slice(1).join('') };
}
