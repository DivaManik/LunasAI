# Contract Team Report — V3 IDRX Migration

**Dari:** Contract Team
**Tanggal:** 2026-09-27
**Status:** SELESAI — semua task berhasil

---

## Ringkasan

DelegationCard sekarang pakai ERC-20 mock token **IDRX** (1 token = 1 IDR) menggantikan native tBNB sebagai mata uang spending. Kontrak lama `DelegationCard.sol` (V1, native tBNB) **tidak diubah** — dibiarkan tetap ada sebagai referensi/histori. Kontrak baru `DelegationCardV2.sol` dibuat terpisah dan sudah di-deploy.

Semua deploy pakai **Foundry** (`forge`, tersedia — tidak perlu fallback viem).

---

## Task 1 — MockIDRX (ERC-20)

**File:** `agentpay/packages/contracts/src/MockIDRX.sol`
Standard OpenZeppelin `ERC20` + `Ownable` (v5.0.2, di-vendor manual ke `lib/openzeppelin-contracts` — lihat catatan di bawah). `decimals()` di-override jadi 2. Initial supply 10.000.000 IDRX di-mint ke deployer saat construct. `mint(address, uint256)` hanya bisa dipanggil owner (deployer).

**Deploy:**
```
MOCK_IDRX_ADDRESS=0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996
DEPLOY_TX_HASH=0x09dd95df9f9f892ba29577c1e7ad9e5c6417ddeb21e7119825080f80aaae24b4
DEPLOYER_ADDRESS=0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
BSCSCAN_URL=https://testnet.bscscan.com/address/0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996
```

Terverifikasi on-chain: `name()="IDRX"`, `symbol()="IDRX"`, `decimals()=2`.

---

## Task 2 — DelegationCardV2.sol

**File:** `agentpay/packages/contracts/src/DelegationCardV2.sol` (file baru, `DelegationCard.sol` V1 **tidak disentuh**)

Perubahan dari V1 (persis sesuai instruksi):
- State var baru `address public idrxToken`, di-set di constructor `constructor(address _idrxToken)`
- `createCard`: hapus `payable`/`msg.value`, ganti jadi `IERC20(idrxToken).transferFrom(msg.sender, address(this), budget)` — user wajib `approve()` dulu sebelum `createCard`
- `spend`, `approveSpend`, `revokeCard`: semua transfer native BNB diganti `IERC20(idrxToken).transfer(...)`
- Interface `IERC20` minimal (transferFrom/transfer/balanceOf) di-hardcode langsung di file, sesuai instruksi
- Semua event tetap sama

**Catatan tambahan (bukan bagian instruksi eksplisit, tapi dipertahankan dari hotfix sebelumnya karena sudah ada di V1):** struct `Card` masih punya field `authorizedAgent` dan restriction `approveSpend`/`rejectSpend` masih mengizinkan `owner || authorizedAgent` (hasil hotfix `docs/agents/reports/hotfix-contract-approval.md` sebelumnya). Ini dipertahankan supaya V2 tidak regresi dari fix yang sudah ada di V1 — kalau ini tidak diinginkan, kasih tahu, gampang di-revert.

**Deploy:**
```
DELEGATION_CARD_V2_ADDRESS=0x9c8729f98bD42206D8a390360bd2326FFbf53837
DEPLOY_TX_HASH=0x1e1831941edcac6a64c1e2dd1f0810614718e593fb8ea30d735cbbc04d703c16
CONSTRUCTOR_ARG=idrxToken=0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996
BSCSCAN_URL=https://testnet.bscscan.com/address/0x9c8729f98bD42206D8a390360bd2326FFbf53837
```

Sanity check on-chain: `DelegationCardV2.idrxToken()` → `0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996` ✓ (cocok dengan MockIDRX yang baru di-deploy).

**Test:** 13/13 PASS untuk V1 (tidak berubah, tidak regresi). V2 belum ada test suite terpisah — tidak diminta di instruksi, tapi kalau perlu saya bisa buatkan.

---

## Task 3 — Deploy Script

Karena `forge` tersedia (`forge --version` → 1.8.1), deploy pakai Foundry script (bukan viem):
- `agentpay/packages/contracts/script/DeployMockIDRX.s.sol` — deploy MockIDRX + langsung mint faucet ke 2 wallet dalam satu broadcast
- `agentpay/packages/contracts/script/DeployV2.s.sol` — deploy DelegationCardV2, baca `IDRX_TOKEN_ADDRESS` dari `.env` sebagai constructor arg

(File `.ts` viem tidak dibuat karena tidak diperlukan — sesuai instruksi "Jika forge tidak tersedia, buat...".)

---

## Task 4 — Update `.env`

`agentpay/.env` sudah diupdate:
```
IDRX_TOKEN_ADDRESS=0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996
# OLD V1 (native tBNB, deprecated 2026-09-27): 0xACDAc5d57dB7a97013D002a8d073578347C057AE
DELEGATION_CARD_ADDRESS=0x9c8729f98bD42206D8a390360bd2326FFbf53837
```
Address V1 lama disimpan sebagai komentar sesuai instruksi.

---

## Task 5 — ABI

`forge build` otomatis generate ABI di `out/` (konvensi Foundry standar, sama seperti V1):
```
agentpay/packages/contracts/out/MockIDRX.sol/MockIDRX.json          (25 ABI entries)
agentpay/packages/contracts/out/DelegationCardV2.sol/DelegationCardV2.json  (18 ABI entries)
```

**Catatan:** instruksi menyebut path `out/MockIDRX.json` (tanpa subfolder), tapi Foundry selalu nest per-file (`out/<NamaFile.sol>/<NamaContract>.json`) — ini konsisten dengan lokasi ABI V1 (`out/DelegationCard.sol/DelegationCard.json`) yang sudah dipakai backend team. Saya ikuti konvensi Foundry ini supaya backend team tidak perlu 2 aturan berbeda untuk V1 vs V2.

---

## Task 6 — Faucet

Mint 1.000.000 IDRX (`100000000` unit terkecil, decimals=2) ke masing-masing wallet, dieksekusi dalam broadcast yang sama dengan deploy MockIDRX:

```
MINT_TX_1 (shop wallet):    0xb86976da01c79b21c3da35b72cca4742fa1597a3225829026986c993b89ec012
MINT_TX_2 (testing wallet): 0xa4dae7ea77076331eae1a69ae6309cad8b6134d2240bd644070cbacd515bf6a1
```

**Balance terverifikasi on-chain (`cast call balanceOf`):**

| Wallet | Balance (raw, decimals=2) | Balance (IDRX) | Keterangan |
|---|---|---|---|
| `0xBa4918Ff177C289F01fd362bc8a55B3e0469149f` (shop/deployer) | 1,100,000,000 | **11.000.000 IDRX** | 10jt initial supply (deployer) + 1jt faucet |
| `0x0a18fCB673099443CB8bA44AE7198529275b7c1f` (testing wallet) | 100,000,000 | **1.000.000 IDRX** | Faucet only |

Kedua faucet mint **berhasil dan terkonfirmasi on-chain**.

---

## Issues / Catatan

1. **RPC:** Tetap pakai Alchemy (`BNB_RPC_URL` di `.env`) + flag `--legacy` — konsisten dengan setup sebelumnya (RPC publik gratis terbukti tidak stabil dari environment ini).
2. **OpenZeppelin vendoring:** `lib/openzeppelin-contracts` (v5.0.2) di-vendor manual dengan cara yang sama seperti `forge-std` sebelumnya — `git clone --depth 1 --branch v5.0.2`, lalu hapus folder `.git` supaya jadi plain directory (bukan git submodule), karena repo `agentpay` masih belum di-init sebagai git repository. Remapping ditambahkan di `remappings.txt`: `@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/`.
3. **Bug kecil ditemukan (bukan dari task ini, punya Testing/lain):** baris `TESTING_WALLET_ADDRESS= 0x0a18fCB673099443CB8bA44AE7198529275b7c1f` di `agentpay/.env` punya spasi ekstra setelah `=`. Ini bikin `bash -c 'source .env'` (pola yang dipakai semua script deploy di project ini) melempar error `command not found` untuk baris tsb — errornya non-fatal (proses lain tetap jalan), tapi berpotensi bikin masalah kalau ada script lain yang lebih strict soal exit code. **Tidak saya perbaiki** karena bukan scope Contract Team dan bukan bagian dari task ini — tolong diteruskan ke tim yang menambahkan baris itu.
4. **V1 (`DelegationCard.sol`, native tBNB) dan address-nya (`0xACDAc5d57dB7a97013D002a8d073578347C057AE`) masih live on-chain** — sengaja tidak disentuh/dihapus, cuma sudah tidak jadi address utama di `.env`. Kalau ada bagian sistem yang masih hardcode address lama, perlu diupdate manual ke `DELEGATION_CARD_ADDRESS` yang baru.

---

## Ringkasan untuk Tim Lain

| Tim | Action Required |
|---|---|
| Backend Team | ABI baru: `createCard` butuh approve ERC-20 dulu (`IDRX.approve(delegationCardV2Address, budget)`) sebelum call `createCard`. Ganti semua referensi native BNB (`msg.value`, balance check) jadi ERC-20 `balanceOf`/`transfer`. Update address ke `DELEGATION_CARD_ADDRESS` baru dari `.env`. |
| Frontend Team | Form spending card perlu tambah step "Approve IDRX" sebelum "Create Card" (2 transaksi wallet, bukan 1). Tampilkan harga dalam IDR langsung (decimals=2) tanpa konversi ke desimal 18. |
| Bot Team | Cek ulang logic spend — sekarang saldo dalam IDRX bukan tBNB, tidak ada lagi native value transfer. |

---

## File yang Dibuat/Diubah

**Baru:**
- `agentpay/packages/contracts/src/MockIDRX.sol`
- `agentpay/packages/contracts/src/DelegationCardV2.sol`
- `agentpay/packages/contracts/script/DeployMockIDRX.s.sol`
- `agentpay/packages/contracts/script/DeployV2.s.sol`
- `agentpay/packages/contracts/lib/openzeppelin-contracts/` (vendored)
- `docs/agents/reports/05-contract-team-report-v3-idrx.md` (laporan ini)

**Diubah:**
- `agentpay/packages/contracts/remappings.txt` (tambah remapping `@openzeppelin/contracts`)
- `agentpay/.env` (tambah `IDRX_TOKEN_ADDRESS`, update `DELEGATION_CARD_ADDRESS`, simpan address lama sebagai komentar)

**Tidak diubah (sesuai aturan):**
- `agentpay/packages/contracts/src/DelegationCard.sol` (V1)
- Package lain (`backend`, `bot`, `shop`, `dashboard`)
