module.exports = async function makeGarlicFetch (opts = {}) {
  const { makeRoutedFetch } = await import('make-fetch')
  const {fetch, router} = makeRoutedFetch()
  const {got} = await import('got')
  const detect = require('detect-port')
  const HttpProxyAgent = require('http-proxy-agent').HttpProxyAgent
  const HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent
  const finalOpts = { timeout: 30000, ...opts }
  const mainConfig = {ip: 'localhost', port: 4444, ports: 4445}
  const useTimeOut = finalOpts.timeout

  function takeCareOfIt(data){
    console.log(data)
    throw new Error('aborted')
  }

  function sendTheData(theSignal, theData){
    if(theSignal){
      theSignal.removeEventListener('abort', takeCareOfIt)
    }
    return theData
  }

  async function handleIip(request) {
    const { url, method, headers: reqHeaders, body, signal, referrer } = request

    if(signal){
      signal.addEventListener('abort', takeCareOfIt)
    }
      const mainURL = new URL(url)

      if(mainURL.hostname === '_'){
        const detectedPort = await detect(mainConfig.port)
        const detectedPorts = await detect(mainConfig.ports)
        const isItRunning = mainConfig.port !== detectedPort && mainConfig.ports !== detectedPorts
        return {status: 200, headers: {'Content-Type': 'text/plain; charset=utf-8'}, body: [String(isItRunning)]}
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
      return sendTheData(signal, {status: res.statusCode, headers: res.headers, body: [res.body]})
  }
  async function handleIips(request) {
    const { url, method, headers: reqHeaders, body, signal, referrer } = request

    if(signal){
      signal.addEventListener('abort', takeCareOfIt)
    }
      const mainURL = new URL(url)

      if(mainURL.hostname === '_'){
        const detectedPort = await detect(mainConfig.port)
        const detectedPorts = await detect(mainConfig.ports)
        const isItRunning = mainConfig.port !== detectedPort && mainConfig.ports !== detectedPorts
        return {status: 200, headers: {'Content-Type': 'text/plain; charset=utf-8'}, body: [String(isItRunning)]}
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
    return sendTheData(signal, {status: res.statusCode, headers: res.headers, body: [res.body]})
  }
  router.any('iip://*/**', handleIip)
  router.any('iips://*/**', handleIips)

  return fetch
}