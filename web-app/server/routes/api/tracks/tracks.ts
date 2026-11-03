import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { updateTrackSchema } from '../../../../shared/schemas/track-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-constants';
import { TracksRepository } from '../../../repositories/tracks-repository';

import type { TrackListItem } from '../../../../shared/types/track';
import type { Result } from '../../../../shared/types/utilities/result';
import type { HonoBindings } from '../../../types/hono-bindings';

export const tracks = new Hono<{ Bindings: HonoBindings; }>();
export const tracksPath = '/tracks' as const;

tracks.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

/** 楽曲一覧を取得する */
tracks.get('/', async context => {
  const tracks = await new TracksRepository(context.env.DB).findAll();
  return context.json<Result<Array<TrackListItem>>>({ result: tracks }, httpStatusCode.ok);
});

/** コメントを更新する */
tracks.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = updateTrackSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  await new TracksRepository(context.env.DB).update(id, parsed.data.comment);
  return context.json<Result<true>>({ result: true }, httpStatusCode.ok);
});
