import Link from "next/link";
import { LoginButton } from "@/components/LoginButton";
import { CardList } from "@/components/CardList";
import { NetworkWarning } from "@/components/NetworkWarning";

export default function CardsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Agent<span className="text-yellow-500">Pay</span>
        </h1>
        <LoginButton />
      </header>

      <NetworkWarning />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Kartu Saya</h2>
        <Link href="/" className="text-sm font-medium text-yellow-600 hover:underline">
          ← Buat card baru
        </Link>
      </div>

      <CardList />
    </div>
  );
}
