export default function ContactPage() {
  return (
    <div className="container-custom py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Habarlaşmak</h1>
      <div className="space-y-6 text-gray-700 text-base leading-relaxed">
        <p>
          Soraglar, teklipler ýa-da tehniki kynçylyklar üçin biziň bilen habarlaşmagyňyzy haýyş edýäris.
        </p>
        <div className="bg-gray-50 rounded-xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-gray-500 w-24 flex-shrink-0">E-poçta:</span>
            <a href="mailto:info@smu.edu.tm" className="text-primary hover:underline">
              info@smu.edu.tm
            </a>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-gray-500 w-24 flex-shrink-0">Salgy:</span>
            <span>Aşgabat, Türkmenistan</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-gray-500 w-24 flex-shrink-0">Iş wagty:</span>
            <span>Duşenbe – anna, 09:00 – 18:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
