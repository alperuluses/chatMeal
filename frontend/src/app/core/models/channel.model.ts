export interface Channel {
    id?: string;
    name?: string;
    serverId?: number;
    type?: string;  // optional type, default 'voice' olabilir
    users?: string[];  // Kanalda bulunan kullanıcılar
  }

  export interface CreateChannelResponse {
    message?: string;
    channels?: Channel[];
  }

  export interface MessageResponse {
    id: number;
    channel_id: number;
    user_id: number;
    content: string;
    sent_at: string;
    username: string;
  }
  
  