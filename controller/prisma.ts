import {PrismaClient} from "@prisma/client";
import {UserClass} from "./user";

declare global {
    var prisma: PrismaClient;
    var userClass: UserClass;
}

const prisma = global.prisma || new PrismaClient();
const userClass = global.userClass || new UserClass(prisma);

export {prisma, userClass};
