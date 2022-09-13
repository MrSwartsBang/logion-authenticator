import { DateTime, Duration } from "luxon";
import { Mock, It } from "moq.ts";
import PeerId from "peer-id";

import { Authenticator, AuthenticatorConfig, AuthorityService, defaultErrorFactory, SignedSession } from "../src";

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const USER_TOKEN = "eyJhbGciOiJFZERTQSJ9.eyJpYXQiOjE2MzEyMTc2MTEsImV4cCI6NDc4NDgxNzYxMSwiaXNzIjoiMTJEM0tvb1dEQ3VHVTdXWTNWYVdqQlMxRTQ0eDRFbm1UZ0szSFJ4V0ZxWUczZHFYRGZQMSIsInN1YiI6IjVINE12QXNvYmZaNmJCQ0R5ajVkc3JXWUxyQThIclJ6YXFhOXA2MVVYdHhNaFNDWSJ9.pBYUyYxq2I_HZiYyeJ-rc8ANxVgckLyd2Y1Snu685mDK4fSwanb6EHsMAP47iCtzSxhaB5bDu7zDmY-XMAyuAw"
const USER_TOKEN_WRONG_SIGNATURE = "eyJhbGciOiJFZERTQSJ9.eyJpYXQiOjE2MzEyMTc2MTEsImV4cCI6NDc4NDgxNzYxMSwiaXNzIjoiMTJEM0tvb1dEQ3VHVTdXWTNWYVdqQlMxRTQ0eDRFbm1UZ0szSFJ4V0ZxWUczZHFYRGZQMSIsInN1YiI6IjVINE12QXNvYmZaNmJCQ0R5ajVkc3JXWUxyQThIclJ6YXFhOXA2MVVYdHhNaFNDWSJ9.GTLJB_uMjsdcuWzM3CWL92n1UNI0WYXFUDW7QQ1Vi6k3TQIEvG_WwMuuZ2d9cexY"
const ALICE_TOKEN = "eyJhbGciOiJFZERTQSJ9.eyJpYXQiOjE2MjM2NzQwOTksImV4cCI6MTgyMzY3NDA5OSwiaXNzIjoiMTJEM0tvb1dEQ3VHVTdXWTNWYVdqQlMxRTQ0eDRFbm1UZ0szSFJ4V0ZxWUczZHFYRGZQMSIsInN1YiI6IjVHcnd2YUVGNXpYYjI2Rno5cmNRcERXUzU3Q3RFUkhwTmVoWENQY05vSEdLdXRRWSJ9.GggMsAlDO2GoRFm8IBxuHKVtZ7Ms1pipCTzzoaDbGxXGhm4niFX_kEetMVdXo69oG0vI7XWfWHs7Z-x-nOjUCQ"
const USER_ADDRESS = "5H4MvAsobfZ6bBCDyj5dsrWYLrA8HrRzaqa9p61UXtxMhSCY"
const TTL = 100 * 365 * 24 * 3600; // 100 years

describe('AuthenticationService createToken()', () => {

    it('generates a token for user', async () => {
        const authenticationService = new Authenticator(buildConfig());
        const signedSession = new Mock<SignedSession>();
        signedSession.setup(instance => instance.session.address).returns(USER_ADDRESS);
        const actual = await authenticationService.createToken(signedSession.object(), DateTime.fromSeconds(1631217611));
        expect(actual.value).toBe(USER_TOKEN);
        expect(actual.expiredOn.toSeconds()).toBe(DateTime.fromSeconds(1631217611 + TTL).toSeconds());
    })

    it('authenticates user based on token', async () => {
        const authenticationService = new Authenticator(buildConfig());
        const logionUser = await authenticationService.ensureAuthenticatedUserOrThrow(USER_TOKEN);
        expect(logionUser.address).toBe(USER_ADDRESS);
    })

    it('authenticates node owner based on token', async () => {
        const authenticationService = new Authenticator(buildConfig(true));
        const logionUser = await authenticationService.ensureAuthenticatedUserOrThrow(ALICE_TOKEN);
        expect(logionUser.isNodeOwner()).toBe(true);
    })

    it('does not authenticate bad token', async () => {
        const authenticationService = new Authenticator(buildConfig());
        await expectAsync(authenticationService.ensureAuthenticatedUserOrThrow("BAD")).toBeRejectedWithError(Error, "JWTInvalid: Invalid JWT");
    })

    it('does not authenticate token with wrong signature', async () => {
        const authenticationService = new Authenticator(buildConfig());
        await expectAsync(authenticationService.ensureAuthenticatedUserOrThrow(USER_TOKEN_WRONG_SIGNATURE)).toBeRejectedWithError(Error, "JWSSignatureVerificationFailed: signature verification failed");
    })

    it('does not authenticate token for unknown node', async () => {
        const authenticationService = new Authenticator(buildConfig(false, false));
        await expectAsync(authenticationService.ensureAuthenticatedUserOrThrow(USER_TOKEN)).toBeRejectedWithError(Error, "Invalid issuer");
    })
})

function buildConfig(isLegalOfficer?: boolean, isWellKnownNode: boolean = true): AuthenticatorConfig {
    return {
        nodePeerId: PeerId.createFromB58String("12D3KooWDCuGU7WY3VaWjBS1E44x4EnmTgK3HRxWFqYG3dqXDfP1"),
        nodeKey: Buffer.from("1c482e5368b84abe08e1a27d0670d303351989b3aa281cb1abfc2f48e4530b57", "hex"),
        nodeOwner: ALICE,
        jwtTimeToLive: Duration.fromObject({ seconds: TTL }),
        authorityService: mockAuthorityService(isLegalOfficer, isWellKnownNode),
        errorFactory: defaultErrorFactory(),
    };
}

function mockAuthorityService(isLegalOfficer?: boolean, isWellKnownNode: boolean = true): AuthorityService {
    const authority = new Mock<AuthorityService>();
    authority.setup(instance => instance.isLegalOfficer(It.IsAny<string>()))
        .returns(Promise.resolve(isLegalOfficer ? isLegalOfficer : false))
        authority.setup(instance => instance.isLegalOfficerNode(It.IsAny<string>()))
        .returns(Promise.resolve(isWellKnownNode))
    return authority.object();
}
