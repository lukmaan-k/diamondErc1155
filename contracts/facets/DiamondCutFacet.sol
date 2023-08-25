// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/** 
 * Adapted from the Diamond 3 reference implementation by Nick Mudge: https://github.com/mudgen/diamond-3-hardhat
 */

import { IDiamondCut } from "../interfaces/IDiamondCut.sol";
import { LibDiamond } from "../libraries/LibDiamond.sol";

contract DiamondCutFacet is IDiamondCut {
    
    /**
     * @dev See {IDiamondCut-diamondCut}.
     */
    function diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}