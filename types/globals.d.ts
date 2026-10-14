export {};

declare global {
  // Custom claims added in Clerk → Sessions → Customize session token.
  // The org name rides on the token so nothing has to ask Clerk for it.
  interface CustomJwtSessionClaims {
    org_name?: string;
  }
}
