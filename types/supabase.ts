export type Database = {
  public: {
    Tables: {
      favorites: {
        Row: {
          id: string | null
          user_id: string | null
          content: string | null
          created_at: string | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          content: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          content?: string | null
          created_at?: string | null
        }
      }
    }
  }
}
