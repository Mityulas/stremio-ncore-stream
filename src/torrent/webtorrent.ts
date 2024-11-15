import fs from "fs-extra";
import MemoryStore from "memory-chunk-store";
import os from "os";
import path from "path";
import WebTorrent, { Torrent } from "webtorrent";
import { getReadableDuration } from "../utils/file.js";
import {config} from "../config/config.js";

interface FileInfo {
  name: string;
  path: string;
  size: number;
  url?: string;
}

interface ActiveFileInfo extends FileInfo {
  progress: number;
  downloaded: number;
}

export interface TorrentInfo {
  name: string;
  infoHash: string;
  size: number;
  files: FileInfo[];
}

interface ActiveTorrentInfo extends TorrentInfo {
  progress: number;
  downloaded: number;
  uploaded: number;
  downloadSpeed: number;
  uploadSpeed: number;
  peers: number;
  openStreams: number;
  files: ActiveFileInfo[];
}

// Directory to store downloaded files (default OS temp directory)
const DOWNLOAD_DIR =
    config().download_dir || path.join(os.tmpdir(), "torrent-stream-server");

// Maximum number of connections per torrent (default 50)
const MAX_CONNS_PER_TORRENT = Number(process.env.MAX_CONNS_PER_TORRENT) || 50;

// Max download speed (bytes/s) over all torrents (default 20MB/s)
const DOWNLOAD_SPEED_LIMIT =
  Number(process.env.DOWNLOAD_SPEED_LIMIT) || 20 * 1024 * 1024;

// Max upload speed (bytes/s) over all torrents (default 1MB/s)
const UPLOAD_SPEED_LIMIT =
  Number(process.env.UPLOAD_SPEED_LIMIT) || 1 * 1024 * 1024;

// Time (ms) to seed torrents after all streams are closed (default 1 minute)
const SEED_TIME = Number(process.env.SEED_TIME) || 60 * 1000;

// Timeout (ms) when adding torrents if no metadata is received (default 5 seconds)
const TORRENT_TIMEOUT = Number(process.env.TORRENT_TIMEOUT) || 5 * 1000;

const infoClient = new WebTorrent();
const streamClient = new WebTorrent({
  // @ts-ignore
  downloadLimit: DOWNLOAD_SPEED_LIMIT,
  uploadLimit: UPLOAD_SPEED_LIMIT,
  maxConns: MAX_CONNS_PER_TORRENT,
});

streamClient.on("torrent", (torrent) => {
  console.log(`Added torrent: ${torrent.name}`);
});

streamClient.on("error", (error) => {
  if (typeof error === "string") {
    console.error(`Error: ${error}`);
  } else {
    if (error.message.startsWith("Cannot add duplicate torrent")) return;
    console.error(`Error: ${error.message}`);
  }
});

infoClient.on("error", () => {});

const launchTime = Date.now();

export const getStats = () => ({
  uptime: getReadableDuration(Date.now() - launchTime),
  openStreams: [...openStreams.values()].reduce((a, b) => a + b, 0),
  downloadSpeed: streamClient.downloadSpeed,
  uploadSpeed: streamClient.uploadSpeed,
  activeTorrents: streamClient.torrents.map<ActiveTorrentInfo>((torrent) => ({
    name: torrent.name,
    infoHash: torrent.infoHash,
    size: torrent.length,
    progress: torrent.progress,
    downloaded: torrent.downloaded,
    uploaded: torrent.uploaded,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    peers: torrent.numPeers,
    openStreams: openStreams.get(torrent.infoHash) || 0,
    files: torrent.files.map((file) => ({
      name: file.name,
      path: file.path,
      size: file.length,
      progress: file.progress,
      downloaded: file.downloaded,
    })),
  })),
});

export const getOrAddTorrent = (uri: string, needDestroyTimer: boolean = true) =>
  new Promise<Torrent | undefined>((resolve) => {
    const torrent = streamClient.add(
      uri,
      {
        path: DOWNLOAD_DIR,
        destroyStoreOnDestroy: true,
        // @ts-ignore
        deselect: true,
      },
      (torrent) => {
        clearTimeout(timeout);
        resolve(torrent);
      }
    );

      const timeout = setTimeout(() => {
        if (needDestroyTimer) {
          torrent.destroy();
          resolve(undefined);
          console.log(`Torrent ${torrent.name} - ${torrent.infoHash} destroyed.`);
        }
      }, TORRENT_TIMEOUT);
  });

export const getFile = (torrent: Torrent, path: string) =>
  torrent.files.find((file) => file.path === path);

export const getTorrentInfo = async (uri: string) => {
  const getInfo = (torrent: Torrent): TorrentInfo => ({
    name: torrent.name,
    infoHash: torrent.infoHash,
    size: torrent.length,
    files: torrent.files.map((file) => ({
      name: file.name,
      path: file.path,
      size: file.length,
    })),
  });

  return await new Promise<TorrentInfo | undefined>((resolve) => {
    const torrent = infoClient.add(
      uri,
      { store: MemoryStore, destroyStoreOnDestroy: true },
      (torrent) => {
        clearTimeout(timeout);
        const info = getInfo(torrent);
        console.log(`Fetched info: ${info.name}`);
        torrent.destroy();
        resolve(info);
      }
    );

    const timeout = setTimeout(() => {
      torrent.destroy();
      resolve(undefined);
    }, TORRENT_TIMEOUT);
  });
};

const timeouts = new Map<string, NodeJS.Timeout>();
const openStreams = new Map<string, number>();

export const streamOpened = (hash: string, fileName: string) => {
  console.log(`Stream opened: ${fileName}`);

  const count = openStreams.get(hash) || 0;
  openStreams.set(hash, count + 1);

  const timeout = timeouts.get(hash);

  if (timeout) {
    clearTimeout(timeout);
    timeouts.delete(hash);
  }
};

export const streamClosed = (hash: string, fileName: string) => {
  console.log(`Stream closed: ${fileName}`);

  const count = openStreams.get(hash) || 1;
  openStreams.set(hash, count - 1);

  if (count > 1) return;

  openStreams.delete(hash);

  let timeout = timeouts.get(hash);
  if (timeout) return;

  timeouts.set(hash, timeout);
};


export const deleteTorrent = async (hash: string) => {
  openStreams.delete(hash);
  const torrent = await streamClient.get(hash);
  // @ts-ignore
  torrent?.destroy(undefined, () => {
    console.log(`Removed torrent: ${torrent.name}`);
    timeouts.delete(hash);
  });
  return torrent;
}
