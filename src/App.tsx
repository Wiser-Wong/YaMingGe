import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BirthInput, Gender, NameAnalysis } from './types';
import { computeBazi } from './utils/bazi';
import QuickNaming, { type SharedState } from './components/QuickNaming';
import MasterNaming from './components/MasterNaming';
import NameTest from './components/NameTest';
import NameModal from './components/NameModal';

type Tab = 'quick' | 'master' | 'test';
const AUTHOR = '祥宇(Skyline)';
const FAV_KEY = 'naming-tool-favorites';

interface DetailState { item: NameAnalysis; masterComment?: string }

function loadFavorites(): NameAnalysis[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as NameAnalysis[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('quick');
  const [surname, setSurname] = useState('');
  const [gender, setGender] = useState<Gender>('M');
  const [single, setSingle] = useState(false);
  const [birth, setBirth] = useState<BirthInput>({ date: '', hour: null });
  const [favorites, setFavorites] = useState<NameAnalysis[]>(loadFavorites);
  const [favOpen, setFavOpen] = useState(false);
  const [detail, setDetail] = useState<DetailState | null>(null);

  const bazi = useMemo(() => computeBazi(birth), [birth]);

  useEffect(() => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch { /* 忽略存储失败 */ }
  }, [favorites]);

  const isFavorite = useCallback((n: NameAnalysis) => favorites.some((f) => f.fullName === n.fullName), [favorites]);
  const toggleFavorite = useCallback((n: NameAnalysis) => {
    setFavorites((prev) => (prev.some((f) => f.fullName === n.fullName) ? prev.filter((f) => f.fullName !== n.fullName) : [n, ...prev]));
  }, []);
  const openDetail = useCallback((item: NameAnalysis, masterComment?: string) => setDetail({ item, masterComment }), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const shared: SharedState = {
    surname, gender, single, birth, bazi,
    setSurname, setGender, setSingle, setBirth,
    isFavorite, toggleFavorite, openDetail,
  };

  const TABS: { key: Tab; label: string; desc: string }[] = [
    { key: 'quick', label: '智能起名', desc: '200 个好名 · 换一批' },
    { key: 'master', label: '大师起名', desc: '精心甄选 · 逐一点评' },
    { key: 'test', label: '名字测试', desc: '已有名字 · 全面解析' },
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-seal">雅</div>
            <div>
              <h1>雅名阁</h1>
              <p>生辰八字 · 五行平衡 · 音律字型 · 数理文化 —— 为孩子取一个好名字</p>
            </div>
          </div>
          <div className="header-right">
            <button type="button" className="btn ghost fav-toggle" onClick={() => setFavOpen((v) => !v)}>
              ★ 我的收藏 <b>{favorites.length}</b>
            </button>
            <span className="author-badge">作者：{AUTHOR}</span>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button type="button" key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
              <b>{t.label}</b>
              <span>{t.desc}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab === 'quick' && <QuickNaming {...shared} />}
        {tab === 'master' && <MasterNaming {...shared} />}
        {tab === 'test' && <NameTest {...shared} />}
      </main>

      {favOpen && (
        <aside className="fav-drawer">
          <div className="fav-head">
            <h3>我的收藏（{favorites.length}）</h3>
            <button type="button" className="btn ghost close" onClick={() => setFavOpen(false)}>✕</button>
          </div>
          {favorites.length === 0 ? (
            <p className="fav-empty">还没有收藏的名字，点击卡片上的 ☆ 即可收藏。</p>
          ) : (
            <ul className="fav-list">
              {favorites.map((f) => (
                <li key={f.fullName}>
                  <button type="button" className="fav-name" onClick={() => openDetail(f)}>
                    <b>{f.fullName}</b>
                    <span>{f.pinyin}</span>
                    <em>{f.score} 分</em>
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => toggleFavorite(f)}>移除</button>
                </li>
              ))}
            </ul>
          )}
          {favorites.length > 0 && (
            <button
              type="button" className="btn secondary"
              onClick={() => {
                const text = favorites.map((f) => `${f.fullName}（${f.pinyin}）${f.score}分`).join('\n');
                navigator.clipboard?.writeText(`${text}\n—— 雅名阁 · 作者 ${AUTHOR}`).catch(() => undefined);
              }}
            >
              复制收藏列表
            </button>
          )}
        </aside>
      )}

      <footer className="footer">
        <p>
          雅名阁 · 生辰八字智能取名工具 &nbsp;|&nbsp; 作者：<b>{AUTHOR}</b>
        </p>
        <p className="footer-note">
          八字排盘依据公历日期与时辰换算，五行归属、康熙笔画与数理吉凶均以传统命名学参考资料为准，结果仅供取名参考，愿每个孩子都拥有一个美好的名字。
        </p>
      </footer>

      <NameModal
        item={detail?.item ?? null}
        masterComment={detail?.masterComment}
        favorite={detail ? isFavorite(detail.item) : false}
        onClose={closeDetail}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}
