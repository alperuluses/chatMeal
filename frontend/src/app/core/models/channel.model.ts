export interface Channel {
    id?: number;
    name?: string;
    serverId?: number;
    type?: string;  // optional type, default 'voice' olabilir
  }

  export interface CreateChannelResponse {
    message?: string;
    channels?: Channel[];
  }
  