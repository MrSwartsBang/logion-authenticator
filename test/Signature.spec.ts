import { It, Mock } from "moq.ts";
import { CrossmintSignatureService, EthereumSignatureService, PolkadotSignatureService, SignatureService, VerifyFunction, VerifyFunctionParams } from "../src";

describe('SignatureService', () => {

    it('verifies with valid input', async () => testVerify({
        expectedResult: true,
        expectedMessage: "SdPF9uK+K2RNcs0m0OYPXTTNUhJ06/+v8CcZrv9f8jo=",
        attributes: ["abcd"],
    }));

    it('rejects with invalid input', async () => testVerify({
        expectedResult: false,
        expectedMessage: "",
        attributes: ["abcd"],
    }));

    it('verifies with no attributes', async () => testVerify({
        expectedResult: true,
        expectedMessage: "CjwOkiDFvZWqt+uZYPktkdggygroB60g0mVn7QxyZm8=",
        attributes: [],
    }));

    it('rejects with no message nor attributes', async () => testVerify({
        expectedResult: false,
        expectedMessage: "",
        attributes: [],
    }));

    it('verifies with mixed attributes', async () => testVerify({
        expectedResult: true,
        expectedMessage: MIXED_ATTRIBUTES_MESSAGE,
        attributes: ["abc", 123, true],
    }));

    it('verifies with mixed attributes and full nesting', async () => testVerify({
        expectedResult: true,
        expectedMessage: MIXED_ATTRIBUTES_MESSAGE,
        attributes: [["abc", 123, true]],
    }));

    it('verifies with mixed attributes and partial nesting 1', async () => testVerify({
        expectedResult: true,
        expectedMessage: MIXED_ATTRIBUTES_MESSAGE,
        attributes: [["abc", 123], true],
    }));

    it('verifies with mixed attributes and partial nesting 2', async () => testVerify({
        expectedResult: true,
        expectedMessage: MIXED_ATTRIBUTES_MESSAGE,
        attributes: ["abc", [123, true]],
    }));
});

const MIXED_ATTRIBUTES_MESSAGE = "FtvKwzH/OdYXynVMDeOh6WD77O5gYD8LtDzs5qqDf2U=";
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

async function testVerify(params: {
    expectedResult: boolean;
    expectedMessage: string;
    attributes: any[];
}) {
    const verifier = new Mock<VerifyFunction>();
    const signature = "signature";
    const expectedMessage = params.expectedMessage;
    verifier.setup(instance => instance(It.Is<VerifyFunctionParams>(params =>
            params.signature === signature
            && params.address === BOB
            && params.message === expectedMessage
        )
    )).returns(Promise.resolve(true));
    const service = new SignatureService(verifier.object());

    const result = await service.verify({
        signature,
        address: BOB,
        operation: "operation",
        resource: "resource",
        timestamp: "2021-05-10T00:00",
        attributes: params.attributes
    })

    expect(result || false).toBe(params.expectedResult);
}

describe("EthereumSignatureService", () => {

    const params = {
        address: "0x6ef154673a6379b2CDEDeD6aF1c0d705c3c8272a",
        resource: "authentication",
        operation: "login",
        timestamp: "2022-07-21T15:42:36.653+02:00",
        attributes: [ "a0a9c8f5-743a-458e-8592-dd702bd9b58b" ]
    };

    const signatureService = new EthereumSignatureService();

    it("verifies valid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x38fe0c82e7f0fbdcb4c66467fb65360af6ed6384f375968913befe4d2663769f5e8a82982431ef4e0e51186e9a569f2fa485f534b90ba791676ac4f9083456e51c",
        })).toBeTrue();
    })

    it("fails to verify invalid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x8807227a68aecb8012994fa6197b36ffa50fe8510edb6ce3f78073deed022da05c272ec6f330f67b1fe6729eb3b66129daa506c18e8ab5eec96b8420711150b61c",
        })).toBeFalse();
    })
});

describe("PolkadotSignatureService", () => {

    const params = {
        address: "5DPLBrBxniGbGdFe1Lmdpkt6K3aNjhoNPJrSJ51rwcmhH2Tn",
        resource: "authentication",
        operation: "login",
        timestamp: "2022-07-21T15:42:36.653Z",
        attributes: [ "a0a9c8f5-743a-458e-8592-dd702bd9b58b" ]
    };

    const signatureService = new PolkadotSignatureService();

    it("verifies valid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x2c88db66ecf845896e1ba4c9fd02ebcb5ab5b84007b45edca6f0836007763c3fb1239824f07372dd41696e1f6558a700cd2c1a7b15fdb06e2041dd3b9878b988",
        })).toBeTrue();
    })

    it("fails to verify invalid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x8807227a68aecb8012994fa6197b36ffa50fe8510edb6ce3f78073deed022da05c272ec6f330f67b1fe6729eb3b66129daa506c18e8ab5eec96b8420711150b61c",
        })).toBeFalse();
    })
});

describe("CrossmintSignatureService", () => {

    const params = {
        address: "0xb21edd3dc671484F34075B038a68A76F6362F980",
        resource: "authentication",
        operation: "login",
        timestamp: "2022-09-21T16:31:38.464+02:00",
        attributes: [ "2afe2730-08ad-4409-8ea4-265ea28a699b" ]
    };

    const signatureService = new CrossmintSignatureService();

    it("verifies valid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x4ce607efd5f846bcb3a5e09393c78f9444f82b846db8350040180f007434fc0d721c82eee2e6d61e9631b4948daa398113c4177f775b8a3cb0fe95ade4cedebb1c",
        })).toBeTrue();
    })

    it("fails to verify invalid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x8807227a68aecb8012994fa6197b36ffa50fe8510edb6ce3f78073deed022da05c272ec6f330f67b1fe6729eb3b66129daa506c18e8ab5eec96b8420711150b61c",
        })).toBeFalse();
    })
});
