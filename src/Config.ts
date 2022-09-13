import { Duration } from "luxon";
import PeerId from "peer-id";

export interface AuthenticatorConfig {
    readonly nodeOwner: string;
    readonly nodePeerId: PeerId;
    readonly nodeKey: Buffer;
    readonly jwtTimeToLive: Duration;
    readonly errorFactory: ErrorFactory;
    readonly authorityService: AuthorityService;
}

export interface ErrorFactory {
    unauthorized: (message: string) => Error;
}

export interface AuthorityService {
    isLegalOfficerNode(peerId: PeerId): Promise<boolean>;
    isLegalOfficer(address: string): Promise<boolean>;
}

export function defaultErrorFactory(): ErrorFactory {
    return {
        unauthorized: (message: string) => new Error(message),
    };
}
