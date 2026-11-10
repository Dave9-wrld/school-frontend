import type { NextRequest } from 'next/server';
import { isAllowedApiRoute } from '@/lib/api-routes';
export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest, context: {params: Promise<{path: string[]}>}) {
  const { path } = await context.params;
  const endpoint = path.join('/');
  if (!isAllowedApiRoute(endpoint)) return Response.json({detail:'Not found.'}, {status:404});
  const origin = process.env.DJANGO_API_ORIGIN || 'http://127.0.0.1:8000';
  const headers = new Headers({Accept:'application/json'});
  for (const name of ['authorization', 'content-type']) {
    const value = request.headers.get(name); if (value) headers.set(name, value);
  }
  const search = request.nextUrl.search || '';
  try {
    const hasBody = !['GET', 'HEAD', 'DELETE'].includes(request.method);
    const body = hasBody ? await request.text() : undefined;
    const response = await fetch(`${origin.replace(/\/$/,'')}/api/${endpoint}/${search}`, {
      method:request.method, headers, cache:'no-store', redirect:'manual',
      body,
      signal:AbortSignal.timeout(15000),
    });
    const responseHeaders = {'Content-Type':response.headers.get('content-type') || 'application/json', 'Cache-Control':'no-store', 'Vary':'Authorization'};
    if (response.status === 204) return new Response(null, {status:204,headers:responseHeaders});
    return new Response(await response.text(), {status:response.status,headers:responseHeaders});
  } catch { return Response.json({detail:'Academic service unavailable.'}, {status:503,headers:{'Cache-Control':'no-store'}}); }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE, proxy as PUT };
