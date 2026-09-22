import { useEffect, useRef, useState } from 'react';
import type { BoostMode, ExpectKey, NameAnalysis, StyleKey, WuXing } from '../types';
import BasicForm from './BasicForm';
import BaziPanel from './BaziPanel';
import NameCard from './NameCard';
import type { SharedState } from './QuickNaming';
import { generateNames, STYLE_LABEL } from '../utils/generator';
import { EXPECT_LABEL } from '../utils/analysis';
import { buildMasterComment, buildMasterOverview } from '../utils/master';
import { WX_LIST } from '../utils/bazi';
import { cleanHan } from '../utils/text';

const EXPECT_KEYS = Object.keys(EXPECT_LABEL) as ExpectKey[];
const STYLE_KEYS = Object.keys(STYLE_LABEL) as StyleKey[];
const PICK = 9;

const STEPS = ['排盘分析生辰八字', '推演五行喜用与忌讳', '筛选契合期望之用字', '校验音律平仄与字型', '核算三才五格数理', '甄别典籍出处与寓意', '大师综合评定优选'];

export default function MasterNaming(s: SharedState) {
  const [expectations, setExpectations] = useState<ExpectKey[]>([]);
  const [styles, setStyles] = useState<StyleKey[]>([]);
  const [avoid, setAvoid] = useState('');
  const [wish, setWish] = useState('');
  const [boostWx, setBoostWx] = useState<WuXing[]>([]);
  const [boostMode, setBoostMode] = useState<BoostMode>('combo');
  const [results, setResults] = useState<NameAnalysis[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overview, setOverview] = useState('');
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(0);
  const [error, setError] = useState('');
  const [step, setStep] = useState(-1); // -1 空闲；0..n 进行中
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const toggle = <T,>(list: T[], set: (v: T[]) => void, k: T, max: number) =>
    set(list.includes(k) ? list.filter((x) => x !== k) : list.length >= max ? list : [...list, k]);

  const start = (fresh: boolean) => {
    const surname = cleanHan(s.surname);
    if (!surname) { setError('请先填写姓氏'); return; }
    if (surname !== s.surname) s.setSurname(surname);
    setError('');
    setStep(0);
    const exclude = fresh ? new Set<string>() : new Set(shown);
    const seed = (Date.now() ^ (round * 104729)) >>> 0;

    const tick = (i: number) => {
      if (i >= STEPS.length) {
        // 生成
        const list = generateNames({
          surname, gender: s.gender, single: s.single, styles, scheme: s.bazi ? 'wuxing' : 'balanced',
          bazi: s.bazi, avoid, expectations, exclude, count: PICK, seed, strict: true, boostWx, boostMode,
        });
        if (!list.length) {
          setError(fresh ? '未能甄选出合适名字，请放宽条件后重试' : '当前条件下的名字已全部呈现，可放宽条件再试');
          setStep(-1);
          return;
        }
        const next = new Set(exclude);
        const cm: Record<string, string> = {};
        list.forEach((n) => {
          next.add(n.chars.map((c) => c.ch).join(''));
          cm[n.fullName] = buildMasterComment(n, expectations, s.bazi);
        });
        setShown(next);
        setResults(list);
        setComments(cm);
        setOverview(buildMasterOverview(s.bazi, expectations, s.gender));
        setRound((r) => r + 1);
        setStep(-1);
        return;
      }
      setStep(i);
      timer.current = window.setTimeout(() => tick(i + 1), 320 + Math.random() * 200);
    };
    tick(0);
  };

  const busy = step >= 0;

  return (
    <div className="page">
      <div className="panel master-panel">
        <h2 className="panel-title">大师起名 <small>精心甄选 · 每次呈现 {PICK} 个上佳之名，附大师逐一点评</small></h2>
        <BasicForm
          surname={s.surname} gender={s.gender} single={s.single} birth={s.birth}
          onSurname={s.setSurname} onGender={s.setGender} onSingle={s.setSingle} onBirth={s.setBirth}
        />

        <div className="field block">
          <span className="field-label">对孩子的期望 <em>可选，最多 4 项</em></span>
          <div className="chips">
            {EXPECT_KEYS.map((k) => (
              <button type="button" key={k} className={`chip gold ${expectations.includes(k) ? 'on' : ''}`} onClick={() => toggle(expectations, setExpectations, k, 4)}>
                {EXPECT_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="field block">
          <span className="field-label">偏好风格 <em>可选，最多 3 项</em></span>
          <div className="chips">
            {STYLE_KEYS.map((k) => (
              <button type="button" key={k} className={`chip ${styles.includes(k) ? 'on' : ''}`} onClick={() => toggle(styles, setStyles, k, 3)}>
                {STYLE_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="field block">
          <span className="field-label">五行补充 <em>可选，最多 2 项，选两项可组合；不选则完全依八字平衡推算</em></span>
          <div className="chips">
            {WX_LIST.map((w) => (
              <button type="button" key={w} className={`chip wx-chip ${boostWx.includes(w) ? 'on' : ''}`} onClick={() => toggle(boostWx, setBoostWx, w, 2)}>
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
            </div>
          )}
        </div>

        <div className="form-grid two">
          <label className="field">
            <span className="field-label">避讳的字 <em>可选</em></span>
            <input className="input" value={avoid} placeholder="长辈名字用字等，直接连写" onChange={(e) => setAvoid(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">补充说明 <em>可选，仅作记录</em></span>
            <input className="input" value={wish} placeholder="如：希望名字里有水，读音要响亮" onChange={(e) => setWish(e.target.value)} />
          </label>
        </div>

        <div className="actions">
          <button type="button" className="btn gold big" disabled={busy} onClick={() => start(true)}>
            {busy ? '甄选中…' : results.length ? '重新甄选' : '开始甄选'}
          </button>
          {results.length > 0 && (
            <button type="button" className="btn secondary big" disabled={busy} onClick={() => start(false)}>再选一批</button>
          )}
          {error && <span className="error">{error}</span>}
        </div>

        {busy && (
          <div className="progress">
            {STEPS.map((t, i) => (
              <div key={t} className={`progress-step ${i < step ? 'done' : i === step ? 'doing' : ''}`}>
                <span className="dot" />{t}
              </div>
            ))}
          </div>
        )}
      </div>

      <BaziPanel bazi={s.bazi} />

      {results.length > 0 && !busy && (
        <div className="results">
          <div className="master-overview">
            <h3>大师总评</h3>
            <p>{overview}</p>
            {wish && <p className="wish">您的补充说明：{wish}</p>}
          </div>
          <div className="results-bar">
            <div className="results-stat">第 <b>{round}</b> 轮甄选 · 精选 <b>{results.length}</b> 名 · 点击卡片查看大师点评与详解</div>
          </div>
          <div className="card-grid master-grid">
            {results.map((n, i) => (
              <div className="master-item" key={n.fullName}>
                <NameCard
                  item={n} index={i} master
                  favorite={s.isFavorite(n)}
                  onOpen={(it) => s.openDetail(it, comments[it.fullName])}
                  onToggleFavorite={s.toggleFavorite}
                />
                <p className="master-brief">{comments[n.fullName]?.split('。').slice(0, 2).join('。')}。</p>
              </div>
            ))}
          </div>
          <div className="actions center">
            <button type="button" className="btn secondary big" onClick={() => start(false)}>再选一批</button>
          </div>
        </div>
      )}
    </div>
  );
}
