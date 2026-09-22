import type { BaziResult } from '../types';
import { WX_LIST } from '../utils/bazi';

interface Props {
  bazi: BaziResult | null;
  compact?: boolean;
}

const WX_CLASS: Record<string, string> = { 金: 'wx-jin', 木: 'wx-mu', 水: 'wx-shui', 火: 'wx-huo', 土: 'wx-tu' };

export function WxTag({ wx, small }: { wx: string; small?: boolean }) {
  return <span className={`wx-tag ${WX_CLASS[wx] ?? ''} ${small ? 'small' : ''}`}>{wx}</span>;
}

/** 八字四柱 + 五行统计面板 */
export default function BaziPanel({ bazi, compact }: Props) {
  if (!bazi) {
    return (
      <div className="bazi-panel empty">
        <p>填写出生日期后，将自动排出生辰八字并分析五行喜忌。</p>
      </div>
    );
  }
  const pillars = [
    { name: '年柱', p: bazi.year },
    { name: '月柱', p: bazi.month },
    { name: '日柱', p: bazi.day },
    { name: '时柱', p: bazi.hour },
  ];
  const total = Object.values(bazi.counts).reduce((a, b) => a + b, 0);

  return (
    <div className={`bazi-panel ${compact ? 'compact' : ''}`}>
      <div className="bazi-head">
        <span className="bazi-title">生辰八字</span>
        <span className="bazi-sub">{bazi.solarText} · 属{bazi.zodiac}</span>
      </div>
      <div className="pillars">
        {pillars.map(({ name, p }) => (
          <div className="pillar" key={name}>
            <div className="pillar-name">{name}</div>
            {p ? (
              <>
                <div className={`pillar-char ${WX_CLASS[p.ganWx]}`}>{p.gan}</div>
                <div className={`pillar-char ${WX_CLASS[p.zhiWx]}`}>{p.zhi}</div>
                <div className="pillar-wx">{p.ganWx}{p.zhiWx}</div>
              </>
            ) : (
              <>
                <div className="pillar-char muted">?</div>
                <div className="pillar-char muted">?</div>
                <div className="pillar-wx">不详</div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="wx-bars">
        {WX_LIST.map((w) => (
          <div className="wx-bar-row" key={w}>
            <WxTag wx={w} small />
            <div className="wx-bar-track">
              <div className={`wx-bar-fill ${WX_CLASS[w]}`} style={{ width: `${total ? (bazi.counts[w] / total) * 100 : 0}%` }} />
            </div>
            <span className="wx-bar-count">{bazi.counts[w]}</span>
          </div>
        ))}
      </div>
      <div className="bazi-tags">
        <span>日主：<b>{bazi.dayMaster}{bazi.dayMasterWx}</b>（{bazi.strength}）</span>
        <span>偏旺：<b className={bazi.strong.length ? 'bad' : ''}>{bazi.strong.length ? bazi.strong.join('、') : '无'}</b></span>
        <span>缺失：<b>{bazi.missing.length ? bazi.missing.join('、') : '无'}</b></span>
      </div>
      <div className="bazi-tags balance">
        {bazi.primary.length > 0 && <span>主用：<b className="good">{bazi.primary.join('、')}</b></span>}
        {bazi.assist.length > 0 && <span>辅用：<b className="good">{bazi.assist.join('、')}</b></span>}
        {bazi.caution.length > 0 && <span>慎补：<b className="warn">{bazi.caution.join('、')}</b></span>}
        {bazi.unfavorable.length > 0 && <span>忌用：<b className="bad">{bazi.unfavorable.join('、')}</b></span>}
      </div>
      {!compact && <p className="bazi-summary">{bazi.summary}</p>}
      {!compact && bazi.balanceNotes.length > 0 && (
        <ul className="bazi-notes">
          {bazi.balanceNotes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
