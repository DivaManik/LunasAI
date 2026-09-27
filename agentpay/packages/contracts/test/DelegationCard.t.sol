// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DelegationCard} from "../src/DelegationCard.sol";

contract DelegationCardTest is Test {
    DelegationCard internal card;

    address internal owner = makeAddr("owner");
    address internal agent = makeAddr("agent");
    address internal stranger = makeAddr("stranger");
    address payable internal merchant = payable(makeAddr("merchant"));

    uint256 internal constant BUDGET = 0.1 ether;
    uint256 internal constant AUTO_LIMIT = 0.01 ether;
    uint256 internal constant EXPIRY_DAYS = 7;

    function setUp() public {
        card = new DelegationCard();
        vm.deal(owner, 10 ether);
        vm.deal(agent, 1 ether);
        vm.deal(stranger, 1 ether);
    }

    function _createDefaultCard() internal returns (uint256 cardId) {
        vm.prank(owner);
        cardId = card.createCard{value: BUDGET}(BUDGET, AUTO_LIMIT, EXPIRY_DAYS, agent);
    }

    function test_CreateCard_StoresCardWithCorrectValues() public {
        _createDefaultCard();
        DelegationCard.Card memory c = card.getCard(1);
        assertEq(c.owner, owner);
        assertEq(c.authorizedAgent, agent);
        assertEq(c.totalBudget, BUDGET);
        assertEq(c.autoApproveLimit, AUTO_LIMIT);
        assertTrue(c.isActive);
    }

    function test_CreateCard_RevertsIfValueDoesNotMatchBudget() public {
        vm.prank(owner);
        vm.expectRevert("Must send exact budget amount");
        card.createCard{value: 0.05 ether}(BUDGET, AUTO_LIMIT, EXPIRY_DAYS, agent);
    }

    function test_Spend_AutoApprovesAndTransfersToMerchant() public {
        _createDefaultCard();
        uint256 smallAmount = 0.005 ether;
        uint256 balanceBefore = merchant.balance;

        vm.prank(agent);
        card.spend(1, merchant, smallAmount, "small item");

        assertEq(merchant.balance - balanceBefore, smallAmount);

        DelegationCard.Card memory c = card.getCard(1);
        assertEq(c.spentAmount, smallAmount);
    }

    function test_Spend_CreatesPendingSpendIfAmountExceedsAutoApproveLimit() public {
        _createDefaultCard();
        uint256 bigAmount = 0.05 ether;

        vm.prank(agent);
        card.spend(1, merchant, bigAmount, "big item");

        (, , uint256 amount, , bool isApproved, , bool isExecuted, ) = card.pendingSpends(1);
        assertEq(amount, bigAmount);
        assertFalse(isApproved);
        assertFalse(isExecuted);
    }

    function test_Spend_RevertsIfCardExpired() public {
        vm.prank(owner);
        card.createCard{value: BUDGET}(BUDGET, AUTO_LIMIT, 0, agent);

        vm.warp(block.timestamp + 86401);

        vm.prank(agent);
        vm.expectRevert("Card expired");
        card.spend(1, merchant, AUTO_LIMIT, "item");
    }

    function test_Spend_RevertsIfOverBudget() public {
        _createDefaultCard();

        vm.prank(agent);
        vm.expectRevert("Insufficient budget");
        card.spend(1, merchant, 0.2 ether, "expensive");
    }

    function test_ApproveSpend_ExecutesTransferAndMarksApproved() public {
        _createDefaultCard();
        uint256 bigAmount = 0.05 ether;

        vm.prank(agent);
        card.spend(1, merchant, bigAmount, "big item");

        uint256 balanceBefore = merchant.balance;

        vm.prank(owner);
        card.approveSpend(1);

        assertEq(merchant.balance - balanceBefore, bigAmount);

        (, , , , bool isApproved, , , ) = card.pendingSpends(1);
        assertTrue(isApproved);
    }

    function test_ApproveSpend_SucceedsWhenCalledByAuthorizedAgent() public {
        _createDefaultCard();
        uint256 bigAmount = 0.05 ether;

        vm.prank(agent);
        card.spend(1, merchant, bigAmount, "big item");

        uint256 balanceBefore = merchant.balance;

        // authorizedAgent (backend/deployer wallet) approves on behalf of owner —
        // this is exactly the flow the hotfix unblocks: backend signs with its own
        // wallet, not the card owner's wallet.
        vm.prank(agent);
        card.approveSpend(1);

        assertEq(merchant.balance - balanceBefore, bigAmount);

        (, , , , bool isApproved, , , ) = card.pendingSpends(1);
        assertTrue(isApproved);
    }

    function test_RejectSpend_SucceedsWhenCalledByAuthorizedAgent() public {
        _createDefaultCard();

        vm.prank(agent);
        card.spend(1, merchant, 0.05 ether, "item");

        vm.prank(agent);
        card.rejectSpend(1);

        (, , , , , bool isRejected, , ) = card.pendingSpends(1);
        assertTrue(isRejected);
    }

    function test_ApproveSpend_RevertsIfNotOwnerOrAuthorizedAgent() public {
        _createDefaultCard();

        vm.prank(agent);
        card.spend(1, merchant, 0.05 ether, "item");

        vm.prank(stranger);
        vm.expectRevert("Not authorized");
        card.approveSpend(1);
    }

    function test_ApproveSpend_RevertsIfAlreadyProcessed() public {
        _createDefaultCard();

        vm.prank(agent);
        card.spend(1, merchant, 0.05 ether, "item");

        vm.prank(owner);
        card.approveSpend(1);

        vm.prank(owner);
        vm.expectRevert("Already processed");
        card.approveSpend(1);
    }

    function test_RevokeCard_RefundsRemainingBudgetAndMarksInactive() public {
        _createDefaultCard();
        uint256 balanceBefore = owner.balance;

        vm.prank(owner);
        card.revokeCard(1);

        assertEq(owner.balance - balanceBefore, BUDGET);

        DelegationCard.Card memory c = card.getCard(1);
        assertFalse(c.isActive);
    }

    function test_RevokeCard_RevertsIfNotCardOwner() public {
        _createDefaultCard();

        // authorizedAgent can approve/reject spends, but revokeCard stays owner-only.
        vm.prank(agent);
        vm.expectRevert("Not card owner");
        card.revokeCard(1);
    }
}
