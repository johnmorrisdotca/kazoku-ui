// The sample data every interface demo page shows: Jupiter's card, layers, a data door's credits, a trail and a reading page. The numbers are NASA's published figures; the ones marked computed are worked
// out here for the clock's moment from the JPL "Approximate Positions of the Planets" elements (a = 5.20288700 AU, e = 0.04838624, mean longitude 34.39644051 deg and 3034.74612775 deg a century,
// longitude of perihelion 14.72847983 deg and 0.21252668 deg a century, J2000). They are for showing the parts, not for navigation.
const NASA = { label: "NASA Planetary Fact Sheet", href: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html" };
const JPL = { label: "JPL, Approximate Positions of the Planets", href: "https://ssd.jpl.nasa.gov/planets/approx_pos.html" };
const AU_KM = 149597870.7;
const GM_SUN = 1.32712440018e20;
const J2000 = Date.UTC(2000, 0, 1, 12);

/** Jupiter's distance from the Sun, the light time from it and its speed, at a moment: [AU, minutes, km/s]. */
export function jupiterNow(ms) {
  const T = (ms - J2000) / 86400000 / 36525;
  const M = (((34.39644051 - 14.72847983) + (3034.74612775 - 0.21252668) * T) % 360) * Math.PI / 180;
  const e = 0.04838624;
  const a = 5.202887;
  let E = M;
  for (let i = 0; i < 8; i += 1) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const r = a * (1 - e * Math.cos(E));
  const v = Math.sqrt(GM_SUN * (2 / (r * AU_KM * 1000) - 1 / (a * AU_KM * 1000))) / 1000;
  return [r, (r * AU_KM) / 299792.458 / 60, v];
}

const link = (source) => ({ label: source.label, href: source.href });

/** The object card's data for Jupiter at a moment. */
export function jupiterCard(ms) {
  const [r] = jupiterNow(ms);
  return {
    kind: { en: "Planet · gas giant", ja: "惑星・ガス惑星" },
    name: { en: "Jupiter", ja: "木星" },
    stats: [
      { id: "radius", label: { en: "Radius", ja: "半径" }, value: 69911, unit: "km", source: link(NASA) },
      { id: "mass", label: { en: "Mass", ja: "質量" }, value: 1.8982e27, unit: "kg", source: link(NASA) },
      { id: "gravity", label: { en: "Gravity", ja: "重力" }, value: 24.79, unit: "m/s²", source: link(NASA) },
      { id: "day", label: { en: "Day", ja: "自転周期" }, value: 9.9259, unit: "h", source: link(NASA) },
      { id: "year", label: { en: "Year", ja: "公転周期" }, value: 4332.59, unit: "d", source: link(NASA) },
      { id: "sun", label: { en: "From the Sun", ja: "太陽からの距離" }, value: Number(r.toFixed(3)), unit: "AU", computed: true, source: link(JPL) },
    ],
    primary: { label: { en: "Open page", ja: "ページを開く" }, href: "interface-page.html" },
    secondary: { label: { en: "Compare", ja: "比べる" }, href: "interface-parts.html" },
  };
}

export const TRAIL = [{ label: "Solar system", href: "interface.html" }, { label: { en: "Jupiter", ja: "木星" } }];
export const TRAIL_JA = [{ label: "太陽系", href: "interface.html" }, { label: { en: "Jupiter", ja: "木星" } }];

export const LAYERS = [
  { id: "orbits", label: { en: "Orbits", ja: "軌道" }, checked: true },
  { id: "names", label: { en: "Names", ja: "名前" }, checked: true },
  { id: "moons", label: { en: "Moons", ja: "衛星" }, checked: true },
  { id: "spacecraft", label: { en: "Spacecraft", ja: "探査機" }, checked: false },
  { id: "constellations", label: { en: "Constellations", ja: "星座" }, checked: true },
  { id: "blackholes", label: { en: "Black holes", ja: "ブラックホール" }, checked: false },
];

/** What a view's `credits()` would return with the data door in place: the package's own data, and two outside sources (examples, not real catalogues). */
export const CREDITS = [
  { own: true, used: 5080, source: { id: "own-stars", name: { en: "Bright stars", ja: "明るい星" }, credit: { en: "Yale Bright Star Catalogue, with credit", ja: "イェール輝星星表（出典を明記）" }, licence: { name: "Public domain", url: "https://www.ucolick.org/~sla/" }, url: "https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html" } },
  { own: false, used: 1200, source: { id: "example-faint", name: { en: "Faint stars (example)", ja: "暗い星（例）" }, credit: { en: "An example faint-star list", ja: "暗い星のリストの例" }, licence: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }, url: "https://example.org/faint" } },
  { own: false, used: 300, source: { id: "example-survey", name: { en: "Survey images (example)", ja: "スカイサーベイ画像（例）" }, credit: { en: "An example sky survey", ja: "スカイサーベイの例" }, licence: { name: "CC BY-NC 3.0 IGO", url: "https://creativecommons.org/licenses/by-nc/3.0/igo/", nonCommercial: true }, url: "https://example.org/survey" } },
];

/** A reading page for Jupiter at a moment. */
export function jupiterReading(ms) {
  const [r, light, v] = jupiterNow(ms);
  const row = (id, en, ja, value, unit, cen, cja, source) => ({ label: { en, ja }, value, unit, comparison: cen ? { en: cen, ja: cja } : undefined, source: link(source) });
  return {
    picture: { src: "interface-jupiter.svg", alt: { en: "A drawing of Jupiter: a banded sphere with the Great Red Spot.", ja: "木星の絵。縞模様の球と大赤斑。" } },
    breadcrumb: [{ label: "Atlas", href: "interface.html" }, { label: "Planets", href: "interface.html" }, { label: "Jupiter" }],
    kind: { en: "Planet · gas giant", ja: "惑星・ガス惑星" },
    name: { en: "Jupiter", ja: "木星" },
    summary: { en: "The largest planet of the solar system, a ball of hydrogen and helium with more than twice the mass of all the other planets together.", ja: "太陽系で最大の惑星で、水素とヘリウムでできた球です。質量は、ほかのすべての惑星を合わせたものの2倍を超えます。" },
    actions: [{ label: { en: "See it in the Universe", ja: "宇宙で見る" }, href: "interface.html" }, { label: { en: "Sheets to print", ja: "印刷用シート" }, href: "print.html" }, { label: { en: "How to cite", ja: "引用のしかた" }, href: "#cite" }],
    now: [
      { label: { en: "From the Sun", ja: "太陽からの距離" }, value: Number(r.toFixed(3)), unit: "AU", source: link(JPL), note: { en: "Worked out for the time shown", ja: "表示中の時刻で計算" } },
      { label: { en: "Light from the Sun takes", ja: "太陽の光が届くまで" }, value: Number(light.toFixed(1)), unit: "min", source: link(JPL), link: { label: { en: "Plan a journey", ja: "旅を計画する" }, href: "interface.html" } },
      { label: { en: "Speed in its orbit", ja: "軌道上の速さ" }, value: Number(v.toFixed(2)), unit: "km/s", source: link(JPL) },
    ],
    numbers: [
      row("radius", "Radius", "半径", 69911, "km", "11 times Earth's radius", "地球の半径の11倍", NASA),
      row("mass", "Mass", "質量", 1.8982e27, "kg", "318 times Earth's mass", "地球の質量の318倍", NASA),
      row("gravity", "Surface gravity", "表面重力", 24.79, "m/s²", "2.5 times Earth's", "地球の2.5倍", NASA),
      row("day", "Length of day", "自転周期", 9.9259, "h", "", "", NASA),
      row("year", "Orbital period", "公転周期", 4332.59, "d", "11.9 years", "11.9年", NASA),
      row("distance", "Mean distance from the Sun", "太陽からの平均距離", 778.5e6, "km", "5.2 times Earth's", "地球の5.2倍", NASA),
    ],
    related: [
      { title: { en: "Its moons", ja: "衛星" }, items: [
        { label: { en: "Io", ja: "イオ" }, kind: { en: "about 3,643 km across · orbits in 1.77 d", ja: "直径約3,643 km · 公転周期 1.77日" }, href: "#io" },
        { label: { en: "Europa", ja: "エウロパ" }, kind: { en: "about 3,122 km across · orbits in 3.55 d", ja: "直径約3,122 km · 公転周期 3.55日" }, href: "#europa" },
        { label: { en: "Ganymede", ja: "ガニメデ" }, kind: { en: "about 5,268 km across · orbits in 7.15 d", ja: "直径約5,268 km · 公転周期 7.15日" }, href: "#ganymede" },
        { label: { en: "Callisto", ja: "カリスト" }, kind: { en: "about 4,821 km across · orbits in 16.69 d", ja: "直径約4,821 km · 公転周期 16.69日" }, href: "#callisto" },
      ] },
      { title: { en: "Its neighbours", ja: "となりの惑星" }, items: [
        { label: { en: "Mars", ja: "火星" }, kind: { en: "Planet · rocky", ja: "惑星・岩石惑星" }, href: "#mars" },
        { label: { en: "Saturn", ja: "土星" }, kind: { en: "Planet · gas giant", ja: "惑星・ガス惑星" }, href: "#saturn" },
      ] },
    ],
  };
}
