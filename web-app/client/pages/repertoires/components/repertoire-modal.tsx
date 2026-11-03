import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useState } from 'react';

import { RepertoireFormModal } from './repertoire-form-modal';
import { repertoirePartNames } from '../../../../shared/constants/repertoire-constants';
import { isEmpty } from '../../../../shared/helpers/is-empty';

import type { RepertoireListItem } from '../../../../shared/types/repertoire';
import type { ReactElement } from 'react';

type Props = {
  repertoire: RepertoireListItem;
  onClose: () => void;
};

/** クライアント側でメモを Markdown として表示するモーダル */
export const RepertoireModal = ({ repertoire, onClose }: Props): ReactElement => {
  const [isEditing, setIsEditing] = useState<boolean>(false);  // 編集フォームを表示中か否か
  
  // Markdown 内の HTML・リンクも含め、DOM に渡す直前にサニタイズする
  const memoHtml = DOMPurify.sanitize(marked.parse(repertoire.memo ?? '', { async: false }), {
    USE_PROFILES: { html: true }
  });
  
  // 編集時はフォームモーダルに切り替える
  if(isEditing) return (
    <RepertoireFormModal repertoire={repertoire} onClose={onClose} />
  );
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl p-4">
        <h2 className="mb-4 text-lg font-bold">{repertoire.track?.title ?? repertoire.title} / {repertoirePartNames[repertoire.part]}</h2>
        {isEmpty(repertoire.memo) ? (
          <p className="mb-4 text-sm text-gray-500">メモはありません。</p>
        ) : (
          <div className="memo" dangerouslySetInnerHTML={{ __html: memoHtml }} />  // eslint-disable-line tailwindcss/no-custom-classname, @eslint-react/dom-no-dangerously-set-innerhtml
        )}
        <div className="modal-action justify-between">
          <button className="btn" type="button" onClick={onClose}>閉じる</button>
          <button className="btn btn-info" type="button" onClick={() => setIsEditing(true)}>編集</button>
        </div>
      </div>
    </div>
  );
};
