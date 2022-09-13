import { LogionNodeApi } from '@logion/node-api';
import { OpaquePeerId } from '@logion/node-api/dist/interfaces/default';
import PeerId from 'peer-id';

import { AuthorityService } from './Config';

export class PolkadotAuthorityService implements AuthorityService {

    constructor(connectedApi: LogionNodeApi) {
        this.api = connectedApi;
    }

    private api: LogionNodeApi;

    async isLegalOfficer(address: string): Promise<boolean> {
        const entry = await this.api.query.loAuthorityList.legalOfficerSet(address);
        return entry.isSome;
    }

    async isLegalOfficerNode(peerId: PeerId): Promise<boolean> {
        const hexPeerId = peerId.toHexString();
        const legalOfficerNodes = await this.api.query.loAuthorityList.legalOfficerNodes();
        const wellKnowNodes = await this.api.query.nodeAuthorization.wellKnownNodes();
        return this.isInSet(hexPeerId, legalOfficerNodes) || this.isInSet(hexPeerId, wellKnowNodes);
    }

    private isInSet(hexPeerId: string, set: Set<OpaquePeerId>): boolean {
        for (const opaquePeerId of set) {
            if (opaquePeerId.toHex() === `0x${ hexPeerId }`) {
                return true;
            }
        }
        return false;
    }
}
