/** エラーオブジェクトを文字列にして返す */
export const serializeError = (error: unknown): string => {
  if(error instanceof Error) return error.message;
  return String(error);
};
