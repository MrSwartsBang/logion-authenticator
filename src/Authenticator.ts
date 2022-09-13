import { DateTime } from "luxon";
import PeerId from "peer-id";
import { KeyObject } from "crypto";
import { SignJWT, decodeJwt, jwtVerify, JWTPayload } from "jose";
import { JWTVerifyResult } from "jose/dist/types/types";

import { AuthenticatorConfig } from "./Config";
import { NodeSigner } from "./NodeSigner";
import { AuthenticatedUser } from "./AuthenticatedUser";
import { SignedSession } from "./Session";

export interface Token {
    readonly value: string;
    readonly expiredOn: DateTime;
}

export class Authenticator {

    async createToken(signedSession: SignedSession, issuedAt: DateTime): Promise<Token> {
        return this._createToken(signedSession.session.address, issuedAt);
    }

    private async _createToken(address: string, issuedAt: DateTime): Promise<Token> {
        const now = Math.floor(issuedAt.toSeconds());
        const expiredOn = now + this.config.jwtTimeToLive.as("seconds");
        const encodedToken = await new SignJWT({})
            .setProtectedHeader({ alg: Authenticator.ALGORITHM })
            .setIssuedAt(now)
            .setExpirationTime(expiredOn)
            .setIssuer(this.config.nodePeerId.toB58String())
            .setSubject(address)
            .sign(this.privateKey);
        return {
            value: encodedToken,
            expiredOn: DateTime.fromSeconds(expiredOn),
        };
    }

    async ensureAuthenticatedUserOrThrow(jwtToken: string): Promise<AuthenticatedUser> {
        const address = await this.validTokenOrThrow(jwtToken);
        return new AuthenticatedUser(
            address,
            this.config.nodeOwner,
            this.config.authorityService,
            this.config.errorFactory
        );
    }

    private async validTokenOrThrow(jwtToken: string): Promise<string> {
        let payload: JWTPayload;
        try {
            payload = decodeJwt(jwtToken)
        } catch (error) {
            throw this.config.errorFactory.unauthorized("" + error)
        }
        const issuer = payload.iss ? PeerId.createFromB58String(payload.iss) : undefined;
        if (!issuer || ! await this.config.authorityService.isLegalOfficerNode(issuer)) {
            throw this.config.errorFactory.unauthorized("Invalid issuer");
        }

        const publicKey = this.signer.buildPublicJsonWebKey(issuer);
        let result: JWTVerifyResult;
        try {
            result = await jwtVerify(jwtToken, publicKey, { algorithms: [ Authenticator.ALGORITHM ] });
        } catch (error) {
            throw this.config.errorFactory.unauthorized("" + error)
        }
        const address = result.payload.sub;
        if (!address) {
            throw this.config.errorFactory.unauthorized("Unable to find issuer in payload");
        }
        return address;
    }

    async refreshToken(jwtToken: string): Promise<Token> {
        const address = await this.validTokenOrThrow(jwtToken);
        return await this._createToken(address, DateTime.now());
    }

    constructor(config: AuthenticatorConfig) {
        this.config = config;
        this.signer = new NodeSigner();
        this.privateKey = this.signer.buildPrivateJsonWebKey(
            config.nodePeerId,
            config.nodeKey,
        );
    }

    static readonly ALGORITHM = "EdDSA";

    private readonly privateKey: KeyObject;
    private readonly config: AuthenticatorConfig;
    private readonly signer: NodeSigner;
}
