// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DelegationCardV2} from "../src/DelegationCardV2.sol";

contract DeployV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address idrxToken = vm.envAddress("IDRX_TOKEN_ADDRESS");

        console.log("Deploying DelegationCardV2 with:", deployer);
        console.log("Using IDRX token:", idrxToken);

        vm.startBroadcast(deployerPrivateKey);
        DelegationCardV2 v2 = new DelegationCardV2(idrxToken);
        vm.stopBroadcast();

        address v2Address = address(v2);
        console.log("DelegationCardV2 deployed to:", v2Address);
        console.log("Deployer address:", deployer);
        console.log("BscScan URL: https://testnet.bscscan.com/address/", v2Address);
        console.log("Update .env: DELEGATION_CARD_ADDRESS=", v2Address);
    }
}
