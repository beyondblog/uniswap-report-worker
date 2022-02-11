import { UniswapV3 } from './uniswapV3'
declare const STORE: KVNamespace


export async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url)
  if (pathname != '/run') {
    return new Response('{"code":400, "message":"error"}', {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    })
  }
  await new UniswapV3(STORE).run()

  return new Response('ok', {
    headers: { 'content-type': 'text/plain' },
  })
}
