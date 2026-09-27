// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockIDRX} from "../src/MockIDRX.sol";

contract DeployMockIDRX is Script {
    address constant SHOP_WALLET = 0xBa4918Ff177C289F01fd362bc8a55B3e0469149f;
    address constant TESTING_WALLET = 0x0a18fCB673099443CB8bA44AE7198529275b7c1f;
    uint256 constant FAUCET_AMOUNT = 1_000_000 * 10 ** 2; // 1,000,000 IDRX (decimals = 2)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying MockIDRX with:", deployer);

        vm.startBroadcast(deployerPrivateKey);
        MockIDRX idrx = new MockIDRX();
        idrx.mint(SHOP_WALLET, FAUCET_AMOUNT);
        idrx.mint(TESTING_WALLET, FAUCET_AMOUNT);
        vm.stopBroadcast();

        address idrxAddress = address(idrx);
        console.log("MockIDRX deployed to:", idrxAddress);
        console.log("Deployer address:", deployer);
        console.log("Faucet minted 1,000,000 IDRX to shop wallet:", SHOP_WALLET);
        console.log("Faucet minted 1,000,000 IDRX to testing wallet:", TESTING_WALLET);
        console.log("BscScan URL: https://testnet.bscscan.com/address/", idrxAddress);
        console.log("Update .env: IDRX_TOKEN_ADDRESS=", idrxAddress);
    }
}
