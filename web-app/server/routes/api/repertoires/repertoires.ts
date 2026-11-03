import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { editRepertoireSchema } from '../../../../shared/schemas/repertoire-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-constants';
import { RepertoiresRepository } from '../../../repositories/repertoires-repository';
import { RepertoiresService } from '../../../services/repertoires-service';

import type { RepertoireListItem } from '../../../../shared/types/repertoire';
import type { Result } from '../../../../shared/types/utilities/result';
import type { HonoBindings } from '../../../types/hono-bindings';

export const repertoires = new Hono<{ Bindings: HonoBindings; }>();
export const repertoiresPath = '/repertoires' as const;

repertoires.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

/** 紐付く楽曲情報とともに全レパートリーを取得する */
repertoires.get('/', async context => {
  const result = await new RepertoiresService(context.env.DB).findAll();
  return context.json<Result<Array<RepertoireListItem>>>({ result }, httpStatusCode.ok);
});

/** レパートリーを登録する */
repertoires.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = editRepertoireSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const result = await new RepertoiresService(context.env.DB).create(parsed.data);
  if(result.error != null) return context.json({ error: result.error }, httpStatusCode.notFound);
  
  return context.json<Result<number>>(result, httpStatusCode.created);
});

/** レパートリーを更新する */
repertoires.put('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id) || id < 1) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = editRepertoireSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const result = await new RepertoiresService(context.env.DB).update(id, parsed.data);
  if(result.error != null) return context.json({ error: result.error }, httpStatusCode.notFound);
  
  return context.json<Result<true>>(result, httpStatusCode.ok);
});

/** レパートリーを削除する */
repertoires.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id) || id < 1) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  await new RepertoiresRepository(context.env.DB).delete(id);
  return context.json<Result<true>>({ result: true }, httpStatusCode.ok);
});
