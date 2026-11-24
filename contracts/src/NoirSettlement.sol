// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title NoirSettlement
/// @notice The seal and the door for NOIR on Robinhood Chain.
///         The seal: receipts of NOIR blocks, in a hash chain that only moves forward.
///         The door: ETH comes in with a plain transfer and leaves through payouts that can each happen once.
contract NoirSettlement {
    address public authority;        // the NOIR chain authority: the only caller of seal() and payout()
    address public pendingAuthority;

    uint64 public lastTo;            // last NOIR block covered by a receipt
    uint64 public count;             // receipts written
    bytes32 public checkpoint;       // head of the receipt hash chain
    bytes32 public stateRoot;        // NOIR state root after block lastTo

    mapping(bytes32 => bool) public paid;   // payout id => already paid
    uint256 private locked = 1;

    event Sealed(uint64 indexed from, uint64 indexed to, bytes32 blocksRoot, bytes32 stateRoot, bytes32 lastBlockHash, uint64 txCount, bytes32 checkpoint);
    event Deposited(address indexed from, uint256 amount);
    event PaidOut(bytes32 indexed id, address indexed to, uint256 amount);
    event AuthorityChanged(address indexed authority);

    error NotAuthority();
    error OutOfOrder();
    error EmptyRange();
    error AlreadyPaid();
    error PayoutFailed();
    error Reentered();
    error NothingSent();

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotAuthority();
        _;
    }

    constructor(address authority_) {
        authority = authority_;
        emit AuthorityChanged(authority_);
    }

    /// @notice Write a receipt for NOIR blocks from..to. After the first receipt, every one must start exactly one block after the last.
    function seal(uint64 from, uint64 to, bytes32 blocksRoot, bytes32 stateRoot_, bytes32 lastBlockHash, uint64 txCount) external onlyAuthority {
        if (to < from) revert EmptyRange();
        if (count != 0 && from != lastTo + 1) revert OutOfOrder();
        checkpoint = sha256(abi.encodePacked(checkpoint, from, to, blocksRoot, stateRoot_, lastBlockHash, txCount));
        lastTo = to;
        stateRoot = stateRoot_;
        unchecked { count++; }
        emit Sealed(from, to, blocksRoot, stateRoot_, lastBlockHash, txCount, checkpoint);
    }

    /// @notice Deposit ETH. The sender's address is credited on NOIR.
    receive() external payable {
        if (msg.value == 0) revert NothingSent();
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable {
        if (msg.value == 0) revert NothingSent();
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Pay a withdrawal. Each id pays at most once, whatever is retried.
    function payout(bytes32 id, address payable to, uint256 amount) external onlyAuthority {
        if (locked != 1) revert Reentered();
        if (paid[id]) revert AlreadyPaid();
        paid[id] = true;
        locked = 2;
        (bool ok, ) = to.call{value: amount}("");
        locked = 1;
        if (!ok) revert PayoutFailed();
        emit PaidOut(id, to, amount);
    }

    function transferAuthority(address next) external onlyAuthority {
        pendingAuthority = next;
    }

    function acceptAuthority() external {
        if (msg.sender != pendingAuthority) revert NotAuthority();
        authority = msg.sender;
        pendingAuthority = address(0);
        emit AuthorityChanged(msg.sender);
    }
}
