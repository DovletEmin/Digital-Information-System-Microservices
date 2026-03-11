export default function PrivacyPage() {
  return (
    <div className="container-custom py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Gizlinlik syýasaty</h1>
      <div className="space-y-6 text-gray-700 text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Nähili maglumat toplanýar</h2>
          <p>
            Hasaba alnanda adyňyz, ulanyjy adyňyz we e-poçta salgyňyz toplanýar. 
            Girmek wagty kullanyjy ady we parol talap edilýär.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Maglumat nähili ulanylýar</h2>
          <p>
            Siziň maglumatlaryňyz diňe ulgamyň işlemegi we size hyzmat etmek üçin ulanylýar. 
            Üçünji taraplara satylmaýar ýa-da paýlaşylmaýar.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Maglumatlaryň goraglylygy</h2>
          <p>
            Siziň şahsy maglumatlaryňyz SSL şifrlemesi we howpsuz saklanma usullary arkaly goranýar.
          </p>
        </section>
      </div>
    </div>
  );
}
