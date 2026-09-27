# Prompt untuk Contract Team (V3 — MockIDRX + DelegationCard Upgrade)

> Copy-paste prompt di bawah ini ke terminal baru (agent baru).

---

```
Kamu adalah Contract Team untuk proyek AgentPay — hackathon Indonesia Web3.

Tugasmu adalah:
1. Deploy ERC-20 mock token bernama "IDRX" di BNB Testnet (1 token = 1 IDR)
2. Deploy ulang DelegationCard.sol yang sudah diupgrade untuk support ERC-20 IDRX
   (menggantikan native tBNB sebagai mata uang spending)

Working directory: E:\Hackaton\BNB

---

## Konteks Proyek

AgentPay adalah sistem spending delegation: user buat "spending card" on-chain,
lalu AI agent bisa belanja pakai card itu dalam batas budget.

Saat ini kontrak memakai native tBNB (ETH-like). Kita upgrade ke ERC-20 IDRX
agar lebih natural untuk demo (harga dalam Rupiah, bukan BNB).

Contract yang sudah ada: E:\Hackaton\BNB\agentpay\packages\contracts\src\DelegationCard.sol
Environment: E:\Hackaton\BNB\agentpay\.env

---

## Task 1 — Deploy MockIDRX ERC-20

Buat file baru: agentpay/packages/contracts/src/MockIDRX.sol

Spec token:
- Name: "IDRX"
- Symbol: "IDRX"
- Decimals: 2  (karena 1 token = 1 IDR, dan kita mau harga seperti 5000, bukan 5000000000000000)
- Total supply awal: 10.000.000 IDRX (dikirim ke deployer)
- Fungsi mint(address to, uint256 amount) — hanya owner bisa mint (untuk faucet demo)
- Standard OpenZeppelin ERC20 + Ownable

Cara deploy (gunakan Foundry/forge atau script manual dengan viem/ethers):
- Baca private key dari E:\Hackaton\BNB\agentpay\.env (PRIVATE_KEY)
- BNB_RPC_URL juga ada di .env
- Setelah deploy, catat contract address

Jika Foundry tidak tersedia, buat deployment script dengan viem di:
agentpay/packages/contracts/scripts/deployMockIDRX.ts

---

## Task 2 — Upgrade DelegationCard.sol

Buat file baru: agentpay/packages/contracts/src/DelegationCardV2.sol

Perubahan dari V1:
- Tambah state variable: address public idrxToken (set di constructor)
- createCard: ganti `payable` + `msg.value` → pakai IERC20(idrxToken).transferFrom(msg.sender, address(this), budget)
  - User harus approve dulu ke kontrak sebelum createCard
  - Hapus require(msg.value == budget)
- spend: ganti `merchant.transfer(amount)` → IERC20(idrxToken).transfer(merchant, amount)
- approveSpend: ganti `payable(ps.merchant).transfer(ps.amount)` → IERC20(idrxToken).transfer(ps.merchant, ps.amount)
- revokeCard: ganti `payable(msg.sender).transfer(remaining)` → IERC20(idrxToken).transfer(msg.sender, remaining)
- Semua event tetap sama
- Import: gunakan interface IERC20 minimal (tidak perlu import OpenZeppelin jika tidak ada)

Interface IERC20 minimal yang bisa hardcode di file:
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

Constructor baru:
constructor(address _idrxToken) {
    idrxToken = _idrxToken;
}

---

## Task 3 — Deploy DelegationCardV2

Deploy DelegationCardV2.sol ke BNB Testnet dengan parameter:
- constructor arg: address MockIDRX yang baru di-deploy di Task 1

Buat deployment script: agentpay/packages/contracts/scripts/deployV2.ts
(atau gunakan forge jika tersedia)

---

## Task 4 — Update .env

Setelah deploy, update E:\Hackaton\BNB\agentpay\.env:
- Tambah: IDRX_TOKEN_ADDRESS=<address MockIDRX>
- Update: DELEGATION_CARD_ADDRESS=<address DelegationCardV2>
  (simpan address lama sebagai komentar: # OLD V1: 0xACDAc5d57dB7a97013D002a8d073578347C057AE)

---

## Task 5 — Update ABI

Copy ABI hasil compile ke:
- agentpay/packages/contracts/out/MockIDRX.json  (minimal: abi array saja)
- agentpay/packages/contracts/out/DelegationCardV2.sol/DelegationCardV2.json

Jika pakai forge: `forge build` otomatis generate di out/
Jika manual: export ABI dari deployment script dan tulis ke file JSON.

---

## Output untuk Orchestrator

Buat laporan di: docs/agents/reports/05-contract-team-report-v3-idrx.md

Isi laporan:
- Address MockIDRX yang di-deploy
- Address DelegationCardV2 yang di-deploy
- TxHash deploy masing-masing
- Bukti: output dari get_card_info atau getCard(cardId) lewat cast/curl setelah deploy
- Faucet test: mint 1.000.000 IDRX ke wallet 0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
  dan wallet 0x0a18fCB673099443CB8bA44AE7198529275b7c1f
- Issues jika ada

---

## Environment yang Tersedia

Dari E:\Hackaton\BNB\agentpay\.env:
- PRIVATE_KEY=0x44e8ffc77a00c30cd55a5e23e9cc594c0118dbb549a6aef8eedcf4eb16597bf9
- BNB_RPC_URL=https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg
- DELEGATION_CARD_ADDRESS=0xACDAc5d57dB7a97013D002a8d073578347C057AE (V1, akan diganti)
- SHOP_WALLET_ADDRESS=0xBa4918Ff177C289F01fd362bc8a55B3e0469149f

---

## Aturan

- Jangan ubah DelegationCard.sol yang lama — buat file baru DelegationCardV2.sol
- Jangan ubah packages lain (backend, shop, dashboard)
- Gunakan Solidity ^0.8.20
- Jika forge tidak tersedia, pakai viem + typescript untuk deploy
- Check: `forge --version` atau `npx foundry-cli --version` dulu sebelum pilih toolchain

Working directory: E:\Hackaton\BNB
```
