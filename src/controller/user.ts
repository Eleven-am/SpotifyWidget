import SpotifyApi from "spotify-web-api-node";
import {Spotify} from "./spotify";
import {User, PrismaClient} from '@prisma/client';

export class UserClass {
    private readonly prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    public async getUser(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({where: {id}});
    }

    public async updateUser(user: User): Promise<User> {
        return this.prisma.user.update({where: {id: user.id}, data: user});
    }

    protected async saveUser(accessToken: string, refreshToken: string, expiresIn: number): Promise<string> {
        const spotify = new SpotifyApi({
            ...Spotify.spotifyCredentials,
        });

        spotify.setRefreshToken(refreshToken);
        spotify.setAccessToken(accessToken);
        const email = await spotify.getMe().then(response => response.body.email);
        const newUser = await this.prisma.user.upsert({
            where: {email},
            update: {},
            create: {
                email, accessToken, refreshToken,
                validUntil: new Date(Date.now() + expiresIn * 1000),
            }
        });

        return newUser.id;
    }

    public async createUser(accessToken: string, refreshToken: string, expiresIn: number): Promise<{error?: string, user?: string}> {
        if (!accessToken || !refreshToken || !expiresIn)
            return {error: 'Missing parameters'};

        const user = await this.saveUser(accessToken, refreshToken, expiresIn);
        if (user === '')
            return {error: 'Something went wrong'};

        return {user};
    }
}
