import { useEffect, useRef, useState } from 'react';
import { Check, Palette, Shirt, Smile, Sparkles, X } from 'lucide-react';
import { AVATAR_OPTIONS, type AvatarCustomization } from '../lib/avatar-customization';
import type { Character } from '../lib/types';
import { avatarPalettes, starterAvatar } from './classroom-avatar';
import { AvatarPreview } from './avatar-preview';
import '../app/avatar-editor.css';

const categories = [
  { id: 'hair', label: '머리', Icon: Palette },
  { id: 'face', label: '얼굴', Icon: Smile },
  { id: 'clothes', label: '옷', Icon: Shirt },
  { id: 'accessories', label: '소품', Icon: Sparkles },
] as const;

const optionLabels: { [Key in keyof AvatarCustomization]: Record<AvatarCustomization[Key], string> } = {
  hair: { waves: '웨이브', crop: '짧은 머리', spiky: '삐죽 머리', bob: '단발', bun: '올림머리', curls: '곱슬', part: '가르마', long: '긴 머리' },
  hairColor: { black: '검정', brown: '갈색', blond: '금발', pink: '분홍', silver: '은빛', navy: '남색' },
  skin: { porcelain: '아이보리', peach: '복숭아빛', honey: '꿀빛', bronze: '구릿빛', deep: '짙은 갈색' },
  expression: { smile: '잔잔한 미소', grin: '활짝 웃기', sleepy: '꾸벅꾸벅' },
  clothing: { plain: '기본 티셔츠', knit: '니트', puffer: '패딩', cardigan: '가디건' },
  clothingColor: { cream: '크림', sage: '연두', sky: '하늘색', lavender: '라벤더', rose: '장밋빛', amber: '호박색', navy: '남색' },
  accessory: { none: '없음', glasses: '안경', cat: '고양이 귀', ribbon: '리본', beanie: '비니', sprout: '새싹', headphones: '헤드폰',
    star: '별', scarf: '목도리', clip: '머리핀', earmuffs: '귀마개', frog: '개구리 모자', mushroom: '버섯 모자', axolotl: '우파 머리띠' },
};

const categoryOptions = {
  hair: [['hair', '머리 모양'], ['hairColor', '머리색']],
  face: [['skin', '피부색'], ['expression', '표정']],
  clothes: [['clothing', '옷 종류'], ['clothingColor', '옷 색']],
  accessories: [['accessory', '소품']],
} as const;
const optionValues: { [Key in keyof AvatarCustomization]: readonly AvatarCustomization[Key][] } = AVATAR_OPTIONS;
const swatches: Partial<Record<keyof AvatarCustomization, Record<string, readonly [string, string]>>> = avatarPalettes;

export function AvatarEditor({ character, current, onSave, onClose }: {
  character: Character; current?: AvatarCustomization;
  onSave?: (avatar: AvatarCustomization) => Promise<void>; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [initial] = useState(() => current ?? starterAvatar(character));
  const [draft, setDraft] = useState(initial);
  const [category, setCategory] = useState<(typeof categories)[number]['id']>('hair');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const changed = (Object.keys(draft) as Array<keyof AvatarCustomization>).some(key => draft[key] !== initial[key]);

  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>('.avatar-category[aria-pressed="true"]')?.focus();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  async function save() {
    if (pending.current || !changed || !onSave) return;
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '캐릭터를 저장하지 못했어요. 다시 시도해주세요.');
      setSaving(false);
      pending.current = false;
    }
  }

  function optionsFor<Key extends keyof AvatarCustomization>(key: Key, label: string) {
    const options = optionValues[key];
    const palette = swatches[key];
    return <fieldset className="avatar-options" key={key}>
      <legend>{label}</legend>
      <div className={palette ? 'avatar-options-grid has-swatches' : 'avatar-options-grid'}>
        {options.map(value => {
          const selected = draft[key] === value;
          return <button key={value} type="button" aria-pressed={selected} disabled={saving}
            onClick={() => setDraft(previous => ({ ...previous, [key]: value }))}>
            {palette && <span className="avatar-swatch" aria-hidden="true" style={{ backgroundColor: palette[value][0] }} />}
            <span>{optionLabels[key][value]}</span>
            {selected && <Check className="avatar-option-check" size={13} aria-hidden="true" />}
          </button>;
        })}
      </div>
    </fieldset>;
  }

  return <dialog ref={dialog} className="classroom-character-dialog avatar-editor" aria-labelledby="avatar-editor-title"
    onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="classroom-picker-heading">
      <h2 id="avatar-editor-title">내 캐릭터 꾸미기</h2>
      <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="캐릭터 꾸미기 닫기"><X size={20} /></button>
    </div>
    <div className="avatar-editor-workspace">
      <figure className="avatar-editor-preview">
        <AvatarPreview character={character} avatar={draft} />
        <figcaption>미리 보기</figcaption>
      </figure>
      <div className="avatar-editor-controls">
        <div className="avatar-category-list" role="group" aria-label="꾸미기 종류">
          {categories.map(({ id, label, Icon }) => <button className="avatar-category" key={id} type="button"
            aria-pressed={category === id} disabled={saving} onClick={() => setCategory(id)}><Icon size={16} aria-hidden="true" />{label}</button>)}
        </div>
        <div className="avatar-editor-options">{categoryOptions[category].map(([key, label]) => optionsFor(key, label))}</div>
      </div>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {!onSave && <p role="status">지금은 캐릭터를 저장할 수 없어요.</p>}
    <div className="avatar-editor-footer">
      <button type="button" className="avatar-reset" disabled={!changed || saving} onClick={() => { setDraft(initial); setError(''); }}>되돌리기</button>
      <button type="button" className="primary" disabled={!changed || saving || !onSave} onClick={() => void save()}>{saving ? '저장 중' : '꾸민 모습 저장'}</button>
    </div>
  </dialog>;
}
