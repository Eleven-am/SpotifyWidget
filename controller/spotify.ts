import fetch from 'cross-fetch';
import SpotifyApi from 'spotify-web-api-node';
import {UserClass} from "./user";
import {BaseClass} from "./base";
import {User} from '@prisma/client';
import {PondLiveChannel} from "pondsocket";

interface SpotifyCredentials {
    clientId: string;
    clientSecret: string;
}

interface SpotifyArtist {
    id: string;
    name: string;
    genres: string[];
    spotifyUri: string;
    popularity: number;
}

interface SpotifyAlbum {
    id: string;
    name: string;
    images: { url: string }[];
    spotifyUri: string;
    genres: string[];
    popularity: number;
    releaseDate: string;
    albumType: 'album' | 'single' | 'compilation';
    artists: (SpotifyArtist | null)[];
}

export interface SpotifyTrack {
    id: string;
    name: string;
    spotifyUri: string;
    artists: Omit<SpotifyArtist, 'popularity' | 'genres' | 'spotifyUri'>[];
    popularity?: number;
    album: Omit<SpotifyAlbum, 'releaseDate' | 'popularity' | 'genres' | 'albumType' | 'artists'> | null;
    explicit: boolean;
    durationMs: number;
}

export interface SpotifyDevice {
    id: string | null;
    name: string;
    type: 'Computer' | 'Smartphone' | 'Tablet';
    isActive: boolean;
    isRestricted: boolean;
    volumePercent: number;
}

export type SpotifyState = "PLAYING" | "PAUSED" | "STOPPED" | "ERROR" | 'OFFLINE' | 'LOADING';

export interface SpotifyPlayerState {
    device: SpotifyDevice | null;
    track: SpotifyTrack | null;
    details: {
        timestamp: number;
        elapsed: string;
        remains: string;
        progressPercent: number;
        playerState: SpotifyState;
        progressMs: number | null;
        repeatMode: 'off' | 'track' | 'context' | 'album';
        shuffleMode: boolean;
        isPlaying: boolean;
    }
}

export class Spotify extends BaseClass {
    private readonly spotifyKey: string;
    private token: User | undefined;
    private readonly api: SpotifyApi;
    private readonly userClass: UserClass;
    private readonly channel: PondLiveChannel | undefined;

    constructor(spotifyKey: string, user: UserClass, channel?: PondLiveChannel) {
        super();
        this.spotifyKey = spotifyKey;
        this.userClass = user;
        this.channel = channel;
        this.api = new SpotifyApi({
            ...Spotify.spotifyCredentials,
        });
    }

    public static get spotifyCredentials(): SpotifyCredentials {
        const credentials = {
            clientId: process.env.SPOTIFY_CLIENT_ID || '',
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ''
        }

        if (credentials.clientId === '' || credentials.clientSecret === '')
            throw new Error('No Spotify credentials found');

        return credentials;
    }

    private static millisToMinutesAndSeconds(millis: number): string {
        const seconds = Math.floor(millis / 1000);
        const minutes = Math.floor(seconds / 60);
        const secondsLeft = seconds % 60;
        return minutes + ':' + (secondsLeft < 10 ? '0' : '') + secondsLeft;
    }

    public async getToken(): Promise<User> {
        let token = this.token;
        if (token === undefined) {
            const tempToken = await this.userClass.getUser(this.spotifyKey);
            if (!tempToken)
                throw new Error('Invalid token');

            const validUntil = new Date(tempToken.validUntil);
            token = {...tempToken, validUntil};
        }

        if (token.validUntil.getTime() < Date.now()) {
            const credentials = Spotify.spotifyCredentials;
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(credentials.clientId + ':' + credentials.clientSecret)
                        .toString('base64'),
                },
                body: 'grant_type=refresh_token&refresh_token=' + token.refreshToken,
            });

            const json = await response.json();
            token.validUntil = new Date(Date.now() + (json.expires_in * 1000));
            token.accessToken = json.access_token;
            await this.userClass.updateUser(token);
        }

        this.token = token;
        return this.token;
    }

    public async getPlayerState(): Promise<SpotifyPlayerState | null> {
        return this.executeFunction(async () => {
            const response = await this.api.getMyCurrentPlaybackState();
            const playerState = response.body.item ? response.body.is_playing ? 'PLAYING' : 'PAUSED' : 'STOPPED';

            const state: SpotifyPlayerState = {
                track: response.body.item ? {
                    id: response.body.item.id,
                    name: response.body.item.name,
                    durationMs: response.body.item.duration_ms,
                    spotifyUri: response.body.item.external_urls.spotify,
                    explicit: response.body.item.explicit,
                    album: response.body.item.type === 'track' ? {
                        id: response.body.item.album.id,
                        name: response.body.item.album.name,
                        images: response.body.item.album.images,
                        spotifyUri: response.body.item.album.external_urls.spotify,
                    } : null,
                    artists: response.body.item.type === 'track' ? response.body.item.artists.map(a => ({
                        id: a.id,
                        name: a.name,
                        spotifyUri: a.external_urls.spotify,
                    })) : [],
                } : null,
                device: response.body.device ? {
                    id: response.body.device.id,
                    name: response.body.device.name,
                    type: response.body.device.type as 'Computer' | 'Smartphone' | 'Tablet',
                    isActive: response.body.device.is_active,
                    isRestricted: response.body.device.is_restricted,
                    volumePercent: response.body.device.volume_percent || 0,
                } : null,
                details: {
                    playerState,
                    isPlaying: response.body.is_playing || false,
                    progressMs: response.body.progress_ms || 0,
                    shuffleMode: response.body.shuffle_state || false,
                    repeatMode: response.body.repeat_state || false,
                    timestamp: response.body.timestamp || 0,
                    elapsed: Spotify.millisToMinutesAndSeconds(response.body.progress_ms || 0),
                    remains: Spotify.millisToMinutesAndSeconds((response.body.item?.duration_ms || 0) - (response.body.progress_ms || 0)),
                    progressPercent: (response.body.progress_ms || 0) / (response.body.item?.duration_ms || 0),
                }
            }

            return state;
        });
    }

    public async seek(positionMs: number): Promise<void> {
        return this.executeFunction(async () => {
            await this.api.seek(positionMs);
        }).then(() => {
        });
    }

    public async pause(): Promise<void> {
        return this.executeFunction(async () => {
            await this.api.pause();
        }).then(() => {
        });
    }

    public async resume(): Promise<void> {
        return this.executeFunction(async () => {
            await this.api.play();
        }).then(() => {
        });
    }

    public async playPrevious(): Promise<void> {
        return this.executeFunction(async () => {
            await this.api.skipToPrevious();
        }).then(() => {
        });
    }

    public async playNext(): Promise<void> {
        return this.executeFunction(async () => {
            await this.api.skipToNext();
        }).then(() => {
        });
    }

    public generateAuthorizeUrl(state: string): string {
        const credentials = Spotify.spotifyCredentials;
        const scopes = ['user-read-private', 'user-read-email',
            'user-read-playback-state', 'user-modify-playback-state',
            'user-read-currently-playing', 'playlist-read-private',
            'playlist-modify-public', 'playlist-modify-private',
            'playlist-read-collaborative', 'user-read-recently-played', 'user-top-read',
            'streaming'].join(',');

        const stringifyParams = (params: any) => {
            return Object.keys(params).map(key => key + '=' + encodeURIComponent(params[key])).join('&');
        }

        const params = {
            client_id: credentials.clientId,
            response_type: 'code',
            redirect_uri: 'http://localhost:3000/spotify/callback',
            scope: scopes, state: state,
            auth_type: 'rerequest',
            display: 'popup',
        };

        return 'https://accounts.spotify.com/authorize?' + stringifyParams(params);
    }

    public async authorize(code: string) {
        const credentials = Spotify.spotifyCredentials;
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(credentials.clientId + ':' + credentials.clientSecret)
                    .toString('base64'),
            },
            body: 'grant_type=authorization_code&code=' + code + '&redirect_uri=http://localhost:3000/spotify/callback',
        });

        const json = await response.json();
        const token = {
            accessToken: json.access_token,
            refreshToken: json.refresh_token,
            expiresInSeconds: json.expires_in,
        };

        return await this.userClass.createUser(token.accessToken, token.refreshToken, token.expiresInSeconds);
    }

    protected async getTrack(trackId: string): Promise<SpotifyTrack | null> {
        return this.executeFunction(async () => {
            if (trackId === '')
                return null;

            const response = await this.api.getTrack(trackId);
            const track: SpotifyTrack = {
                id: response.body.id,
                name: response.body.name,
                spotifyUri: response.body.external_urls.spotify,
                popularity: response.body.popularity,
                artists: response.body.artists.map(a => ({
                    id: a.id,
                    name: a.name,
                    spotifyUri: a.external_urls.spotify,
                })),
                album: {
                    id: response.body.album.id,
                    name: response.body.album.name,
                    images: response.body.album.images,
                    spotifyUri: response.body.album.external_urls.spotify,
                },
                durationMs: response.body.duration_ms,
                explicit: response.body.explicit,
            }

            return track;
        });
    }

    protected async getDevice(deviceId: string): Promise<SpotifyDevice | null> {
        return this.executeFunction(async () => {
            const devices = await this.api.getMyDevices();
            const device = devices.body.devices.find(d => d.id === deviceId);
            if (device === undefined)
                return null;

            const deviceInfo: SpotifyDevice = {
                id: device.id,
                name: device.name,
                type: device.type as 'Computer' | 'Smartphone' | 'Tablet',
                isActive: device.is_active,
                isRestricted: device.is_restricted,
                volumePercent: device.volume_percent || 0,
            }

            return deviceInfo;
        });
    }

    private async executeFunction<S>(callback: () => Promise<S>): Promise<S | null> {
        const token = await this.getToken();
        this.api.setAccessToken(token.accessToken);
        try {
            return await callback();
        } catch (e: any) {
            console.error(e);
            this.channel?.broadcast('error', {
                error: e.message
            })
            return null;
        }
    }
}
