import { ProxyAgent, setGlobalDispatcher } from "undici";

if (process.env.HTTPS_PROXY) {
  console.log("Setting global proxy agent for HTTPS_PROXY:", process.env.HTTPS_PROXY);
  const dispatcher = new ProxyAgent(process.env.HTTPS_PROXY);
  setGlobalDispatcher(dispatcher);
}
