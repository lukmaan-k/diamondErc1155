// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/** 
 * Adapted from the Diamond 3 reference implementation by Nick Mudge: https://github.com/mudgen/diamond-3-hardhat
 */

import { IERC165 } from "@openzeppelin/contracts/interfaces/IERC165.sol";
import { LibDiamond } from  "../libraries/LibDiamond.sol";
import { IDiamondLoupe } from "../interfaces/IDiamondLoupe.sol";

contract DiamondLoupeFacet is IDiamondLoupe, IERC165 {

    /**
     * see {IDiamondLoupe-facets}
     */
    function facets() external override view returns (Facet[] memory facets_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 numFacets = ds.facetAddresses.length;
        facets_ = new Facet[](numFacets);
        for (uint256 i; i < numFacets; i++) {
            address facetAddress_ = ds.facetAddresses[i];
            facets_[i].facetAddress = facetAddress_;
            facets_[i].functionSelectors = ds.facetFunctionSelectors[facetAddress_].functionSelectors;
        }
    }

    /**
     * see {IDiamondLoupe-facetFunctionSelectors}
     */
    function facetFunctionSelectors(address _facet) external override view returns (bytes4[] memory facetFunctionSelectors_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetFunctionSelectors_ = ds.facetFunctionSelectors[_facet].functionSelectors;
    }

    /**
     * see {IDiamondLoupe-facetAddresses}
     */
    function facetAddresses() external override view returns (address[] memory facetAddresses_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddresses_ = ds.facetAddresses;
    }

    /**
     * see {IDiamondLoupe-facetAddress}
     */
    function facetAddress(bytes4 _functionSelector) external override view returns (address facetAddress_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddress_ = ds.selectorToFacetAndPosition[_functionSelector].facetAddress;
    }

    /**
     * see {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 _interfaceId) external override view returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[_interfaceId];
    }
}