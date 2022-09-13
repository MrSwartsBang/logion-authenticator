import { Mock } from "moq.ts";
import { bool, Option } from "@polkadot/types-codec";
import PeerId, { createFromB58String } from "peer-id";
import { OpaquePeerId } from "@logion/node-api/dist/interfaces";

import { PolkadotAuthorityService } from "../src";
import { LogionNodeApi } from "@logion/node-api";

const LEGAL_OFFICER_NODES: string[] = ["12D3KooWBmAwcd4PJNJvfV89HwE48nwkRmAgo8Vy3uQEyNNHBox2", "12D3KooWQYV9dGMFoRzNStwpXztXaBUjtPqi6aU76ZgUriHhKust"]

describe("PolkadotAuthorityService", () => {

    it("succeeds with legal officer", async () => {
        const polkadotService = mockPolkadotServiceWithLegalOfficer("abc", LEGAL_OFFICER_NODES, []);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficer("abc")).toBe(true);
    })

    it("fails for a non-legal officer", async () => {
        const polkadotService = mockPolkadotServiceWithLegalOfficer("abc", LEGAL_OFFICER_NODES, []);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficer("abd")).toBe(false);
    })

    it(" does detect a legal officer node", async () => {
        const peerId = PeerId.createFromB58String(LEGAL_OFFICER_NODES[0]);
        const polkadotService = mockPolkadotServiceWithLegalOfficer("abc", LEGAL_OFFICER_NODES, []);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficerNode(peerId)).toBeTrue();
    })

    it(" does not detect a random peer id as legal officer node", async () => {
        const peerId = PeerId.createFromB58String("12D3KooWDCuGU7WY3VaWjBS1E44x4EnmTgK3HRxWFqYG3dqXDfP1");
        const polkadotService = mockPolkadotServiceWithLegalOfficer("abc", LEGAL_OFFICER_NODES, []);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficerNode(peerId)).toBeFalse()
    })

    it(" does detect a well-known node", async () => {
        const peerId = PeerId.createFromB58String(LEGAL_OFFICER_NODES[0]);
        const polkadotService = mockPolkadotServiceWithLegalOfficer("abc", [], LEGAL_OFFICER_NODES);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficerNode(peerId)).toBeTrue();
    })
})

function mockPolkadotServiceWithLegalOfficer(expectedAddress: string, legalOfficerNodes: string[], wellKnownNodes: string[]): LogionNodeApi {
    const apiMock: unknown = {
        query: {
            loAuthorityList: {
                legalOfficerSet: (address: string) => address === expectedAddress ? mockOptionBool(true, true) : mockOptionBool(false),
                legalOfficerNodes: () => new Set<OpaquePeerId>(legalOfficerNodes.map(toOpaquePeerId)),
            },
            nodeAuthorization: {
                wellKnownNodes: () => new Set<OpaquePeerId>(wellKnownNodes.map(toOpaquePeerId)),
            },
        }
    };

    return apiMock as LogionNodeApi;
}

function mockOptionBool(isSome: boolean, isTrue?: boolean): Option<bool> {
    if(isSome) {
        const optionMock: unknown = {
            isSome,
            unwrap: () => {
                return {
                    isTrue: isTrue!
                };
            }
        }
        return optionMock as Option<bool>;
    } else {
        const optionMock: unknown = {
            isSome,
            unwrap: () => { throw new Error() }
        }
        return optionMock as Option<bool>;
    }
}

function toOpaquePeerId(base58PeerId: string): OpaquePeerId {
    const hexPeerId = createFromB58String(base58PeerId).toHexString();
    const peerId = new Mock<OpaquePeerId>();
    peerId.setup(instance => instance.toHex())
        .returns(`0x${hexPeerId}`);
    return peerId.object();
}
