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
], {
    index: staticPath,
    secret: 'd72a9ea2-3125-4173-90c6-d58d56689260'
});

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

server.get('/spotify/:state',(req, res) => {
    const spotify = new Spotify('', userClass);
    const url = spotify.getAuthUrl(req.params.state);
    res.redirect(url);
});


server.get(/(.*?)/, (_, res) => {
    res.redirect('/login');
});

const port: number = Number(process.env.PORT || 3000);

server.listen(port, () => {
    console.log('Listening on port 3000');
})
