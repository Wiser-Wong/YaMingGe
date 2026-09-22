import type { BirthInput, Gender } from '../types';
import { HOUR_OPTIONS } from '../utils/bazi';
import { cleanHan } from '../utils/text';

interface Props {
  surname: string;
  gender: Gender;
  single: boolean;
  birth: BirthInput;
  onSurname: (v: string) => void;
  onGender: (v: Gender) => void;
  onSingle: (v: boolean) => void;
  onBirth: (v: BirthInput) => void;
  showSingle?: boolean;
  showSurname?: boolean;
}

/** 姓氏 / 性别 / 单双字 / 生辰 —— 三个页签共用的基础表单 */
export default function BasicForm({ surname, gender, single, birth, onSurname, onGender, onSingle, onBirth, showSingle = true, showSurname = true }: Props) {
  return (
    <div className="form-grid">
      {showSurname && (
        <label className="field">
          <span className="field-label">姓氏</span>
          <input
            className="input"
            value={surname}
            maxLength={8}
            placeholder="如：王 / 欧阳"
            onChange={(e) => onSurname(e.target.value)}
            onBlur={(e) => onSurname(cleanHan(e.target.value))}
          />
        </label>
      )}

      <div className="field">
        <span className="field-label">性别</span>
        <div className="seg">
          <button type="button" className={gender === 'M' ? 'active' : ''} onClick={() => onGender('M')}>男宝</button>
          <button type="button" className={gender === 'F' ? 'active' : ''} onClick={() => onGender('F')}>女宝</button>
        </div>
      </div>

      {showSingle && (
        <div className="field">
          <span className="field-label">名字字数</span>
          <div className="seg">
            <button type="button" className={!single ? 'active' : ''} onClick={() => onSingle(false)}>双字名</button>
            <button type="button" className={single ? 'active' : ''} onClick={() => onSingle(true)}>单字名</button>
          </div>
        </div>
      )}

      <label className="field">
        <span className="field-label">出生日期（公历）</span>
        <input
          className="input"
          type="date"
          value={birth.date}
          min="1900-01-01"
          max="2099-12-31"
          onChange={(e) => onBirth({ ...birth, date: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field-label">出生时辰</span>
        <select
          className="input"
          value={birth.hour === null ? '' : String(birth.hour)}
          onChange={(e) => onBirth({ ...birth, hour: e.target.value === '' ? null : Number(e.target.value) })}
        >
          {HOUR_OPTIONS.map((o) => (
            <option key={o.label} value={o.value === null ? '' : o.value}>{o.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
