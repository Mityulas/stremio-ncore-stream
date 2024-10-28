import {schedule} from 'node-cron';
import {config} from "../config/config.js";
import {deleteTorrent} from "../torrent/webtorrent.js";
import {JSDOM} from 'jsdom';
import {login} from "../torrent/ncore/login.js";
import {rm} from "fs/promises";
import {downloadAndParseTorrent} from "../torrent/ncore/getTorrents.js";

export const loadCronJobs = () => {
    if (config().ncore.delete_torrents_after_hitnrun.enabled) {
        schedule(config().ncore.delete_torrents_after_hitnrun.cron, deleteUnnecessaryTorrents);
    }
};

export const deleteUnnecessaryTorrents = async () => {
        console.log('Running cron job for deleting torrents after hitnrun...');
        const deletableInfoHashes = await findDeletableInfoHashes();
        console.log(`Found ${deletableInfoHashes.length} deletable torrents.`);
        deletableInfoHashes.forEach(async (infoHash) => {
                let torrent = await deleteTorrent(infoHash);
                if (torrent) {
                    const torrentFilePath = `${config().download_dir}/${torrent.infoHash}.torrent`;
                    const torrentContentFilePath = `${config().download_dir}/${torrent.name}`;
                    await rm(torrentFilePath);
                    await rm(torrentContentFilePath, { recursive: true });
                }
            });
    };

const findDeletableInfoHashes = async (): Promise<string[]> => {
    const cookie = await login();
    const request = await fetch(`${config().ncore.url}/hitnrun.php?showall=true`, {
        headers: {cookie},
    });
    const html = await request.text();
    const {document} = new JSDOM(html).window;
    const rows = Array.from(document.querySelectorAll('.hnr_all, .hnr_all2'));
    const deletableRows = rows.filter(
        (row) => row.querySelector('.hnr_ttimespent')?.textContent === '-',
    );
    const deletableInfoHashPromises: Promise<string>[] = deletableRows.map(async (row) => {
        const detailsUrl = row.querySelector('.hnr_tname a')?.getAttribute('href') ?? '';
        const searchParams = new URLSearchParams(detailsUrl.split('?')[1] ?? '');
        const ncoreId = searchParams.get('id') ?? '';
        const downloadUrl = await getDownloadUrlFromNcoreId(ncoreId);
        const {infoHash} = await downloadAndParseTorrent(downloadUrl);
        return infoHash;
    });
    const deletableInfoHashes = (await Promise.allSettled(deletableInfoHashPromises))
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map((result) => result.value);
    return deletableInfoHashes;
};

const getDownloadUrlFromNcoreId = async (ncoreId: string) => {
    const cookies = await login();
    const response = await fetch(
        `${config().ncore.url}/torrents.php?action=details&id=${ncoreId}`,
        {
            headers: {
                cookie: cookies,
            },
        },
    );
    const html = await response.text();
    const { document } = new JSDOM(html).window;
    const downloadLink = `${config().ncore.url}/${document
        .querySelector('.download > a')
        ?.getAttribute('href')}`;
    return downloadLink;
};

