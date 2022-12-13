import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";

import { SessionManagerConfig } from "./Config.js";
import { SignatureType } from "./Signature.js";

export interface Session {
    readonly id: string;
    readonly addresses: string[];
    readonly createdOn: DateTime;
}

export interface SessionSignature {
    readonly signature: string;
    readonly type: SignatureType;
    readonly signedOn: string;
}

export interface SignedSession {
    session: Session;
    signatures: Record<string, SessionSignature>;
}

export class SessionManager {

    createNewSession(addresses: string[]): Session {
        const id = uuid();
        const createdOn = DateTime.now();
        return {
            id,
            addresses,
            createdOn
        };
    }

    async signedSessionOrThrow(session: Session, signatures: Record<string, SessionSignature>): Promise<SignedSession> {
        for(const address of Object.keys(signatures)) {
            const signature = signatures[address];
            const signatureService = this.config.signatureServices[signature.type];
            if (!await signatureService.verify({
                address,
                signature: signature.signature,
                resource: "authentication",
                operation: "login",
                timestamp: signature.signedOn,
                attributes: [ session.id ]
            })) {
                throw this.config.errorFactory.unauthorized("Invalid signature");
            }
        }
        return {
            session,
            signatures
        };
    }

    constructor(config: SessionManagerConfig) {
        this.config = config;
    }

    private config: SessionManagerConfig;
}
