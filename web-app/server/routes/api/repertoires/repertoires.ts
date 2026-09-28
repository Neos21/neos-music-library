import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { createRepertoireSchema, updateRepertoireSchema } from '../../../../shared/schemas/repertoire-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-constants';
import { RepertoiresService } from '../../../services/repertoires-service';

import type { HonoBindings } from '../../../types/hono-bindings';

export const repertoires = new Hono<{ Bindings: HonoBindings; }>();
export const repertoiresPath = '/repertoires' as const;

repertoires.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

/** レパートリーとリンクを登録する */
repertoires.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = createRepertoireSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const result = await new RepertoiresService(context.env.DB).create(parsed.data);
  if(result.error != null) return context.json({ error: result.error }, httpStatusCode.notFound);
  
  return context.json({ result: { id: result.result } }, httpStatusCode.created);
});

/** レパートリーとリンクを更新する */
repertoires.put('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id) || id < 1) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = updateRepertoireSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const result = await new RepertoiresService(context.env.DB).update(id, parsed.data);
  if(result.error != null) return context.json({ error: result.error }, httpStatusCode.notFound);
  
  return context.json({ result: { id: result.result } }, httpStatusCode.ok);
});

/** レパートリーとリンクを削除する */
repertoires.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id) || id < 1) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const result = await new RepertoiresService(context.env.DB).delete(id);
  if(result.error != null) return context.json({ error: result.error }, httpStatusCode.notFound);
  
  return context.json({ result: { id: result.result } }, httpStatusCode.ok);
});
