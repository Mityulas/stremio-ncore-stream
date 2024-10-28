import axios from "axios";
import { RequestListener } from "http";
import https from "https";
import localtunnel from "localtunnel";
import {config} from "../config/config.js";

const HTTPS_METHOD = config().https.method;

export const serveHTTPS = async (app: RequestListener, port: number) => {
  if (HTTPS_METHOD === 1) {
    const json = (await axios.get("https://local-ip.medicmobile.org/keys"))
      .data;
    const cert = `${json.cert}\n${json.chain}`;
    const httpsServer = https.createServer({ key: json.privkey, cert }, app);
    httpsServer.listen(port);
    console.log(`HTTPS addon listening on port ${port}`);
    return httpsServer;
  }

  if (HTTPS_METHOD === 2) {
    const key = (await axios.get("http://local-ip.co/cert/server.key")).data;
    const serverPem = (await axios.get("http://local-ip.co/cert/server.pem"))
      .data;
    const chainPem = (await axios.get("http://local-ip.co/cert/chain.pem"))
      .data;
    const cert = `${serverPem}\n${chainPem}`;
    const httpsServer = https.createServer({ key, cert }, app);
    httpsServer.listen(port);
    console.log(`HTTPS addon listening on port ${port}`);
    return httpsServer;
  }

  if (HTTPS_METHOD === 3) {
    const tunnel = await localtunnel({ port: Number(process.env.PORT) });
    console.log(`Tunnel accessible at: ${tunnel.url}`);
    const tunnelPassword = await axios.get("https://loca.lt/mytunnelpassword");
    console.log(`Tunnel password: ${tunnelPassword.data}`);
  }
};
