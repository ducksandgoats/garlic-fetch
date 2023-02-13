module.exports = async function makeGarlicFetch (opts = {}) {
  const { makeRoutedFetch } = await import('make-fetch')
  const { fetch, router } = makeRoutedFetch({onNotFound: handleEmpty, onError: handleError})
  const { default: nodeFetch } = await import('node-fetch')
  const detect = require('detect-port')
  const HttpProxyAgent = require('http-proxy-agent').HttpProxyAgent
  const HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent
  const finalOpts = { timeout: 30000, ...opts }
  const mainConfig = {ip: '127.0.0.1', port: 4444, ports: 4445}
  const useTimeOut = finalOpts.timeout
  const mainAgents = { 'http': new HttpProxyAgent(`http://${mainConfig.ip}:${mainConfig.port}`), 'https': new HttpsProxyAgent(`http://${mainConfig.ip}:${mainConfig.ports}`) }

  function handleEmpty(request) {
    const { url, headers: reqHeaders, method, body, signal } = request
    if(signal){
      signal.removeEventListener('abort', takeCareOfIt)
    }
    const mainReq = !reqHeaders.has('accept') || !reqHeaders.get('accept').includes('application/json')
    const mainRes = mainReq ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8'
    return {status: 400, headers: { 'Content-Type': mainRes }, body: mainReq ? `<html><head><title>${url}</title></head><body><div><p>did not find any data</p></div></body></html>` : JSON.stringify('did not find any data')}
  }

  function handleError(e, request) {
    const { url, headers: reqHeaders, method, body, signal } = request
    if(signal){
      signal.removeEventListener('abort', takeCareOfIt)
    }
    const mainReq = !reqHeaders.has('accept') || !reqHeaders.get('accept').includes('application/json')
    const mainRes = mainReq ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8'
    return {status: 500, headers: { 'X-Error': e.name, 'Content-Type': mainRes }, body: mainReq ? `<html><head><title>${e.name}</title></head><body><div><p>${e.stack}</p></div></body></html>` : JSON.stringify(e.stack)}
  }

  async function handleData(timeout, data) {
    if (timeout) {
      return await Promise.race([
        new Promise((resolve, reject) => setTimeout(() => { const err = new Error('timed out'); err.name = 'timeout'; reject(err) }, timeout)),
        data
      ])
    } else {
      return await data
    }
  }

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

function useAgent(_parsedURL) {
		if (_parsedURL.protocol === 'http:') {
			return mainAgents.http;
		} else if(_parsedURL.protocol === 'https:'){
			return mainAgents.https;
    } else {
      throw new Error('protocol is not valid')
    }
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
    
    request.agent = useAgent
    const useLink = request.url.replace('iip', 'http')
    delete request.url
    const mainTimeout = reqHeaders.has('x-timer') || mainURL.searchParams.has('x-timer') ? reqHeaders.get('x-timer') !== '0' || mainURL.searchParams.get('x-timer') !== '0' ? Number(reqHeaders.get('x-timer') || mainURL.searchParams.get('x-timer')) * 1000 : undefined : useTimeOut
    
    return sendTheData(signal, await handleData(mainTimeout, nodeFetch(useLink, request)))
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

    request.agent = useAgent
    const useLink = request.url.replace('iip', 'http')
    delete request.url
    const mainTimeout = (request.headers['x-timer'] && request.headers['x-timer'] !== '0') || (mainURL.searchParams.has('x-timer') && mainURL.searchParams.get('x-timer') !== '0') ? Number(request.headers['x-timer'] || mainURL.searchParams.get('x-timer')) * 1000 : useTimeOut

    return sendTheData(signal, await Promise.race([nodeFetch(useLink, request), new Promise((resolve, reject) => setTimeout(() => {reject(new Error('timeout'))}, mainTimeout))]))
  }
  router.any('iip://*/**', handleIip)
  router.any('iips://*/**', handleIips)

  return fetch
}