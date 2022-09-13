import { AuthorityService, ErrorFactory } from "./Config";

export class AuthenticatedUser {

    constructor(
        address: string,
        nodeOwner: string,
        authorityService: AuthorityService,
        errorFactory: ErrorFactory,
    ) {
        this.address = address;
        this.nodeOwner = nodeOwner;
        this.authorityService = authorityService;
        this.errorFactory = errorFactory;
    }

    isNodeOwner(): boolean {
        return this.nodeOwner === this.address;
    }

    async isLegalOfficer(): Promise<boolean> {
        return await this.authorityService.isLegalOfficer(this.address);
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

    isOneOf(addresses: (string | undefined | null)[]): boolean {
        return addresses.some(address => this.is(address));
    }

    readonly address: string;
    private readonly nodeOwner: string;
    private readonly authorityService: AuthorityService;
    private readonly errorFactory: ErrorFactory;
}
