# logion-authenticator

This library provides the server-side building blocks for implementing logion's authentication scheme.

In a nutshell, a JSON Web Token (JWT, Standard: [RFC 7519 - JSON Web Tokens](https://jwt.io/)) is issued to a user which proves he is
the owner of a given keypair. This is achieved by:

1. creating a session with a random ID associated with a public key provided by the user,
2. sending back the session data to the user for signature,
3. finally receiving a signature sent by the user and, if the signature can be verified with the public key associated with the session,
   issue a JWT.

Two main components are provided:

- The `SessionManager` which creates and validates sessions,
- The `Authenticator` which creates and verifies JWT tokens.

## Example of usage

```typescript
const tokenConfig: TokenConfig = {
    nodePeerId: PeerId.createFromB58String("12D3KooWBmAwcd4PJNJvfV89HwE48nwkRmAgo8Vy3uQEyNNHBox2"),
    nodeKey: Buffer.from("c12b6d18942f5ee8528c8e2baf4e147b5c5c18710926ea492d09cbd9f6c9f82a", "hex"),
    nodeOwner: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    jwtTimeToLive: Duration.fromObject({ hour: 1 }),
};
const { sessionManager, authenticator } = defaultSetup({ api, tokenConfig });

// ... receive address (i.e. the public key) from the user
const address = "...";
const session = sessionManager.createNewSession(address);

// ... send session data back to the user

// ... receive signature from user
const signature: SessionSignature = {
    ...
};
const signedSession = await sessionManager.signedSessionOrThrow(session, signature);
const token = await authenticator.createToken(signedSession, DateTime.now());

// ... send token back to the user

// ... Later on, verify tokens and check access rules
const authenticatedUser = await authenticator.ensureAuthenticatedUserOrThrow(token.value);
if(authenticatedUser.is("5DPLBrBxniGbGdFe1Lmdpkt6K3aNjhoNPJrSJ51rwcmhH2Tn")) {
    // Let user with keypair 5DPLBrBxniGbGdFe1Lmdpkt6K3aNjhoNPJrSJ51rwcmhH2Tn do something
}
```
