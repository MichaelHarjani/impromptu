'use client';

import Image from 'next/image';
import Link from 'next/link';

interface AdminHeaderProps {
  onLogout: () => void;
}

export default function AdminHeader({ onLogout }: AdminHeaderProps) {
  return (
    <header className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-4">
        <Image src="/logo.webp" alt="Logo" width={48} height={48} className="rounded" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Question Bank</h1>
          <Link href="/" className="text-sm text-red-600 hover:text-red-700">
            View public page
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
