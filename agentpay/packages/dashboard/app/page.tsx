import Link from "next/link";
import { LoginButton } from "@/components/LoginButton";
import { CreateCardForm } from "@/components/CreateCardForm";
import { NetworkWarning } from "@/components/NetworkWarning";
import { SignMessage } from "@/components/SignMessage";
import { BOT_USERNAME } from "@/lib/constants";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Agent<span className="text-yellow-500">Pay</span>
        </h1>
        <LoginButton />
      </header>

      <NetworkWarning />

      <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-bold">Cara Pakai AgentPay</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm text-gray-700">
          <li>Login pakai Google/Email/Wallet (tombol di atas)</li>
          <li>Isi form di bawah → klik Buat Card → tunggu konfirmasi wallet</li>
          <li>Catat Card ID dari notifikasi sukses atau BscScan</li>
          <li>
            Buka Telegram → cari{" "}
            <span className="font-medium">{BOT_USERNAME}</span>
          </li>
          <li>
            Ketik{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5">
              /connect &lt;wallet_address_kamu&gt;
            </code>
          </li>
          <li>
            Ketik{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5">/use &lt;card_id&gt;</code>
          </li>
          <li>
            Ketik{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5">/buy &lt;nama_item&gt;</code>{" "}
            untuk mulai belanja!
          </li>
        </ol>
      </div>

      <CreateCardForm />

      <SignMessage />

      <Link
        href="/cards"
        className="text-center font-medium text-yellow-600 hover:underline"
      >
        Lihat kartu saya →
      </Link>
    </div>
  );
}
