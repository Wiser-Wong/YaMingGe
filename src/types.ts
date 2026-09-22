// ===== 基础类型 =====
export type WuXing = '金' | '木' | '水' | '火' | '土';
export type Gender = 'M' | 'F';
export type CharGender = 'M' | 'F' | 'N'; // N = 中性

/** 风格偏好 */
export type StyleKey =
  | 'poetic' // 诗意古风
  | 'grand' // 大气稳重
  | 'gentle' // 温婉柔美
  | 'bright' // 阳光活力
  | 'scholar' // 儒雅书香
  | 'modern' // 简约现代
  | 'lucky' // 吉祥富贵
  | 'nature'; // 自然清新

/** 对孩子的期望 */
export type ExpectKey =
  | 'study' // 学业有成
  | 'career' // 事业腾达
  | 'health' // 健康平安
  | 'virtue' // 品德高尚
  | 'wisdom' // 聪明智慧
  | 'gentle' // 温柔善良
  | 'brave' // 勇敢坚强
  | 'art' // 艺术才华
  | 'wealth' // 富足丰盈
  | 'happy'; // 幸福美满

/** 起名方案 */
export type SchemeKey =
  | 'balanced' // 综合均衡
  | 'wuxing' // 五行补益
  | 'phonetic' // 音韵优美
  | 'classic' // 诗词典故
  | 'numerology' // 数理吉祥
  | 'zodiac' // 生肖宜用
  | 'unique' // 独特脱俗
  | 'natural'; // 浑然天成（姓名连读成词）

export interface CharInfo {
  ch: string;
  py: string; // 带数字声调的拼音，如 yu3
  wx: WuXing;
  strokes: number; // 康熙笔画（参考）
  meaning: string;
  gender: CharGender;
  styles: StyleKey[];
  tags: ExpectKey[];
  pop: number; // 1-5，取名常用度，越高越常见
  source?: string; // 典籍出处
  unknown?: boolean; // 字库未收录，信息为估算
}

export interface SurnameInfo {
  ch: string;
  py: string;
  wx: WuXing;
  strokes: number;
  rank: number; // 百家姓常见度 1 最常见
}

// ===== 八字 =====
export interface Pillar {
  gan: string;
  zhi: string;
  ganWx: WuXing;
  zhiWx: WuXing;
}

export interface BaziResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  zodiac: string;
  dayMaster: string; // 日主天干
  dayMasterWx: WuXing;
  counts: Record<WuXing, number>;
  missing: WuXing[]; // 缺失五行
  weak: WuXing[]; // 偏弱五行（仅1个）
  strong: WuXing[]; // 偏旺五行
  primary: WuXing[]; // 主用：制衡偏旺、补足所缺
  assist: WuXing[]; // 辅用：泄耗旺气、扶助偏弱
  favorable: WuXing[]; // 喜用五行（主用 + 辅用）
  unfavorable: WuXing[]; // 忌用五行
  caution: WuXing[]; // 慎补：虽缺但会助旺偏旺之气
  balanceNotes: string[]; // 平衡思路逐条说明
  strength: '偏强' | '中和' | '偏弱';
  summary: string;
  solarText: string;
}

export interface BirthInput {
  date: string; // YYYY-MM-DD
  hour: number | null; // 0-23 或 null（不详）
}

// ===== 分析结果 =====
export interface GridInfo {
  name: string;
  value: number;
  wx: WuXing;
  luck: '吉' | '半吉' | '凶';
  desc: string;
}

export interface DimensionScore {
  key: string;
  label: string;
  score: number;
  comment: string;
}

export interface NameAnalysis {
  surname: SurnameInfo;
  chars: CharInfo[];
  fullName: string;
  pinyin: string; // 带声调
  score: number; // 综合评分
  dims: {
    phonetic: DimensionScore;
    glyph: DimensionScore;
    wuxing: DimensionScore;
    meaning: DimensionScore;
    unique: DimensionScore;
    culture: DimensionScore;
    numerology: DimensionScore;
  };
  grids: GridInfo[]; // 五格
  sancai: { text: string; luck: '吉' | '半吉' | '凶'; desc: string };
  duplicateRate: string; // 重名率文字
  duplicateLevel: '极低' | '较低' | '中等' | '较高';
  meaningText: string; // 寓意解读
  advice: string; // 综合建议
  baziFit: string; // 与八字的契合说明
  natural?: string; // 浑然天成：姓名连读的妙处
}

export interface GenerateOptions {
  surname: string;
  gender: Gender;
  single: boolean; // 单字名
  styles: StyleKey[];
  scheme: SchemeKey;
  bazi: BaziResult | null;
  avoid: string; // 避讳字
  expectations: ExpectKey[];
  exclude: Set<string>; // 已展示过的名字
  count: number;
  seed: number;
  strict?: boolean; // 大师模式：严格甄选
  boostWx?: WuXing[]; // 用户指定需要补充的五行
  boostMode?: BoostMode; // 选两项时：combo = 一字各属一行的组合；any = 含其中之一即可
}

/** 五行补充方式 */
export type BoostMode = 'combo' | 'any';

/** 浑然天成：姓名连读成词的特殊造名 */
export interface NaturalName {
  given: string;
  note: string; // 连读何意，如“谐「圆满」，圆满无缺”
  gender?: CharGender;
}
