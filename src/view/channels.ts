import {BroadcastChannel} from "@eleven-am/pondlive";
import {Monitor, MonitorChannel} from "../controller/monitor";

interface UserData {
    user: string | null;
    state: string | null;
}

export const userBroadcastChannel = new BroadcastChannel<UserData>({
    user: null,
    state: null
})

export const monitorChannel = new BroadcastChannel<MonitorChannel, Record<string, {monitor: Monitor, users: number}>>({})


