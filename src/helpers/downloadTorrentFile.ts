import {config} from "../config/config.js";
import contentDisposition from 'content-disposition';
import ParseTorrent from 'parse-torrent';
import {existsSync, mkdirSync, writeFileSync} from "fs";
import path from "path";

const writeFileWithCreateDir: typeof writeFileSync = (filePath, ...restArgs) => {
    const dirPath = path.dirname(filePath.toString());
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, {recursive: true});
    }
    writeFileSync(filePath, ...restArgs);
};

export const downloadTorrent = async (torrentUrl: string) => {
    const torrentReq = await fetch(torrentUrl);
    const torrentArrayBuffer = await torrentReq.arrayBuffer();
    const parsedTorrent = await ParseTorrent(new Uint8Array(torrentArrayBuffer));

    const torrentFilePath = `${config().download_dir}/${parsedTorrent.infoHash}.torrent`;
    if (!existsSync(torrentFilePath)) {
        console.log('Download Torrent file: ' + torrentFilePath)
        writeFileWithCreateDir(torrentFilePath, Buffer.from(torrentArrayBuffer));
    }
    return torrentFilePath;
};


