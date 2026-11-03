import { useState, type ReactElement, type SubmitEvent } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { commentDisplayName, updateTrackSchema } from '../../../../shared/schemas/track-schema';
import { adminApi } from '../../../helpers/admin-api';
import { convertToLf } from '../../../helpers/convert-to-lf';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';
import { useTracksStore } from '../../../stores/tracks-store';

import type { TrackListItem } from '../../../../shared/types/app/track-list-item';

type Props = {
  track: TrackListItem;
  onClose: () => void;
};

/** 楽曲のコメント編集モーダル */
export const EditCommentModal = ({ track, onClose }: Props): ReactElement => {
  const [editingComment, setEditingComment] = useState<string>(() => convertToLf(track.comment ?? ''));  // 編集中のコメント
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
      const response = await adminApi.patch(`/api/tracks/${track.id}`, { json: parsed.data }).json<{ result: Pick<TrackListItem, 'id' | 'comment'>; }>();
      
      useTracksStore.getState().updateTrackComment(response.result);
      onClose();
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
      <div className="modal-box max-w-4xl p-4">
        <h2 className="mb-4 text-lg font-bold">コメントを編集する</h2>
        
        <form onSubmit={onSubmit}>
          <dl className="mb-2 grid grid-cols-[auto_1fr] gap-2 text-xs">
            <dt>トラック ID</dt>
            <dd>{track.id}</dd>
            <dt>アーティスト</dt>
            <dd>{track.artist}</dd>
            <dt>アルバム</dt>
            <dd>{track.album}</dd>
            <dt>トラック番号</dt>
            <dd>{track.track_number === 0 ? '-' : track.track_number}</dd>
            <dt>曲名</dt>
            <dd>{track.title}</dd>
          </dl>
          
          <fieldset className="mb-4 fieldset">
            <label className="fieldset-label">{commentDisplayName}</label>
            <textarea
              className="textarea w-full textarea-sm"
              placeholder="コメント"
              value={editingComment}
              disabled={isSaving}
              onChange={event => setEditingComment(event.target.value)}
              rows={6}
              autoFocus
            />
          </fieldset>
          
          {!isEmpty(saveError) && (
            <div className="mb-4 alert alert-soft alert-error">{saveError}</div>
          )}
          
          <div className="modal-action justify-between">
            <button className="btn" type="button" disabled={isSaving} onClick={onClose}>キャンセル</button>
            <button className="btn btn-info" type="submit" disabled={isSaving}>更新する</button>
          </div>
        </form>
      </div>
    </div>
  );
};
