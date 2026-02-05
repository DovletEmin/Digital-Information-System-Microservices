import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="container-custom py-8">
        <div className="flex flex-wrap justify-between items-center text-sm text-gray-600">
          <div className="flex flex-wrap gap-6 mb-4 md:mb-0">
            <Link href="/about" className="hover:text-primary transition-colors">
              Biz barada
            </Link>
            <Link href="/contact" className="hover:text-primary transition-colors">
              Şert we düzgünler
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Gizlinlik Syýasaty
            </Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Habarlaşmak
            </Link>
          </div>
          <div>
            © {currentYear} SMU™. Ähli hukuklary goragly.
          </div>
        </div>
      </div>
    </footer>
  );
}
