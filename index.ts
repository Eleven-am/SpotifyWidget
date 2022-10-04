import {PondServer} from "pondsocket";
import {Player} from "./view/player";
import path from "path";
import {Login} from "./view/login";
import {userClass} from "./controller/prisma";
import {Spotify} from "./controller/spotify";

const staticPath = path.join(__dirname, './public/index.html');
const server = new PondServer();

server.get('/', (_, res) => {
    res.redirect('/login');
});

server.useStatic(path.join(__dirname, './public'));

const manager = server.usePondLive([
    {
        path: '/widget/:userId',
        Component: Player
    },
    {
        path: '/login',
        Component: Login
    }
], staticPath);

server.get('/spotify/callback', async (req, res) => {
    const {code, state} = req.query;
    const spotify = new Spotify('', userClass);
    const data = await spotify.authorize(code);
    if (data.error)
        res.json({error: data.error});

    else {
        manager.broadcast(state, 'spotifyCallback', data);
        const html = `<script>window.close()</script>`;
        res.html(html);
    }
});

server.get(/(.*?)/, (_, res) => {
    res.redirect('/login');
});

server.listen(3000, () => {
    console.log('Listening on port 3000');
})
