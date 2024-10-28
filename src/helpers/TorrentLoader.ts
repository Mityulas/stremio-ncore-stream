import {config} from "../config/config.js";
import {getOrAddTorrent} from "../torrent/webtorrent.js";
import {globSync} from "glob";

export const loadTorrents = async (): Promise<void> => {
    console.log('Looking for torrent files...');
    const savedTorrentFilePaths = globSync(`${config().download_dir}/*.torrent`);
    console.log(`Found ${savedTorrentFilePaths.length} torrent files.`);
    await Promise.allSettled(
        savedTorrentFilePaths.map((filePath) => {
            return getOrAddTorrent(filePath, false)

        }),
    );
    console.log('Torrent files loaded and verified.');
};