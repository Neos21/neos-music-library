import { Hono } from 'hono';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { LibraryService } from '../../../services/library-service';

import type { HonoBindings } from '../../../types/hono-bindings';

export const library = new Hono<{ Bindings: HonoBindings; }>();
export const libraryPath = '/library' as const;

/** トラックと紐付くレパートリー一覧を取得する */
library.get('/', async context => {
  const libraryTracks = await new LibraryService(context.env.DB).findAll();
  return context.json({ result: libraryTracks }, httpStatusCode.ok);
});
