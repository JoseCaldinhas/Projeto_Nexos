import { env } from 'cloudflare:workers';
import { handleApi } from '../../../server/api';
import type { Database } from '../../../server/database';
export const dynamic = 'force-dynamic';
function handle(request: Request) {
  return handleApi(request, env.DB as unknown as Database);
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
