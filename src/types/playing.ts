import { Exception } from "./exception";

export type Playing = {
    id?: string;
    artistName?: string;
    songTitle?: string;
    albumName?: string;
    currentProgress?: number;
    exception?: Exception;
}