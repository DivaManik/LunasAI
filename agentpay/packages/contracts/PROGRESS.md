# Contract Team — Progress Notes

**Update:** 2026-09-27 (V3: migrasi ke ERC-20 IDRX — DelegationCardV2 + MockIDRX deployed)
**Scope:** `packages/contracts/` only (per `docs/agents/01-contract-team.md`)

## Status: SELESAI. V2 (native tBNB, dengan hotfix authorizedAgent) DIPERTAHANKAN. V3/V2-ERC20 (DelegationCardV2 + MockIDRX) sudah live di BNB Testnet.

## V3 2026-09-27 — Migrasi ke ERC-20 IDRX (lihat laporan lengkap: `docs/agents/reports/05-contract-team-report-v3-idrx.md`)

**Kenapa:** Native tBNB diganti ERC-20 mock token "IDRX" (1 token = 1 IDR, decimals=2) supaya demo lebih natural pakai harga Rupiah.

**File baru (V1 `DelegationCard.sol` TIDAK disentuh):**
- `src/MockIDRX.sol` — ERC20 (OpenZeppelin v5.0.2) + Ownable, initial supply 10jt ke deployer, `mint()` owner-only
- `src/DelegationCardV2.sol` — sama logic dengan V1 (termasuk hotfix `authorizedAgent` dari 2026-09-25) tapi semua transfer native BNB diganti `IERC20(idrxToken).transfer/transferFrom`. `createCard` butuh user `approve()` dulu.
- `script/DeployMockIDRX.s.sol`, `script/DeployV2.s.sol` — Foundry deploy scripts
- `lib/openzeppelin-contracts/` — vendored manual (sama pola dengan `forge-std`: git clone plain, `.git` dihapus, karena masih belum ada git repo di project)

**Address LIVE (pakai ini untuk integrasi baru):**
```
IDRX_TOKEN_ADDRESS=0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996
DELEGATION_CARD_ADDRESS=0x9c8729f98bD42206D8a390360bd2326FFbf53837   (DelegationCardV2, ERC-20 IDRX)
```
Faucet sudah di-mint 1.000.000 IDRX masing-masing ke `0xBa4918Ff...9149f` (shop) dan `0x0a18fCB6...b7c1f` (testing wallet) — total shop wallet 11jt IDRX (10jt initial supply + 1jt faucet).

**Address LAMA (V1, native tBNB, sudah tidak dipakai sebagai default):**
```
0xACDAc5d57dB7a97013D002a8d073578347C057AE   (DelegationCard V1 + hotfix authorizedAgent, 2026-09-25)
0x0942C2ce428bD07Cef0FA6b833b3885aFc3390dd   (DelegationCard pre-hotfix, 2026-09-24)
```
Ketiganya masih live on-chain (kontrak tidak bisa dihapus), tapi cuma address V3 di atas yang tercatat di `agentpay/.env` sekarang.

**Test:** V1 tetap 13/13 PASS (tidak regresi). V2/ERC20 belum ada test suite Foundry terpisah — kalau mau ditambahkan, ikuti pola `test/DelegationCard.t.sol` tapi pakai MockIDRX + approve() sebelum createCard.

**Issue tercatat (bukan scope contract team, punya team lain):** `agentpay/.env` baris `TESTING_WALLET_ADDRESS= 0x0a18f...` ada spasi ekstra setelah `=` yang bikin `bash -c 'source .env'` error (non-fatal) — lihat detail di laporan V3.

---

## Riwayat sebelum V3 (2026-09-25 dan sebelumnya)

## HOTFIX 2026-09-25 — authorizedAgent (lihat `docs/agents/reports/hotfix-contract-approval.md`)

**Masalah:** `approveSpend`/`rejectSpend` cuma bisa dipanggil `card.owner`. Backend selalu sign pakai deployer wallet (bukan wallet user asli), jadi approval flow selalu revert saat demo — CRITICAL, blocking Bot Team & Frontend Team.

**Fix:**
- Struct `Card` tambah field `authorizedAgent` (address).
- `createCard` sekarang butuh param ke-4: `authorizedAgent`.
- `approveSpend` & `rejectSpend`: restriction diganti dari `require(card.owner == msg.sender, "Not card owner")` jadi `require(card.owner == msg.sender || card.authorizedAgent == msg.sender, "Not authorized")`.
- `revokeCard` **TIDAK diubah** — tetap owner-only (sesuai instruksi hotfix).

**Test:** ditambah 2 test baru khusus validasi fix (`test_ApproveSpend_SucceedsWhenCalledByAuthorizedAgent`, `test_RejectSpend_SucceedsWhenCalledByAuthorizedAgent`), plus 1 test lama (`RevertsIfNotCardOwner` → di-rename `RevertsIfNotOwnerOrAuthorizedAgent`, aktornya diganti dari `agent` ke `stranger` baru karena `agent` sekarang dipakai sebagai `authorizedAgent` di semua test — total **13/13 test PASS**.

### Hasil Deploy TERBARU (pakai hotfix ini — pakai address ini, bukan yang lama)

```
DELEGATION_CARD_ADDRESS=0xACDAc5d57dB7a97013D002a8d073578347C057AE
ABI_LOCATION=packages/contracts/out/DelegationCard.sol/DelegationCard.json
DEPLOYER_ADDRESS=0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
TX_HASH=0x2963e61cb9432b14ff81cca3cb8df09bd2be2c063d60f08267879a64a1fb8e8e
BSCSCAN_URL=https://testnet.bscscan.com/address/0xACDAc5d57dB7a97013D002a8d073578347C057AE
```

`agentpay/.env` sudah diupdate `DELEGATION_CARD_ADDRESS` ke address baru di atas.

### Impact ke tim lain (dari hotfix ini)

| Tim | Yang berubah |
|---|---|
| Backend Team | ABI `createCard` berubah — tambah param `authorizedAgent` (address ke-4). **Wajib update ABI di backend** dari `out/DelegationCard.sol/DelegationCard.json` yang baru. Saat backend call `approveSpend`/`rejectSpend`, sekarang bisa sign pakai deployer/backend wallet (tidak perlu wallet user asli). |
| Frontend Team | Form `createCard` perlu kirim param `authorizedAgent` = deployer/backend wallet address (`0xBa4918Ff177C289F01fd362bc8a55B3e0469149f`, sama seperti `DEPLOYER_ADDRESS` di atas / `SHOP_WALLET_ADDRESS` di `.env`). |
| Bot Team | Tidak ada perubahan (sesuai laporan hotfix). |

### Address LAMA (sebelum hotfix — SUDAH TIDAK DIPAKAI, jangan bingung)

```
Old address (pre-hotfix): 0x0942C2ce428bD07Cef0FA6b833b3885aFc3390dd
```
Kontrak lama ini masih ada di chain tapi ABI-nya beda (createCard cuma 3 param, approveSpend/rejectSpend masih strict owner-only). Semua tim harus pindah ke address baru di atas.

---

## Riwayat sebelum hotfix (2026-09-24)

### Catatan penting soal RPC endpoint

`BNB_RPC_URL` di `.env` akhirnya diisi dengan **Alchemy** (`https://bnb-testnet.g.alchemy.com/v2/<API_KEY>`), BUKAN endpoint publik default `data-seed-prebsc-1-s1.binance.org` yang tercantum di jobdesk. Alasan: dari environment WSL ini, semua RPC publik gratis (binance official, publicnode, drpc.org) sangat flaky/timeout — bahkan `drpc.org` sempat kena rate-limit "free plan timeout" saat estimasi gas EIP-1559. Alchemy dengan API key pribadi jauh lebih stabil (response ~0.3s konsisten).

**Kalau API key Alchemy ini nanti di-regenerate/invalid**, ganti `BNB_RPC_URL` di `agentpay/.env` dengan RPC BNB testnet lain yang valid (chain ID harus 97 / `0x61`), lalu re-run `npm run deploy:testnet` KALAU perlu redeploy — tapi karena kontrak sudah live di address di atas, **tidak perlu deploy ulang** kecuali ada perubahan kode kontrak.

Juga dipakai flag `--legacy` saat deploy (skip estimasi fee EIP-1559) karena BSC testnet lebih cocok pakai legacy gas pricing dan beberapa RPC gratis tidak mendukung `eth_feeHistory` dengan baik.

## Status lama (sebelum deploy, dipertahankan sebagai histori)

## PENTING: toolchain sudah pindah dari Hardhat ke Foundry

Atas permintaan user, seluruh setup di package ini di-migrasi dari Hardhat/TypeScript ke **Foundry** (forge/cast/anvil). Struktur file lama (Hardhat) sudah dihapus total — jangan cari `hardhat.config.ts`, `tsconfig.json`, `contracts/`, `typechain-types/`, dll, semua sudah tidak ada.

### Struktur baru (Foundry)

```
packages/contracts/
├── foundry.toml           # config: solc 0.8.20, evm paris, network bnb_testnet (chain 97)
├── remappings.txt         # forge-std/=lib/forge-std/src/
├── package.json           # scripts npm tinggal wrapper tipis ke forge
├── .gitignore              # out/, cache/, broadcast/, .env
├── src/
│   └── DelegationCard.sol # sama persis logic-nya, cuma pindah lokasi dari contracts/
├── test/
│   └── DelegationCard.t.sol  # rewrite dari Chai/Mocha (.test.ts) ke Foundry (Test.sol), 11 test, semua PASS
├── script/
│   └── Deploy.s.sol       # rewrite dari scripts/deploy.ts, pakai forge Script + vm.broadcast
└── lib/
    └── forge-std/          # di-vendor manual (git clone biasa, .git dihapus) — BUKAN git submodule,
                             # karena repo `agentpay` ini sendiri belum di-init sebagai git repo.
                             # Kalau nanti Task 1 team init git di root, lib/forge-std tetap aman
                             # (plain folder, bukan submodule) tapi bisa dipertimbangkan pindah ke
                             # submodule proper kalau perlu update versi forge-std di masa depan.
```

### Kenapa forge-std di-vendor manual, bukan `forge install`

`forge install foundry-rs/forge-std` normalnya pakai git submodule, tapi gagal dengan:
```
Error: git submodule exited with code 128: fatal: not a git repository
```
karena tidak ada `.git` di manapun dalam tree `E:\Hackaton\BNB`. Solusinya: `git clone --depth 1` langsung ke `lib/forge-std`, lalu hapus folder `.git` di dalamnya supaya jadi source biasa (bukan submodule). Ini valid dan umum dipakai kalau project tidak pakai git submodule workflow.

**Kalau nanti repo di-init git dan mau pakai `forge install` yang proper (submodule):** hapus `lib/forge-std`, lalu jalankan `forge install foundry-rs/forge-std --no-commit` dari root git yang baru.

### Verifikasi yang sudah dijalankan (Foundry)

```bash
cd packages/contracts
forge build   # sukses, "Compiler run successful!" (cuma ada lint notes/warnings, bukan error —
               # notes soal "prefer custom errors" diabaikan sengaja karena spec resmi minta persis
               # string message tsb agar backend bisa parse, lihat docs/agents/01-contract-team.md)
forge test    # Ran 11 tests ... 11 passed; 0 failed; 0 skipped
```

Semua 11 test case dari spec ter-cover, 1:1 mapping dari test lama:
1. createCard stores correct values
2. createCard reverts if value != budget
3. spend auto-approve + transfer ke merchant
4. spend bikin PendingSpend kalau amount > autoApproveLimit
5. spend revert kalau card expired
6. spend revert kalau over budget
7. approveSpend execute transfer + mark approved
8. approveSpend revert kalau bukan owner
9. approveSpend revert kalau already processed
10. revokeCard refund remaining + mark inactive
11. revokeCard revert kalau bukan owner

### npm scripts (masih ada, jadi wrapper ke forge — supaya konsisten dgn workspace lain)

```json
"compile": "forge build",
"test": "forge test",
"deploy:testnet": "bash -c 'set -a; source ../../.env; set +a; forge script script/Deploy.s.sol --rpc-url \"$BNB_RPC_URL\" --broadcast --private-key \"$PRIVATE_KEY\" --legacy'"
```

`deploy:testnet` sengaja `source ../../.env` manual (bukan andalkan forge auto-load `.env`) karena lokasi env file yang disepakati team adalah `agentpay/.env` (root monorepo), BUKAN `packages/contracts/.env`. Ini tetap konsisten dengan konvensi lama di Hardhat config.

Flag `--legacy` di script ini **wajib ada** (sudah di-update setelah deploy sukses) — tanpa itu, `forge script` coba estimasi fee EIP-1559 (`eth_feeHistory`) yang bikin gagal di beberapa RPC gratis (lihat "Catatan penting soal RPC endpoint" di atas).

## Bug yang diperbaiki dari draft plan (masih berlaku)

Plan di `docs/superpowers/plans/2026-09-24-agentpay-implementation.md` (Task 2, Step 3) punya bug di `revokeCard`: pakai error message `"Card already inactive"`. Ini **tidak match** spec resmi yang minta string persis `"Card is not active"` (backend parse string ini). Sudah diperbaiki di kode (tetap dipertahankan setelah migrasi ke Foundry) — pastikan agent baru TIDAK copy-paste ulang dari file plan tsb tanpa cek spec.

## Riwayat blocking (sudah resolved, dipertahankan sebagai histori)

Sebelumnya deploy blocked karena `agentpay/.env` belum ada. Sudah dibuat dan diisi oleh user langsung (bukan di-generate oleh agent) via sesi chat — user isi `PRIVATE_KEY` dan sempat lupa prefix `0x` (sudah diperbaiki agent). RPC URL sempat dicoba 3 kali (binance official → timeout, publicnode → flaky ~50%, drpc.org → kena rate-limit "free plan"), akhirnya settle di Alchemy (lihat "Catatan penting soal RPC endpoint" di atas).

Catatan: ada file `E:\Hackaton\BNB\.env` (di root repo, BUKAN di dalam folder `agentpay/`) tapi isinya cuma `SHOP_WALLET_ADDRESS` dan `SHOP_PORT` — punya package `shop`, bukan untuk contracts. Jangan salah pakai.

## Next steps untuk agent lanjutan

Tidak ada next step wajib untuk deploy — sudah selesai (lihat "Hasil Deploy TERBARU" di bagian HOTFIX paling atas). Yang mungkin relevan untuk agent/team lain:

1. **Backend team (Task 4):** pakai `DELEGATION_CARD_ADDRESS` dari `agentpay/.env`, dan ABI dari `packages/contracts/out/DelegationCard.sol/DelegationCard.json` (bukan `artifacts/` seperti konvensi Hardhat lama).
2. Kalau ada perubahan kode kontrak di masa depan yang butuh redeploy: `cd packages/contracts && npm run deploy:testnet` (env sudah lengkap, tinggal jalan). Ingat update `DELEGATION_CARD_ADDRESS` di `.env` lagi kalau redeploy menghasilkan address baru.
3. Kalau Alchemy API key expired/invalid, ganti `BNB_RPC_URL` di `agentpay/.env` — jangan pakai `data-seed-prebsc-1-s1.binance.org` (sudah terbukti timeout dari environment ini), coba Alchemy/Infura/QuickNode baru dulu.

## Yang TIDAK boleh disentuh (di luar scope)

- Jangan buat/ubah root `agentpay/package.json` (workspaces config) — itu Task 1, punya team lain.
- Jangan ubah package lain (`backend`, `bot`, `shop`, `dashboard`) — belum ada, dan bukan scope Contract Team.
- Jangan tambah fitur di luar spec (fee mechanism, multi-token, dll) — constraint eksplisit dari jobdesk.
