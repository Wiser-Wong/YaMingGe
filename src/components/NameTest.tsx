import { useState } from 'react';
import type { NameAnalysis } from '../types';
import BasicForm from './BasicForm';
import BaziPanel from './BaziPanel';
import NameDetail from './NameDetail';
import type { SharedState } from './QuickNaming';
import { lookupChar } from '../data/characters';
import { lookupSurname } from '../data/surnames';
import { analyzeName } from '../utils/analysis';
import { cleanHan, splitFullName } from '../utils/text';

export default function NameTest(s: SharedState) {
  const [fullName, setFullName] = useState('');
  const [result, setResult] = useState<NameAnalysis | null>(null);
  const [error, setError] = useState('');

  const run = () => {
    const clean = cleanHan(fullName, 6);
    const { surname: sn, given: gv } = splitFullName(clean);
    if (!sn || !gv) { setError('请输入完整姓名，如：李思远'); return; }
    if (gv.length > 2) { setError('名字部分最多支持 2 个字（复姓会自动识别）'); return; }
    setError('');
    setFullName(clean);
    s.setSurname(sn);
    const surname = lookupSurname(sn);
    const chars = Array.from(gv).map(lookupChar);
    setResult(analyzeName(surname, chars, { bazi: s.bazi, scheme: 'balanced' }));
  };

  const unknown = result?.chars.filter((c) => c.unknown) ?? [];

  return (
    <div className="page">
      <div className="panel">
        <h2 className="panel-title">名字测试 <small>输入完整姓名，获得与起名同等维度的详细解析</small></h2>
        <div className="form-grid two">
          <label className="field">
            <span className="field-label">姓名 <em>姓与名连写，复姓自动识别</em></span>
            <input
              className="input" value={fullName} maxLength={12} placeholder="如：李思远 / 欧阳子文"
              onChange={(e) => setFullName(e.target.value)}
              onBlur={(e) => setFullName(cleanHan(e.target.value, 6))}
              onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
            />
          </label>
        </div>
        <BasicForm
          surname={s.surname} gender={s.gender} single={s.single} birth={s.birth}
          onSurname={s.setSurname} onGender={s.setGender} onSingle={s.setSingle} onBirth={s.setBirth}
          showSingle={false} showSurname={false}
        />
        <div className="actions">
          <button type="button" className="btn primary big" onClick={run}>开始测名</button>
          {result && (
            <button type="button" className={`btn secondary big ${s.isFavorite(result) ? 'fav-on' : ''}`} onClick={() => s.toggleFavorite(result)}>
              {s.isFavorite(result) ? '★ 已收藏' : '☆ 收藏此名'}
            </button>
          )}
          {error && <span className="error">{error}</span>}
        </div>
      </div>

      <BaziPanel bazi={s.bazi} />

      {result && (
        <div className="panel test-result">
          {unknown.length > 0 && (
            <div className="notice">
              「{unknown.map((c) => c.ch).join('」「')}」暂未收录于字库，其五行、笔画与拼音按估算处理，相关维度得分仅供参考。
            </div>
          )}
          <NameDetail item={result} />
        </div>
      )}
    </div>
  );
}
