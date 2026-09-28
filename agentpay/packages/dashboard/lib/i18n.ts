export type Lang = "id" | "en";

export const t = {
  nav: {
    home: { id: "Beranda", en: "Home" },
    features: { id: "Fitur", en: "Features" },
    howItWorks: { id: "Cara Kerja", en: "How It Works" },
    dashboard: { id: "Dashboard", en: "Dashboard" },
    launch: { id: "Mulai", en: "Launch App" },
    langToggle: { id: "Ganti bahasa ke English", en: "Switch language to Bahasa Indonesia" },
  },
  hero: {
    badge: { id: "BNB Testnet · IDRX · Live", en: "BNB Testnet · IDRX · Live" },
    heading1: { id: "Beri AI Budget,", en: "Give AI a Budget," },
    heading2: { id: "Biarkan Ia Bekerja", en: "Let It Work For You" },
    sub: {
      id: "Delegasikan pembayaran ke AI agent. On-chain, transparan, dalam kendalimu.",
      en: "Delegate payments to AI agents. Every transaction stays on-chain, transparent, and under your control.",
    },
    cta1: { id: "Mulai Gratis", en: "Get Started Free" },
    cta2: { id: "Lihat Cara Kerja", en: "See How It Works" },
    scroll: { id: "Gulir", en: "Scroll" },
  },
  ticker: {
    items: {
      id: ["On-Chain", "IDRX Token", "BNB Testnet", "AI Payment", "Protokol x402", "Non-Custodial", "MCP Ready"],
      en: ["On-Chain", "IDRX Token", "BNB Testnet", "AI Payment", "x402 Protocol", "Non-Custodial", "MCP Ready"],
    },
  },
  features: {
    label: { id: "Fitur Utama", en: "Core Features" },
    title: { id: "Satu platform,", en: "One platform," },
    title2: { id: "kendali penuh", en: "full control" },
    cards: [
      {
        title: { id: "Kartu Delegasi", en: "Delegation Card" },
        desc: {
          id: "Set budget, batas auto-approve, dan masa berlaku. AI belanja sesuai aturanmu.",
          en: "Set budget, auto-approve limit, and expiry. AI spends only within your rules.",
        },
      },
      {
        title: { id: "AI Payment Otomatis", en: "Autonomous AI Payment" },
        desc: {
          id: "AI terima HTTP 402, bayar langsung on-chain, lalu lanjut kerja tanpa interupsi.",
          en: "AI receives HTTP 402, pays on-chain instantly, and keeps working without interruption.",
        },
      },
      {
        title: { id: "Blockchain x402", en: "x402 Blockchain" },
        desc: {
          id: "Setiap transaksi tercatat di BNB Chain. Audit trail lengkap, transparan selamanya.",
          en: "Every transaction recorded on BNB Chain. Complete audit trail, transparent forever.",
        },
      },
    ],
  },
  steps: {
    label: { id: "Cara Kerja", en: "How It Works" },
    title: { id: "Empat langkah,", en: "Four steps," },
    title2: { id: "AI bisa bayar", en: "AI can pay" },
    items: [
      {
        num: "01",
        title: { id: "Login & Claim IDRX", en: "Login & Claim IDRX" },
        desc: {
          id: "Login Google. Wallet dibuat otomatis. Claim 100.000 IDRX gratis dari faucet.",
          en: "Login with Google. Wallet created automatically. Claim 100,000 IDRX free from faucet.",
        },
      },
      {
        num: "02",
        title: { id: "Buat Kartu Delegasi", en: "Create Delegation Card" },
        desc: {
          id: "Set budget total, batas auto-approve, dan masa berlaku kartu.",
          en: "Set total budget, auto-approve limit, and card expiry date.",
        },
      },
      {
        num: "03",
        title: { id: "Sambungkan ke Claude", en: "Connect to Claude" },
        desc: {
          id: "Generate MCP URL, tambahkan di Claude Settings → Connectors. 30 detik selesai.",
          en: "Generate MCP URL, add it in Claude Settings → Connectors. Done in 30 seconds.",
        },
      },
      {
        num: "04",
        title: { id: "AI Bayar Otomatis", en: "AI Pays Automatically" },
        desc: {
          id: "Minta Claude fetch konten berbayar. paid_fetch deteksi 402, bayar, return konten.",
          en: "Ask Claude to fetch paid content. paid_fetch detects 402, pays, returns content.",
        },
      },
    ],
  },
  cta: {
    title: { id: "Siap kasih AI budget sendiri?", en: "Ready to give AI its own budget?" },
    sub: {
      id: "Gratis di BNB Testnet. Tidak perlu kartu kredit, tidak perlu KYC.",
      en: "Free on BNB Testnet. No credit card, no KYC required.",
    },
    btn: { id: "Buka Dashboard →", en: "Open Dashboard →" },
  },
  footer: {
    note: {
      id: "BNB Chain Hackathon 2026 · IDRX di BNB Testnet",
      en: "BNB Chain Hackathon 2026 · IDRX on BNB Testnet",
    },
  },
  loading: {
    label: { id: "Memuat LunasAI", en: "Loading LunasAI" },
  },
  dashboard: {
    title: { id: "Dashboard", en: "Dashboard" },
    subtitleActive: {
      id: "Selamat datang kembali. Kartu aktif kamu berjalan normal.",
      en: "Welcome back. Your active cards are running normally.",
    },
    subtitleEmpty: {
      id: "Selamat datang. Claim IDRX lalu buat kartu delegasi pertamamu.",
      en: "Welcome. Claim IDRX, then create your first delegation card.",
    },
    subtitleLoggedOut: {
      id: "Kelola kartu delegasi dan budget AI agent kamu.",
      en: "Manage your delegation cards and AI agent budget.",
    },
    btnCreate: { id: "+ Buat Kartu", en: "+ Create Card" },
    btnCloseForm: { id: "Tutup Form", en: "Close Form" },
    btnClaim: { id: "Claim IDRX", en: "Claim IDRX" },
    loadingLabel: { id: "Memuat...", en: "Loading..." },
    loginTitle: { id: "Masuk untuk mulai", en: "Log in to get started" },
    loginSub: {
      id: "Login dengan Google atau email. Wallet embedded dibuat otomatis tanpa seed phrase.",
      en: "Log in with Google or email. Your embedded wallet is created automatically without a seed phrase.",
    },
    btnRefresh: { id: "Refresh", en: "Refresh" },

    stats: {
      budget: { id: "Total Budget Aktif", en: "Total Active Budget" },
      spent: { id: "Sudah Dipakai", en: "Total Spent" },
      txToday: { id: "Transaksi Hari Ini", en: "Today's Transactions" },
      wallet: { id: "Saldo Wallet", en: "Wallet Balance" },
      cards: { id: "kartu aktif", en: "active cards" },
      dariBudget: { id: "dari budget", en: "of budget" },
      autoApproved: { id: "Auto-approved semua", en: "All auto-approved" },
      noTx: { id: "Belum ada transaksi", en: "No transactions yet" },
      pendingApproval: { id: "menunggu approval", en: "pending approval" },
      bnbTestnet: { id: "BNB Testnet", en: "BNB Testnet" },
    },

    sidebar: {
      overview: { id: "Overview", en: "Overview" },
      cards: { id: "Kartu", en: "Cards" },
      dashboard: { id: "Dashboard", en: "Dashboard" },
      activeCards: { id: "Kartu Aktif", en: "Active Cards" },
      history: { id: "Riwayat", en: "History" },
      aiAgent: { id: "AI Agent", en: "AI Agent" },
      mcp: { id: "MCP Connect", en: "MCP Connect" },
      shop: { id: "Shop", en: "Shop" },
      wallet: { id: "Wallet", en: "Wallet" },
      notLoggedIn: { id: "Belum login", en: "Not logged in" },
    },

    cardList: {
      heading: { id: "Kartu Delegasi", en: "Delegation Cards" },
      sub: { id: "Semua kartu milik wallet ini", en: "All cards owned by this wallet" },
      headingActive: { id: "Kartu Delegasi Aktif", en: "Active Delegation Cards" },
      subConnected: { id: "AI agent yang terhubung", en: "Connected AI agents" },
      active: { id: "Aktif", en: "Active" },
      expired: { id: "Expired", en: "Expired" },
      revoked: { id: "Revoked", en: "Revoked" },
      autoLimit: { id: "Auto ≤", en: "Auto ≤" },
      spent: { id: "terpakai", en: "spent" },
      remaining: { id: "Sisa", en: "Remaining" },
      until: { id: "s/d", en: "until" },
      budget: { id: "Budget", en: "Budget" },
      card: { id: "Kartu", en: "Card" },
      agent: { id: "Agent", en: "Agent" },
      btnHistory: { id: "Lihat History", en: "View History" },
      btnHideHistory: { id: "Tutup History", en: "Hide History" },
      btnRevoke: { id: "Revoke", en: "Revoke" },
      revoking: { id: "Memproses...", en: "Processing..." },
      loginFirst: { id: "Login dulu untuk lihat kartu kamu", en: "Log in to see your cards" },
      walletNotFound: {
        id: "Wallet belum terdeteksi. Coba login ulang.",
        en: "Wallet not detected. Try logging in again.",
      },
      empty: {
        id: 'Belum ada kartu. Klik "+ Buat Kartu" di atas untuk membuat kartu pertama.',
        en: 'No cards yet. Click "+ Create Card" above to create your first card.',
      },
    },

    activity: {
      heading: { id: "Aktivitas Terbaru", en: "Recent Activity" },
      sub: { id: "Transaksi oleh AI agent", en: "Transactions by AI agent" },
      autoApproved: { id: "auto-approved", en: "auto-approved" },
      approved: { id: "disetujui", en: "approved" },
      pending: { id: "menunggu approval", en: "pending approval" },
      rejected: { id: "ditolak", en: "rejected" },
      exceeded: { id: "melebihi batas", en: "exceeded limit" },
      empty: {
        id: "Belum ada transaksi. Aktivitas AI agent akan muncul di sini.",
        en: "No transactions yet. AI agent activity will appear here.",
      },
      transaction: { id: "Transaksi", en: "Transaction" },
      loadError: { id: "Gagal memuat riwayat transaksi", en: "Failed to load transaction history" },
      loadingHistory: { id: "Memuat riwayat...", en: "Loading history..." },
      noneYet: { id: "Belum ada transaksi.", en: "No transactions yet." },
    },

    mcp: {
      heading: { id: "MCP Connection", en: "MCP Connection" },
      sub: {
        id: "URL untuk disambungkan ke Claude Settings → Connectors",
        en: "URL to connect in Claude Settings → Connectors",
      },
      card: { id: "Kartu:", en: "Card:" },
      needActiveCard: {
        id: "Buat kartu aktif dulu untuk generate MCP URL.",
        en: "Create an active card first to generate an MCP URL.",
      },
      btnGenerate: { id: "Generate MCP URL", en: "Generate MCP URL" },
      generating: { id: "Generating...", en: "Generating..." },
      hint: {
        id: "Setelah generate, paste URL ke: Claude Web → Settings → Connectors → Add MCP Server",
        en: "After generating, paste the URL into: Claude Web → Settings → Connectors → Add MCP Server",
      },
      secretTitle: { id: "🔑 MCP URL: Rahasia, jangan bagikan!", en: "🔑 MCP URL: Secret, do not share!" },
      secretWarning: {
        id: "Simpan URL ini sekarang! Tidak bisa dilihat lagi setelah refresh.",
        en: "Save this URL now! It cannot be viewed again after refresh.",
      },
      copy: { id: "Salin URL", en: "Copy URL" },
      copied: { id: "✓ Tersalin", en: "✓ Copied" },
      showUrl: { id: "Tampilkan URL", en: "Show URL" },
      hideUrl: { id: "Sembunyikan URL", en: "Hide URL" },
      regen: { id: "Revoke & Generate Ulang", en: "Revoke & Regenerate" },
      revoke: { id: "Revoke", en: "Revoke" },
      processing: { id: "Memproses...", en: "Processing..." },
      howToTitle: { id: "Cara pakai:", en: "How to use:" },
      how1: {
        id: "Buka claude.ai → Settings → Connectors → Add MCP Server",
        en: "Open claude.ai → Settings → Connectors → Add MCP Server",
      },
      how2: { id: "Paste URL di atas", en: "Paste the URL above" },
      how3: {
        id: 'Tanya Claude: "cek info card saya"',
        en: 'Ask Claude: "check my card info"',
      },
      errGenerate: { id: "Gagal generate MCP URL. Coba lagi.", en: "Failed to generate MCP URL. Try again." },
      errRevoke: { id: "Gagal revoke MCP URL. Coba lagi.", en: "Failed to revoke MCP URL. Try again." },
    },

    createCard: {
      title: { id: "Buat Kartu Delegasi", en: "Create Delegation Card" },
      subtitle: {
        id: "IDRX akan di-lock di kontrak sebagai budget AI agent.",
        en: "IDRX will be locked in the contract as the AI agent's budget.",
      },
      budget: { id: "Total Budget (IDRX)", en: "Budget (IDRX)" },
      autoLimit: { id: "Auto-Approve Limit (IDRX)", en: "Auto-Approve Limit (IDRX)" },
      expiry: { id: "Berlaku (hari)", en: "Expiry (days)" },
      btnApproving: { id: "Approve IDRX...", en: "Approving IDRX..." },
      btnCreate: { id: "Buat Kartu", en: "Create Card" },
      btnCreateAnother: { id: "Buat kartu lain", en: "Create another card" },
      btnPendingWallet: { id: "Menunggu konfirmasi wallet...", en: "Waiting for wallet confirmation..." },
      btnPendingTx: { id: "Memproses transaksi...", en: "Processing transaction..." },
      loginFirst: { id: "Login untuk melanjutkan", en: "Log in to continue" },
      walletNotFound: { id: "Wallet tidak ditemukan. Login ulang.", en: "Wallet not found. Log in again." },
      idrxNotConfigured: {
        id: "Token IDRX belum dikonfigurasi. Hubungi admin.",
        en: "IDRX token not configured. Contact admin.",
      },
      txFailed: { id: "Transaksi gagal", en: "Transaction failed" },
      validationBudget: { id: "Budget harus > 0", en: "Budget must be > 0" },
      validationExpiry: { id: "Expiry harus minimal 1 hari", en: "Expiry must be at least 1 day" },
      validationAutoLimit: {
        id: "Auto-approve limit harus ≤ total budget",
        en: "Auto-approve limit must be ≤ total budget",
      },
      successTitle: { id: "Kartu berhasil dibuat!", en: "Card created successfully!" },
      viewOnBscscan: { id: "Lihat di BscScan →", en: "View on BscScan →" },
      cardIdLabel: { id: "Card ID:", en: "Card ID:" },
      nextStep: { id: "Sekarang buka", en: "Now open" },
      nextStepTelegram: { id: "di Telegram dan ketik:", en: "on Telegram and type:" },
      txLabel: { id: "Tx:", en: "Tx:" },
      modalTitle: { id: "💳 Buat Kartu Delegasi", en: "💳 Create Delegation Card" },
      modalIntro: {
        id: "Proses ini membutuhkan 2 konfirmasi wallet secara berurutan:",
        en: "This process requires 2 wallet confirmations in sequence:",
      },
      modalStep1Title: { id: "Approve IDRX", en: "Approve IDRX" },
      modalStep1Desc: {
        id: "Izinkan kontrak mengambil {amount} IDRX dari saldo kamu sebagai budget kartu",
        en: "Allow the contract to take {amount} IDRX from your balance as the card budget",
      },
      modalStep2Title: { id: "Buat Kartu Delegasi", en: "Create Delegation Card" },
      modalStep2Desc: {
        id: "IDRX di-lock di dalam kontrak sebagai budget yang bisa dipakai AI agent untuk belanja",
        en: "IDRX is locked in the contract as a budget the AI agent can use to spend",
      },
      modalNote: {
        id: "Ini normal untuk token ERC-20. Kamu cukup memberi satu approval setiap kali membuat kartu.",
        en: "This is normal for ERC-20 tokens. Each card creation requires one approval.",
      },
      modalCancel: { id: "Batal", en: "Cancel" },
      modalContinue: { id: "Mengerti, Lanjutkan →", en: "Got it, Continue →" },

      budgetBadge: { id: "Dana yang dikunci", en: "Funds to lock" },
      budgetDesc: {
        id: "Jumlah IDRX yang akan dikunci di smart contract sebagai anggaran AI agent kamu. AI tidak bisa membelanjakan lebih dari ini.",
        en: "The amount of IDRX locked in the smart contract as your AI agent's budget. The AI can't spend more than this.",
      },
      availableBalance: { id: "Saldo tersedia:", en: "Available balance:" },
      budgetExceedsBalance: {
        id: "Budget melebihi saldo wallet kamu. Kurangi budget atau claim IDRX dari faucet.",
        en: "Budget exceeds your wallet balance. Lower the budget or claim IDRX from the faucet.",
      },
      budgetMax: { id: "Max", en: "Max" },
      autoLimitBadge: { id: "Per transaksi", en: "Per transaction" },
      autoLimitDesc: {
        id: "Transaksi di bawah limit ini disetujui otomatis oleh AI. Di atas limit, kamu mendapat notifikasi untuk approve manual.",
        en: "Transactions under this limit are auto-approved by the AI. Above it, you'll get a notification for manual approval.",
      },
      autoLimitWarning: {
        id: "Hati-hati: AI bisa membelanjakan seluruh budget sekaligus tanpa konfirmasi.",
        en: "Careful: the AI can spend the entire budget at once without confirmation.",
      },
      expiryBadge: { id: "Kartu expired otomatis", en: "Card expires automatically" },
      expiryUntil: { id: "Kartu expired pada:", en: "Card expires on:" },
      rupiahNote: { id: "1 IDRX = 1 IDR", en: "1 IDRX = 1 IDR" },
      daysSuffix: { id: "hari", en: "days" },

      previewTitle: { id: "Preview Kartu", en: "Card Preview" },
      previewBudgetLabel: { id: "Total Budget", en: "Total Budget" },
      previewAutoLimitLabel: { id: "Auto-Approve", en: "Auto-Approve" },
      previewExpiryLabel: { id: "Berlaku s/d", en: "Valid Until" },

      summaryTitle: { id: "Ringkasan", en: "Summary" },
      summaryLocked: { id: "Budget dikunci", en: "Budget locked" },
      summaryAutoApprove: { id: "Auto-approve hingga", en: "Auto-approve up to" },
      summaryPerTx: { id: "/ transaksi", en: "/ transaction" },
      summaryManual: { id: "Perlu approval manual", en: "Needs manual approval" },
      summaryExpired: { id: "Expired", en: "Expires" },
      summaryGas: { id: "Gas fee (estimasi)", en: "Gas fee (estimate)" },

      stepBudget: { id: "Total Budget", en: "Total Budget" },
      stepAutoLimit: { id: "Batas Auto-Approve", en: "Auto-Approve Limit" },
      stepExpiry: { id: "Masa Berlaku", en: "Card Validity" },
      walletConfirmNote: {
        id: "Proses membutuhkan 2 konfirmasi wallet: Approve IDRX → Create Card",
        en: "This process needs 2 wallet confirmations: Approve IDRX → Create Card",
      },
    },

    faucet: {
      btn: { id: "Claim 100.000 IDRX", en: "Claim 100,000 IDRX" },
      loading: { id: "Mengirim...", en: "Sending..." },
      success: { id: "✓ IDRX Diterima!", en: "✓ IDRX Received!" },
      cooldown: { id: "⏳ Sudah Claim Hari Ini", en: "⏳ Already Claimed Today" },
      error: { id: "Coba Lagi", en: "Try Again" },
      cooldownMsg: { id: "Sudah claim hari ini.", en: "Already claimed today." },
      failedMsg: { id: "Faucet gagal.", en: "Faucet failed." },
      connError: { id: "Tidak bisa terhubung ke server.", en: "Could not connect to the server." },
      sentSuffix: { id: "berhasil dikirim!", en: "sent successfully!" },
    },

    network: {
      warning: {
        id: "Kamu terhubung ke jaringan yang salah. Silakan ganti ke BNB Smart Chain Testnet di Wallet kamu.",
        en: "You're connected to the wrong network. Please switch to BNB Smart Chain Testnet in your wallet.",
      },
    },

    login: {
      btn: { id: "Login / Connect Wallet", en: "Login / Connect Wallet" },
      logout: { id: "Logout", en: "Logout" },
      copied: { id: "✓ Copied!", en: "✓ Copied!" },
      loadingLabel: { id: "Memuat...", en: "Loading..." },
      copyTitle: { id: "Klik untuk copy address", en: "Click to copy address" },
    },

    telegram: {
      heading: { id: "Bot Telegram", en: "Telegram Bot" },
      sub: {
        id: "Verifikasi wallet supaya bisa approve transaksi lewat Telegram",
        en: "Verify your wallet to approve transactions via Telegram",
      },
    },

    breadcrumb: {
      dashboard: { id: "Dashboard", en: "Dashboard" },
      cards: { id: "Kartu Aktif", en: "Active Cards" },
      createCard: { id: "Buat Kartu Baru", en: "Create New Card" },
      history: { id: "Riwayat", en: "History" },
      mcp: { id: "MCP Connect", en: "MCP Connect" },
      telegram: { id: "Telegram Bot", en: "Telegram Bot" },
    },

    backToCards: { id: "Kembali ke Kartu Aktif", en: "Back to Active Cards" },

    chart: {
      heading: { id: "Spending 7 Hari Terakhir", en: "Spending Last 7 Days" },
      sub: { id: "Total IDRX yang dibelanjakan per hari", en: "Total IDRX spent per day" },
    },

    quickLinks: {
      cardsTitle: { id: "Kartu Aktif", en: "Active Cards" },
      cardsSub: { id: "Kelola kartu delegasi kamu", en: "Manage your delegation cards" },
      mcpTitle: { id: "MCP Connect", en: "MCP Connect" },
      mcpSub: { id: "Hubungkan ke Claude", en: "Connect to Claude" },
    },

    viewAll: { id: "Lihat semua →", en: "View all →" },

    filter: {
      allCards: { id: "Semua Kartu", en: "All Cards" },
      allStatus: { id: "Semua Status", en: "All Status" },
      statusAutoApproved: { id: "Auto-approved", en: "Auto-approved" },
      statusPending: { id: "Pending", en: "Pending" },
      statusRejected: { id: "Ditolak", en: "Rejected" },
    },

    mcpPage: {
      guideTitle: { id: "Cara Menghubungkan MCP", en: "How to Connect MCP" },
      urlPlaceholderNote: {
        id: "Ganti <MCP_URL> dengan URL MCP kartu kamu di sebelah kiri.",
        en: "Replace <MCP_URL> with your card's MCP URL on the left.",
      },
      experimental: { id: "⚠️ Eksperimental", en: "⚠️ Experimental" },

      tabClaude: { id: "Claude", en: "Claude" },
      tabCursor: { id: "Cursor", en: "Cursor" },
      tabWindsurf: { id: "Windsurf", en: "Windsurf" },
      tabVscode: { id: "VS Code", en: "VS Code" },

      claudeStep1: { id: "Buka Claude Desktop", en: "Open Claude Desktop" },
      claudeStep2: {
        id: "Pergi ke Settings → Developer → Edit Config",
        en: "Go to Settings → Developer → Edit Config",
      },
      claudeStep3: {
        id: "Tambahkan ke claude_desktop_config.json:",
        en: "Add this to claude_desktop_config.json:",
      },
      claudeStep4: { id: "Restart Claude Desktop", en: "Restart Claude Desktop" },
      claudeStep5: {
        id: "Cek ikon 🔌 di chat. LunasAI tools sudah tersedia",
        en: "Check the 🔌 icon in chat. LunasAI tools are now available",
      },

      cursorStep1: { id: "Buka Cursor Settings (Cmd/Ctrl + Shift + J)", en: "Open Cursor Settings (Cmd/Ctrl + Shift + J)" },
      cursorStep2: { id: 'Pergi ke tab "MCP"', en: 'Go to the "MCP" tab' },
      cursorStep3: { id: 'Klik "Add new MCP server"', en: 'Click "Add new MCP server"' },
      cursorStep4: { id: "Isi:", en: "Fill in:" },
      cursorStep4Name: { id: "Name: LunasAI", en: "Name: LunasAI" },
      cursorStep4Type: { id: "Type: SSE", en: "Type: SSE" },
      cursorStep4Url: { id: "URL:", en: "URL:" },
      cursorStep5: {
        id: "Klik Save. Tools langsung aktif di Cursor Agent",
        en: "Click Save. The tools are immediately available in Cursor Agent",
      },

      windsurfStep1: { id: "Buka Windsurf Settings", en: "Open Windsurf Settings" },
      windsurfStep2: { id: "Pergi ke Cascade → MCP Servers", en: "Go to Cascade → MCP Servers" },
      windsurfStep3: { id: 'Klik "+ Add Server"', en: 'Click "+ Add Server"' },
      windsurfStep4: { id: "Isi:", en: "Fill in:" },
      windsurfStep4Name: { id: "Name: LunasAI", en: "Name: LunasAI" },
      windsurfStep4Url: { id: "Server URL:", en: "Server URL:" },
      windsurfStep5: { id: "Restart Windsurf", en: "Restart Windsurf" },
      windsurfStep6: {
        id: "Tools LunasAI tersedia di Cascade chat",
        en: "LunasAI tools are available in Cascade chat",
      },

      vscodeStep1: {
        id: 'Install extension "GitHub Copilot" versi terbaru',
        en: 'Install the latest "GitHub Copilot" extension',
      },
      vscodeStep2: {
        id: "Buka Command Palette (Cmd/Ctrl + Shift + P)",
        en: "Open Command Palette (Cmd/Ctrl + Shift + P)",
      },
      vscodeStep3: { id: 'Ketik: "MCP: Add Server"', en: 'Type: "MCP: Add Server"' },
      vscodeStep4: { id: "Pilih type: SSE", en: "Select type: SSE" },
      vscodeStep5: { id: "Masukkan URL:", en: "Enter the URL:" },
      vscodeStep6: {
        id: 'Buka Copilot Chat → pilih mode "Agent"',
        en: 'Open Copilot Chat → select "Agent" mode',
      },
      vscodeStep7: {
        id: "Catatan: fitur ini masih eksperimental, mungkin tidak stabil",
        en: "Note: this feature is still experimental and may be unstable",
      },
    },

    telegramPage: {
      title: { id: "🤖 LunasPayBot", en: "🤖 LunasPayBot" },
      intro: {
        id: "Hubungkan wallet ke Telegram bot untuk kelola kartu via chat.",
        en: "Connect your wallet to the Telegram bot to manage cards via chat.",
      },
      usernameLabel: { id: "Bot Username", en: "Bot Username" },
      openBotHero: { id: "Buka @LunasPayBot", en: "Open @LunasPayBot" },
      howToTitle: { id: "Cara pakai:", en: "How to use:" },
      step1: {
        id: 'Klik tombol "Buka @LunasPayBot" di atas',
        en: 'Click "Open @LunasPayBot" above',
      },
      step2: { id: 'Klik "Start" di chat Telegram', en: 'Click "Start" in the Telegram chat' },
      step3: { id: "Ketik /start untuk memulai", en: "Type /start to begin" },
      step4: {
        id: "Bot akan meminta MCP URL kamu. Copy URL tersebut dari halaman MCP",
        en: "The bot will ask for your MCP URL. Copy it from the MCP page",
      },
      step5: {
        id: "Paste MCP URL ke bot → AI agent siap digunakan via Telegram",
        en: "Paste your MCP URL to the bot → AI agent ready via Telegram",
      },
      commandsTitle: { id: "Commands", en: "Commands" },
      cmdStart: { id: "Mulai & lihat panduan", en: "Start & see the guide" },
      cmdConnect: { id: "Hubungkan wallet", en: "Connect wallet" },
      cmdUse: { id: "Pilih kartu aktif", en: "Select active card" },
      cmdBuy: { id: "Beli produk", en: "Buy a product" },
      cmdBalance: { id: "Cek saldo kartu", en: "Check card balance" },
    },

    shop: {
      breadcrumb: { id: "Toko Digital", en: "Digital Store" },
      title: { id: "Toko Digital", en: "Digital Store" },
      x402Enabled: { id: "x402 Enabled", en: "x402 Enabled" },
      subtitle: {
        id: "Ekosistem merchant yang menerima pembayaran otomatis dari AI agent via protokol x402.",
        en: "The merchant ecosystem accepting automatic payments from AI agents via the x402 protocol.",
      },
      digiStoreLabel: { id: "DigiStore", en: "DigiStore" },
      live: { id: "Live", en: "Live" },
      digiStoreHeroTitle: {
        id: "Toko digital LunasAI yang sudah aktif",
        en: "LunasAI's digital store, already live",
      },
      digiStoreHeroDesc: {
        id: "5 produk digital yang bisa dibeli langsung oleh AI agent via {code}, tanpa approval manual. Pembayaran menggunakan IDRX dan tercatat on-chain.",
        en: "AI agents can buy 5 digital products directly via {code} without manual approval. Payments use IDRX and are recorded on-chain.",
      },
      tagProducts: { id: "5 Produk", en: "5 Products" },
      tagHttp402: { id: "HTTP 402", en: "HTTP 402" },
      tagErc20: { id: "ERC-20 IDRX", en: "ERC-20 IDRX" },
      tagInstant: { id: "Instan", en: "Instant" },
      openDigiStore: { id: "Buka DigiStore", en: "Open DigiStore" },
      viewAllProducts: { id: "Lihat semua produk", en: "View all products" },
      merchantPartner: { id: "Merchant Partner", en: "Merchant Partners" },
      comingSoon: { id: "Coming Soon", en: "Coming Soon" },
      soon: { id: "Segera", en: "Soon" },
      willSupport: { id: "Akan mendukung x402 + IDRX", en: "Will support x402 + IDRX" },
      registerTitle: { id: "Daftarkan Merchant Kamu", en: "Register Your Merchant" },
      registerDesc: {
        id: "Terima pembayaran otomatis dari AI agent via protokol x402. Tambahkan endpoint ke website kamu untuk mulai menerima IDRX.",
        en: "Accept automatic payments from AI agents via the x402 protocol. Add an endpoint to your website to start receiving IDRX.",
      },
      formMerchantName: { id: "Nama Merchant *", en: "Merchant Name *" },
      formMerchantPlaceholder: { id: "Tokoku Store", en: "My Store" },
      formUrl: { id: "URL Website", en: "Website URL" },
      formUrlPlaceholder: { id: "https://tokoku.id", en: "https://mystore.com" },
      formCategory: { id: "Kategori", en: "Category" },
      formCategoryPlaceholder: { id: "Pilih kategori", en: "Select category" },
      catEcommerce: { id: "E-Commerce", en: "E-Commerce" },
      catEducation: { id: "Edukasi", en: "Education" },
      catMedia: { id: "Media & Konten", en: "Media & Content" },
      catSoftware: { id: "Software & SaaS", en: "Software & SaaS" },
      catOther: { id: "Lainnya", en: "Other" },
      formEmail: { id: "Email Kontak *", en: "Contact Email *" },
      formEmailPlaceholder: { id: "kamu@merchant.id", en: "you@merchant.com" },
      formSubmit: { id: "Daftar Sekarang", en: "Register Now" },
      formSuccessTitle: { id: "Pendaftaran diterima!", en: "Registration received!" },
      formSuccessDesc: {
        id: "Tim kami akan menghubungi kamu di {email} untuk proses integrasi x402.",
        en: "Our team will reach out to you at {email} for the x402 integration process.",
      },
      formRegisterAnother: { id: "Daftarkan merchant lain", en: "Register another merchant" },

      productAiPremium: { id: "Akses AI Premium", en: "AI Premium Access" },
      productEbook: { id: "E-Book Web3 Indonesia", en: "Web3 Indonesia E-Book" },
      productNewsletter: { id: "Newsletter Pro", en: "Newsletter Pro" },
      productCourse: { id: "Kursus Blockchain Developer", en: "Blockchain Developer Course" },
      productLicense: { id: "Software License", en: "Software License" },
      catSubscription: { id: "Langganan", en: "Subscription" },
      catEbook: { id: "E-Book", en: "E-Book" },
      catContent: { id: "Konten", en: "Content" },
      catCourse: { id: "Kursus", en: "Course" },
      catLicense: { id: "Lisensi", en: "License" },

      merchantNusaCartDesc: {
        id: "Platform belanja digital Indonesia untuk voucher, top-up, dan hadiah via AI agent.",
        en: "An Indonesian digital shopping platform for vouchers, top-ups, and gifts purchased through AI agents.",
      },
      merchantZipRideDesc: {
        id: "Pesan ojek, makanan, dan kurir otomatis lewat AI agent tanpa buka app.",
        en: "Order rides, food, and courier services automatically via AI agent, no app needed.",
      },
      merchantPageOneDesc: {
        id: "E-book, audiobook, dan majalah digital premium yang dikirim langsung ke AI agent kamu.",
        en: "Premium e-books, audiobooks, and digital magazines delivered straight to your AI agent.",
      },
      merchantSkillLoopDesc: {
        id: "Ribuan kursus online, sertifikasi, dan workshop yang bisa dibeli AI agent sesuai kebutuhan.",
        en: "Thousands of online courses, certifications, and workshops that AI agents can purchase on demand.",
      },
      merchantCatEcommerce: { id: "E-Commerce", en: "E-Commerce" },
      merchantCatSuperApp: { id: "Super App", en: "Super App" },
      merchantCatMediaBooks: { id: "Media & Buku", en: "Media & Books" },
      merchantCatEducation: { id: "Edukasi", en: "Education" },
    },

    telegramVerify: {
      instructions: {
        id: "Ketik {connectCmd} di {bot}, paste pesan dari bot di bawah, lalu sign dengan wallet kamu.",
        en: "Type {connectCmd} in {bot}, paste the bot's message below, then sign with your wallet.",
      },
      messageLabel: {
        id: "Pesan dari bot (contoh: AGENTPAY-VERIFY-abc123...)",
        en: "Message from bot (e.g. AGENTPAY-VERIFY-abc123...)",
      },
      btnPending: { id: "Menunggu konfirmasi wallet...", en: "Waiting for wallet confirmation..." },
      btnSign: { id: "Sign Message", en: "Sign Message" },
      success: { id: "✓ Signature berhasil!", en: "✓ Signature successful!" },
      copyHint: { id: "Copy dan kirim ke bot dengan /verify:", en: "Copy and send to the bot with /verify:" },
      btnCopy: { id: "Copy Signature", en: "Copy Signature" },
      sendTo: { id: "Lalu kirim ke", en: "Then send it to" },
    },
  },
};
