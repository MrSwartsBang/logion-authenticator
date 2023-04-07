import { Mock } from "moq.ts";
import { Bytes, Enum, Option, Struct } from "@polkadot/types-codec";
import { Codec } from "@polkadot/types-codec/types";
import type { AccountId32 } from '@polkadot/types/interfaces/runtime';
import PeerId, { createFromB58String } from "peer-id";
import { AccountId, OpaquePeerId } from "@logion/node-api/dist/types/interfaces";

import { PolkadotAuthorityService } from "../src/index.js";
import { LogionNodeApi } from "@logion/node-api";

// Below definitions must be removed once @logion/node-api is switched to ES module packaging
interface PalletLoAuthorityListLegalOfficerData extends Enum {
    readonly isHost: boolean;
    readonly asHost: PalletLoAuthorityListHostData;
    readonly isGuest: boolean;
    readonly asGuest: AccountId32;
    readonly type: 'Host' | 'Guest';
}

interface PalletLoAuthorityListHostData extends Struct {
    readonly nodeId: Option<OpaquePeerId>;
    readonly baseUrl: Option<Bytes>;
}
// Above definitions must be removed once @logion/node-api is switched to ES module packaging

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const NODE1 = "12D3KooWBmAwcd4PJNJvfV89HwE48nwkRmAgo8Vy3uQEyNNHBox2";
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
const NODE2 = "12D3KooWQYV9dGMFoRzNStwpXztXaBUjtPqi6aU76ZgUriHhKust";
const ANY_NODE = "12D3KooWDCuGU7WY3VaWjBS1E44x4EnmTgK3HRxWFqYG3dqXDfP1";
const CHARLIE = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";

const HOSTS: Record<string, string> = {
    [ALICE]: NODE1,
    [BOB]: NODE2,
};

const GUESTS: Record<string, string> = {
    [CHARLIE]: ALICE,
}

const REGULAR_USER_ADDRESS = "5EBxoSssqNo23FvsDeUxjyQScnfEiGxJaNwuwqBH2Twe35BX";

describe("PolkadotAuthorityService", () => {

    it("succeeds with legal officer", async () => {
        const polkadotService = mockPolkadotServiceWithLegalOfficer(HOSTS, [], {});
        const authorityService = new PolkadotAuthorityService(polkadotService, PeerId.createFromB58String(NODE1));
        expect(await authorityService.isLegalOfficer(ALICE)).toBe(true);
    })

    it("fails for a non-legal officer", async () => {
        const polkadotService = mockPolkadotServiceWithLegalOfficer(HOSTS, [], {});
        const authorityService = new PolkadotAuthorityService(polkadotService, PeerId.createFromB58String(NODE1));
        expect(await authorityService.isLegalOfficer(REGULAR_USER_ADDRESS)).toBe(false);
    })

    it("detects a legal officer node", async () => {
        const peerId = PeerId.createFromB58String(NODE1);
        const polkadotService = mockPolkadotServiceWithLegalOfficer(HOSTS, [], {});
        const authorityService = new PolkadotAuthorityService(polkadotService, PeerId.createFromB58String(NODE1));
        expect(await authorityService.isLegalOfficerNode(peerId)).toBeTrue();
    })

    it("does not detect any peer id as legal officer node", async () => {
        const peerId = PeerId.createFromB58String(ANY_NODE);
        const polkadotService = mockPolkadotServiceWithLegalOfficer(HOSTS, [], {});
        const authorityService = new PolkadotAuthorityService(polkadotService, PeerId.createFromB58String(NODE1));
        expect(await authorityService.isLegalOfficerNode(peerId)).toBeFalse()
    })

    it("detects a well-known node", async () => {
        const peerId = PeerId.createFromB58String(NODE1);
        const polkadotService = mockPolkadotServiceWithLegalOfficer({}, Object.values(HOSTS), {});
        const authorityService = new PolkadotAuthorityService(polkadotService, PeerId.createFromB58String(NODE1));
        expect(await authorityService.isLegalOfficerNode(peerId)).toBeTrue();
    })

    it("detects a host legal officer of given node", async () => {
        const peerId = PeerId.createFromB58String(NODE1);
        const polkadotService = mockPolkadotServiceWithLegalOfficer(HOSTS, [], {});
        const authorityService = new PolkadotAuthorityService(polkadotService, peerId);
        expect(await authorityService.isLegalOfficerOnNode(ALICE)).toBeTrue();
    })

    it("detects a guest legal officer of given node", async () => {
        const peerId = PeerId.createFromB58String(NODE1);
        const polkadotService = mockPolkadotServiceWithLegalOfficer(HOSTS, [], GUESTS);
        const authorityService = new PolkadotAuthorityService(polkadotService, peerId);
        expect(await authorityService.isLegalOfficerOnNode(CHARLIE)).toBeTrue();
    })
})

function mockPolkadotServiceWithLegalOfficer(hosts: Record<string, string>, wellKnownNodes: string[], guests: Record<string, string>): LogionNodeApi {
    const apiMock: unknown = {
        query: {
            loAuthorityList: {
                legalOfficerSet: (address: string | AccountId) =>
                    address.toString() in hosts ? mockOption(mockHost(hosts[address.toString()])) :
                        address.toString() in guests ? mockOption(mockGuest(guests[address.toString()])) : mockOption(),
                legalOfficerNodes: () => new Set<OpaquePeerId>(Object.values(hosts).map(toOpaquePeerId)),
            },
            nodeAuthorization: {
                wellKnownNodes: () => new Set<OpaquePeerId>(wellKnownNodes.map(toOpaquePeerId)),
            },
        }
    };

    return apiMock as LogionNodeApi;
}

function mockHost(nodeId: string): PalletLoAuthorityListLegalOfficerData {
    return {
        isHost: true,
        isGuest: false,
        asHost: {
            nodeId: mockOption(toOpaquePeerId(nodeId)),
        } as PalletLoAuthorityListHostData,
    } as unknown as PalletLoAuthorityListLegalOfficerData;
}

function mockGuest(address: string): PalletLoAuthorityListLegalOfficerData {
    return {
        isHost: false,
        isGuest: true,
        asGuest: {
            toHuman: () => address,
            toString: () => address,
        } as AccountId,
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
