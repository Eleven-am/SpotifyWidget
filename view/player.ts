import {LiveFactory, html, PondLiveChannel} from "pondsocket";
import {ClientEvent, Monitor, MonitorMessage} from "../controller/monitor";
import {userClass} from "../controller/prisma";
import {Spotify, SpotifyDevice, SpotifyState, SpotifyTrack} from "../controller/spotify";

const Widget = (ss: Record<string, string>, image?: string) => {
    return html`
        <div class="${ss.widget}">
            <img class="${ss.widgetImg}" src="${image || '/offline.png'}" alt=""/>
            <div class="${ss.widgetSvgHolder}">
                <svg class="${ss.widgetSvg}" xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px"
                     viewBox="0 0 427.652 427.652">
                    <path d="M213.826,0C95.733,0,0,95.733,0,213.826s95.733,213.826,213.826,213.826 s213.826-95.733,213.826-213.826S331.919,0,213.826,0z M306.886,310.32c-2.719,4.652-7.612,7.246-12.638,7.247 c-2.506,0-5.044-0.645-7.364-2c-38.425-22.456-82.815-26.065-113.295-25.138c-33.763,1.027-58.523,7.692-58.769,7.76 c-7.783,2.126-15.826-2.454-17.961-10.236c-2.134-7.781,2.43-15.819,10.209-17.962c1.116-0.307,27.76-7.544,64.811-8.766 c21.824-0.72,42.834,0.801,62.438,4.52c24.83,4.71,47.48,12.978,67.322,24.574C308.612,294.393,310.96,303.349,306.886,310.32z M334.07,253.861c-3.22,5.511-9.016,8.583-14.97,8.584c-2.968,0-5.975-0.763-8.723-2.369c-45.514-26.6-98.097-30.873-134.2-29.776 c-39.994,1.217-69.323,9.112-69.614,9.192c-9.217,2.515-18.746-2.906-21.275-12.124c-2.528-9.218,2.879-18.738,12.093-21.277 c1.322-0.364,32.882-8.937,76.77-10.384c25.853-0.852,50.739,0.949,73.96,5.354c29.412,5.58,56.241,15.373,79.744,29.108 C336.115,234.995,338.897,245.603,334.07,253.861z M350.781,202.526c-3.641,0-7.329-0.936-10.7-2.906 c-108.207-63.238-248.572-25.643-249.977-25.255c-11.313,3.117-23.008-3.527-26.124-14.839 c-3.117-11.312,3.527-23.008,14.839-26.124c1.621-0.447,40.333-10.962,94.166-12.737c31.713-1.044,62.237,1.164,90.72,6.567 c36.077,6.844,68.987,18.856,97.815,35.704c10.13,5.92,13.543,18.931,7.623,29.061C365.193,198.757,358.084,202.526,350.781,202.526 z"/>
                </svg>
            </div>
            <div class="${ss.copyright}">Copyright © 2022 Roy Ossai.</div>
        </div>`
}

type LiveContext = {
    state: MonitorMessage | null,
    channel: string,
}

interface ITrackInfoProps {
    track: SpotifyTrack | null | undefined
    device: SpotifyDevice | null | undefined
}

const TrackInfo = ({device, track}: ITrackInfoProps, ss: Record<string, string>) => {
    return html`
        <div class=${ss.infoDevice}>${device?.name || ''}</div>
        <div class=${ss.infoHolder}>
            <div class=${ss.infoTitle}>${track?.name || 'Unavailable content'}</div>
            <svg class="${ss.infoHolderSvg}" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                <path d="M0 0h48v48H0z" fill="none"/>
                <path d="M38 6H10c-2.21 0-4 1.79-4 4v28c0 2.21 1.79 4 4 4h28c2.21 0 4-1.79 4-4V10c0-2.21-1.79-4-4-4zm-8 12h-8v4h8v4h-8v4h8v4H18V14h12v4z"/>
            </svg>
        </div>

        <div class=${ss.infoHolder}>
            <div class=${ss.infoArtist}>${track?.artists.map(e => e.name).join(', ') || ''}</div>
            <div class=${ss.infoSplitter}>${track ? '—': ''}</div>
            <div class=${ss.infoArtist}>${track?.album?.name || ''}</div>
        </div>
    `
}

interface IButtonsProps {
    state: SpotifyState | undefined;
    device: SpotifyDevice | null | undefined
}

const Buttons = (ss: Record<string, string>, props: IButtonsProps) => {
    return html`
        <div class=${ss.buttonsHolder}>
            <svg class="${ss.buttonsHolderSvg}" viewBox="0 0 20 20" pond-click="restart_play_previous_track">
                <path d="M4 5h3v10H4V5zm12 0v10l-9-5 9-5z"/>
            </svg>

            <svg class="${ss.buttonsHolderSvg}" viewBox="0 0 24 24" pond-click="pause_resume_playback" style="margin: 0 5vw">
                <polygon points="5 3 19 12 5 21 5 3" style="visibility: ${props.state !== 'PLAYING' ? 'visible': 'hidden'}"/>
                <rect x="6" y="4" width="4" height="16" style="visibility: ${props.state === 'PLAYING' ? 'visible': 'hidden'}"/>
                <rect x="14" y="4" width="4" height="16" style="visibility: ${props.state === 'PLAYING' ? 'visible': 'hidden'}"/>
            </svg>

            <svg class="${ss.buttonsHolderSvg}" viewBox="0 0 20 20" style="transform: scaleX(-1)" pond-click="play_next_track">
                <path d="M4 5h3v10H4V5zm12 0v10l-9-5 9-5z" />
            </svg>
        </div>
        `
}

export const ProgressBar = (ss: Record<string, string>, elapsed?: string, remaining?: string) => {
    return html`
        <div class=${ss.progressContainer}>
            <div>${elapsed || '0:00'}</div>
            <div class=${ss.progressBar}>
                <div class=${ss.progressBarFill}>
                </div>
            </div>
            <div>${remaining || '0:00'}</div>
        </div>
        `
}

export const Player = LiveFactory<LiveContext, ClientEvent, MonitorMessage>({
    routes: [],

    async mount(context, socket, router) {
        const userId = context.params.userId;
        if (userId === undefined)
            return router.redirect('/login');

        const user = await userClass.getUser(userId);
        if (!user)
            return router.redirect('/login');

        const state = await new Spotify(userId, userClass).getPlayerState();

        if (!state) {
            router.pageTitle = `Spotify - Not Playing`;
            return socket.assign({state: null, channel: userId});
        }

        router.pageTitle = `${state?.track?.name} - ${state?.track?.artists[0].name}`;
        return socket.assign({
            state: {
                ...state,
                color: '0,0,0'
            },
            channel: userId
        });
    },

    async onRendered(context, socket, router) {
        const token = context.channel;
        if (!token)
            return router.redirect('/login');

        socket.subscribeAll(token);
        const channel = socket.getChannel(token) as PondLiveChannel;

        if (!channel.data.monitor){
            const monitor = new Monitor(token, channel, userClass);
            monitor.monitorClient();
            channel.assign({monitor, users: 0});
            channel.onComplete(data => {
                const monitor = data.monitor as Monitor;
                if (monitor)
                    monitor.stopMonitorClient();
            })

        } else {
            const monitor = channel.data.monitor as Monitor;
            const message = await monitor.broadcast();
            if (message)
                socket.assign({state: message});

            else
                socket.assign({state: null});

            channel.assign({users: channel.data.users + 1});
        }
    },

    async onEvent(event, context, socket, _router) {
        const token = context.channel;
        const channel = socket.getChannel(token) as PondLiveChannel;

        if (!channel.data.monitor)
            return;

        const monitor = channel.data.monitor as Monitor;
        await monitor.handleMessages(event);
    },

    manageStyles(context, css) {
        const state = context.state || {color: ''};
        return css`
          .widget {
            width: 25vw;
            height: 100%;
            position: relative;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            overflow: hidden;
            padding: 3vw;
          }

          .widgetImg {
            width: 100%;
            object-fit: contain;
            object-position: center;
            border-radius: 1vw;
            -webkit-box-shadow: -2px 16px 28px -12px rgba(0,0,0,0.84);
            -moz-box-shadow: -2px 16px 28px -12px rgba(0,0,0,0.84);
            box-shadow: -2px 16px 28px -12px rgba(0,0,0,0.84);
          }

          .widgetSvgHolder {
            position: absolute;
            bottom: 3vw;
            width: 10%;
            background: #181818;
            border-radius: 50%;
            margin: 5px;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .holder {
            height: 100%;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            background: linear-gradient(to right, rgba(${state.color} 0.001), rgba(${state.color} 0.1), rgba(${state.color} 0.02)),
            linear-gradient(to top, rgba(${state.color} 0.002), rgba(${state.color} 0.2), rgba(${state.color} 0.03)),
            linear-gradient(45deg, rgba(${state.color} 0.002), rgba(${state.color} 0.2), rgba(${state.color} 0.03));
          }

          .widgetSvg {
            fill: #1ed760;
            width: 100%;
            height: auto;
            padding: 0;
            margin: 0;
          }

          .copyright {
            position: absolute;
            padding: 0;
            margin: 0;
            font-size: .7vw;
            bottom: 1vw;
            left: 15vw;
            transform: translateX(-50%);
          }
          
          .info {
            width: calc(75vw - 12vw);
            min-height: 24vw;
            position: relative;
            display: flex;
            flex-direction: column;
            overflow: clip;
            padding: 3vw;
            white-space: nowrap;
          }

          .infoArtist {
            font-size: 2vw;
            font-weight: 600;
            overflow: hidden;
          }

          .infoDevice {
            font-weight: 600;
            overflow: hidden;
            display: flex;
            font-size: 1.5vw;
            margin-bottom: .9vw;
            color: rgba(179, 179, 179, 0.7);
            justify-content: space-between;
            align-items: center;
          }

          .infoSplitter {
            padding: 0 1vw;
            font-size: 2vw;
            font-weight: 600;
            overflow: hidden;
          }
          
          .infoHolder {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            margin: .9vw 0;
            max-height: 5.3vw;
            max-width: calc(75vw - 12vw);
            overflow: hidden;
          }

          .infoTitle {
            font-size: 3.5vw;
            font-weight: 600;
            color: white;
            text-shadow: 1px 1px 5px rgba(24, 24, 24, 0.7);
          }

          .infoHolderSvg {
            width: 3.5vw;
            fill: rgb(179, 179, 179);
            margin-left: 1vw;
            padding: 0;
            visibility: ${context.state?.track?.explicit ? 'visible': 'hidden'};
          }

          .buttonsHolder {
            display: flex;
            align-items: center;
            max-height: 5.3vw;
            max-width: calc(75vw - 12vw);
            overflow: hidden;
            justify-content: center;
            margin: 2vw 0;
          }

          .buttonsHolderSvg {
            width: 3.5vw;
            fill: rgb(179, 179, 179);
            padding: 0;
            transition: all .2s ease-in-out;
            filter: drop-shadow(1px 3px 2px rgb(0 0 0 / 0.4));
          }

          .buttonsHolderSvg:hover {
            fill: #1ed760;
            cursor: pointer;
          }

          .progressContainer {
            display: flex;
            justify-content: space-evenly;
            align-items: center;
            margin: .9vw 0;
            max-height: 5.3vw;
            width: 90%;
            bottom: 3vw;
            position: absolute;
            color: white;
            font-size: 1.5vw;
          }

          .progressBar {
            display: flex;
            justify-content: space-evenly;
            align-items: center;
            width: 90%;
            height: 100%;
            position: relative;
            overflow: hidden;
            background: rgba(30, 215, 96, 0.2);
            border-radius: 1vw;
            padding: .2vw 0;
            margin: 0 2%;
          }

          .progressBarFill {
            width: ${(context.state?.details?.progressPercent || 0) * 100}%;
            height: 100%;
            background: #1ed760;
            border-radius: 1vw;
            position: absolute;
            left: 0;
            top: 0;
            transition: width .5s ease-in-out;
          }
        `
    },

    onInfo(info, context, socket, router) {
        socket.assign({state: info});
        if (context.state?.track?.name !== info.track?.name) {
            if (info.track)
                router.pageTitle = `${info.track?.name} - ${info?.track.artists[0].name}`;

            else
                router.pageTitle = "Spotify - Not Playing";
        }
    },

    render(context, classes ) {
        return html`
            <div class="${classes.holder}">
                ${Widget(classes, context.context.state?.track?.album?.images[0].url)}
                <div class="${classes.info}">
                    ${TrackInfo({device: context.context.state?.device, track: context.context.state?.track}, classes)}
                    ${Buttons(classes, {state: context.context.state?.details?.playerState, device: context.context.state?.device})}
                    ${ProgressBar(classes, context.context.state?.details?.elapsed, context.context.state?.details?.remains)}
                </div>
            </div>`
    },

    onUnmount(context, socket) {
        const token = context.channel;
        const channel = socket.getChannel(token) as PondLiveChannel;

        if (!channel?.data.monitor)
            return;

        const monitor = channel.data.monitor as Monitor;
        if (channel.data.users === 1)
            monitor.stopMonitorClient();

        else
            channel.assign({users: channel.data.users - 1});
    }
});
