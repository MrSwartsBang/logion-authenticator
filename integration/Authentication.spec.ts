import { buildApi } from "@logion/node-api";
import { DateTime, Duration } from "luxon";
import PeerId from "peer-id";

import { Authenticator, defaultErrorFactory, PolkadotAuthorityService } from "../src";

describe("Authentication", () => {

    it("authenticates properly with logion node", async () => {
        const alice = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

        const api = await buildApi("ws://127.0.0.1:9944");
        const authorityService = new PolkadotAuthorityService(api);

        const authenticator = new Authenticator({
            nodePeerId: PeerId.createFromB58String("12D3KooWBmAwcd4PJNJvfV89HwE48nwkRmAgo8Vy3uQEyNNHBox2"),
            nodeKey: Buffer.from("c12b6d18942f5ee8528c8e2baf4e147b5c5c18710926ea492d09cbd9f6c9f82a", "hex"),
            nodeOwner: alice,
            authorityService,
            errorFactory: defaultErrorFactory(),
            jwtTimeToLive: Duration.fromObject({ hour: 1 }),
        });

        // Check with regular user
        const address = "5H4MvAsobfZ6bBCDyj5dsrWYLrA8HrRzaqa9p61UXtxMhSCY";
        const token = await authenticator.createToken(address, DateTime.now());
        const authenticatedUser = await authenticator.ensureAuthenticatedUserOrThrow(token.value);
        expect(authenticatedUser.is(address)).toBe(true);
        expect(authenticatedUser.isNodeOwner()).toBe(false);
        expectAsync(authenticatedUser.isLegalOfficer()).toBeResolvedTo(false);

        // Check with legal officer
        const aliceToken = await authenticator.createToken(alice, DateTime.now());
        const aliceAuthenticatedUser = await authenticator.ensureAuthenticatedUserOrThrow(aliceToken.value);
        expect(aliceAuthenticatedUser.is(alice)).toBe(true);
        expect(aliceAuthenticatedUser.isNodeOwner()).toBe(true);
        expectAsync(aliceAuthenticatedUser.isLegalOfficer()).toBeResolvedTo(true);
    })
});
