import { useState, type ReactElement, type SubmitEvent } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { commentDisplayName, updateTrackSchema } from '../../../../shared/schemas/track-schema';
import { adminApi } from '../../../helpers/admin-api';
import { convertToLf } from '../../../helpers/convert-to-lf';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';
import { useTracksStore } from '../../../stores/tracks-store';

import type { TrackListItem } from '../../../../shared/types/track';
import type { Result } from '../../../../shared/types/utilities/result';

type Props = {
  /** 編集中の楽曲情報 */
  track: TrackListItem;
  /** モーダルを閉じる時の処理 */
  onClose: () => void;
};

/** 楽曲のコメント編集モーダル */
export const EditCommentModal = ({ track, onClose }: Props): ReactElement => {
  const [comment     , setComment     ] = useState<string>(() => convertToLf(track.comment ?? ''));  // 編集中のコメント
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);                                  // 保存処理中か否か
  const [error       , setError       ] = useState<string>('');                                      // 保存に失敗した場合のエラーメッセージ
  
  /** コメントを保存する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSubmitting) return;
    
    const parsed = updateTrackSchema.safeParse({ comment: comment });
    if(!parsed.success) return setError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    setError('');
    try {
      const response = await adminApi.patch(`/api/tracks/${track.id}`, { json: parsed.data }).json<Result<Pick<TrackListItem, 'id' | 'comment'>>>();
      if(response.error != null) return setError(response.error);
      
      useTracksStore.getState().updateTrackComment(response.result);
      onClose();
    }
    catch(error) {
      setError(extractApiErrorMessage(error, 'コメントの更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
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
              value={comment}
              disabled={isSubmitting}
              onChange={event => setComment(event.target.value)}
              rows={6}
              autoFocus
            />
          </fieldset>
          
          {!isEmpty(error) && (
            <div className="mb-4 alert alert-soft alert-error">{error}</div>
          )}
          
          <div className="modal-action justify-between">
            <button className="btn" type="button" disabled={isSubmitting} onClick={onClose}>キャンセル</button>
            <button className="btn btn-info" type="submit" disabled={isSubmitting}>更新する</button>
          </div>
        </form>
      </div>
    </div>
  );
};
