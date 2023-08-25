// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;


import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

/**
 * @title  LibERC1155.sol
 * @author LK
 * @notice Main implementation for 
 */
library LibERC1155 {

    bytes32 constant STORAGE_POSITION = keccak256("g7dao.eth.storage.Erc1155");

    struct Erc1155Storage {
        mapping(uint256 => mapping(address => uint256)) _balances; // Mapping from token ID to owner balances
        mapping(address => mapping(address => bool)) _operatorApprovals; // Mapping from owner to operator approvals
        mapping(uint256 => uint256) _totalSupply; // Mapping from token ID to totalSupply
        mapping(uint256 => mapping(address => bool)) _minted; // Mapping from token ID to minted status
        mapping(uint256 => string) _tokenUris; // Mapping from token ID to its URI suffix
        string _baseUri; // Base URI for all tokens
        uint256 _tokenTypeCount; // Number of token types. Also used as token type index
        string _name; // Token name
        string _symbol; // Token symbol
        bool _initialized; // Whether or not the contract has been initialized
    }

    function _erc1155Storage() internal pure returns (Erc1155Storage storage ds) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
