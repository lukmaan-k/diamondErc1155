import { expect } from 'chai';
import { Wallet, Provider, Contract } from 'zksync-web3';
import * as hre from 'hardhat';
import { Deployer } from '@matterlabs/hardhat-zksync-deploy';
import { ethers } from 'ethers';

type DeployReturn = {
    diamondCutFacet: Contract,
    diamondLoupeFacet: Contract,
    erc1155Facet: Contract,
    diamond: Contract,
    erc1155HolderMock: Contract,
}

async function deployContracts(wallet: Wallet): Promise<DeployReturn> {

    const deployer = new Deployer(hre, wallet);
    
    const diamondCutFacetArtifact = await deployer.loadArtifact('DiamondCutFacet');
    const diamondLoupeFacetArtifact = await deployer.loadArtifact('DiamondLoupeFacet');
    const erc1155FacetArtifact = await deployer.loadArtifact('ERC1155Facet');
    const diamondArtifact = await deployer.loadArtifact('Diamond');
    const ERC1155HolderMockArtifact = await deployer.loadArtifact('ERC1155HolderMock');

    const diamondCutFacet = await deployer.deploy(diamondCutFacetArtifact);
    const diamondLoupeFacet = await deployer.deploy(diamondLoupeFacetArtifact);
    const erc1155Facet = await deployer.deploy(erc1155FacetArtifact);
    const diamond = await deployer.deploy(diamondArtifact, [wallet.address, diamondCutFacet.address]);
    const erc1155HolderMock = await deployer.deploy(ERC1155HolderMockArtifact);

    const loupeIface = new ethers.utils.Interface(diamondLoupeFacetArtifact.abi);
    const loupeSelectors: string[] = [];

    loupeSelectors[0] = loupeIface.getSighash("facets");
    loupeSelectors[1] = loupeIface.getSighash("facetFunctionSelectors");
    loupeSelectors[2] = loupeIface.getSighash("facetAddresses");
    loupeSelectors[3] = loupeIface.getSighash("facetAddress");
    loupeSelectors[4] = loupeIface.getSighash("supportsInterface");

    const loupeCut: [string, number, string[]] = [
        diamondLoupeFacet.address,
        0,
        loupeSelectors
    ];
    
    const erc1155Iface = new ethers.utils.Interface(erc1155FacetArtifact.abi);
    const erc1155Selectors: string[] = [];

    erc1155Selectors[0] = erc1155Iface.getSighash("initialize");
    erc1155Selectors[1] = erc1155Iface.getSighash("name");
    erc1155Selectors[2] = erc1155Iface.getSighash("symbol");
    erc1155Selectors[3] = erc1155Iface.getSighash("uri");
    erc1155Selectors[4] = erc1155Iface.getSighash("setBaseUri");
    erc1155Selectors[5] = erc1155Iface.getSighash("balanceOf");
    erc1155Selectors[6] = erc1155Iface.getSighash("balanceOfBatch");
    erc1155Selectors[7] = erc1155Iface.getSighash("setApprovalForAll");
    erc1155Selectors[8] = erc1155Iface.getSighash("isApprovedForAll");
    erc1155Selectors[9] = erc1155Iface.getSighash("safeTransferFrom");
    erc1155Selectors[10] = erc1155Iface.getSighash("safeBatchTransferFrom");
    erc1155Selectors[11] = ethers.utils.id("mint(address,string,bytes)").substring(0, 10);
    erc1155Selectors[12] = ethers.utils.id("mint(address,uint256,bytes)").substring(0, 10);
    erc1155Selectors[13] = erc1155Iface.getSighash("mintBatch");
    erc1155Selectors[14] = erc1155Iface.getSighash("burn");
    erc1155Selectors[15] = erc1155Iface.getSighash("burnBatch");

    const erc1155Cut: [string, number, string[]] = [
        erc1155Facet.address,
        0,
        erc1155Selectors
    ];

    const attachedDiamond = diamondCutFacet.attach(diamond.address);
    const baseUri = "someBaseUri";
    const name = "TestG7-1155";
    const symbol = "TG7";
    const calldata = erc1155Iface.encodeFunctionData("initialize", [baseUri, name, symbol]);
    await attachedDiamond.diamondCut([loupeCut, erc1155Cut], erc1155Facet.address, calldata);

    const contracts = {
        diamondCutFacet: diamondCutFacet,
        diamondLoupeFacet: diamondLoupeFacet,
        erc1155Facet: erc1155Facet,
        diamond: diamond,
        erc1155HolderMock: erc1155HolderMock
    }
    
    return contracts
}


describe('ERC1155Facet', function () {

    // Wallets
    const provider = Provider.getDefaultProvider();
    const deployerSigner = new Wallet("0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110", provider);
    const senderSigner = new Wallet("0xac1e735be8536c6534bb4f17f06f6afc73b2b5ba84ac2cfb12f7461b20c0bbe3", provider);
    const receiverSigner = new Wallet("0xd293c684d884d56f8d6abd64fc76757d3664904e309a0645baf8522ab6366d9e", provider);
    const operatorSigner = new Wallet("0x850683b40d4a740aa6e745f889a6fdc8327be76e122f5aba645a5b02d0248db8", provider);

    let diamondCutFacet:Contract,
        diamondLoupeFacet:Contract,
        erc1155Facet:Contract,
        diamond:Contract,
        erc1155HolderMock:Contract,
        attachedDiamond:Contract

    beforeEach(async function () {
        const result = await deployContracts(deployerSigner);
        diamondCutFacet = result.diamondCutFacet;
        diamondLoupeFacet = result.diamondLoupeFacet;
        erc1155Facet = result.erc1155Facet;
        diamond = result.diamond;
        erc1155HolderMock = result.erc1155HolderMock;
        attachedDiamond = erc1155Facet.attach(diamond.address);
    })

    describe('Deployment', function () {
        it('Should deploy properly', async function () {
            attachedDiamond = diamondLoupeFacet.attach(diamond.address);
            const diamondInterface = "0xe7c4ba98" // solidity: type(IDiamondERC1155).interfaceId
            const supportsInterface = await attachedDiamond.supportsInterface(diamondInterface);
            expect(supportsInterface).to.be.true;
            
            attachedDiamond = erc1155Facet.attach(diamond.address);
            const name = await attachedDiamond.name();
            expect(name).to.equal("TestG7-1155");

            const symbol = await attachedDiamond.symbol();
            expect(symbol).to.equal("TG7");

            const baseUri = await attachedDiamond.uri(0);
            expect(baseUri).to.equal("someBaseUri");
        });
    });

    describe('Minting', function () {
        it("user should not mint before an admin has minted the token first", async function () {
            const tx = attachedDiamond.connect(senderSigner)["mint(address,uint256,bytes)"](
                senderSigner.address,
                0,
                []
            )
            await expect(tx).to.be.revertedWithCustomError(erc1155Facet, "TokenDoesNotExist");
        });

        it("admin should not mint to zero address", async function () {
            const tx = attachedDiamond.connect(deployerSigner)["mint(address,string,bytes)"](
                ethers.constants.AddressZero,
                "someUri.glb",
                []
            )
            await expect(tx).to.be.revertedWithCustomError(erc1155Facet, "NoZeroAddress");
        });

        it("admin should not mint with invalid uri", async function () {
            const tx = attachedDiamond.connect(deployerSigner)["mint(address,string,bytes)"](
                deployerSigner.address,
                "noglbextensionUri",
                []
            )
            await expect(tx).to.be.revertedWithCustomError(erc1155Facet, "InvalidURI");
        });

        it("admin should be able to mint to themself", async function () {
            await attachedDiamond.connect(deployerSigner)["mint(address,string,bytes)"](
                deployerSigner.address,
                "someUri.glb",
                []
            )
            const balance = await attachedDiamond.balanceOf(deployerSigner.address, 0);
            expect(balance).to.equal(1);
        });

        it("admin should be able to mint to another address", async function () {
            await attachedDiamond.connect(deployerSigner)["mint(address,string,bytes)"](
                senderSigner.address,
                "someUri.glb",
                []
            )
            const balance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(balance).to.equal(1);
        });

        it("tokenIDs should increment on admin mints", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            const balance1 = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(balance1).to.equal(1);
            const balance2 = await attachedDiamond.balanceOf(senderSigner.address, 1);
            expect(balance2).to.equal(1);
            const balance3 = await attachedDiamond.balanceOf(senderSigner.address, 2);
            expect(balance3).to.equal(1);
        });

        it("user should be able to mint to themself after admin", async function () {
            await attachedDiamond.connect(deployerSigner)["mint(address,string,bytes)"](
                senderSigner.address,
                "someUri.glb",
                []
            )
            await attachedDiamond.connect(senderSigner)["mint(address,uint256,bytes)"](
                senderSigner.address,
                0,
                []
            )
            const balance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(balance).to.equal(2);
        });

        it("user should be able to mint to another address after admin", async function () {
            await attachedDiamond.connect(deployerSigner)["mint(address,string,bytes)"](
                senderSigner.address,
                "someUri.glb",
                []
            )
            await attachedDiamond.connect(senderSigner)["mint(address,uint256,bytes)"](
                receiverSigner.address,
                0,
                []
            )
            const senderBalance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance).to.equal(1);
            const receiverBalance = await attachedDiamond.balanceOf(receiverSigner.address, 0);
            expect(receiverBalance).to.equal(1);
        });

        it ("should not be able to batch mint to zero address", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            const tx = attachedDiamond.connect(deployerSigner)["mintBatch(address,uint256[],bytes)"](
                ethers.constants.AddressZero,
                [0, 1, 2],
                []
            )
            await expect(tx).to.be.revertedWithCustomError(erc1155Facet, "NoZeroAddress");
        });

        it ("should be able to batch mint", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner)["mintBatch(address,uint256[],bytes)"](
                senderSigner.address,
                [0, 1, 2],
                []
            )
            const senderBalance1 = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance1).to.equal(2);
            const senderBalance2 = await attachedDiamond.balanceOf(senderSigner.address, 1);
            expect(senderBalance2).to.equal(2);
            const senderBalance3 = await attachedDiamond.balanceOf(senderSigner.address, 2);
            expect(senderBalance3).to.equal(2);
        })
    });

    describe("BalanceOf", function () {        
        it("should return balance of 0 for accounts with no tokens", async function () {
            const balance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(balance).to.equal(0);
        })

        it("should return balance of more than 0 for accounts with tokens", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            const balance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(balance).to.equal(1);
        })

        it("should not return a balance for zero address", async function () {
            await expect(attachedDiamond.balanceOf(ethers.constants.AddressZero, 0)).to.revertedWithCustomError(erc1155Facet, "NoZeroAddress");
        })

        it("should throw array length mismatch error if given malformed inputs", async function () {
            await expect(
                attachedDiamond.balanceOfBatch(
                    [deployerSigner.address, senderSigner.address], [0, 0, 1]
                )
            ).to.revertedWithCustomError(erc1155Facet, "InputArrayLengthMismatch");
        })

        it("should not return a balance for zero address is batch call", async function () {
            await expect(
                attachedDiamond.balanceOfBatch(
                    [ethers.constants.AddressZero, senderSigner.address], [0, 0]
                )
            ).to.revertedWithCustomError(erc1155Facet, "NoZeroAddress");
        })

        it("should return correct balances for multiple accounts when all are zero", async function () {
            const balances = await attachedDiamond.balanceOfBatch(
                [deployerSigner.address, senderSigner.address, receiverSigner.address], [0, 1, 0]
            )
            expect(balances[0]).to.equal(0);
            expect(balances[1]).to.equal(0);
            expect(balances[2]).to.equal(0);
        })

        it("should return correct balances for multiple queries when all are more than zero", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)

            const balances = await attachedDiamond.balanceOfBatch(
                [senderSigner.address, senderSigner.address, senderSigner.address], [0, 1, 2]
            )
            expect(balances[0]).to.equal(1);
            expect(balances[1]).to.equal(1);
            expect(balances[2]).to.equal(1);
        })
    });

    describe("Approvals", function () {
        it("should not be able to approve self", async function () {
            await expect(
                attachedDiamond.connect(senderSigner).setApprovalForAll(senderSigner.address, true)
            ).to.be.revertedWithCustomError(erc1155Facet, "NoSelfApproval");
        })

        it("should be able to approve another address", async function () {
            await attachedDiamond.connect(senderSigner).setApprovalForAll(operatorSigner.address, true);
            const isApproved = await attachedDiamond.isApprovedForAll(senderSigner.address, operatorSigner.address);
            expect(isApproved).to.be.true;
        })

        it("should be able to unset approvals", async function () {
            await attachedDiamond.connect(senderSigner).setApprovalForAll(operatorSigner.address, true);
            let isApproved = await attachedDiamond.isApprovedForAll(senderSigner.address, operatorSigner.address);
            expect(isApproved).to.be.true;
            
            await attachedDiamond.connect(senderSigner).setApprovalForAll(operatorSigner.address, false);
            isApproved = await attachedDiamond.isApprovedForAll(senderSigner.address, operatorSigner.address);
            expect(isApproved).to.be.false;
        })
    })

    describe("Transfers", function () {
        it("should not be able to transfer to zero address", async function () {
            await expect(
                attachedDiamond.connect(senderSigner).safeTransferFrom(senderSigner.address, ethers.constants.AddressZero, 0, 1, [])
            ).to.be.revertedWithCustomError(erc1155Facet, "NoZeroAddress");
        })

        it("should not be able to transfer more than owned", async function () {
            await expect(
                attachedDiamond.connect(senderSigner).safeTransferFrom(senderSigner.address, receiverSigner.address, 0, 1, [])
            ).to.be.revertedWithCustomError(erc1155Facet, "InsufficientBalance");
        })

        it("should be able to transfer to another address", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).safeTransferFrom(senderSigner.address, receiverSigner.address, 0, 1, [])
            const senderBalance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance).to.equal(0);
            const receiverBalance = await attachedDiamond.balanceOf(receiverSigner.address, 0);
            expect(receiverBalance).to.equal(1);
        })

        it("should be able to transfer with operator", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).setApprovalForAll(operatorSigner.address, true);
            await attachedDiamond.connect(operatorSigner).safeTransferFrom(senderSigner.address, receiverSigner.address, 0, 1, [])
            const senderBalance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance).to.equal(0);
            const receiverBalance = await attachedDiamond.balanceOf(receiverSigner.address, 0);
            expect(receiverBalance).to.equal(1);
            const operatorBalance = await attachedDiamond.balanceOf(operatorSigner.address, 0);
            expect(operatorBalance).to.equal(0);
        })

        it("should not be able to transfer with operator if not approved", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await expect(
                attachedDiamond.connect(operatorSigner).safeTransferFrom(senderSigner.address, receiverSigner.address, 0, 1, [])
            ).to.be.revertedWithCustomError(erc1155Facet, "NoApproval");
        })

        it("should be able to transfer to a contract implementing IERC1155Holder with no data passed", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).safeTransferFrom(senderSigner.address, erc1155HolderMock.address, 0, 1, [])
            const senderBalance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance).to.equal(0);
            const erc1155HolderMockBalance = await attachedDiamond.balanceOf(erc1155HolderMock.address, 0);
            expect(erc1155HolderMockBalance).to.equal(1);
        })

        it("should be able to transfer to a contract implementing IERC1155Holder with arbitrary data passed", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).safeTransferFrom(senderSigner.address, erc1155HolderMock.address, 0, 1, "0x1234")
            const senderBalance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance).to.equal(0);
            const erc1155HolderMockBalance = await attachedDiamond.balanceOf(erc1155HolderMock.address, 0);
            expect(erc1155HolderMockBalance).to.equal(1);
        })

        it("should not be able to transfer to IERC1155Holder if hook reverts", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            const dataWhichThrowsError = ethers.utils.arrayify("0x1111111111111111");
            await expect(
                attachedDiamond.connect(senderSigner).safeTransferFrom(senderSigner.address, erc1155HolderMock.address, 0, 1, dataWhichThrowsError)
            ).to.be.revertedWith("ERC1155HolderMock: reverting");
        })

        it("should not be able to transfer to IERC1155Holder if response is unexpected", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            const dataWhichRejectsTransfer = ethers.utils.arrayify("0x2222222222222222");
            await expect(
                attachedDiamond.connect(senderSigner).safeTransferFrom(senderSigner.address, erc1155HolderMock.address, 0, 1, dataWhichRejectsTransfer)
            ).to.be.revertedWithCustomError(erc1155Facet, "ReceiverRejectedTokens");
        })

        it("should not be able to transfer to contract (with bytecode size > 0) with no IERC1155Holder implementation", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await expect(
                attachedDiamond.connect(senderSigner).safeTransferFrom(senderSigner.address, erc1155Facet.address, 0, 1, [])
            ).to.be.reverted
        })
    })

    describe("Batch Transfers", function () {
        it("should not be able to transfer to zero address", async function () {
            await expect(
                attachedDiamond.connect(senderSigner).safeBatchTransferFrom(senderSigner.address, ethers.constants.AddressZero, [0, 1], [1, 1], [])
            ).to.be.revertedWithCustomError(erc1155Facet, "NoZeroAddress");
        })

        it("should not be able to transfer more than owned", async function () {
            await expect(
                attachedDiamond.connect(senderSigner).safeBatchTransferFrom(senderSigner.address, receiverSigner.address, [0, 1], [1, 1], [])
            ).to.be.revertedWithCustomError(erc1155Facet, "InsufficientBalance");
        })

        it("should be able to transfer to another addess", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).safeBatchTransferFrom(senderSigner.address, receiverSigner.address, [0, 1], [1, 1], [])

            const senderBalance1 = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance1).to.equal(0);
            const senderBalance2 = await attachedDiamond.balanceOf(senderSigner.address, 1);
            expect(senderBalance2).to.equal(0);
            const receiverBalance1 = await attachedDiamond.balanceOf(receiverSigner.address, 0);
            expect(receiverBalance1).to.equal(1);
            const receiverBalance2 = await attachedDiamond.balanceOf(receiverSigner.address, 1);
            expect(receiverBalance2).to.equal(1);
        })

        it("should be able to transfer with operator", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).setApprovalForAll(operatorSigner.address, true);
            await attachedDiamond.connect(operatorSigner).safeBatchTransferFrom(senderSigner.address, receiverSigner.address, [0, 1], [1, 1], [])

            const senderBalance1 = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance1).to.equal(0);
            const senderBalance2 = await attachedDiamond.balanceOf(senderSigner.address, 1);
            expect(senderBalance2).to.equal(0);
            const receiverBalance1 = await attachedDiamond.balanceOf(receiverSigner.address, 0);
            expect(receiverBalance1).to.equal(1);
            const receiverBalance2 = await attachedDiamond.balanceOf(receiverSigner.address, 1);
            expect(receiverBalance2).to.equal(1);
            const operatorBalance1 = await attachedDiamond.balanceOf(operatorSigner.address, 0);
            expect(operatorBalance1).to.equal(0);
            const operatorBalance2 = await attachedDiamond.balanceOf(operatorSigner.address, 1);
            expect(operatorBalance2).to.equal(0);
        })

        it("should not be able to transfer with operator if not approved", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await expect(
                attachedDiamond.connect(operatorSigner).safeBatchTransferFrom(senderSigner.address, receiverSigner.address, [0, 1], [1, 1], [])
            ).to.be.revertedWithCustomError(erc1155Facet, "NoApproval");
        })

        it("should be able to transfer to a contract implementing IERC1155Holder with no data passed", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).safeBatchTransferFrom(senderSigner.address, erc1155HolderMock.address, [0, 1], [1, 1], [])
            const senderBalance1 = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance1).to.equal(0);
            const senderBalance2 = await attachedDiamond.balanceOf(senderSigner.address, 1);
            expect(senderBalance2).to.equal(0);
            const erc1155HolderMockBalance1 = await attachedDiamond.balanceOf(erc1155HolderMock.address, 0);
            expect(erc1155HolderMockBalance1).to.equal(1);
            const erc1155HolderMockBalance2 = await attachedDiamond.balanceOf(erc1155HolderMock.address, 1);
            expect(erc1155HolderMockBalance2).to.equal(1);
        })

        it("should be able to transfer to a contract implementing IERC1155Holder with arbitrary data passed", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).safeBatchTransferFrom(senderSigner.address, erc1155HolderMock.address, [0, 1], [1, 1], "0x1234")
            const senderBalance1 = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(senderBalance1).to.equal(0);
            const senderBalance2 = await attachedDiamond.balanceOf(senderSigner.address, 1);
            expect(senderBalance2).to.equal(0);
            const erc1155HolderMockBalance1 = await attachedDiamond.balanceOf(erc1155HolderMock.address, 0);
            expect(erc1155HolderMockBalance1).to.equal(1);
            const erc1155HolderMockBalance2 = await attachedDiamond.balanceOf(erc1155HolderMock.address, 1);
            expect(erc1155HolderMockBalance2).to.equal(1);
        })

        it("should not be able to transfer to IERC1155Holder if hook reverts", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            const dataWhichThrowsError = ethers.utils.arrayify("0x1111111111111111");
            await expect(
                attachedDiamond.connect(senderSigner).safeBatchTransferFrom(senderSigner.address, erc1155HolderMock.address, [0, 1], [1, 1], dataWhichThrowsError)
            ).to.be.revertedWith("ERC1155HolderMock: reverting");
        })

        it("should not be able to transfer to IERC1155Holder if response is unexpected", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            const dataWhichRejectsTransfer = ethers.utils.arrayify("0x2222222222222222");
            await expect(
                attachedDiamond.connect(senderSigner).safeBatchTransferFrom(senderSigner.address, erc1155HolderMock.address, [0, 1], [1, 1], dataWhichRejectsTransfer)
            ).to.be.revertedWithCustomError(erc1155Facet, "ReceiverRejectedTokens");
        })

        it("should not be able to transfer to contract (with bytecode size > 0) with no IERC1155Holder implementation", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await expect(
                attachedDiamond.connect(senderSigner).safeBatchTransferFrom(senderSigner.address, erc1155Facet.address, [0, 1], [1, 1], [])
            ).to.be.reverted
        })
    })

    describe("Burn", function () {
        it("should not be able to burn from zero account", async function () {
            await expect(
                attachedDiamond.connect(senderSigner).burn(ethers.constants.AddressZero, 0, 1)
            ).to.be.revertedWithCustomError(erc1155Facet, "NoZeroAddress");
        })

        it("should be able to burn own tokens", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).burn(senderSigner.address, 0, 1);
            const balance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(balance).to.equal(0);
        })

        it("should be able to burn tokens from operator", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).setApprovalForAll(operatorSigner.address, true);
            await attachedDiamond.connect(operatorSigner).burn(senderSigner.address, 0, 1);
            const balance = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(balance).to.equal(0);
        })

        it("should not be able to burn tokens from operator if not approved", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await expect(
                attachedDiamond.connect(operatorSigner).burn(senderSigner.address, 0, 1)
            ).to.be.revertedWithCustomError(erc1155Facet, "NoApproval");
        })

        it("should be able to burn own batch of tokens", async function () {
            await adminTripleInitialMint(deployerSigner, senderSigner, diamond, erc1155Facet)
            await attachedDiamond.connect(senderSigner).burnBatch(senderSigner.address, [0, 1, 2], [1, 1, 1]);
            const balance1 = await attachedDiamond.balanceOf(senderSigner.address, 0);
            expect(balance1).to.equal(0);
            const balance2 = await attachedDiamond.balanceOf(senderSigner.address, 1);
            expect(balance2).to.equal(0);
            const balance3 = await attachedDiamond.balanceOf(senderSigner.address, 2);
            expect(balance3).to.equal(0);
        })
    })

    describe("URI", function () {
        it("should be able to set base uri as admin", async function () {
            let baseUri = await attachedDiamond.uri(0);
            expect(baseUri).to.equal("someBaseUri");
            await attachedDiamond.connect(deployerSigner).setBaseUri("newBaseUri");
            baseUri = await attachedDiamond.uri(0);
            expect(baseUri).to.equal("newBaseUri");
        })

        it("should not be able to set base uri as non-admin", async function () {
            await expect(
                attachedDiamond.connect(senderSigner).setBaseUri("newBaseUri")
            ).to.be.revertedWith("LibDiamond: Must be contract owner");
        })
    })
});

const adminTripleInitialMint = async function (deployerSigner: Wallet, senderSigner: Wallet, diamond: Contract, erc1155Facet: Contract) {
    const attachedDiamond = erc1155Facet.attach(diamond.address);
    await attachedDiamond.connect(deployerSigner)["mint(address,string,bytes)"](
        senderSigner.address,
        "firstUri.glb",
        []
    )
    await attachedDiamond.connect(deployerSigner)["mint(address,string,bytes)"](
        senderSigner.address,
        "secondUri.glb",
        []
    )
    await attachedDiamond.connect(deployerSigner)["mint(address,string,bytes)"](
        senderSigner.address,
        "thirdUri.glb",
        []
    )
}
