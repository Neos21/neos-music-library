import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useState } from 'react';

import { RepertoireFormModal } from './repertoire-form-modal';
import { repertoirePartNames, repertoireProficiencyNames } from '../../../../shared/constants/repertoire-constants';
import { isEmpty } from '../../../../shared/helpers/is-empty';

import type { RepertoireListItem } from '../../../../shared/types/repertoire';
import type { ReactElement } from 'react';

type Props = {
  /** 表示対象のレパートリー */
  repertoire: RepertoireListItem;
  /** モーダルを閉じた時の処理 */
  onClose: () => void;
};

/** レパートリー詳細モーダル : メモは Markdown としてパース表示する */
export const RepertoireModal = ({ repertoire, onClose }: Props): ReactElement => {
  const [isEditing, setIsEditing] = useState<boolean>(false);  // 編集フォームを表示中か否か
  
  // メモを Markdown として解釈しサニタイズする
  const [memoHtml] = useState<string>(() => {
    const memoFragment = DOMPurify.sanitize(marked.parse(repertoire.memo ?? '', { async: false }), {
      USE_PROFILES: { html: true },
      RETURN_DOM_FRAGMENT: true
    });
    // リンクを新規ウィンドウで開くようにしておく
    memoFragment.querySelectorAll('a').forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noreferrer');
    });
    const memoElement = document.createElement('div');
    memoElement.appendChild(memoFragment);
    return memoElement.innerHTML;
  });
  
  // 編集時はフォームモーダルに切り替える
  if(isEditing) return (
    <RepertoireFormModal repertoire={repertoire} onClose={onClose} />
  );
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl p-4">
        <h2 className="mb-4 text-lg font-bold">レパートリー詳細</h2>
        
        <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
          <dt>アーティスト</dt>
          <dd>{repertoire.track?.artist ?? repertoire.artist}</dd>
          <dt>アルバム</dt>
          <dd>{repertoire.track?.album ?? repertoire.album}</dd>
          <dt>曲名</dt>
          <dd>{repertoire.track?.title ?? repertoire.title}</dd>
          <dt>パート</dt>
          <dd>{repertoirePartNames[repertoire.part]}</dd>
          <dt>習熟度</dt>
          <dd>{repertoire.proficiency == null ? '-' : repertoireProficiencyNames[repertoire.proficiency]}</dd>
        </dl>
        
        <fieldset className="mb-4 fieldset">
          <label className="fieldset-label">メモ</label>
          {isEmpty(repertoire.memo) ? (
            <p className="text-xs text-gray-500">メモはありません。</p>
          ) : (
            <div className="memo" dangerouslySetInnerHTML={{ __html: memoHtml }} />  // eslint-disable-line tailwindcss/no-custom-classname, @eslint-react/dom-no-dangerously-set-innerhtml
          )}
        </fieldset>
        
        <div className="modal-action justify-between">
          <button type="button" className="btn btn-sm" onClick={onClose}>閉じる</button>
          <button type="button" className="btn btn-info btn-sm" onClick={() => setIsEditing(true)}>編集する</button>
        </div>
      </div>
    </div>
  );
};
