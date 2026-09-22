import { useEffect } from 'react';
import type { NameAnalysis } from '../types';
import NameDetail from './NameDetail';

interface Props {
  item: NameAnalysis | null;
  masterComment?: string;
  favorite: boolean;
  onClose: () => void;
  onToggleFavorite: (item: NameAnalysis) => void;
}

export default function NameModal({ item, masterComment, favorite, onClose, onToggleFavorite }: Props) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  if (!item) return null;

  const copy = () => {
    const text = `${item.fullName}（${item.pinyin}）综合评分 ${item.score}\n${item.meaningText}\n${item.baziFit}\n${item.advice}\n—— 雅名阁 · 作者 祥宇(Skyline)`;
    navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <button type="button" className={`btn ghost ${favorite ? 'fav-on' : ''}`} onClick={() => onToggleFavorite(item)}>
            {favorite ? '★ 已收藏' : '☆ 收藏'}
          </button>
          <button type="button" className="btn ghost" onClick={copy}>复制解析</button>
          <button type="button" className="btn ghost close" onClick={onClose}>✕</button>
        </div>
        <NameDetail item={item} masterComment={masterComment} />
      </div>
    </div>
  );
}
