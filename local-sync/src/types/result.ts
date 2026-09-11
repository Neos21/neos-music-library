/** Result 型 */
export type Result<T> = { result: T; error?: never; } | { result?: never; error: string; };
