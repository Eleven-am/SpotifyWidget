import {Spotify, SpotifyPlayerState, SpotifyState} from "./spotify";
import {BaseClass} from "./base";
import {PondLiveChannel} from "pondsocket";
import {UserClass} from "./user";
import { getAverageColor } from 'fast-average-color-node';

export interface MonitorMessage extends Required<SpotifyPlayerState> {
    color: string;
}

export type ClientEvent =
    |   {type: 'pause_resume_playback'}
    |   {type: 'restart_play_previous_track'}
    |   {type: 'play_next_track'}
    |   {type: 'seek_to', position: number}

export class Monitor extends BaseClass {
    public monitorState: SpotifyState = 'OFFLINE';
    private readonly _channel: PondLiveChannel;
    private interval: NodeJS.Timeout | undefined;
    private _lastMessage: MonitorMessage | null;
    private _color: string = '';
    private readonly _spotify: Spotify;
    private _progressMs: number = 0;

    constructor(topic: string, channel: PondLiveChannel, user: UserClass) {
        super();
        this._channel = channel;
        this._spotify = new Spotify(topic, user, channel);
        this._lastMessage = null;
        return this;
    }

    public monitorClient() {
        this.monitorState = 'LOADING';
        this.interval = setInterval(async () => {
            const track = await this._spotify.getPlayerState();
            if (track)
                await this.syncPlayerState(track);
        }, 1000);
    }

    public stopMonitorClient() {
        clearInterval(this.interval as NodeJS.Timeout);
        this.interval = undefined;
        this.monitorState = 'OFFLINE';
    }

    public async handleMessages(message: ClientEvent) {
        switch (message.type) {
            case 'pause_resume_playback':
                if (this._lastMessage?.details.playerState === 'PLAYING')
                    await this._spotify.pause();
                else
                    await this._spotify.resume();
                break;
            case 'restart_play_previous_track':
                if (this._lastMessage?.track)
                    if (this._progressMs > 5000)
                        await this._spotify.seek(0);
                    else
                        await this._spotify.playPrevious();
                break;
            case 'play_next_track':
                await this._spotify.playNext();
                break;
            case 'seek_to':
                await this._spotify.seek(message.position || 0);
                break;
            default:
                console.log('Unknown message', message);
                break;
        }
    }

    public async broadcast() {
        if (!this._lastMessage) {
            const track = await this._spotify.getPlayerState();
            if (track)
                await this.syncPlayerState(track);
            return;
        }

        this.sendMessage('sync_track', this._lastMessage);
        return this._lastMessage;
    }

    private async syncPlayerState(track: SpotifyPlayerState) {
        let color = this._color;
        if (!this.isStateInSync(track)) {
            if (track.track) {
                const data = await getAverageColor(track.track.album?.images[0].url || '');
                data.value.pop();

                color = `${data.value.join(',')},`;
            } else
                color = '0,0,0';

            this._color = color;
            this._lastMessage = {
                ...track,
                color
            }
        }

        this.sendMessage('sync_track', {
            ...track,
            color
        });
    }

    private isStateInSync(state: SpotifyPlayerState): boolean {
        let valid = true;
        switch (true) {
            case state.details.playerState !== this.monitorState:
            case state.track?.id !== this._lastMessage?.track?.id:
            case state.device?.id !== this._lastMessage?.device?.id:
                valid = false;
                break;
        }

        this.monitorState = state.details.playerState;
        return valid;
    }

    private sendMessage(event: string, message: MonitorMessage) {
        this._channel.broadcast(event, message);
        this._progressMs = message.details.progressMs || 0;
    }
}
