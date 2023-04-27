import { LogionNodeApiClass } from '@logion/node-api';
import { OpaquePeerId } from "@logion/node-api/dist/types/interfaces";
import PeerId from 'peer-id';

import { AuthorityService } from './Config.js';

export class PolkadotAuthorityService implements AuthorityService {

    constructor(connectedApi: LogionNodeApiClass, nodeId: PeerId) {
        this.api = connectedApi;
        this.nodeId = nodeId;
    }

    private api: LogionNodeApiClass;

    private readonly nodeId: PeerId;

    async isLegalOfficer(address: string): Promise<boolean> {
        const entry = await this.api.polkadot.query.loAuthorityList.legalOfficerSet(address);
        return entry.isSome;
    }

    async isLegalOfficerOnNode(address: string): Promise<boolean> {
        const entry = await this.api.polkadot.query.loAuthorityList.legalOfficerSet(address);
        if(!entry.isSome) {
            return false;
        } else {
            const legalOfficer = entry.unwrap();
            if(legalOfficer.isHost && legalOfficer.asHost.nodeId.isSome) {
                return this.toHex(this.nodeId) === legalOfficer.asHost.nodeId.unwrap().toHex();
            } else if(legalOfficer.isGuest) {
                const hostAddress = legalOfficer.asGuest;
                const host = await this.api.polkadot.query.loAuthorityList.legalOfficerSet(hostAddress);
                if(host.isSome && host.unwrap().isHost && host.unwrap().asHost.nodeId.isSome) {
                    return this.toHex(this.nodeId) === host.unwrap().asHost.nodeId.unwrap().toHex();
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }
    }

    private toHex(peerId: PeerId): string {
        return `0x${ peerId.toHexString() }`;
    }

    async isLegalOfficerNode(peerId: PeerId): Promise<boolean> {
        const hexPeerId = this.toHex(peerId);
        const legalOfficerNodes = await this.api.polkadot.query.loAuthorityList.legalOfficerNodes();
        const wellKnowNodes = await this.api.polkadot.query.nodeAuthorization.wellKnownNodes();
        return this.isInSet(hexPeerId, legalOfficerNodes) || this.isInSet(hexPeerId, wellKnowNodes);
    }

    private isInSet(hexPeerId: string, set: Set<OpaquePeerId>): boolean {
        for (const opaquePeerId of set) {
            if (opaquePeerId.toHex() === hexPeerId) {
                return true;
            }
        }
        return false;
    }
}
