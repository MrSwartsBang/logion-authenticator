import { LogionNodeApi } from "@logion/node-api";
import { Duration } from "luxon";
import PeerId from "peer-id";
import { Authenticator } from "./Authenticator";
import { PolkadotAuthorityService } from "./Authority";
import { SessionManager } from "./Session";
import { CrossmintSignatureService, EthereumSignatureService, PolkadotSignatureService, SignatureService, SignatureType } from "./Signature";

export interface TokenConfig {
    readonly nodeOwner: string;
    readonly nodePeerId: PeerId;
    readonly nodeKey: Buffer;
    readonly jwtTimeToLive: Duration;
}

export interface AuthenticatorConfig extends TokenConfig {
    readonly errorFactory: ErrorFactory;
    readonly authorityService: AuthorityService;
}

export interface ErrorFactory {
    unauthorized: (message: string) => Error;
}

export interface AuthorityService {
    isLegalOfficerNode(peerId: PeerId): Promise<boolean>;
    isLegalOfficer(address: string): Promise<boolean>;
    isLegalOfficerOnNode(address: string): Promise<boolean>;
}

export function defaultErrorFactory(): ErrorFactory {
    return {
        unauthorized: (message: string) => new Error(message),
    };
}

export function defaultAuthorityService(api: LogionNodeApi, nodeId: PeerId): AuthorityService {
    return new PolkadotAuthorityService(api, nodeId);
}

export interface SessionManagerConfig {
    signatureServices: Record<SignatureType, SignatureService>;
    errorFactory: ErrorFactory;
}

export function defaultSignatureServices(): Record<SignatureType, SignatureService> {
    return {
        ETHEREUM: new EthereumSignatureService(),
        POLKADOT: new PolkadotSignatureService(),
        CROSSMINT_ETHEREUM: new CrossmintSignatureService(),
    };
}

export function defaultSetup(args: {
    api: LogionNodeApi,
    tokenConfig: TokenConfig,
    errorFactory?: ErrorFactory,
}): AuthenticationSystem {
    const { api, tokenConfig, errorFactory } = args;

    const sessionManager = new SessionManager({
        errorFactory: defaultErrorFactory(),
        signatureServices: defaultSignatureServices(),
    });

    const authorityService = defaultAuthorityService(api, tokenConfig.nodePeerId);
    const authenticator = new Authenticator({
        ...tokenConfig,
        authorityService,
        errorFactory: errorFactory ? errorFactory : defaultErrorFactory(),
    });

    return {
        sessionManager,
        authenticator,
        authorityService,
    }
}

export interface AuthenticationSystem {
    readonly sessionManager: SessionManager;
    readonly authenticator: Authenticator;
    readonly authorityService: AuthorityService;
}
