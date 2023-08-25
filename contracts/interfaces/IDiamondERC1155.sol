// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;


interface IDiamondERC1155 {

    error TokenDoesNotExist(uint256 tokenID_);
    error NoZeroAddress();
    error InputArrayLengthMismatch();
    error NoApproval();
    error InsufficientBalance();
    error ReceiverRejectedTokens();
    error NonReceiverImplementer();
    error InvalidURI();
    error NoSelfApproval();

    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);

    function initialize(string calldata _baseUri, string calldata _name, string calldata _symbol) external;
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function uri(uint256 id) external view returns (string memory);
    function setBaseUri(string calldata _baseUri) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external;
    function mint(address account, string calldata tokenUri, bytes calldata data) external;
    function mint(address account, uint256 id, bytes calldata data) external;
    function mintBatch(address to, uint256[] calldata ids, bytes calldata data) external;
    function burn(address account, uint256 id, uint256 amount) external;
    function burnBatch(address account, uint256[] calldata ids, uint256[] calldata amounts) external;
}