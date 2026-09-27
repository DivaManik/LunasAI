// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockIDRX is ERC20, Ownable {
    uint8 private constant DECIMALS = 2;
    uint256 private constant INITIAL_SUPPLY = 10_000_000 * 10 ** DECIMALS;

    constructor() ERC20("IDRX", "IDRX") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
