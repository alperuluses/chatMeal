import { MediaConnection } from "peerjs";

export interface Peers {
    [id: string]: MediaConnection
}
