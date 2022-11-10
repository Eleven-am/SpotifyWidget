import {Player} from "./view/player";
import path from "path";
import {Login} from "./view/login";
import {userClass} from "./controller/prisma";
import {Spotify} from "./controller/spotify";
import {PondLive} from "@eleven-am/pondlive";
import express from 'express';
import {userBroadcastChannel} from "./view/channels";

const server = PondLive(express());

server.get('/', (_, res) => {
    res.redirect('/login');
});

server.usePondLive([
    {
        path: '/widget/:userId',
        Component: Player
    },
    {
        path: '/login',
        Component: Login
    }
], {
    staticPath: path.join(__dirname, '../public'),
    secret: 'd72a9ea2-3125-4173-90c6-d58d56689260'
});

server.get('/spotify/callback', async (req, res) => {
    const {code, state} = req.query;
    const spotify = new Spotify('', userClass);
    const data = await spotify.authorize(code as string);
    if (data.error)
        res.json({error: data.error});

    else {
        userBroadcastChannel.broadcast({
            state: state as string,
            user: data.user || null
        })
        const html = `<script>window.close()</script>`;
        res.html(html);
    }
});

server.get('/spotify/:state',(req, res) => {
    const spotify = new Spotify('', userClass);
    const url = spotify.getAuthUrl(req.params.state);
    res.redirect(url);
});

const port: number = Number(process.env.PORT || 3000);

server.listen(port, () => {
    console.log('Listening on port 3000');
})
