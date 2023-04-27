import { buildApiClass, ValidAccountId } from "@logion/node-api";
import { KeyringSigner, RawSigner, toIsoString } from "@logion/client";
import { Keyring } from "@polkadot/api";
import { DateTime, Duration } from "luxon";
import PeerId from "peer-id";

import { AuthenticatedUser, Authenticator, defaultSetup, SessionManager, SessionSignature, TokenConfig } from "../src/index.js";

describe("Authentication", () => {

    it("authenticates properly with logion node", async () => {
        const api = await buildApiClass("ws://127.0.0.1:9944");
        const signer = buildSigner();

        const alice = api.queries.getValidAccountId("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", "Polkadot");
        const user = api.queries.getValidAccountId("5DPLBrBxniGbGdFe1Lmdpkt6K3aNjhoNPJrSJ51rwcmhH2Tn", "Polkadot");

        const tokenConfig: TokenConfig = {
            nodePeerId: PeerId.createFromB58String("12D3KooWBmAwcd4PJNJvfV89HwE48nwkRmAgo8Vy3uQEyNNHBox2"),
            nodeKey: Buffer.from("c12b6d18942f5ee8528c8e2baf4e147b5c5c18710926ea492d09cbd9f6c9f82a", "hex"),
            nodeOwner: alice.address,
            jwtTimeToLive: Duration.fromObject({ hour: 1 }),
        };
        const { sessionManager, authenticator } = defaultSetup({ api, tokenConfig });

        // Check with regular user
        const authenticatedUser = await authenticate({ address: user, authenticator, sessionManager, signer });
        expect(authenticatedUser.is(user.address)).toBe(true);
        expect(authenticatedUser.isNodeOwner()).toBe(false);
        await expectAsync(authenticatedUser.isLegalOfficer()).toBeResolvedTo(false);

        // Check with legal officer
        const aliceAuthenticatedUser = await authenticate({ address: alice, authenticator, sessionManager, signer });
        expect(aliceAuthenticatedUser.is(alice.address)).toBe(true);
        expect(aliceAuthenticatedUser.isNodeOwner()).toBe(true);
        await expectAsync(aliceAuthenticatedUser.isLegalOfficer()).toBeResolvedTo(true);
    })
});

function buildSigner(): RawSigner {
    const keyring = new Keyring({ type: 'sr25519' });
    keyring.addFromUri("0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a"); // 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
    keyring.addFromUri("unique chase zone team upset caution match west enter eyebrow limb wrist"); // 5DPLBrBxniGbGdFe1Lmdpkt6K3aNjhoNPJrSJ51rwcmhH2Tn
    return new KeyringSigner(keyring);
}

async function authenticate(args: { address: ValidAccountId, sessionManager: SessionManager, authenticator: Authenticator, signer: RawSigner }): Promise<AuthenticatedUser> {
    const { address, sessionManager, authenticator, signer } = args;

    const session = sessionManager.createNewSession([ address.address ]);
    const signedOn = DateTime.now();
    const typedSignature = await signer.signRaw({
        signerId: address,
        resource: 'authentication',
        operation: 'login',
        signedOn,
        attributes: [ session.id ],
    });
    const signatures: SessionSignature[] = [ {
            address: address.address,
            signature: typedSignature.signature,
            signedOn: toIsoString(signedOn),
            type: "POLKADOT",
        }
    ];
    const signedSession = await sessionManager.signedSessionOrThrow(session, signatures);

    const tokens = await authenticator.createTokens(signedSession, DateTime.now());
    return authenticator.ensureAuthenticatedUserOrThrow(tokens[0].value);
}
