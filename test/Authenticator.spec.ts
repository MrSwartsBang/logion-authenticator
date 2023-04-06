import { DateTime, Duration } from "luxon";
import { Mock, It } from "moq.ts";
import PeerId from "peer-id";

import { Authenticator, AuthenticatorConfig, AuthorityService, defaultErrorFactory, SignedSession } from "../src/index.js";

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const USER_TOKEN_PAYLOAD = "eyJhbGciOiJFZERTQSJ9.eyJhZGRyZXNzVHlwZSI6IlBvbGthZG90IiwiaWF0IjoxNjMxMjE3NjExLCJleHAiOjQ3ODQ4MTc2MTEsImlzcyI6IjEyRDNLb29XREN1R1U3V1kzVmFXakJTMUU0NHg0RW5tVGdLM0hSeFdGcVlHM2RxWERmUDEiLCJzdWIiOiI1SDRNdkFzb2JmWjZiQkNEeWo1ZHNyV1lMckE4SHJSemFxYTlwNjFVWHR4TWhTQ1kifQ"
const USER_TOKEN = USER_TOKEN_PAYLOAD + ".WT9c_0PkSoJm5y6PbXKOpphP_RxOBWtCJJnun8QRC34MnYB_HXaOIW9Miee19-L0BV72YDpB0whk2WOvR2XyBg";
const USER_TOKEN_WRONG_SIGNATURE = USER_TOKEN_PAYLOAD + ".GTLJB_uMjsdcuWzM3CWL92n1UNI0WYXFUDW7QQ1Vi6k3TQIEvG_WwMuuZ2d9cexY";
const ALICE_TOKEN = "eyJhbGciOiJFZERTQSJ9.eyJhZGRyZXNzVHlwZSI6IlBvbGthZG90IiwiaWF0IjoxNjMxMjE3NjExLCJleHAiOjQ3ODQ4MTc2MTEsImlzcyI6IjEyRDNLb29XREN1R1U3V1kzVmFXakJTMUU0NHg0RW5tVGdLM0hSeFdGcVlHM2RxWERmUDEiLCJzdWIiOiI1R3J3dmFFRjV6WGIyNkZ6OXJjUXBEV1M1N0N0RVJIcE5laFhDUGNOb0hHS3V0UVkifQ.Bp6MrRdlDZqJwPUShc2MLJTsC2vuTFY0XeQtM9sMHthnOq5LwmapMzHz-EUFw225bQsAMHpgA18DrkJMv2AECw"
const USER_ADDRESS = "5H4MvAsobfZ6bBCDyj5dsrWYLrA8HrRzaqa9p61UXtxMhSCY"
const TTL = 100 * 365 * 24 * 3600; // 100 years

describe('Authenticator', () => {

    it('generates a token for user', async () => {
        const authenticationService = new Authenticator(buildConfig());
        const signedSession = new Mock<SignedSession>();
        signedSession.setup(instance => instance.signatures).returns({
            [ USER_ADDRESS ]: {
                signature: "0x2c88db66ecf845896e1ba4c9fd02ebcb5ab5b84007b45edca6f0836007763c3fb1239824f07372dd41696e1f6558a700cd2c1a7b15fdb06e2041dd3b9878b988",
                signedOn: DateTime.now().toISO() || "",
                type: "POLKADOT"
        }});
        const actual = await authenticationService.createTokens(signedSession.object(), DateTime.fromSeconds(1631217611));
        expect(actual[USER_ADDRESS].value).toBe(USER_TOKEN);
        expect(actual[USER_ADDRESS].expiredOn.toSeconds()).toBe(DateTime.fromSeconds(1631217611 + TTL).toSeconds());
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

function buildConfig(isLegalOfficer?: boolean, isWellKnownNode = true): AuthenticatorConfig {
    return {
        nodePeerId: PeerId.createFromB58String("12D3KooWDCuGU7WY3VaWjBS1E44x4EnmTgK3HRxWFqYG3dqXDfP1"),
        nodeKey: Buffer.from("1c482e5368b84abe08e1a27d0670d303351989b3aa281cb1abfc2f48e4530b57", "hex"),
        nodeOwner: ALICE,
        jwtTimeToLive: Duration.fromObject({ seconds: TTL }),
        authorityService: mockAuthorityService(isLegalOfficer, isWellKnownNode),
        errorFactory: defaultErrorFactory(),
    };
}

function mockAuthorityService(isLegalOfficer?: boolean, isWellKnownNode = true): AuthorityService {
    const authority = new Mock<AuthorityService>();
    authority.setup(instance => instance.isLegalOfficer(It.IsAny<string>()))
        .returns(Promise.resolve(isLegalOfficer ? isLegalOfficer : false))
        authority.setup(instance => instance.isLegalOfficerNode(It.IsAny<string>()))
        .returns(Promise.resolve(isWellKnownNode))
    return authority.object();
}
