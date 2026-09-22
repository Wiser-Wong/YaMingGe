import type { NameAnalysis } from '../types';
import { WxTag } from './BaziPanel';
import { scoreClass } from './NameCard';
import { toneMark, splitPinyin, TONE_NAMES, pingZe } from '../utils/pinyin';

interface Props {
  item: NameAnalysis;
  masterComment?: string;
}

function ScoreBar({ label, score, comment }: { label: string; score: number; comment: string }) {
  return (
    <div className="dim-row">
      <div className="dim-head">
        <span className="dim-label">{label}</span>
        <span className={`dim-score ${scoreClass(score)}`}>{score}</span>
      </div>
      <div className="dim-track"><div className={`dim-fill ${scoreClass(score)}`} style={{ width: `${score}%` }} /></div>
      <p className="dim-comment">{comment}</p>
    </div>
  );
}

/** 名字详细分析（弹窗与测名页共用） */
export default function NameDetail({ item, masterComment }: Props) {
  const dims = item.dims;
  const given = item.chars.map((c) => c.ch).join('');
  return (
    <div className="detail">
      <div className="detail-hero">
        <div className="detail-name">
          <span className="detail-surname">{item.surname.ch}</span>
          <span className="detail-given">{given}</span>
        </div>
        <div className="detail-pinyin">{item.pinyin}</div>
        <div className={`detail-score ${scoreClass(item.score)}`}>
          <div className="ring" style={{ ['--p' as string]: `${item.score}%` }}>
            <span>{item.score}</span>
          </div>
          <div className="ring-label">综合评分</div>
        </div>
      </div>

      {masterComment && (
        <section className="detail-section master-comment">
          <h4>大师点评</h4>
          <p>{masterComment}</p>
        </section>
      )}

      {item.natural && (
        <section className="detail-section natural-note">
          <h4>浑然天成</h4>
          <p className="detail-text">姓名连读{item.natural}。</p>
        </section>
      )}

      <section className="detail-section">
        <h4>用字解析</h4>
        <div className="char-cards">
          {item.chars.map((c) => {
            const p = splitPinyin(c.py);
            return (
              <div className="char-card" key={c.ch}>
                <div className="char-big">{c.ch}</div>
                <div className="char-info">
                  <div className="char-line">
                    <span className="char-py">{toneMark(c.py) || '—'}</span>
                    {p.tone > 0 && <span className="char-tone">{TONE_NAMES[p.tone]} · {pingZe(p.tone)}</span>}
                  </div>
                  <div className="char-line">
                    <WxTag wx={c.wx} />
                    <span className="char-strokes">康熙 {c.strokes} 画</span>
                  </div>
                  <div className="char-meaning">{c.meaning}</div>
                  {c.source && <div className="char-source">典出：{c.source}</div>}
                  {c.unknown && <div className="char-warn">该字暂未收录，五行/笔画为估算</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="detail-section">
        <h4>名字寓意</h4>
        <p className="detail-text">{item.meaningText}</p>
      </section>

      <section className="detail-section">
        <h4>八字五行契合</h4>
        <p className="detail-text">{item.baziFit}</p>
      </section>

      <section className="detail-section">
        <h4>多维评分</h4>
        <ScoreBar label="音律" score={dims.phonetic.score} comment={dims.phonetic.comment} />
        <ScoreBar label="字型" score={dims.glyph.score} comment={dims.glyph.comment} />
        <ScoreBar label="五行调和" score={dims.wuxing.score} comment={dims.wuxing.comment} />
        <ScoreBar label="寓意" score={dims.meaning.score} comment={dims.meaning.comment} />
        <ScoreBar label="独特性 / 重名率" score={dims.unique.score} comment={dims.unique.comment} />
        <ScoreBar label="文化底蕴" score={dims.culture.score} comment={dims.culture.comment} />
        <ScoreBar label="三才五格数理" score={dims.numerology.score} comment={dims.numerology.comment} />
      </section>

      <section className="detail-section">
        <h4>三才五格</h4>
        <div className="grid-table">
          {item.grids.map((g) => (
            <div className="grid-cell" key={g.name}>
              <div className="grid-name">{g.name}</div>
              <div className="grid-value">{g.value}</div>
              <div className="grid-meta"><WxTag wx={g.wx} small /><span className={`luck luck-${g.luck}`}>{g.luck}</span></div>
              <div className="grid-desc">{g.desc}</div>
            </div>
          ))}
        </div>
        <p className="detail-text">
          三才配置「{item.sancai.text}」<span className={`luck luck-${item.sancai.luck}`}>{item.sancai.luck}</span>：{item.sancai.desc}
        </p>
      </section>

      <section className="detail-section advice">
        <h4>综合建议</h4>
        <p className="detail-text">{item.advice}</p>
      </section>
    </div>
  );
}
