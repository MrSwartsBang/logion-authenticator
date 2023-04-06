import { It, Mock } from "moq.ts";
import { AuthenticatedUser, AuthorityService, AddressType } from "../src/index.js";

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const USER_POLKADOT_ADDRESS = "5H4MvAsobfZ6bBCDyj5dsrWYLrA8HrRzaqa9p61UXtxMhSCY"
const USER_ETHEREUM_ADDRESS = "0x590E9c11b1c2f20210b9b84dc2417B4A7955d4e6"

describe('AuthenticatedUser', () => {

    it('does not authenticate user different from token', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.is("SOME-OTHER-USER")).toBe(false);
    })

    it('does not authenticate null user', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.is(null)).toBe(false);
    })

    it('does not authenticate undefined user', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.is(undefined)).toBe(false);
    })

    it('detects not in white list', () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.isOneOf([ "FAKE ADDRESS" ])).toBe(false);
    })

    it('detects in white list', () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.isOneOf([ USER_POLKADOT_ADDRESS ])).toBe(true);
        expect(authenticatedUser.isPolkadot()).toBe(true);
    })

    it('authenticates legal officer based on token', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: ALICE,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.isNodeOwner()).toBe(true);
    })

    it('detects Ethereum Address', () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_ETHEREUM_ADDRESS,
            isWellKnownNode: true,
            addressType: "Ethereum"
        });
        expect(authenticatedUser.isOneOf([ USER_ETHEREUM_ADDRESS ])).toBe(true);
        expect(authenticatedUser.isPolkadot()).toBe(false);
        expect(authenticatedUser.type).toBe("Ethereum");

    })
})

function buildAuthenticatedUser(args: {
    address: string,
    isWellKnownNode?: boolean,
    addressType?: AddressType,
}): AuthenticatedUser {
    const { address, isWellKnownNode, addressType } = args;
    return new AuthenticatedUser(
        { address, type: addressType ? addressType : "Polkadot" },
        ALICE,
        mockAuthorityService(false, isWellKnownNode),
        {
            unauthorized: (message: string) => new Error(message),
        },
    );
}

function mockAuthorityService(isLegalOfficer?: boolean, isWellKnownNode = true): AuthorityService {
    const authority = new Mock<AuthorityService>();
    authority.setup(instance => instance.isLegalOfficer(It.IsAny<string>()))
        .returns(Promise.resolve(isLegalOfficer ? isLegalOfficer : false))
        authority.setup(instance => instance.isLegalOfficerNode(It.IsAny<string>()))
        .returns(Promise.resolve(isWellKnownNode))
    return authority.object();
}
