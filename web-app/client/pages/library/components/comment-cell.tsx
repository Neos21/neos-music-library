import { useState, type ReactElement } from 'react';

import { commentDisplayName } from '../../../../shared/schemas/track-schema';
import { adminApi } from '../../../helpers/admin-api';
import { convertToLf } from '../../../helpers/convert-to-lf';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';
import { useLibraryStore } from '../../../stores/library-store';

import type { LibraryTrack } from '../../../../shared/types/app/library-track';

type Props = {
  /** 編集対象の楽曲情報 */
  libraryTrack: LibraryTrack;
  /** 編集中のトラック ID */
  editingTrackId: number | null;
  /** 編集中のトラック ID を設定する */
  setEditingTrackId: (trackId: number | null) => void;
  /** 保存時エラーメッセージを設定する */
  setSaveError: (errorMessage: string) => void;
};

/** コメントセル : クリックすると編集中状態にする */
export const CommentCell = ({ libraryTrack, editingTrackId, setEditingTrackId, setSaveError }: Props): ReactElement => {
  const [editingComment, setEditingComment] = useState<string>('');      // 編集中のコメント
  const [isSaving      , setIsSaving      ] = useState<boolean>(false);  // 保存処理中か否か
  
  /** コメントの編集を開始する */
  const onStartEditComment = (): void => {
    if(editingTrackId != null) return;  // 編集中の楽曲があるようなら開始させない
    
    setEditingTrackId(libraryTrack.id);  // トラック ID を与えることで編集開始にする
    setEditingComment(convertToLf(libraryTrack.comment ?? ''));  // LF に変換する
    setSaveError('');
  };
  
  /** コメントを保存する */
  const onSaveComment = async (): Promise<void> => {
    if(isSaving) return;  // 保存中の場合は何もしない
    
    // 変更なしの場合は保存処理はせず編集を終了する
    if(editingComment === convertToLf(libraryTrack.comment ?? '')) {
      setEditingTrackId(null);
      setEditingComment('');
      setSaveError('');
      return;
    }
    
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await adminApi.patch(`/api/tracks/${libraryTrack.id}`, {
        json: {
          comment: editingComment
        }
      })
      .json<{ result: Pick<LibraryTrack, 'id' | 'comment' | 'updated_at'>; }>();
      
      // 更新されたコメントをストアに反映する
      useLibraryStore.getState().updateLibraryTrackComment(response.result);
      // 編集を終了する
      setEditingTrackId(null);
      setEditingComment('');
    }
    catch(error) {
      setSaveError(extractApiErrorMessage(error, 'コメントの更新に失敗しました'));
    }
    finally {
      setIsSaving(false);
    }
  };
  
  return (
    <td className="whitespace-pre-wrap" onClick={onStartEditComment}>
      {editingTrackId === libraryTrack.id ? (
        <textarea
          autoFocus
          placeholder={commentDisplayName}
          value={editingComment}
          disabled={isSaving}
          className="textarea min-h-8 w-full px-[.4em] py-[.2em]"
          rows={3}
          onChange={event => setEditingComment(event.target.value)}
          onBlur={onSaveComment}
        />
      ) : libraryTrack.comment}
    </td>
  );
};
