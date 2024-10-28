import {config} from "../../config/config.js";
import {FullTorrent} from "./getTorrents.js";
import {Stream} from "stremio-addon-sdk";
import {getStreamDescription} from "./getStreamDescription.js";


export const convertTorrentsToStreams = async (torrents: FullTorrent[], genre: string[], streamEndpoint): Promise<Stream[]> => {

	// Sort the torrents by file size (ascending)
	torrents.sort((a, z) => {
		return a.files[a.selectedFileIdx]!.length - z.files[z.selectedFileIdx]!.length;
	});
	const orderedTorrents = rateList(torrents, [
		// If the torrent has the user's first preferred language, it gets +3 rating point
		({ languages }) => (languages.includes(config().users[0].preferences.first_preferred_lang) ? 3 : 0),
		// If the torrent is the same resolution as the user's preference, it gets +2 rating point
		({ resolution }) => (config().users[0].preferences.preferred_resolutions.includes(resolution) ? 2 : 0),
		// If the torrent doesn't have the first preferred language, but has the
		// second preferred language, it gets +2 rating point
		({ languages }) =>
			!languages.includes(config().users[0].preferences.first_preferred_lang) &&
			config().users[0].preferences.second_preferred_lang &&
			languages.includes(config().users[0].preferences.second_preferred_lang)
				? 2
				: 0,
	]);

	const streams: Stream[] =  await Promise.all(orderedTorrents.map(async (torrent, i) => {
		const isRecommended = i === 0;
		return {
			url:  [
        streamEndpoint,
        encodeURIComponent(torrent.download_url),
        encodeURIComponent(torrent.files[torrent.selectedFileIdx]!.path)
      ].join("/"),
			title: await getStreamDescription(torrent, isRecommended, genre),
			behaviorHints: {
				notWebReady: true,
			},
		};
	}));
	return streams;
};

export const rateList = <T>(
	array: T[],
	rateFns: ((item: T, index: number) => number)[],
	topN: number = array.length,
): T[] => {
	const rates = array.map((item, index) => {
		return {
			item,
			rating: rateFns.reduce((acc, rateFn) => acc + rateFn(item, index), 0),
		};
	});
	rates.sort((a, z) => z.rating - a.rating);
	return rates.map(({ item }) => item).slice(0, topN);
};
