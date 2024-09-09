import axios from "axios";
import { Playing } from "../types/playing";

export const getLyric = async (data: Playing): Promise<string> => {
    const responseLyrics = await axios.get(`https://lyrics-api.qolbudr.workers.dev/?artist=${data.artistName}&name=${data.songTitle}`)
    const dataLyrics = responseLyrics.data;
    return dataLyrics;
}