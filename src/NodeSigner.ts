import { createPrivateKey, createPublicKey, KeyObject, sign, verify } from "crypto";
import { base64url } from "jose";
import PeerId from "peer-id";

export class NodeSigner {

    static readonly HASH_FUNCTION = "SHA256";

    static readonly KEY_PAIR_TYPE = "OKP"; // Octet Key Pair - https://datatracker.ietf.org/doc/html/draft-ietf-jose-cfrg-curves#section-2

    static readonly CURVE_TYPE = "Ed25519";

    buildPrivateJsonWebKey(peerId: PeerId, privateKeyBytes: Buffer): KeyObject {
        const publicKeyBytes = this.toPublicKeyBytes(peerId);
        return createPrivateKey({
            key: {
                kty: NodeSigner.KEY_PAIR_TYPE,
                crv: NodeSigner.CURVE_TYPE,
                x: base64url.encode(publicKeyBytes),
                d: base64url.encode(privateKeyBytes),
            },
            format: "jwk"
        })
    }

    private toPublicKeyBytes(peerId: PeerId): Uint8Array {
        return peerId.pubKey.bytes.slice(4, 36);
    }

    buildPublicJsonWebKey(peerId: PeerId): KeyObject {
        const publicKeyBytes = this.toPublicKeyBytes(peerId);
        return createPublicKey({
            key: {
                kty: NodeSigner.KEY_PAIR_TYPE,
                crv: NodeSigner.CURVE_TYPE,
                x: base64url.encode(publicKeyBytes)
            },
            format: "jwk"
        });
    }

    /**
     * Signs input data.
     * With Ed25519 keys, streaming of input data is not supported: see https://github.com/mscdex/io.js/commit/7d0e50dcfef98ca56715adf74678bcaf4aa08796
     * 
     * @param data The data to sign
     * @param privateKey The private key
     * @returns The signature
     */
    sign(data: Buffer, privateKey: KeyObject): Buffer {
        return sign(null, data, privateKey);
    }

    /**
     * Verifies input data against a signature.
     * With Ed25519 keys, streaming of input data is not supported: see https://github.com/mscdex/io.js/commit/7d0e50dcfef98ca56715adf74678bcaf4aa08796
     * 
     * @param data The signed data
     * @param publicKey The public key
     * @returns True if signed data match the signature
     */
    verify(data: Buffer, publicKey: KeyObject, signature: Buffer): boolean {
        return verify(null, data, publicKey, signature);
    }
}
