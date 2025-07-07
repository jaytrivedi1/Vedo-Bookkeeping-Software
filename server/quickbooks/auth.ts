import { Request, Response } from 'express';
import { getQuickBooksConfig, createOAuthClient } from './config';
import { IStorage } from '../storage';

export interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  scope: string;
  realmId: string;
}

export class QuickBooksAuth {
  private oauthClient: any;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    const config = getQuickBooksConfig();
    this.oauthClient = createOAuthClient(config);
  }

  /**
   * Generate authorization URL for QuickBooks OAuth
   */
  getAuthorizationUrl(state?: string): string {
    const authUri = this.oauthClient.authorizeUri({
      scope: this.oauthClient.scopes.Accounting,
      state: state || 'secure-random-state'
    });
    
    return authUri;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(req: Request): Promise<QuickBooksTokens> {
    try {
      const authResponse = await this.oauthClient.createToken(req.url);
      const tokens = authResponse.getToken();
      
      // Store tokens in your storage system
      await this.storeTokens(tokens);
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        x_refresh_token_expires_in: tokens.x_refresh_token_expires_in,
        scope: tokens.scope,
        realmId: tokens.realmId
      };
    } catch (error) {
      console.error('QuickBooks OAuth error:', error);
      throw new Error('Failed to authenticate with QuickBooks');
    }
  }

  /**
   * Check if access token is valid
   */
  isTokenValid(): boolean {
    return this.oauthClient.isAccessTokenValid();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(): Promise<QuickBooksTokens> {
    try {
      const authResponse = await this.oauthClient.refresh();
      const tokens = authResponse.getToken();
      
      // Update stored tokens
      await this.storeTokens(tokens);
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        x_refresh_token_expires_in: tokens.x_refresh_token_expires_in,
        scope: tokens.scope,
        realmId: tokens.realmId
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh QuickBooks tokens');
    }
  }

  /**
   * Store tokens securely (implement according to your storage system)
   */
  private async storeTokens(tokens: any): Promise<void> {
    // Store tokens in your database/storage
    // This is a placeholder - implement based on your storage system
    console.log('Storing QuickBooks tokens:', {
      access_token: tokens.access_token ? '[REDACTED]' : 'null',
      refresh_token: tokens.refresh_token ? '[REDACTED]' : 'null',
      realmId: tokens.realmId,
      expires_in: tokens.expires_in
    });
  }

  /**
   * Get stored tokens
   */
  async getStoredTokens(): Promise<QuickBooksTokens | null> {
    // Implement token retrieval from your storage system
    // This is a placeholder
    return null;
  }

  /**
   * Revoke tokens and disconnect from QuickBooks
   */
  async revokeTokens(): Promise<void> {
    try {
      await this.oauthClient.revoke();
      // Clear stored tokens
      console.log('QuickBooks tokens revoked successfully');
    } catch (error) {
      console.error('Error revoking QuickBooks tokens:', error);
      throw new Error('Failed to revoke QuickBooks tokens');
    }
  }
}