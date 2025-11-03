"use client"

import Image from 'next/image';
import Link from 'next/link';
import logo from "../../public/logo.png";

interface HeaderProps {
  rightContent: React.ReactNode;
}

export default function Header({ rightContent }: HeaderProps) {
  return (
    <>
      <header className="bg-[#FEFEFD] py-4">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center cursor-pointer">
              <div className="h-10 w-10 relative">
                <Image 
                  src={logo} 
                  alt="Aim90 Logo" 
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Aim90
              </span>
            </Link>
            <div className="flex items-center">
              {rightContent}
            </div>
          </div>
        </div>
      </header>
      <div className="w-full">
        <div className="max-w-5xl mx-auto border-t border-gray-200" />
      </div>
    </>
  );
}

