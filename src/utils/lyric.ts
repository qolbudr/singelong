import axios from "axios";
import { Playing } from "../types/playing";

const token = '2005218b74f939209bda92cb633c7380612e14cb7fe92dcd6a780f';
const url = 'https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&namespace=lyrics_synched&subtitle_format=lrc&app_id=web-desktop-app-v1.0'

export const getLyric = async (playing: Playing): Promise<string> => {
    try {
        const param = `&q_artist=${playing.artistName}&q_track=${playing.songTitle}&usertoken=${token}`
        const finalUrl = url + param;
        const response = await axios.get(finalUrl, {
            headers: {
                authority: "apic-desktop.musixmatch.com",
                cookie: "x-mxm-token-guid=",
            }
        });
        const data = response.data;
        return data.message.body.macro_calls['track.subtitles.get'].message.body.subtitle_list[0].subtitle.subtitle_body;
    } catch (e) {
        return '';
    }
}