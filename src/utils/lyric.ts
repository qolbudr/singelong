import axios from "axios";
import { Playing } from "../types/playing";
import { Lyric } from "../types/lyric";

const msxmatchToken = '2005218b74f939209bda92cb633c7380612e14cb7fe92dcd6a780f';
const msxmatchUrl = 'https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&namespace=lyrics_synched&subtitle_format=lrc&app_id=web-desktop-app-v1.0'

export const getLyric = async (playing: Playing): Promise<Lyric> => {
    try {
        // Fetch Netease
        const chinese = await fetchNetease(playing);
        if (!chinese.exception) {
            console.log("LYRICS FROM NETEASE");
            return chinese;
        }

        // Fetch MusixMatch
        const msxmatchParam = `&q_artist=${playing.artistName}&q_track=${playing.songTitle}&usertoken=${msxmatchToken}`
        const finalUrl = msxmatchUrl + msxmatchParam;
        const response = await axios.get(finalUrl, {
            headers: {
                authority: "apic-desktop.musixmatch.com",
                cookie: "x-mxm-token-guid=",
            }
        });

        const data = response.data;
        const subtitleList = data.message.body.macro_calls['track.subtitles.get'].message.body.subtitle_list
        if (subtitleList.length > 0) {
            if (subtitleList[0].subtitle.subtitle_body) {
                console.log("LYRICS FROM MUSIXMATCH");
                return { lyric: subtitleList[0].subtitle.subtitle_body }
            }
        }


        // Fetch Own API
        const own = await axios.get(`https://lyrics-api.qolbudr.workers.dev/?artist=${playing.artistName}&name=${playing.songTitle}`)
        const ownData = own.data;
        if (ownData != "Not found") {
            console.log("LYRICS FROM OWN API");
            return { lyric: ownData }
        }


        throw 'Cannot get lyric for playing song';
    } catch (e) {
        return { exception: { code: 404, message: 'Cannot get lyric for playing song' } };
    }
}

const fetchNetease = async (playing: Playing): Promise<Lyric> => {
    const searchURL = "https://music.xianqiao.wang/neteaseapiv2/search?limit=10&type=1&keywords=";
    const lyricURL = "https://music.xianqiao.wang/neteaseapiv2/lyric?id=";

    const requestHeader = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0",
    };

    const cleanTitle = LyricUtils.removeExtraInfo(LyricUtils.normalize(playing.songTitle!));
    const finalURL = searchURL + encodeURIComponent(`${cleanTitle} ${playing.artistName}`);

    const searchResults = await axios.get(finalURL, { headers: requestHeader });
    const items = searchResults.data.result.songs;

    if (!items || !items.length) {
        return { exception: { code: 404, message: "Cannot find track" } };
    }

    const album = LyricUtils.capitalize(playing.albumName!);
    const itemId = items.findIndex((val: any) => LyricUtils.capitalize(val.album.name) === album);
    if (itemId === -1) return { exception: { code: 404, message: "Cannot find track" } };

    const meta = await axios.get(lyricURL + items[itemId].id, { headers: requestHeader });
    let lyricStr = meta.data.lrc;

    if (!lyricStr || !lyricStr.lyric) {
        return { exception: { code: 404, message: "No lyrics" } };
    }

    lyricStr = lyricStr.lyric;

    const otherInfoKeys = [
        "\\s?作?\\s*词|\\s?作?\\s*曲|\\s?编\\s*曲?|\\s?监\\s*制?",
        ".*编写|.*和音|.*和声|.*合声|.*提琴|.*录|.*工程|.*工作室|.*设计|.*剪辑|.*制作|.*发行|.*出品|.*后期|.*混音|.*缩混",
        "原唱|翻唱|题字|文案|海报|古筝|二胡|钢琴|吉他|贝斯|笛子|鼓|弦乐",
        "lrc|publish|vocal|guitar|program|produce|write|mix",
    ];
    const otherInfoRegexp = new RegExp(`^(${otherInfoKeys.join("|")}).*(:|：)`, "i");

    const lines = lyricStr.split(/\r?\n/).map((line: string) => line.trim());
    let noLyrics = false;
    const lyrics = lines
        .flatMap((line: string) => {
            // ["[ar:Beyond]"]
            // ["[03:10]"]
            // ["[03:10]", "永远高唱我歌"]
            // ["永远高唱我歌"]
            // ["[03:10]", "[03:10]", "永远高唱我歌"]
            const matchResult = line.match(/(\[.*?\])|([^\[\]]+)/g) || [line];
            if (!matchResult.length || matchResult.length === 1) {
                return;
            }
            const textIndex = matchResult.findIndex((slice) => !slice.endsWith("]"));
            let text = "";
            if (textIndex > -1) {
                text = matchResult.splice(textIndex, 1)[0];
                text = LyricUtils.capitalize(LyricUtils.normalize(text, false));
            }
            if (text === "纯音乐, 请欣赏") noLyrics = true;
            return matchResult.map((slice) => {
                const matchResult = slice.match(/[^\[\]]+/g);
                const [key, value] = matchResult![0].split(":") || [];
                const [min, sec] = [Number.parseFloat(key), Number.parseFloat(value)];
                if (!Number.isNaN(min) && !Number.isNaN(sec) && !otherInfoRegexp.test(text)) {
                    const arrayValue = value.split('.');
                    const milisecond = arrayValue[1].substring(0, 2);
                    return `[${key}:${arrayValue[0]}.${milisecond}]${text}`;
                }
                return;
            });
        })
        .sort((a: any, b: any) => {
            if (a.startTime === null) {
                return 0;
            }
            if (b.startTime === null) {
                return 1;
            }
            return a.startTime - b.startTime;
        })
        .filter(Boolean);

    if (noLyrics) {
        return { exception: { code: 404, message: "No lyrics" } };

    }
    if (!lyrics.length) {
        return { exception: { code: 404, message: "No synced lyrics" } };
    }

    return { lyric: lyrics.join("\n") };
}

const LyricUtils = {
    normalize(s: string, emptySymbol = true) {
        const result = s
            .replace(/（/g, "(")
            .replace(/）/g, ")")
            .replace(/【/g, "[")
            .replace(/】/g, "]")
            .replace(/。/g, ". ")
            .replace(/；/g, "; ")
            .replace(/：/g, ": ")
            .replace(/？/g, "? ")
            .replace(/！/g, "! ")
            .replace(/、|，/g, ", ")
            .replace(/‘|’|′|＇/g, "'")
            .replace(/“|”/g, '"')
            .replace(/〜/g, "~")
            .replace(/·|・/g, "•");
        if (emptySymbol) {
            result.replace(/-/g, " ").replace(/\//g, " ");
        }
        return result.replace(/\s+/g, " ").trim();
    },

    removeExtraInfo(s: string) {
        return (
            s
                .replace(/-\s+(feat|with|prod).*/i, "")
                .replace(/(\(|\[)(feat|with|prod)\.?\s+.*(\)|\])$/i, "")
                .replace(/\s-\s.*/, "")
                .trim() || s
        );
    },

    capitalize(s: string) {
        return s.replace(/^(\w)/, ($1) => $1.toUpperCase());
    },
};