import type { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

const allowed = /^(login|register|logout|password-reset(?:\/confirm)?|admin\/(users|stats|classes|classes\/\d+|students|students\/\d+\/class|teachers)|teacher\/(subjects|students|classes|grades|grades\/record\/\d+)|student\/(grades|profile))$/;

async function proxy(request: NextRequest, context: {params: Promise<{path: string[]}>}) {
  const { path } = await context.params;
  const endpoint = path.join('/');
  if (!allowed.test(endpoint)) return Response.json({detail:'Not found.'}, {status:404});
  const origin = process.env.DJANGO_API_ORIGIN || 'http://127.0.0.1:8000';
  const headers = new Headers({Accept:'application/json'});
  for (const name of ['authorization', 'content-type']) {
    const value = request.headers.get(name); if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(`${origin.replace(/\/$/,'')}/api/${endpoint}/`, {
      method:request.method, headers, cache:'no-store', redirect:'manual',
      body:request.method === 'GET' ? undefined : await request.text(),
      signal:AbortSignal.timeout(15000),
    });
    const responseHeaders = {'Content-Type':response.headers.get('content-type') || 'application/json', 'Cache-Control':'no-store', 'Vary':'Authorization'};
    if (response.status === 204) return new Response(null, {status:204,headers:responseHeaders});
    return new Response(await response.text(), {status:response.status,headers:responseHeaders});
  } catch { return Response.json({detail:'Academic service unavailable.'}, {status:503,headers:{'Cache-Control':'no-store'}}); }
}
export { proxy as GET, proxy as POST, proxy as PATCH };
