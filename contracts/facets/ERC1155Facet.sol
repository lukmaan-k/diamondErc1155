// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;


import { LibERC1155 } from "../libraries/LibERC1155.sol";
import { LibDiamond } from "../libraries/LibDiamond.sol";
import { IDiamondERC1155 } from "../interfaces/IDiamondERC1155.sol";
import { IERC1155Receiver } from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract ERC1155Facet is IDiamondERC1155 {
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    /**
     * @notice Initializes the contract. Serves same purpose as a constructor in a non-upgradeable contract
     * @param _baseUri the base URI for all tokens
     * @param _name the name of the token
     * @param _symbol the symbol of the token
     */
    function initialize(string calldata _baseUri, string calldata _name, string calldata _symbol) external {
        LibERC1155.Erc1155Storage storage erc1155Storage = LibERC1155._erc1155Storage();
        erc1155Storage._baseUri = _baseUri;
        erc1155Storage._name = _name;
        erc1155Storage._symbol = _symbol;
        erc1155Storage._initialized = true;

        LibDiamond.DiamondStorage storage diamondStorage = LibDiamond.diamondStorage();
        diamondStorage.supportedInterfaces[type(IDiamondERC1155).interfaceId] = true;
    }

    /**
     * @notice returns the name of the token
     */
    function name() external view returns (string memory) {
        LibERC1155.Erc1155Storage storage erc1155Storage = LibERC1155._erc1155Storage();
        return erc1155Storage._name;
    }

    /**
     * @notice returns the symbol of the token
     */
    function symbol() external view returns (string memory) {
        LibERC1155.Erc1155Storage storage erc1155Storage = LibERC1155._erc1155Storage();
        return erc1155Storage._symbol;
    }

    /**
     * @notice Returns the total supply of the token ID
     * @param tokenID_ The token ID
     * @return The total supply of the token ID
     */
    function totalSupply(uint256 tokenID_) external view returns (uint256) {
        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();
        return ds._totalSupply[tokenID_];
    }

    /**
     * @notice Returns the full URI of a particular token ID from the collection
     * @dev We rely on the first token of each type being minted by the owner, so do not check for valid token ID
     *      and instead return the baseURI
     * @param tokenID_ The token ID
     * @return The URI for a given token ID
     */
    function uri(uint256 tokenID_) external view returns (string memory) {
        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        string memory _base = ds._baseUri;

        if (bytes(ds._tokenUris[tokenID_]).length > 0) {
            return string(abi.encodePacked(_base, ds._tokenUris[tokenID_]));
        } else {
            return _base;
        }
    }

    /**
     * @notice sets the base URI for all tokens. Only callable by owner
     * @param _baseUri the base URI for all tokens
     */
    function setBaseUri(string calldata _baseUri) external onlyOwner {
        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();
        ds._baseUri = _baseUri;
    }

    /**
     * @notice Returns the balance of a particular token ID from the collection for a particular address
     * @param account address of the token owner
     * @param id token id
     */
    function balanceOf(address account, uint256 id) public view returns (uint256) {
        if (account == address(0)) revert NoZeroAddress();
        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        return ds._balances[id][account];
    }

    /**
     * @notice Batched version of balanceOf()
     * @param accounts The accounts to check for balance
     * @param ids The token IDs to check for balance
     */
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) public view returns (uint256[] memory) {
        if (accounts.length != ids.length) revert InputArrayLengthMismatch();
        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        uint256[] memory batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i] == address(0)) revert NoZeroAddress();
            batchBalances[i] = ds._balances[ids[i]][accounts[i]];
        }

        return batchBalances;
    }

    /**
     * @notice Sets the approval status of an operator for a given owner for all token types in the collection
     * @param operator The address of the operator
     * @param approved The approval status of the operator
     */
    function setApprovalForAll(address operator, bool approved) external {
        if (operator == address(0)) revert NoZeroAddress();
        if (operator == msg.sender) revert NoSelfApproval();
        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        ds._operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @notice Returns the approval status of an operator for a given owner
     * @param account The address of the token owner
     * @param operator The address of the operator
     */
    function isApprovedForAll(address account, address operator) external view returns (bool) {
        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();
        return ds._operatorApprovals[account][operator];
    }

    /**
     * @notice Transfers some amount of a token ID from the 'from' address to the 'to' address specified
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param id The token ID to transfer
     * @param amount The amount of tokens to transfer
     * @param data Any extra data to include in the transfer to be fed to the onERC1155Received hook
     */
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external {
        if (to == address(0)) revert NoZeroAddress();
        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        if (from != msg.sender && !ds._operatorApprovals[from][msg.sender]) revert NoApproval();

        _doSafeTransfer(from, to, id, amount, ds);

        emit TransferSingle(msg.sender, from, to, id, amount);

        _doSafeTransferAcceptanceCheck(msg.sender, from, to, id, amount, data);
    }

    /**
     * @notice Transfers a batch of token IDs from the 'from' address to the 'to' address specified
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param ids The token IDs to transfer
     * @param amounts The amounts of tokens to transfer
     * @param data The extra data to include in the transfer to be fed to the onERC1155BatchReceived hook
     */
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external {
        if (to == address(0)) revert NoZeroAddress();
        if (ids.length != amounts.length) revert InputArrayLengthMismatch();
        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        if (from != msg.sender && !ds._operatorApprovals[from][msg.sender]) revert NoApproval();

        for (uint256 i = 0; i < ids.length; i++) {
            _doSafeTransfer(from, to, ids[i], amounts[i], ds);
        }

        emit TransferBatch(msg.sender, from, to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(msg.sender, from, to, ids, amounts, data);
    }
    
    /**
     * @notice Overloaded mint function which is only callable by owner, where the token URI is specified.
     *         A token
     * @param account The address to mint to
     * @param tokenUri The token URI
     * @param data The extra data to include in the mint to be fed to the onERC1155Received hook
     */
    function mint(address account, string calldata tokenUri, bytes calldata data) external onlyOwner {
        if (account == address(0)) revert NoZeroAddress();
        if (!_isValidTokenUri(tokenUri)) revert InvalidURI();

        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();
        uint256 id = ds._tokenTypeCount;

        ds._tokenUris[id] = tokenUri;
        ds._balances[id][account]++;
        ds._totalSupply[id]++;
        ds._tokenTypeCount++;

        emit TransferSingle(msg.sender, address(0), account, id, 1);
        _doSafeTransferAcceptanceCheck(msg.sender, address(0), account, id, 1, data);
    }

    /**
     * @notice Mints some amount of a token ID to the 'to' address specified
     * @param account The address to mint to
     * @param id The token ID to mint
     * @param data The extra data to include in the mint to be fed to the onERC1155Received hook
     */
    function mint(address account, uint256 id, bytes calldata data) external {
        if (account == address(0)) revert NoZeroAddress();

        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        if (ds._totalSupply[id] == 0) revert TokenDoesNotExist(id);

        ds._minted[id][msg.sender] = true;
        ds._balances[id][account] ++;
        ds._totalSupply[id] ++;

        emit TransferSingle(msg.sender, address(0), account, id, 1);

        _doSafeTransferAcceptanceCheck(msg.sender, address(0), account, id, 1, data);
    }

    /**
     * @notice Mints a batch of token IDs to the 'to' address specified
     * @param to The address to mint to
     * @param ids The token IDs to mint
     * @param data The extra data to include in the mint to be fed to the onERC1155Received hook
     */
    function mintBatch(address to, uint256[] calldata ids, bytes calldata data) external {
        if (to == address(0)) revert NoZeroAddress();

        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        for (uint256 i = 0; i < ids.length; i++) {
            if (ds._totalSupply[ids[i]] == 0) revert TokenDoesNotExist(ids[i]);
            ds._minted[ids[i]][msg.sender] = true;
            ds._balances[ids[i]][to] ++;
            ds._totalSupply[ids[i]] ++;
        }

        uint256[] memory amounts = _arrayOfOnes(ids.length);

        emit TransferBatch(msg.sender, address(0), to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(msg.sender, address(0), to, ids, amounts, data);
    }

    /**
     * @notice Burns some amount of a token ID from the 'from' address specified
     * @param from The address to burn from
     * @param id The token ID to burn
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 id, uint256 amount) external {
        if (from == address(0)) revert NoZeroAddress();

        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        if (from != msg.sender && !ds._operatorApprovals[from][msg.sender]) revert NoApproval();

        _burn(from, id, amount, ds);

        emit TransferSingle(msg.sender, from, address(0), id, amount);
    }

    /**
     * @notice Burns a batch of token IDs from the 'from' address specified
     * @param from The address to burn from
     * @param ids The token IDs to burn
     * @param amounts The amounts of tokens to burn
     */
    function burnBatch(address from, uint256[] calldata ids, uint256[] calldata amounts) external {
        if (from == address(0)) revert NoZeroAddress();
        if (ids.length != amounts.length) revert InputArrayLengthMismatch();

        LibERC1155.Erc1155Storage storage ds = LibERC1155._erc1155Storage();

        if (from != msg.sender && !ds._operatorApprovals[from][msg.sender]) revert NoApproval();

        for (uint256 i = 0; i < ids.length; i++) {
            _burn(from, ids[i], amounts[i], ds);
        }

        emit TransferBatch(msg.sender, from, address(0), ids, amounts);
    }

    function _burn(address from, uint256 id, uint256 amount, LibERC1155.Erc1155Storage storage ds) internal {
        uint256 fromBalance = ds._balances[id][from];
        if (fromBalance < amount) revert InsufficientBalance();
        unchecked {
            ds._balances[id][from] = fromBalance - amount;
        }
        ds._totalSupply[id] -= amount;
    }

    function _mint(address to, uint256 id, LibERC1155.Erc1155Storage storage ds) internal {
        ds._minted[id][msg.sender] = true;
        ds._balances[id][to] ++;
        ds._totalSupply[id] ++;
    }

    function _doSafeTransfer(address from, address to, uint256 id, uint256 amount, LibERC1155.Erc1155Storage storage ds) internal {
        uint fromBalance = ds._balances[id][from];
        if (fromBalance < amount) revert InsufficientBalance();
        unchecked {
            ds._balances[id][from] = fromBalance - amount;
        }
        ds._balances[id][to] += amount;
    }

    function _doSafeTransferAcceptanceCheck(address operator, address from, address to, uint256 id, uint256 amount, bytes memory data) private {
        if (_isContract(to)) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 response) {
                if (response != IERC1155Receiver.onERC1155Received.selector) revert ReceiverRejectedTokens();
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert ();
            }
        }
    }

    function _doSafeBatchTransferAcceptanceCheck(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) private {
        if (_isContract(to)) {
            try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data) returns (bytes4 response) {
                if (response != IERC1155Receiver.onERC1155BatchReceived.selector) revert ReceiverRejectedTokens();
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert();
            }
        }
    }

    function _isValidTokenUri(string memory tokenUri_) private pure returns (bool) {
        bytes memory strBytes = bytes(tokenUri_);
        if (strBytes.length < 4) {
            return false;
        }

        // Match the last 4 characters to ".glb"
        bytes4 glb = ".glb";
        bytes4 lastFourBytes;
        assembly {
            lastFourBytes := mload(
                add(
                    add(strBytes, 0x20), // The offset of the bytes array, since first element is length
                    sub(
                        mload(strBytes), // Load length of tokenURI
                        4
                    ) // Subtract 4 because we want the last 4 bytes, and not the end of the string
                ) // Add the offset to get final location of the last 4 bytes of the tokenURI string
            ) // Load the last 4 bytes of the string into the lastFourBytes variable
        }

        return lastFourBytes == glb;
    }

    function _isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    function _arrayOfOnes(uint256 length) private pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            array[i] = 1;
        }
        return array;
    }
}