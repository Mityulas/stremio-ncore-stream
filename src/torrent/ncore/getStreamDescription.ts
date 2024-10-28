import {Language} from '@ctrl/video-filename-parser';
import {formatBytes} from "./bytes.js";
import {FullTorrent} from "./getTorrents.js";


export const getStreamDescription = async (torrent: FullTorrent, isRecommended: boolean, genre: String[]): Promise<string> => {
	const langEmoji = torrent.languages.map(getLanguageEmoji).join(' ');

	const size = formatBytes(
		Number(torrent.files[torrent.selectedFileIdx]!.length ?? torrent.size),
	);
	const resolution = torrent.resolution ?? torrent.category.toUpperCase();
	return `${isRecommended ? '⭐️ Recommended\n' : ''}${langEmoji} | ${resolution} | ${size}\n${
		torrent.release_name
	}\nSeed:${torrent.seeders}|Leech:${torrent.leechers}\n${genre}	
	`;

};

const getLanguageEmoji = (lang: Language): string => {
	switch (lang) {
		case Language.Hungarian:
			return '🇭🇺';
		case Language.German:
			return '🇩🇪';
		case Language.French:
			return '🇫🇷';
		default:
			return '🇺🇸';
	}
};
