import { useState, type ReactElement, type SubmitEvent } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { commentDisplayName, updateTrackSchema } from '../../../../shared/schemas/track-schema';
import { adminApi } from '../../../helpers/admin-api';
import { convertToLf } from '../../../helpers/convert-to-lf';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';
import { useLibraryStore } from '../../../stores/library-store';

import type { LibraryTrack } from '../../../../shared/types/app/library-track';

type Props = {
  libraryTrack: LibraryTrack;
  onClose: () => void;
  onUpdated: () => void;
};

/** 楽曲のコメント編集モーダル */
export const EditCommentModal = ({ libraryTrack, onClose, onUpdated }: Props): ReactElement => {
  const [editingComment, setEditingComment] = useState<string>(() => convertToLf(libraryTrack.comment ?? ''));  // 編集中のコメント
  const [isSaving      , setIsSaving      ] = useState<boolean>(false);                                         // 保存処理中か否か
  const [saveError     , setSaveError     ] = useState<string>('');                                             // 保存に失敗した場合のエラーメッセージ
  
  /** コメントを保存する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSaving) return;
    
    const parsed = updateTrackSchema.safeParse({ comment: editingComment });
    if(!parsed.success) return setSaveError(mergeIssues(parsed.error));
    
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await adminApi.patch(`/api/tracks/${libraryTrack.id}`, { json: parsed.data }).json<{ result: Pick<LibraryTrack, 'id' | 'comment'>; }>();
      
      useLibraryStore.getState().updateLibraryTrackComment(response.result);
      onClose();
      onUpdated();
    }
    catch(error) {
      setSaveError(extractApiErrorMessage(error, 'コメントの更新に失敗しました'));
    }
    finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h2 className="mb-4 text-lg font-bold">コメントを編集する</h2>
        
        <form onSubmit={onSubmit}>
          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt>トラック ID</dt>
            <dd>{libraryTrack.id}</dd>
            <dt>アーティスト</dt>
            <dd>{libraryTrack.artist}</dd>
            <dt>アルバム</dt>
            <dd>{libraryTrack.album}</dd>
            <dt>トラック番号</dt>
            <dd>{libraryTrack.track_number === 0 ? '-' : libraryTrack.track_number}</dd>
            <dt>曲名</dt>
            <dd>{libraryTrack.title}</dd>
          </dl>
          
          <label className="mb-2 block">{commentDisplayName}</label>
          <textarea
            className="textarea mb-4 w-full"
            placeholder="コメント"
            value={editingComment}
            disabled={isSaving}
            onChange={event => setEditingComment(event.target.value)}
            rows={6}
            autoFocus
          />
          
          {!isEmpty(saveError) && (
            <div className="mb-4 alert alert-error">{saveError}</div>
          )}
          
          <div className="modal-action justify-between">
            <button className="btn" type="button" disabled={isSaving} onClick={onClose}>キャンセル</button>
            <button className="btn btn-primary" type="submit" disabled={isSaving}>更新する</button>
          </div>
        </form>
      </div>
    </div>
  );
};
