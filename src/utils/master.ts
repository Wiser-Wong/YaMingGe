import type { BaziResult, ExpectKey, NameAnalysis } from '../types';
import { EXPECT_LABEL } from './analysis';

/** 大师点评：基于分析结果生成一段有针对性的点评文字 */
export function buildMasterComment(item: NameAnalysis, expectations: ExpectKey[], bazi: BaziResult | null): string {
  const given = item.chars.map((c) => c.ch).join('');
  const parts: string[] = [];

  // 开篇：整体气象
  const dims = Object.values(item.dims).sort((a, b) => b.score - a.score);
  const top = dims.slice(0, 2).map((d) => d.label);
  parts.push(`「${item.fullName}」一名，${top.join('与')}俱佳，读来${item.dims.phonetic.score >= 85 ? '抑扬顿挫、朗朗上口' : '平和顺畅'}。`);

  // 八字
  if (bazi) {
    const fill = item.chars.filter((c) => bazi.missing.includes(c.wx) && bazi.primary.includes(c.wx));
    const restrain = item.chars.filter((c) => !bazi.missing.includes(c.wx) && bazi.primary.includes(c.wx));
    const assist = item.chars.filter((c) => bazi.assist.includes(c.wx));
    if (fill.length) parts.push(`命主五行缺${bazi.missing.join('、')}，以「${fill.map((c) => c.ch).join('」「')}」补之，恰如久旱逢甘霖，可调和命局、扶助日主${bazi.dayMaster}${bazi.dayMasterWx}。`);
    else if (restrain.length) parts.push(`命局${bazi.strong.join('、')}偏旺，「${restrain.map((c) => c.ch).join('」「')}」五行属${restrain.map((c) => c.wx).join('、')}，正可克制旺气、以求平衡${assist.length ? `，再以「${assist.map((c) => c.ch).join('」「')}」辅之，张弛有度` : ''}。`);
    else if (assist.length) parts.push(`「${assist.map((c) => c.ch).join('」「')}」五行属${assist.map((c) => c.wx).join('、')}，为命局辅用之应，泄耗旺气、扶助偏弱，相辅相成。`);
    else parts.push('此名五行中正，不与命局相冲，取其稳妥。');
  }

  // 用字典故
  const src = item.chars.find((c) => c.source);
  if (src) parts.push(`「${src.ch}」字${src.source}，用之于名，文脉悠长，气韵自生。`);

  // 期望
  const tags = new Set<ExpectKey>();
  item.chars.forEach((c) => c.tags.forEach((t) => tags.add(t)));
  const hit = expectations.filter((e) => tags.has(e));
  if (hit.length) parts.push(`名中寄寓${hit.map((h) => EXPECT_LABEL[h]).join('、')}之意，与父母所望不谋而合。`);

  // 数理与独特
  if (item.sancai.luck === '吉') parts.push(`三才「${item.sancai.text}」相生，五格数理${item.grids.filter((g) => g.luck === '吉').length >= 4 ? '皆为吉数' : '以吉为主'}，根基稳固。`);
  if (item.duplicateLevel === '极低' || item.duplicateLevel === '较低') parts.push(`「${given}」用字不落俗套，重名率${item.duplicateLevel}，辨识度高。`);

  parts.push(item.score >= 92 ? '综上，此名可列为首选。' : item.score >= 86 ? '综上，此名为上佳之选，值得细品。' : '综上，此名可用，宜结合家族字辈再作斟酌。');
  return parts.join('');
}

/** 大师总评：对整体命局的寄语 */
export function buildMasterOverview(bazi: BaziResult | null, expectations: ExpectKey[], gender: 'M' | 'F'): string {
  const child = gender === 'M' ? '令郎' : '令爱';
  if (!bazi) {
    return `未提供${child}的生辰，本次甄选以音律、字义、数理与文化底蕴为主要依据。若能补充出生日期与时辰，可进一步依八字五行补益取名，更臻完善。${expectations.length ? `已充分考量您对${child}「${expectations.map((e) => EXPECT_LABEL[e]).join('、')}」的期望。` : ''}`;
  }
  const s = [`${child}生于${bazi.solarText.replace('公历 ', '')}，${bazi.year.gan}${bazi.year.zhi}年属${bazi.zodiac}，日主${bazi.dayMaster}${bazi.dayMasterWx}，命局${bazi.strength}。`];
  if (bazi.strong.length) s.push(`八字中${bazi.strong.join('、')}偏旺，取名当以${bazi.primary.join('、')}克制平衡为要${bazi.assist.length ? `，辅以${bazi.assist.join('、')}泄耗其气` : ''}，以求五行流通、气机圆融。`);
  else if (bazi.missing.length) s.push(`八字中五行缺${bazi.missing.join('、')}，取名当以补${bazi.primary.join('、')}为要，以求五行流通、气机圆融。`);
  else s.push(`八字五行均衡，实为难得，取名宜顺势而为，扶助${bazi.favorable.join('、')}即可。`);
  if (bazi.caution.length) s.push(`${bazi.caution.join('、')}虽缺，但会助旺偏旺之气，宜适度而止。`);
  if (bazi.unfavorable.length) s.push(`${bazi.unfavorable.join('、')}已旺，名中宜避免再添此类五行之字。`);
  if (expectations.length) s.push(`结合您对${child}「${expectations.map((e) => EXPECT_LABEL[e]).join('、')}」之期望，以下诸名皆经音、形、义、数、五行五重甄别，逐一斟酌而得。`);
  else s.push('以下诸名皆经音、形、义、数、五行五重甄别，逐一斟酌而得。');
  return s.join('');
}
