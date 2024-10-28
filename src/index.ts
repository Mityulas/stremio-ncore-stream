import "./utils/dotenv.js";

import express from "express";
import { serveHTTP } from "./addon/server.js";
import { router } from "./router.js";
import { serveHTTPS } from "./utils/https.js";
import {loadTorrents} from "./helpers/TorrentLoader.js";
import {deleteUnnecessaryTorrents, loadCronJobs} from "./helpers/cronJobs.js";

const PORT = Number(process.env.PORT) || 58827;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 58828;

const main = async () => {
  const app = await serveHTTP(PORT);
  app.use(express.json()).use(router);
  await loadTorrents();
  loadCronJobs();
  await serveHTTPS(app, HTTPS_PORT);
};

main();
