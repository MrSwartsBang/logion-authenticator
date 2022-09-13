import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";

import { SessionManagerConfig } from "./Config";
import { SignatureType } from "./Signature";

export interface Session {
    readonly id: string;
    readonly address: string;
    readonly createdOn: DateTime;
}

export interface SessionSignature {
    readonly signature: string;
    readonly type: SignatureType;
    readonly signedOn: DateTime;
}

export interface SignedSession {
    session: Session;
    signature: SessionSignature;
}

export class SessionManager {

    createNewSession(address: string): Session {
        const id = uuid();
        const createdOn = DateTime.now();
        return {
            id,
            address,
            createdOn
        };
    }

    async signedSessionOrThrow(session: Session, signature: SessionSignature): Promise<SignedSession> {
        const signatureService = this.config.signatureServices[signature.type];
        if (!await signatureService.verify({
            signature: signature.signature,
            address: session.address,
            resource: "authentication",
            operation: "login",
            timestamp: this.normalize(signature.signedOn),
            attributes: [ session.id ]
        })) {
            throw this.config.errorFactory.unauthorized("Invalid signature");
        } else {
            return {
                session,
                signature
            };
        }
    }

    private normalize(dateTime: DateTime): string {
        const signedOn = dateTime.toISO();
        if(signedOn.endsWith('Z')) {
            return signedOn.substring(0, signedOn.length - 1);
        } else {
            return signedOn;
        }
    }

    constructor(config: SessionManagerConfig) {
        this.config = config;
    }

    private config: SessionManagerConfig;
}
