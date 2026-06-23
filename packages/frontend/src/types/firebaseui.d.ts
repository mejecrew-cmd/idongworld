declare module 'firebaseui' {
  import type firebase from 'firebase/compat/app'

  export namespace auth {
    interface AuthResult {
      user?: firebase.User | null
    }

    interface Config {
      signInOptions?: Array<string | { provider: string }>
      signInFlow?: 'popup' | 'redirect'
      callbacks?: {
        signInSuccessWithAuthResult?: (
          authResult: AuthResult,
          redirectUrl?: string,
        ) => boolean | Promise<boolean>
        uiShown?: () => void
      }
      tosUrl?: string
      privacyPolicyUrl?: string
    }

    class AuthUI {
      constructor(auth: firebase.auth.Auth)
      start(element: string | Element, config: Config): void
      reset(): void

      static getInstance(): AuthUI | null
    }
  }
}
