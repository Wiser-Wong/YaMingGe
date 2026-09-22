import type { NameAnalysis } from '../types';
import { WxTag } from './BaziPanel';

interface Props {
  item: NameAnalysis;
  index?: number;
  favorite: boolean;
  onOpen: (item: NameAnalysis) => void;
  onToggleFavorite: (item: NameAnalysis) => void;
  master?: boolean;
}

export function scoreClass(score: number) {
  if (score >= 90) return 'score-s';
  if (score >= 82) return 'score-a';
  if (score >= 72) return 'score-b';
  return 'score-c';
}

/** 名字卡片 */
export default function NameCard({ item, index, favorite, onOpen, onToggleFavorite, master }: Props) {
  const given = item.chars.map((c) => c.ch).join('');
  return (
    <div className={`name-card ${master ? 'master' : ''}`} onClick={() => onOpen(item)}>
      <div className="name-card-top">
        {index !== undefined && <span className="name-index">{index + 1}</span>}
        <button
          type="button"
          className={`fav-btn ${favorite ? 'on' : ''}`}
          title={favorite ? '取消收藏' : '收藏'}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(item); }}
        >
          {favorite ? '★' : '☆'}
        </button>
      </div>
      <div className="name-main">
        <span className="name-surname">{item.surname.ch}</span>
        <span className="name-given">{given}</span>
      </div>
      <div className="name-pinyin">{item.pinyin}</div>
      <div className="name-wx">
        {item.chars.map((c) => (
          <span key={c.ch} className="name-wx-item">
            {c.ch}<WxTag wx={c.wx} small />
          </span>
        ))}
      </div>
      <div className={`name-score ${scoreClass(item.score)}`}>
        <span className="score-num">{item.score}</span>
        <span className="score-unit">分</span>
      </div>
      {item.natural ? (
        <div className="name-natural" title={item.natural}>
          <span className="name-natural-tag">浑然天成</span>
          {item.natural}
        </div>
      ) : (
        <div className="name-brief">{item.chars.map((c) => c.meaning.split('，')[0]).join(' · ')}</div>
      )}
      <div className="name-foot">
        <span className={`dup dup-${item.duplicateLevel}`}>重名{item.duplicateLevel}</span>
        <span className="detail-link">查看详解 ›</span>
      </div>
    </div>
  );
}
