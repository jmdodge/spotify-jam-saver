export interface UserProfile {
  country: string;
  display_name: string;
  email: string;
  explicit_content: {
    filter_enabled: boolean;
    filter_locked: boolean;
  };
  external_urls: { spotify: string };
  followers: { href: string; total: number };
  href: string;
  id: string;
  images: UserProfileImage[];
  product: string;
  type: string;
  uri: string;
}

export interface UserProfileImage {
  url: string;
  height: number;
  width: number;
}
