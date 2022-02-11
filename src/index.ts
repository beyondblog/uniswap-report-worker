import { handleRequest } from './handler'
import { UniswapV3 } from './uniswapV3'
declare const STORE: KVNamespace

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request))
})

addEventListener('scheduled', (event) => {
  event.waitUntil(handleSchedule(event.scheduledTime))
})

async function handleSchedule(scheduledDate: number) {
  await new UniswapV3(STORE).run()
}
