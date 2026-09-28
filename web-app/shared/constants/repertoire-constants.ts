/** `repertoires.part` に保存する物理名 */
export const repertoirePartValues = ['guitar', 'bass', 'vocal', 'keyboard', 'other'] as const;
export type RepertoirePart = (typeof repertoirePartValues)[number];

/** パートの画面表示名 */
export const repertoirePartNames: Record<RepertoirePart, string> = {
  guitar  : 'ギター',
  bass    : 'ベース',
  vocal   : '歌 (カラオケ)',
  keyboard: 'キーボード',
  other   : 'その他'
};

/** `repertoires.proficiency` に保存する物理名 */
export const repertoireProficiencyValues = ['planned', 'practicing', 'playable', 'mastered'] as const;
export type RepertoireProficiency = (typeof repertoireProficiencyValues)[number];

/** 習熟度の画面表示名 */
export const repertoireProficiencyNames: Record<RepertoireProficiency, string> = {
  planned   : '練習したい',
  practicing: '練習中',
  playable  : '多少できる',
  mastered  : 'マスター'
};
