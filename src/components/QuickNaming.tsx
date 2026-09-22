import { useMemo, useState } from 'react';
import type { BaziResult, BirthInput, BoostMode, Gender, NameAnalysis, SchemeKey, StyleKey, WuXing } from '../types';
import BasicForm from './BasicForm';
import BaziPanel from './BaziPanel';
import NameCard from './NameCard';
import { generateNames, SCHEME_LABEL, STYLE_LABEL } from '../utils/generator';
import { WX_LIST } from '../utils/bazi';
import { cleanHan } from '../utils/text';
import { hasNatural } from '../data/natural';

export interface SharedState {
  surname: string;
  gender: Gender;
  single: boolean;
  birth: BirthInput;
  bazi: BaziResult | null;
  setSurname: (v: string) => void;
  setGender: (v: Gender) => void;
  setSingle: (v: boolean) => void;
  setBirth: (v: BirthInput) => void;
  isFavorite: (n: NameAnalysis) => boolean;
  toggleFavorite: (n: NameAnalysis) => void;
  openDetail: (n: NameAnalysis, masterComment?: string) => void;
}

const STYLE_KEYS = Object.keys(STYLE_LABEL) as StyleKey[];
const SCHEME_KEYS = Object.keys(SCHEME_LABEL) as SchemeKey[];
const BATCH = 200;

type SortKey = 'score' | 'unique' | 'phonetic' | 'wuxing' | 'culture';

export default function QuickNaming(s: SharedState) {
  const [styles, setStyles] = useState<StyleKey[]>([]);
  const [scheme, setScheme] = useState<SchemeKey>('balanced');
  const [avoid, setAvoid] = useState('');
  const [boostWx, setBoostWx] = useState<WuXing[]>([]);
  const [boostMode, setBoostMode] = useState<BoostMode>('combo');
  const [results, setResults] = useState<NameAnalysis[]>([]);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [batchNo, setBatchNo] = useState(0);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortKey>('score');
  const [wxFilter, setWxFilter] = useState<WuXing | ''>('');
  const [loading, setLoading] = useState(false);

  const toggleStyle = (k: StyleKey) =>
    setStyles((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : prev.length >= 3 ? prev : [...prev, k]));
  const toggleBoost = (w: WuXing) =>
    setBoostWx((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : prev.length >= 2 ? prev : [...prev, w]));

  const surnameClean = cleanHan(s.surname);
  const naturalMissing = scheme === 'natural' && surnameClean.length > 0 && !hasNatural(surnameClean);

  const run = (fresh: boolean) => {
    const surname = cleanHan(s.surname);
    if (!surname) { setError('请先填写姓氏'); return; }
    if (surname !== s.surname) s.setSurname(surname);
    setError('');
    setLoading(true);
    const exclude = fresh ? new Set<string>() : new Set(shown);
    // 让按钮有一个即时反馈
    setTimeout(() => {
      const seed = (Date.now() ^ (batchNo * 7919)) >>> 0;
      const list = generateNames({
        surname, gender: s.gender, single: s.single, styles, scheme,
        bazi: s.bazi, avoid, expectations: [], exclude, count: BATCH, seed, boostWx, boostMode,
      });
      if (!list.length) {
        setError(fresh ? '未能生成名字，请调整风格或方案后重试' : '当前条件下的名字已全部展示，可点击「重新生成」或调整条件');
      } else {
        const next = new Set(exclude);
        list.forEach((n) => next.add(n.chars.map((c) => c.ch).join('')));
        setShown(next);
        setResults(list);
        setBatchNo((b) => b + 1);
        setWxFilter('');
      }
      setLoading(false);
    }, 60);
  };

  const view = useMemo(() => {
    let list = results;
    if (wxFilter) list = list.filter((n) => n.chars.some((c) => c.wx === wxFilter));
    const key: Record<SortKey, (n: NameAnalysis) => number> = {
      score: (n) => n.score,
      unique: (n) => n.dims.unique.score,
      phonetic: (n) => n.dims.phonetic.score,
      wuxing: (n) => n.dims.wuxing.score,
      culture: (n) => n.dims.culture.score,
    };
    return [...list].sort((a, b) => key[sort](b) - key[sort](a));
  }, [results, sort, wxFilter]);

  const avg = results.length ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length) : 0;

  return (
    <div className="page">
      <div className="panel">
        <h2 className="panel-title">智能起名 <small>填写信息，一次生成 {BATCH} 个好名</small></h2>
        <BasicForm
          surname={s.surname} gender={s.gender} single={s.single} birth={s.birth}
          onSurname={s.setSurname} onGender={s.setGender} onSingle={s.setSingle} onBirth={s.setBirth}
        />

        <div className="field block">
          <span className="field-label">风格偏好 <em>最多选 3 项，不选则不限</em></span>
          <div className="chips">
            {STYLE_KEYS.map((k) => (
              <button type="button" key={k} className={`chip ${styles.includes(k) ? 'on' : ''}`} onClick={() => toggleStyle(k)}>
                {STYLE_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="field block">
          <span className="field-label">起名方案</span>
          <div className="scheme-grid">
            {SCHEME_KEYS.map((k) => {
              const needBazi = (k === 'wuxing' || k === 'zodiac') && !s.bazi;
              return (
                <button
                  type="button" key={k}
                  className={`scheme ${scheme === k ? 'on' : ''}`}
                  onClick={() => setScheme(k)}
                  title={needBazi ? '建议填写出生日期以获得更佳效果' : ''}
                >
                  <b>{SCHEME_LABEL[k].label}</b>
                  <span>{SCHEME_LABEL[k].desc}{needBazi ? '（需生辰）' : ''}</span>
                </button>
              );
            })}
          </div>
          {naturalMissing && (
            <p className="hint">「{surnameClean}」姓暂无收录的连读成词之名，将以寓意为重的常规方式生成。</p>
          )}
        </div>

        <div className="field block">
          <span className="field-label">五行补充 <em>可选，最多 2 项；选两项可组合起名，如木+水</em></span>
          <div className="chips">
            {WX_LIST.map((w) => (
              <button type="button" key={w} className={`chip wx-chip ${boostWx.includes(w) ? 'on' : ''}`} onClick={() => toggleBoost(w)}>
                补{w}
              </button>
            ))}
          </div>
          {boostWx.length === 2 && !s.single && (
            <div className="boost-mode">
              <div className="seg">
                <button type="button" className={boostMode === 'combo' ? 'active' : ''} onClick={() => setBoostMode('combo')}>{boostWx[0]}+{boostWx[1]} 组合</button>
                <button type="button" className={boostMode === 'any' ? 'active' : ''} onClick={() => setBoostMode('any')}>含{boostWx[0]}或{boostWx[1]}</button>
              </div>
              <p className="hint">{boostMode === 'combo' ? `组合：名字二字一字属${boostWx[0]}、一字属${boostWx[1]}，两行兼补` : `任一：名字含${boostWx[0]}或${boostWx[1]}即可，两字同属一行也可`}</p>
            </div>
          )}
          {boostWx.length === 2 && s.single && <p className="hint">单字名无法组合两行，将从{boostWx.join('、')}中取字。</p>}
          {s.bazi && boostWx.some((w) => s.bazi!.unfavorable.includes(w)) && (
            <p className="hint warn">提示：{boostWx.filter((w) => s.bazi!.unfavorable.includes(w)).join('、')}在八字中已偏旺，再补可能打破平衡，建议参考下方八字面板的喜用建议。</p>
          )}
        </div>

        <label className="field block">
          <span className="field-label">避讳字 <em>可选，如长辈名字用字，多个字直接连写</em></span>
          <input className="input" value={avoid} placeholder="如：建国华" onChange={(e) => setAvoid(e.target.value)} />
        </label>

        <div className="actions">
          <button type="button" className="btn primary big" disabled={loading} onClick={() => run(true)}>
            {loading ? '生成中…' : results.length ? '重新生成' : `智能起名（${BATCH} 个）`}
          </button>
          {results.length > 0 && (
            <button type="button" className="btn secondary big" disabled={loading} onClick={() => run(false)}>换一批</button>
          )}
          {error && <span className="error">{error}</span>}
        </div>
      </div>

      <BaziPanel bazi={s.bazi} />

      {results.length > 0 && (
        <div className="results">
          <div className="results-bar">
            <div className="results-stat">
              第 <b>{batchNo}</b> 批 · 共 <b>{results.length}</b> 个 · 平均 <b>{avg}</b> 分 · 方案「{SCHEME_LABEL[scheme].label}」
              {styles.length > 0 && <> · 风格「{styles.map((k) => STYLE_LABEL[k]).join('/')}」</>}
              {boostWx.length > 0 && <> · {boostWx.length === 2 && boostMode === 'combo' && !s.single ? `${boostWx[0]}+${boostWx[1]} 组合` : `补${boostWx.join('补')}`}</>}
              {scheme === 'natural' && <> · 浑然天成 <b>{results.filter((r) => r.natural).length}</b> 个，余为常规佳名补齐</>}
            </div>
            <div className="results-ctrl">
              <select className="input sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="score">按综合评分</option>
                <option value="unique">按独特性</option>
                <option value="phonetic">按音律</option>
                <option value="wuxing">按五行调和</option>
                <option value="culture">按文化底蕴</option>
              </select>
              <select className="input sm" value={wxFilter} onChange={(e) => setWxFilter(e.target.value as WuXing | '')}>
                <option value="">全部五行</option>
                {WX_LIST.map((w) => <option key={w} value={w}>含{w}</option>)}
              </select>
            </div>
          </div>
          <div className="card-grid">
            {view.map((n, i) => (
              <NameCard
                key={n.fullName} item={n} index={i}
                favorite={s.isFavorite(n)}
                onOpen={(it) => s.openDetail(it)}
                onToggleFavorite={s.toggleFavorite}
              />
            ))}
          </div>
          <div className="actions center">
            <button type="button" className="btn secondary big" disabled={loading} onClick={() => run(false)}>换一批</button>
          </div>
        </div>
      )}
    </div>
  );
}
