import { Exception } from "./exception";

export type Auth = {
    accessToken?: string;
    expiredIn?: number;
    refreshToken?: string;
    exception?: Exception;
}