import PeerId from "peer-id";
import { NodeSigner } from "../src/NodeSigner";

describe("NodeSigner", () => {

    const PEER_ID = PeerId.createFromB58String("12D3KooWBmAwcd4PJNJvfV89HwE48nwkRmAgo8Vy3uQEyNNHBox2");

    const NODE_KEY = Buffer.from("c12b6d18942f5ee8528c8e2baf4e147b5c5c18710926ea492d09cbd9f6c9f82a", "hex");

    it("is able to sign and verify using node key", () => {
        const signer = new NodeSigner();
        const data = Buffer.from("Some data");

        const privateKey = signer.buildPrivateJsonWebKey(PEER_ID, NODE_KEY);
        const signature = signer.sign(data, privateKey);

        const publicKey = signer.buildPublicJsonWebKey(PEER_ID);
        expect(signer.verify(data, publicKey, signature)).toBe(true);
    });
});
