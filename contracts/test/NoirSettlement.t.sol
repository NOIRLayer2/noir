// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import "../src/NoirSettlement.sol";

interface Vm { function prank(address) external; function deal(address, uint256) external; function expectRevert(bytes4) external; }

contract Reenter {
    NoirSettlement s; bytes32 id;
    constructor(NoirSettlement s_) { s = s_; }
    function arm(bytes32 id_) external { id = id_; }
    receive() external payable { s.payout(id, payable(address(this)), 1); }
}

contract NoirSettlementTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    NoirSettlement s; address auth = address(0xA11CE); address user = address(0xB0B); address payee = address(0xCAFE);
    bytes32 constant BR = keccak256("blocks"); bytes32 constant SR = keccak256("state"); bytes32 constant LH = keccak256("last");

    function setUp() public { s = new NoirSettlement(auth); vm.deal(user, 10 ether); }

    function testSealChainsAndMatchesOffchainHash() public {
        vm.prank(auth); s.seal(5, 9, BR, SR, LH, 3);
        bytes32 c1 = sha256(abi.encodePacked(bytes32(0), uint64(5), uint64(9), BR, SR, LH, uint64(3)));
        require(s.checkpoint() == c1 && s.lastTo() == 9 && s.count() == 1 && s.stateRoot() == SR, "first");
        vm.prank(auth); s.seal(10, 10, BR, LH, SR, 0);
        require(s.checkpoint() == sha256(abi.encodePacked(c1, uint64(10), uint64(10), BR, LH, SR, uint64(0))) && s.lastTo() == 10 && s.count() == 2, "second");
    }
    function testSealMustNotSkip() public {
        vm.prank(auth); s.seal(1, 4, BR, SR, LH, 1);
        vm.prank(auth); vm.expectRevert(NoirSettlement.OutOfOrder.selector); s.seal(6, 7, BR, SR, LH, 1);
    }
    function testSealMustNotReplay() public {
        vm.prank(auth); s.seal(1, 4, BR, SR, LH, 1);
        vm.prank(auth); vm.expectRevert(NoirSettlement.OutOfOrder.selector); s.seal(1, 4, BR, SR, LH, 1);
    }
    function testSealRejectsEmptyRange() public {
        vm.prank(auth); vm.expectRevert(NoirSettlement.EmptyRange.selector); s.seal(5, 4, BR, SR, LH, 0);
    }
    function testOnlyAuthoritySeals() public {
        vm.prank(user); vm.expectRevert(NoirSettlement.NotAuthority.selector); s.seal(1, 1, BR, SR, LH, 0);
    }
    function testDepositByPlainTransfer() public {
        vm.prank(user); (bool ok, ) = address(s).call{value: 1 ether}("");
        require(ok && address(s).balance == 1 ether, "receive");
        vm.prank(user); s.deposit{value: 0.5 ether}();
        require(address(s).balance == 1.5 ether, "deposit");
    }
    function testZeroDepositReverts() public {
        vm.prank(user); vm.expectRevert(NoirSettlement.NothingSent.selector); s.deposit{value: 0}();
    }
    function testPayoutOnce() public {
        vm.prank(user); s.deposit{value: 2 ether}();
        vm.prank(auth); s.payout(bytes32(uint256(1)), payable(payee), 1 ether);
        require(payee.balance == 1 ether && s.paid(bytes32(uint256(1))), "paid");
        vm.prank(auth); vm.expectRevert(NoirSettlement.AlreadyPaid.selector); s.payout(bytes32(uint256(1)), payable(payee), 1 ether);
        require(payee.balance == 1 ether, "paid twice");
    }
    function testOnlyAuthorityPays() public {
        vm.prank(user); s.deposit{value: 1 ether}();
        vm.prank(user); vm.expectRevert(NoirSettlement.NotAuthority.selector); s.payout(bytes32(uint256(2)), payable(user), 1 ether);
    }
    function testPayoutBeyondBalanceReverts() public {
        vm.prank(auth); vm.expectRevert(NoirSettlement.PayoutFailed.selector); s.payout(bytes32(uint256(3)), payable(payee), 1 ether);
        require(!s.paid(bytes32(uint256(3))), "a failed payout stays payable");
    }
    function testPayoutCannotReenter() public {
        vm.prank(user); s.deposit{value: 2 ether}();
        Reenter bad = new Reenter(s); bad.arm(bytes32(uint256(9)));
        vm.prank(auth); vm.expectRevert(NoirSettlement.PayoutFailed.selector); s.payout(bytes32(uint256(8)), payable(address(bad)), 1 ether);
        require(address(s).balance == 2 ether, "nothing left");
    }
    function testAuthorityHandover() public {
        vm.prank(auth); s.transferAuthority(user);
        vm.prank(payee); vm.expectRevert(NoirSettlement.NotAuthority.selector); s.acceptAuthority();
        vm.prank(user); s.acceptAuthority();
        require(s.authority() == user, "handover");
        vm.prank(auth); vm.expectRevert(NoirSettlement.NotAuthority.selector); s.seal(1, 1, BR, SR, LH, 0);
    }
}
