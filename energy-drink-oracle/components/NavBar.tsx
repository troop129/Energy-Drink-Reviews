'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinks = [
  { href: '/',          label: 'Home' },
  { href: '/database',  label: 'All Reviews' },
  { href: '/stats',     label: 'Stats Lab' },
  { href: '/oracle',    label: 'The Oracle' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b-4 border-black">
      <div className="flex justify-between items-center w-full px-6 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="font-bangers text-xl md:text-2xl bg-[#eaea00] px-4 py-2 comic-border comic-shadow-sm inline-block -rotate-1 text-black tracking-wider hover:translate-x-1 hover:translate-y-1 transition-transform"
        >
          Abid&apos;s Drink Reviews
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-3">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-vietnam font-bold text-sm px-5 py-2 comic-border comic-btn border-4 border-black tracking-wide transition-all uppercase
                  ${isActive
                    ? 'bg-[#00fbfb] text-black translate-x-1 translate-y-1 !shadow-[4px_4px_0px_0px_#1b1b1b]'
                    : 'bg-white text-black hover:bg-[#f3f3f3]'
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden comic-border bg-[#eaea00] px-3 py-2 font-bangers text-xl"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t-4 border-black bg-white flex flex-col">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="font-vietnam font-bold text-lg px-6 py-4 border-b-4 border-black hover:bg-[#eaea00] tracking-wide transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
