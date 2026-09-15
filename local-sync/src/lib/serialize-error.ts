/** エラーオブジェクトを文字列にして返す */
export const serializeError = (error: unknown): string => error instanceof Error ? error.message : String(error);
