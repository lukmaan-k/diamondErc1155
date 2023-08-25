import { Wallet, utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

// load env file
import dotenv from "dotenv";
dotenv.config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

if (!PRIVATE_KEY)
    throw "⛔️ Private key not detected! Add it to the .env file!";


export default async function (hre: HardhatRuntimeEnvironment) {
    console.log(`Running deploy script for ERC1155 diamond contract`);

    // Initialize the wallet.
    const wallet = new Wallet(PRIVATE_KEY);

    // Create deployer object and load the artifact of the contract you want to deploy.
    const deployer = new Deployer(hre, wallet);

    // Load artifacts for facets only
    const diamondCutFacetArtifact = await deployer.loadArtifact("DiamondCutFacet");
    const diamondLoupeFacetArtifact = await deployer.loadArtifact("DiamondLoupeFacet");
    const erc1155FacetArtifact = await deployer.loadArtifact("ERC1155Facet");
    const erc1155HolderMockArtifact = await deployer.loadArtifact("ERC1155HolderMock");

    // Deploy facets
    const diamondCutFacet = await deployer.deploy(diamondCutFacetArtifact, []);
    console.log(`DiamondCutFacet deployed to ${diamondCutFacet.address}`)
    const diamondLoupeFacet = await deployer.deploy(diamondLoupeFacetArtifact, []);
    console.log(`DiamondLoupeFacet deployed to ${diamondLoupeFacet.address}`)
    const erc1155Facet = await deployer.deploy(erc1155FacetArtifact, []);
    console.log(`ERC1155Facet deployed to ${erc1155Facet.address}`)
    const erc1155HolderMock = await deployer.deploy(erc1155HolderMockArtifact, []);
    console.log(`ERC1155HolderMock deployed to ${erc1155HolderMock.address}`)

    // Deploy diamond and pass in DiamondCutFacet address to constructor
    const diamondArtifact = await deployer.loadArtifact("Diamond");
    const diamond = await deployer.deploy(diamondArtifact, [wallet.address, diamondCutFacet.address]);
    console.log(`Diamond deployed to ${diamond.address}`)

    // Prepare diamondCut data
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

    // Attach the diamondCutFacet to the diamond proxy contract and make cuts
    const attachedDiamond = diamondCutFacet.attach(diamond.address);
    const baseUri = "http://someBaseUri/";
    const name = "TestG7-1155";
    const symbol = "TG7";
    const calldata = erc1155Iface.encodeFunctionData("initialize", [baseUri, name, symbol]);
    await attachedDiamond.diamondCut([loupeCut, erc1155Cut], erc1155Facet.address, calldata);

    console.log("\n###############################################")
    console.log("#####  Facets cut. Deployment complete!  ######")
    console.log("###############################################\n")
}
