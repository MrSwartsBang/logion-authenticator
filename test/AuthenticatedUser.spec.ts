import { It, Mock } from "moq.ts";
import { AuthenticatedUser, AuthorityService } from "../src";

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const USER_ADDRESS = "5H4MvAsobfZ6bBCDyj5dsrWYLrA8HrRzaqa9p61UXtxMhSCY"

describe('AuthenticatedUser', () => {

    it('does not authenticate user different from token', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.is("SOME-OTHER-USER")).toBe(false);
    })

    it('does not authenticate null user', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.is(null)).toBe(false);
    })

    it('does not authenticate undefined user', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.is(undefined)).toBe(false);
    })

    it('detects not in white list', () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.isOneOf([ "FAKE ADDRESS" ])).toBe(false);
    })

    it('detects in white list', () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.isOneOf([ USER_ADDRESS ])).toBe(true);
    })

    it('authenticates legal officer based on token', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: ALICE,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.isNodeOwner()).toBe(true);
    })
})

function buildAuthenticatedUser(args: {
    address: string,
    isWellKnownNode?: boolean,
}): AuthenticatedUser {
    const { address, isWellKnownNode } = args;
    return new AuthenticatedUser(
        address,
        ALICE,
        mockAuthorityService(false, isWellKnownNode),
        {
            unauthorized: (message: string) => new Error(message),
        },
    );
}

function mockAuthorityService(isLegalOfficer?: boolean, isWellKnownNode: boolean = true): AuthorityService {
    const authority = new Mock<AuthorityService>();
    authority.setup(instance => instance.isLegalOfficer(It.IsAny<string>()))
        .returns(Promise.resolve(isLegalOfficer ? isLegalOfficer : false))
        authority.setup(instance => instance.isLegalOfficerNode(It.IsAny<string>()))
        .returns(Promise.resolve(isWellKnownNode))
    return authority.object();
}
