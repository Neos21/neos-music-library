/** `repertoire_links.type` に保存する物理名 */
export const repertoireLinkTypeValues = ['tab', 'lesson', 'reference', 'my_video', 'other'] as const;
export type RepertoireLinkType = (typeof repertoireLinkTypeValues)[number];

/** レパートリーリンク種別の画面表示名 */
export const repertoireLinkTypeNames: Record<RepertoireLinkType, string> = {
  tab      : 'タブ譜',
  lesson   : '教則',
  reference: 'ライブ',
  my_video : '自分',
  other    : 'その他'
};
