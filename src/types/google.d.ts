// Google Identity Services (GIS) TypeScript definitions

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken(overrideConfig?: { prompt?: string }): void;
      }

      interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
        error?: string;
        error_description?: string;
        error_uri?: string;
      }

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type: string; message: string }) => void;
        prompt?: string;
        hint?: string;
        hosted_domain?: string;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
      function revoke(accessToken: string, callback?: () => void): void;
      function hasGrantedAllScopes(
        tokenResponse: TokenResponse,
        ...scopes: string[]
      ): boolean;
    }

    namespace id {
      interface GsiButtonConfiguration {
        type?: 'standard' | 'icon';
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        logo_alignment?: 'left' | 'center';
        width?: string | number;
        locale?: string;
      }

      interface IdConfiguration {
        client_id: string;
        callback?: (response: CredentialResponse) => void;
        auto_select?: boolean;
        login_uri?: string;
        native_callback?: (response: CredentialResponse) => void;
        cancel_on_tap_outside?: boolean;
        prompt_parent_id?: string;
        nonce?: string;
        context?: 'signin' | 'signup' | 'use';
        state_cookie_domain?: string;
        ux_mode?: 'popup' | 'redirect';
        allowed_parent_origin?: string | string[];
        intermediate_iframe_close_callback?: () => void;
        itp_support?: boolean;
      }

      interface CredentialResponse {
        credential: string;
        select_by:
          | 'auto'
          | 'user'
          | 'user_1tap'
          | 'user_2tap'
          | 'btn'
          | 'btn_confirm'
          | 'btn_add_session'
          | 'btn_confirm_add_session';
        clientId: string;
      }

      function initialize(config: IdConfiguration): void;
      function prompt(
        momentListener?: (notification: PromptMomentNotification) => void
      ): void;
      function renderButton(
        parent: HTMLElement,
        options: GsiButtonConfiguration
      ): void;
      function disableAutoSelect(): void;
      function storeCredential(
        credential: { id: string; password: string },
        callback?: () => void
      ): void;
      function cancel(): void;
      function revoke(hint: string, callback?: (response: RevocationResponse) => void): void;

      interface PromptMomentNotification {
        isDisplayMoment(): boolean;
        isDisplayed(): boolean;
        isNotDisplayed(): boolean;
        getNotDisplayedReason():
          | 'browser_not_supported'
          | 'invalid_client'
          | 'missing_client_id'
          | 'opt_out_or_no_session'
          | 'secure_http_required'
          | 'suppressed_by_user'
          | 'unregistered_origin'
          | 'unknown_reason';
        isSkippedMoment(): boolean;
        getSkippedReason():
          | 'auto_cancel'
          | 'user_cancel'
          | 'tap_outside'
          | 'issuing_failed';
        isDismissedMoment(): boolean;
        getDismissedReason():
          | 'credential_returned'
          | 'cancel_called'
          | 'flow_restarted';
        getMomentType(): 'display' | 'skipped' | 'dismissed';
      }

      interface RevocationResponse {
        successful: boolean;
        error?: string;
      }
    }
  }
}

// Extend Window interface
interface Window {
  google?: typeof google;
}
