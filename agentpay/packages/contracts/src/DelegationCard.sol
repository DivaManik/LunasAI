// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DelegationCard {
    struct Card {
        address owner;
        address authorizedAgent;
        uint256 totalBudget;
        uint256 spentAmount;
        uint256 autoApproveLimit;
        uint256 expiryTimestamp;
        bool isActive;
    }

    struct PendingSpend {
        uint256 cardId;
        address merchant;
        uint256 amount;
        string description;
        bool isApproved;
        bool isRejected;
        bool isExecuted;
        uint256 createdAt;
    }

    uint256 private _nextCardId = 1;
    uint256 private _nextSpendId = 1;

    mapping(uint256 => Card) public cards;
    mapping(uint256 => PendingSpend) public pendingSpends;
    mapping(address => uint256[]) public ownerCards;

    event CardCreated(uint256 indexed cardId, address indexed owner, uint256 budget);
    event SpendExecuted(uint256 indexed cardId, address indexed merchant, uint256 amount);
    event SpendPending(uint256 indexed spendId, uint256 indexed cardId, uint256 amount);
    event SpendApproved(uint256 indexed spendId);
    event SpendRejected(uint256 indexed spendId);
    event CardRevoked(uint256 indexed cardId);

    function createCard(
        uint256 budget,
        uint256 autoApproveLimit,
        uint256 expiryDays,
        address authorizedAgent
    ) external payable returns (uint256) {
        require(msg.value == budget, "Must send exact budget amount");
        require(budget > 0, "Budget must be > 0");
        require(autoApproveLimit <= budget, "Auto-approve limit cannot exceed budget");

        uint256 cardId = _nextCardId++;
        cards[cardId] = Card({
            owner: msg.sender,
            authorizedAgent: authorizedAgent,
            totalBudget: budget,
            spentAmount: 0,
            autoApproveLimit: autoApproveLimit,
            expiryTimestamp: block.timestamp + (expiryDays * 1 days),
            isActive: true
        });
        ownerCards[msg.sender].push(cardId);

        emit CardCreated(cardId, msg.sender, budget);
        return cardId;
    }

    function spend(
        uint256 cardId,
        address payable merchant,
        uint256 amount,
        string calldata description
    ) external returns (bool autoApproved, uint256 pendingSpendId) {
        Card storage card = cards[cardId];
        require(card.isActive, "Card is not active");
        require(block.timestamp < card.expiryTimestamp, "Card expired");
        require(card.spentAmount + amount <= card.totalBudget, "Insufficient budget");

        if (amount <= card.autoApproveLimit) {
            card.spentAmount += amount;
            merchant.transfer(amount);
            emit SpendExecuted(cardId, merchant, amount);
            return (true, 0);
        } else {
            uint256 spendId = _nextSpendId++;
            pendingSpends[spendId] = PendingSpend({
                cardId: cardId,
                merchant: merchant,
                amount: amount,
                description: description,
                isApproved: false,
                isRejected: false,
                isExecuted: false,
                createdAt: block.timestamp
            });
            emit SpendPending(spendId, cardId, amount);
            return (false, spendId);
        }
    }

    function approveSpend(uint256 spendId) external {
        PendingSpend storage ps = pendingSpends[spendId];
        Card storage card = cards[ps.cardId];
        require(card.owner == msg.sender || card.authorizedAgent == msg.sender, "Not authorized");
        require(!ps.isApproved && !ps.isRejected, "Already processed");
        require(!ps.isExecuted, "Already executed");

        ps.isApproved = true;
        ps.isExecuted = true;
        card.spentAmount += ps.amount;
        payable(ps.merchant).transfer(ps.amount);
        emit SpendApproved(spendId);
        emit SpendExecuted(ps.cardId, ps.merchant, ps.amount);
    }

    function rejectSpend(uint256 spendId) external {
        PendingSpend storage ps = pendingSpends[spendId];
        Card storage card = cards[ps.cardId];
        require(card.owner == msg.sender || card.authorizedAgent == msg.sender, "Not authorized");
        require(!ps.isApproved && !ps.isRejected, "Already processed");

        ps.isRejected = true;
        emit SpendRejected(spendId);
    }

    function revokeCard(uint256 cardId) external {
        Card storage card = cards[cardId];
        require(card.owner == msg.sender, "Not card owner");
        require(card.isActive, "Card is not active");

        card.isActive = false;
        uint256 remaining = card.totalBudget - card.spentAmount;
        if (remaining > 0) {
            payable(msg.sender).transfer(remaining);
        }
        emit CardRevoked(cardId);
    }

    function getCard(uint256 cardId) external view returns (Card memory) {
        return cards[cardId];
    }

    function getOwnerCards(address owner) external view returns (uint256[] memory) {
        return ownerCards[owner];
    }
}
