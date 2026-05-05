export default function ComicFooter() {
  return (
    <footer className="w-full py-8 px-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#00fbfb] border-t-8 border-black relative z-10">
      <div className="font-bangers text-2xl tracking-widest">
        Abid&apos;s Drink Reviews
      </div>
      <div className="font-vietnam text-sm text-[#3a4a49]">
        Personal energy drink log — for the love of the fizz.
      </div>
      <div className="flex gap-6 font-vietnam font-bold uppercase text-sm">
        {[
          { label: 'Home',        href: '/' },
          { label: 'All Reviews', href: '/database' },
          { label: 'Stats Lab',   href: '/stats' },
          { label: 'The Oracle',  href: '/oracle' },
        ].map(({ label, href }) => (
          <a key={label} href={href} className="hover:underline transition-all text-black">
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
}
