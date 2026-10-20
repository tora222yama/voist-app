export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  user_type: 'illustrator' | 'voice_actor' | 'both';
  followers_count: number;
  following_count: number;
  created_at: string;
}

export interface Illustration {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
  likes_count: number;
  voice_count: number;
  created_at: string;
  profiles?: Profile;
}

export interface VoicePost {
  id: string;
  illustration_id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  audio_url: string;
  duration: number | null;
  likes_count: number;
  created_at: string;
  profiles?: Profile;
}

export interface Like {
  id: string;
  user_id: string;
  illustration_id: string | null;
  voice_post_id: string | null;
  created_at: string;
}

export type Page = 'feed' | 'profile' | 'upload' | 'user';
