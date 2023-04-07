import { AuthorityService, ErrorFactory } from "./Config.js";
import { AccountType } from "@logion/node-api";

export type AddressType = AccountType;

export interface Address {
    readonly type: AddressType;
    readonly address: string;
}

export class AuthenticatedUser implements Address {

    constructor(
        address: Address,
        nodeOwner: string,
        authorityService: AuthorityService,
        errorFactory: ErrorFactory,
    ) {
        this.type = address.type;
        this.address = address.address;
        this.nodeOwner = nodeOwner;
        this.authorityService = authorityService;
        this.errorFactory = errorFactory;
    }

    isPolkadot(): boolean {
        return this.type === "Polkadot";
    }

    isNodeOwner(): boolean {
        return this.isPolkadot() && this.nodeOwner === this.address;
    }

    async isLegalOfficer(): Promise<boolean> {
        return this.isPolkadot() && await this.authorityService.isLegalOfficer(this.address);
    }

    is(address: string | undefined | null): boolean {
        return address !== undefined
            && address !== null
            && address === this.address;
    }

    require(predicate: (check: AuthenticatedUser) => boolean, message?: string): AuthenticatedUser {
        if(!predicate(this)) {
            throw this.errorFactory.unauthorized(message || "Unauthorized");
        }
        return this;
    }

    async requireLegalOfficerOnNode(message?: string): Promise<AuthenticatedUser> {
        if (! (this.isPolkadot() && await this.authorityService.isLegalOfficerOnNode(this.address))) {
            throw this.errorFactory.unauthorized(message || "Authenticated User is not Legal Officer on this node.");
        }
        return this;
    }

    isOneOf(addresses: (string | undefined | null)[]): boolean {
        return addresses.some(address => this.is(address));
    }

    readonly address: string;
    readonly type: AddressType;
    private readonly nodeOwner: string;
    private readonly authorityService: AuthorityService;
    private readonly errorFactory: ErrorFactory;
}
