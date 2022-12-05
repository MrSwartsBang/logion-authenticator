import { Mock } from "moq.ts";
import { Option } from "@polkadot/types-codec";
import { Codec } from "@polkadot/types-codec/types";
import PeerId, { createFromB58String } from "peer-id";
import { OpaquePeerId } from "@logion/node-api/dist/interfaces";

import { PolkadotAuthorityService } from "../src";
import { LogionNodeApi } from "@logion/node-api";
import { PalletLoAuthorityListLegalOfficerData, PalletLoAuthorityListHostData } from "@polkadot/types/lookup";

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const NODE1 = "12D3KooWBmAwcd4PJNJvfV89HwE48nwkRmAgo8Vy3uQEyNNHBox2";
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
const NODE2 = "12D3KooWQYV9dGMFoRzNStwpXztXaBUjtPqi6aU76ZgUriHhKust";
const ANY_NODE = "12D3KooWDCuGU7WY3VaWjBS1E44x4EnmTgK3HRxWFqYG3dqXDfP1";

const LEGAL_OFFICER_NODES: Record<string, string> = {
    [ALICE]: NODE1,
    [BOB]: NODE2,
};

const REGULAR_USER_ADDRESS = "5EBxoSssqNo23FvsDeUxjyQScnfEiGxJaNwuwqBH2Twe35BX";

describe("PolkadotAuthorityService", () => {

    it("succeeds with legal officer", async () => {
        const polkadotService = mockPolkadotServiceWithLegalOfficer(LEGAL_OFFICER_NODES, []);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficer(ALICE)).toBe(true);
    })

    it("fails for a non-legal officer", async () => {
        const polkadotService = mockPolkadotServiceWithLegalOfficer(LEGAL_OFFICER_NODES, []);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficer(REGULAR_USER_ADDRESS)).toBe(false);
    })

    it("detects a legal officer node", async () => {
        const peerId = PeerId.createFromB58String(NODE1);
        const polkadotService = mockPolkadotServiceWithLegalOfficer(LEGAL_OFFICER_NODES, []);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficerNode(peerId)).toBeTrue();
    })

    it("does not detect any peer id as legal officer node", async () => {
        const peerId = PeerId.createFromB58String(ANY_NODE);
        const polkadotService = mockPolkadotServiceWithLegalOfficer(LEGAL_OFFICER_NODES, []);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficerNode(peerId)).toBeFalse()
    })

    it("detects a well-known node", async () => {
        const peerId = PeerId.createFromB58String(NODE1);
        const polkadotService = mockPolkadotServiceWithLegalOfficer({}, Object.values(LEGAL_OFFICER_NODES));
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficerNode(peerId)).toBeTrue();
    })

    it("detects a legal officer of given node", async () => {
        const peerId = PeerId.createFromB58String(NODE1);
        const polkadotService = mockPolkadotServiceWithLegalOfficer(LEGAL_OFFICER_NODES, []);
        const authorityService = new PolkadotAuthorityService(polkadotService);
        expect(await authorityService.isLegalOfficerOnNode(ALICE, peerId)).toBeTrue();
    })
})

function mockPolkadotServiceWithLegalOfficer(legalOfficerNodes: Record<string, string>, wellKnownNodes: string[]): LogionNodeApi {
    const apiMock: unknown = {
        query: {
            loAuthorityList: {
                legalOfficerSet: (address: string) =>
                    address in legalOfficerNodes ? mockOption(mockPalletLoAuthorityListLegalOfficerData(legalOfficerNodes[address])) : mockOption(),
                legalOfficerNodes: () => new Set<OpaquePeerId>(Object.values(legalOfficerNodes).map(toOpaquePeerId)),
            },
            nodeAuthorization: {
                wellKnownNodes: () => new Set<OpaquePeerId>(wellKnownNodes.map(toOpaquePeerId)),
            },
        }
    };

    return apiMock as LogionNodeApi;
}

function mockPalletLoAuthorityListLegalOfficerData(nodeId: string): PalletLoAuthorityListLegalOfficerData {
    return {
        isHost: true,
        asHost: {
            nodeId: mockOption(toOpaquePeerId(nodeId)),
        } as PalletLoAuthorityListHostData,
    } as unknown as PalletLoAuthorityListLegalOfficerData;
}

function mockOption<T extends Codec>(data?: T): Option<T> {
    if(data) {
        const optionMock: unknown = {
            isSome: true,
            unwrap: () => data,
        }
        return optionMock as Option<T>;
    } else {
        const optionMock: unknown = {
            isSome: false,
            unwrap: () => { throw new Error() }
        }
        return optionMock as Option<T>;
    }
}

function toOpaquePeerId(base58PeerId: string): OpaquePeerId {
    const hexPeerId = createFromB58String(base58PeerId).toHexString();
    const peerId = new Mock<OpaquePeerId>();
    peerId.setup(instance => instance.toHex())
        .returns(`0x${hexPeerId}`);
    return peerId.object();
}
