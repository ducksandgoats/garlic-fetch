module.exports = async function makeGarlicFetch (opts = {}) {
  const makeFetch = require('make-fetch')
  const {got} = await import('got')
  const detect = require('detect-port')
  const HttpProxyAgent = require('http-proxy-agent').HttpProxyAgent
  const HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent
  const finalOpts = { timeout: 30000, ...opts }
  const mainConfig = {ip: 'localhost', port: 4444, ports: 4445}
  const useTimeOut = finalOpts.timeout

  const fetch = makeFetch(async (request) => {
    
    try {

      const mainURL = new URL(request.url)

      if ((!request.url.startsWith('iip:') && !request.url.startsWith('iips:')) || !request.method) {
        throw new Error(`request is not correct, protocol must be iip:// or iips://, or requires a method`)
      }

      if(mainURL.hostname === '_'){
        const detectedPort = await detect(mainConfig.port)
        const detectedPorts = await detect(mainConfig.ports)
        const isItRunning = mainConfig.port !== detectedPort && mainConfig.ports !== detectedPorts
        return {statusCode: 200, headers: {'Content-Type': 'text/plain; charset=utf-8'}, data: [String(isItRunning)]}
      }

      request.url = request.url.replace('iip', 'http')

      request.timeout = {request: (request.headers['x-timer'] && request.headers['x-timer'] !== '0') || (mainURL.searchParams.has('x-timer') && mainURL.searchParams.get('x-timer') !== '0') ? Number(request.headers['x-timer'] || mainURL.searchParams.get('x-timer')) * 1000 : useTimeOut}
      request.agent = { 'http': new HttpProxyAgent(`http://${mainConfig.ip}:${mainConfig.port}`), 'https': new HttpsProxyAgent(`http://${mainConfig.ip}:${mainConfig.ports}`) }

      delete request.referrer
      if(request.method === 'CONNECT' || request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS' || request.method === 'TRACE'){
        delete request.body
      }
      if(!request.signal){
        delete request.signal
      }

      const res = await got(request)
      return {statusCode: res.statusCode, headers: res.headers, data: [res.body]}
    } catch(e){
      const {mainHead, mainData} = (() => {
        if(request.headers.accept){
          if(request.headers.accept.includes('text/html')){
            return {mainHead: 'text/html; charset=utf-8', mainData: [`<html><head><title>${request.url.toString()}</title></head><body><p>${e.name}</p></body></html>`]}
          } else if(request.headers.accept.includes('application/json')){
            return {mainHead: 'application/json; charset=utf-8', mainData: [JSON.stringify(e.name)]}
          } else if(request.headers.accept.includes('text/plain')){
            return {mainHead: 'text/plain; charset=utf-8', mainData: [e.name]}
          } else {
            return {mainHead: 'text/plain; charset=utf-8', mainData: [e.name]}
          }
        } else {
          return {mainHead: 'text/plain; charset=utf-8', mainData: [e.name]}
        }
      })()
      return {statusCode: 500, headers: {'X-Error': e.name, 'Content-Type': mainHead}, data: mainData}
    }
  })

  return fetch
}