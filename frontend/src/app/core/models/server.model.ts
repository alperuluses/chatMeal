export interface Server {
    id?: string;
    name?: string;
    owner_id?: number;
    created_at?: string;
  }
  
  export interface ServerResponse {
    servers?: Server[];
  }
  

  export interface Messages {
    id?: number;
    channel_id?: number;
    user_id?: number;
    content?: string;
    sent_at?: string;
    username?: string;
  }
  
