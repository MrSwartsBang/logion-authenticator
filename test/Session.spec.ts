import { DateTime } from "luxon";
import { It, Mock } from "moq.ts";
import {
    defaultErrorFactory,
    EthereumSignatureService,
    PolkadotSignatureService,
    Session,
    SessionManager,
    SessionSignature,
    SignatureService,
    SignatureType,
    VerifyParams,
    MultiversxSignatureService
} from "../src/index.js";

const polkadotAddress = "5DPLBrBxniGbGdFe1Lmdpkt6K3aNjhoNPJrSJ51rwcmhH2Tn";
const ethereumAddress = "0x6ef154673a6379b2CDEDeD6aF1c0d705c3c8272a";
const crossmintEthereumAddress = "0xb21edd3dc671484F34075B038a68A76F6362F980";

describe("SessionManager", () => {

    it("creates a new session", () => {
        const sessionManager = buildSessionManager();

        const session = sessionManager.createNewSession([ polkadotAddress ]);

        expect(session.id).toBeDefined();
        expect(session.addresses[0]).toBe(polkadotAddress);
        expect(session.createdOn).toBeDefined();
    })

    it("provides signed session with valid Polkadot signature", async () => {
        await testSignedSessionOrThrow("POLKADOT", polkadotAddress, true);
    })

    it("throws with invalid Polkadot signature", async () => {
        await testSignedSessionOrThrow("POLKADOT", polkadotAddress, false);
    })

    it("provides signed session with valid Ethereum signature", async () => {
        await testSignedSessionOrThrow("ETHEREUM", ethereumAddress, true);
    })

    it("throws with invalid Ethereum signature", async () => {
        await testSignedSessionOrThrow("ETHEREUM", ethereumAddress, false);
    })

    it("provides signed session with valid Crossmint signature", async () => {
        await testSignedSessionOrThrow("CROSSMINT_ETHEREUM", crossmintEthereumAddress, true);
    })

    it("throws with invalid Crossmint signature", async () => {
        await testSignedSessionOrThrow("CROSSMINT_ETHEREUM", crossmintEthereumAddress, false);
    })
})

function buildSessionManager(): SessionManager {
    const signatureServices = mockSignatureServices();
    return buildSessionManagerWithMocks(signatureServices);
}

function mockSignatureServices(): Record<SignatureType, Mock<SignatureService>> {
    return {
        ETHEREUM: new Mock<EthereumSignatureService>(),
        POLKADOT: new Mock<PolkadotSignatureService>(),
        CROSSMINT_ETHEREUM: new Mock<PolkadotSignatureService>(),
        MULTIVERSX: new Mock<MultiversxSignatureService>(),
    };
}

function buildSessionManagerWithMocks(signatureServices: Record<SignatureType, Mock<SignatureService>>) {
    return new SessionManager({ errorFactory: defaultErrorFactory(), signatureServices: {
        ETHEREUM: signatureServices.ETHEREUM.object(),
        POLKADOT: signatureServices.POLKADOT.object(),
        CROSSMINT_ETHEREUM: signatureServices.CROSSMINT_ETHEREUM.object(),
        MULTIVERSX: signatureServices.MULTIVERSX.object(),
    } });
}

async function testSignedSessionOrThrow(signatureType: SignatureType, address: string, validSignature: boolean) {
    const expectedSignature = "test";
    const expected: Record<SignatureType, ExpectedSignatureServiceVerify | undefined> = {
        ETHEREUM: undefined,
        POLKADOT: undefined,
        CROSSMINT_ETHEREUM: undefined,
        MULTIVERSX: undefined,
    };
    expected[signatureType] = {
        address,
        signature: validSignature ? expectedSignature : "",
    };
    const { session, sessionManager } = buildSession(address, expected);
    const signatures: SessionSignature[] = [ {
            address,
            signature: expectedSignature,
            signedOn: DateTime.now().toISO() || "",
            type: signatureType,
        }
    ];

    if(validSignature) {
        const signedSession = await sessionManager.signedSessionOrThrow(session, signatures);
        expect(signedSession.session).toBe(session);
        expect(signedSession.signatures).toBe(signatures);
    } else {
        await expectAsync(sessionManager.signedSessionOrThrow(session, signatures)).toBeRejectedWithError(Error, "Invalid signature");
    }
}

interface ExpectedSignatureServiceVerify {
    address: string,
    signature: string,
}

function match(args: VerifyParams, expected: ExpectedSignatureServiceVerify & { sessionId: string }): boolean {
    return args.address === expected.address
        && args.operation === "login"
        && args.resource === "authentication"
        && args.attributes[0] === expected.sessionId
        && args.signature === expected.signature;
}

function buildSession(address: string, expectedSignatures: Record<SignatureType, ExpectedSignatureServiceVerify | undefined>): {
    session: Session,
    sessionManager: SessionManager,
} {
    const signatureServices = mockSignatureServices();
    const sessionManager = buildSessionManagerWithMocks(signatureServices);
    const session = sessionManager.createNewSession([ address ]);
    if(expectedSignatures && expectedSignatures.ETHEREUM) {
        const expected = {
            ...expectedSignatures.ETHEREUM,
            sessionId: session.id,
        };
        signatureServices.ETHEREUM.setup(instance => instance.verify(It.Is<VerifyParams>(args => match(args, expected)))).returnsAsync(true);
        signatureServices.ETHEREUM.setup(instance => instance.verify(It.Is<VerifyParams>(args => !match(args, expected)))).returnsAsync(false);
    }
    if(expectedSignatures && expectedSignatures.POLKADOT) {
        const expected = {
            ...expectedSignatures.POLKADOT,
            sessionId: session.id,
        };
        signatureServices.POLKADOT.setup(instance => instance.verify(It.Is<VerifyParams>(args => match(args, expected)))).returnsAsync(true);
        signatureServices.POLKADOT.setup(instance => instance.verify(It.Is<VerifyParams>(args => !match(args, expected)))).returnsAsync(false);
    }
    if(expectedSignatures && expectedSignatures.CROSSMINT_ETHEREUM) {
        const expected = {
            ...expectedSignatures.CROSSMINT_ETHEREUM,
            sessionId: session.id,
        };
        signatureServices.CROSSMINT_ETHEREUM.setup(instance => instance.verify(It.Is<VerifyParams>(args => match(args, expected)))).returnsAsync(true);
        signatureServices.CROSSMINT_ETHEREUM.setup(instance => instance.verify(It.Is<VerifyParams>(args => !match(args, expected)))).returnsAsync(false);
    }
    return { session, sessionManager };
}
