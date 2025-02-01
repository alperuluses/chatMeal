export interface Server {
    id?: string;
    name?: string;
    owner_id?: number;
    created_at?: string;
  }
  
  export interface ServerResponse {
    servers?: Server[];
  }
  