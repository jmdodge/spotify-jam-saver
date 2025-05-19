export interface TokenData {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}
