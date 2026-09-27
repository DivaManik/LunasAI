// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DelegationCard} from "../src/DelegationCard.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying with:", deployer);
        console.log("Balance (wei):", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);
        DelegationCard delegationCard = new DelegationCard();
        vm.stopBroadcast();

        address deployedAddress = address(delegationCard);

        console.log("DelegationCard deployed to:", deployedAddress);
        console.log("Deployer address:", deployer);
        console.log(
            "BscScan URL: https://testnet.bscscan.com/address/",
            deployedAddress
        );
        console.log("Update .env: DELEGATION_CARD_ADDRESS=", deployedAddress);
    }
}
