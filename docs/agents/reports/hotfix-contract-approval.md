# Hotfix Request: Contract Team

**Dari:** Orchestrator
**Tanggal:** 2026-09-25
**Priority:** CRITICAL — blocking Bot Team dan Frontend Team

---

## Masalah

`approveSpend` dan `rejectSpend` di `DelegationCard.sol` mensyaratkan `msg.sender == card.owner`. Backend selalu sign pakai deployer wallet, bukan user wallet. Akibatnya approval flow akan selalu revert saat demo.

---

## Yang Harus Diubah

**File:** `agentpay/packages/contracts/src/DelegationCard.sol`

Ubah `approveSpend` dan `rejectSpend` — hapus restriction `msg.sender == card.owner`, ganti dengan verifikasi bahwa caller adalah **authorized agent** yang didaftarkan saat card dibuat.

### Pendekatan Paling Sederhana untuk MVP:

Tambahkan `authorizedAgent` di struct `Card` — address yang boleh execute spend (ini adalah deployer/backend wallet). User set saat `createCard`.

```solidity
struct Card {
    address owner;
    address authorizedAgent;  // ← TAMBAH INI
    uint256 totalBudget;
    uint256 spentAmount;
    uint256 autoApproveLimit;
    uint256 expiryTimestamp;
    bool isActive;
}
```

Update `createCard` untuk terima `authorizedAgent` sebagai parameter:
```solidity
function createCard(
    uint256 budget,
    uint256 autoApproveLimit,
    uint256 expiryDays,
    address authorizedAgent   // ← TAMBAH INI
) external payable returns (uint256)
```

Update restriction di `approveSpend` dan `rejectSpend`:
```solidity
// SEBELUM:
require(card.owner == msg.sender, "Not card owner");

// SESUDAH:
require(
    card.owner == msg.sender || card.authorizedAgent == msg.sender,
    "Not authorized"
);
```

`revokeCard` tetap hanya `owner` yang bisa revoke — jangan ubah.

---

## Setelah Fix

1. Run tests — pastikan semua pass dengan signature baru
2. Re-deploy ke BNB Testnet
3. Update `agentpay/.env`:
   ```
   DELEGATION_CARD_ADDRESS=0x<new_address>
   ```
4. Update `PROGRESS.md` dengan address baru + tx hash
5. Laporan ke Orchestrator dengan contract address baru

---

## Info Deployment Sebelumnya

```
Old address: 0x0942C2ce428bD07Cef0FA6b833b3885aFc3390dd
Deployer:    0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
RPC:         https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg
ABI:         agentpay/packages/contracts/out/DelegationCard.sol/DelegationCard.json
Flag:        --legacy (wajib untuk BNB Testnet)
```

---

## Impact ke Tim Lain Setelah Fix

| Tim | Yang Berubah |
|---|---|
| Backend Team | `createCard` di ABI berubah — tambah param `authorizedAgent`. Update ABI di backend. |
| Frontend Team | `createCard` form perlu kirim `authorizedAgent` = deployer wallet address |
| Bot Team | Tidak ada perubahan |
