// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;


import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract ERC1155HolderMock is ERC1155Holder {

    uint64 private constant REVERTING = 0x1111111111111111;
    uint64 private constant UNEXPECTED_RESPONSE = 0x2222222222222222;

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory data
    ) public pure override returns (bytes4) {
        if (bytes8(data) == bytes8(REVERTING)) {
            revert("ERC1155HolderMock: reverting");
        } else if (bytes8(data) == bytes8(UNEXPECTED_RESPONSE)) {
            return bytes4(bytes8(UNEXPECTED_RESPONSE));
        } else {
            return this.onERC1155Received.selector;
        }
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory data
    ) public virtual override returns (bytes4) {
        if (bytes8(data) == bytes8(REVERTING)) {
            revert("ERC1155HolderMock: reverting");
        } else if (bytes8(data) == bytes8(UNEXPECTED_RESPONSE)) {
            return bytes4(bytes8(UNEXPECTED_RESPONSE));
        } else {
            return this.onERC1155BatchReceived.selector;
        }
    }
}
