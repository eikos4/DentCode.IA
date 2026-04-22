import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getNextAvailableSlot } from "@/lib/availability";
import {
  MapPin, Star, Calendar, ShieldCheck, Clock, Search,
  TrendingUp, Users, Award, ArrowRight, Stethoscope, Filter,
  ChevronRight, Sparkles, Heart,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Buscar Dentista — DentCode",
  description: "Encuentra y agenda con los mejores dentistas de Chile. Sin registro, sin esperas.",
};

/* ──────────────────── Types ──────────────────── */
type EnrichedDentist = {
  id: string;
  slug: string | null;
  fullName: string;
  photoUrl: string | null;
  specialty: string | null;
  bio: string | null;
  verificationStatus: string;
  isPublished: boolean;
  locations: { id: string; name: string; commune: string | null; city: string | null; region: string | null; address: string | null; phone: string | null }[];
  rating: number;
  reviewCount: number;
  nextSlot: Date | null;
  region: string | null;
  commune: string | null;
};

/* ──────────────────── Specialties ──────────────────── */
const SPECIALTIES = [
  "Odontología general",
  "Ortodoncia",
  "Endodoncia",
  "Implantología",
  "Periodoncia",
  "Odontopediatría",
  "Cirugía maxilofacial",
  "Estética dental",
];

/* ──────────────────── Page ──────────────────── */
export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; commune?: string; specialty?: string; region?: string }>;
}) {
  const { q, commune, specialty, region } = await searchParams;
  const isSearching = !!(q || commune || specialty || region);

  const where: Record<string, unknown> = { isPublished: true };
  if (specialty) where.specialty = { contains: specialty };
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { specialty: { contains: q } },
      { bio: { contains: q } },
    ];
  }

  const dentistsRaw = await prisma.dentist.findMany({
    where,
    include: {
      locations: true,
      reviews: { where: { published: true }, select: { rating: true } },
      services: { where: { active: true }, select: { id: true } },
    },
    take: 100,
  });

  // Filter by commune / region on locations
  const filtered = dentistsRaw.filter((d: typeof dentistsRaw[number]) => {
    if (commune && !d.locations.some((l: typeof d.locations[number]) => l.commune?.toLowerCase().includes(commune.toLowerCase()))) return false;
    if (region && !d.locations.some((l: typeof d.locations[number]) => l.region?.toLowerCase().includes(region.toLowerCase()))) return false;
    return true;
  });

  // Enrich
  const dentists: EnrichedDentist[] = await Promise.all(
    filtered.map(async (d: typeof filtered[number]) => {
      const rating =
        d.reviews.length > 0
          ? d.reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / d.reviews.length
          : 0;
      const nextSlot = await getNextAvailableSlot(d.id);
      const loc0 = d.locations[0];
      return {
        id: d.id,
        slug: d.slug,
        fullName: d.fullName,
        photoUrl: d.photoUrl,
        specialty: d.specialty,
        bio: d.bio,
        verificationStatus: d.verificationStatus,
        isPublished: d.isPublished,
        locations: d.locations,
        rating,
        reviewCount: d.reviews.length,
        nextSlot,
        region: loc0?.region || null,
        commune: loc0?.commune || null,
      };
    }),
  );

  // Stats
  const totalDentists = dentistsRaw.length;
  const totalReviews = dentistsRaw.reduce((s: number, d: typeof dentistsRaw[number]) => s + d.reviews.length, 0);
  const regions = [...new Set(
    dentistsRaw.flatMap((d: typeof dentistsRaw[number]) => d.locations.map((l: typeof d.locations[number]) => l.region).filter(Boolean))
  )] as string[];
  const communes = [...new Set(
    dentistsRaw.flatMap((d: typeof dentistsRaw[number]) => d.locations.map((l: typeof d.locations[number]) => l.commune).filter(Boolean))
  )] as string[];

  // Group by region for discovery
  const byRegion: Record<string, EnrichedDentist[]> = {};
  for (const d of dentists) {
    const r = d.region || "Otras ubicaciones";
    if (!byRegion[r]) byRegion[r] = [];
    byRegion[r].push(d);
  }
  // Sort each region group by rating desc
  for (const rKey of Object.keys(byRegion)) {
    byRegion[rKey].sort((a: EnrichedDentist, b: EnrichedDentist) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  }
  // Sort regions by count desc
  const sortedRegions = Object.keys(byRegion).sort(
    (a: string, b: string) => byRegion[b].length - byRegion[a].length,
  );

  // Top rated overall
  const topRated = [...dentists]
    .filter((d) => d.reviewCount >= 1)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 6);

  // Available today
  const availableToday = dentists.filter((dt: EnrichedDentist) => {
    if (!dt.nextSlot) return false;
    const today = new Date();
    return dt.nextSlot.toDateString() === today.toDateString();
  }).slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 grid place-items-center text-white font-bold text-sm shadow-md shadow-blue-500/20">D</div>
            <span className="font-semibold text-slate-900">Dent<span className="text-blue-600">Code</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-slate-600 hover:text-slate-900 transition">Inicio</Link>
            <Link href="/buscar" className="text-blue-600 font-medium">Buscar dentistas</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/registro" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">Regístrate</Link>
            <Link href="/login" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Ingresar</Link>
          </div>
        </div>
      </header>

      {/* Hero + Search */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-sky-400/20 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-blue-800/30 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 pt-10 pb-12 md:pt-14 md:pb-16">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
              Encuentra tu dentista ideal en Chile
            </h1>
            <p className="text-blue-100 text-lg">
              Agenda online, sin registro, con los mejores profesionales verificados.
            </p>
          </div>

          {/* Search bar */}
          <form className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/30 p-2 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Nombre, especialidad, tratamiento..."
                className="w-full pl-10 pr-3 py-3 text-sm text-slate-900 rounded-xl bg-slate-50 border border-transparent focus:outline-none focus:border-blue-300 focus:bg-white transition"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="commune"
                defaultValue={commune}
                placeholder="Comuna o ciudad..."
                className="w-full pl-10 pr-3 py-3 text-sm text-slate-900 rounded-xl bg-slate-50 border border-transparent focus:outline-none focus:border-blue-300 focus:bg-white transition"
              />
            </div>
            <button className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2 justify-center">
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </form>

          {/* Specialty pills */}
          <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-4xl mx-auto">
            {SPECIALTIES.map((s) => (
              <Link
                key={s}
                href={`/buscar?specialty=${encodeURIComponent(s)}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  specialty === s
                    ? "bg-white text-blue-700 shadow-md"
                    : "bg-white/15 text-white/90 hover:bg-white/25 border border-white/20"
                }`}
              >
                {s}
              </Link>
            ))}
          </div>

          {/* Stats strip */}
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 text-blue-100">
              <Users className="w-4 h-4" />
              <b className="text-white">{totalDentists}</b> dentistas
            </span>
            <span className="flex items-center gap-1.5 text-blue-100">
              <Star className="w-4 h-4" />
              <b className="text-white">{totalReviews}</b> reseñas
            </span>
            <span className="flex items-center gap-1.5 text-blue-100">
              <MapPin className="w-4 h-4" />
              <b className="text-white">{regions.length}</b> regiones
            </span>
            <span className="flex items-center gap-1.5 text-blue-100">
              <Stethoscope className="w-4 h-4" />
              Agenda en <b className="text-white">2 min</b>
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ───── SEARCH MODE ───── */}
        {isSearching ? (
          <>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                  {dentists.length} {dentists.length === 1 ? "profesional encontrado" : "profesionales encontrados"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {q && <>Buscando &ldquo;<b className="text-slate-700">{q}</b>&rdquo;</>}
                  {q && (commune || region) && " en "}
                  {commune && <b className="text-slate-700">{commune}</b>}
                  {region && <b className="text-slate-700">{region}</b>}
                  {specialty && <>{q || commune || region ? " · " : ""}<span className="text-blue-600">{specialty}</span></>}
                </p>
              </div>
              <Link
                href="/buscar"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Filter className="w-3.5 h-3.5" /> Limpiar filtros
              </Link>
            </div>

            {dentists.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dentists.map((d) => (
                  <DentistCard key={d.id} d={d} />
                ))}
              </div>
            )}
          </>
        ) : (
          /* ───── DISCOVERY MODE ───── */
          <div className="space-y-12">
            {/* Top Rated */}
            {topRated.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Award className="w-5 h-5 text-amber-500" />}
                  title="Mejor evaluados"
                  subtitle="Los profesionales con las mejores reseñas de pacientes"
                />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {topRated.map((d, i) => (
                    <DentistCard key={d.id} d={d} rank={i + 1} />
                  ))}
                </div>
              </section>
            )}

            {/* Available Today */}
            {availableToday.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Sparkles className="w-5 h-5 text-emerald-500" />}
                  title="Disponibles hoy"
                  subtitle="Agenda hoy mismo con estos profesionales"
                />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {availableToday.map((d) => (
                    <DentistCard key={d.id} d={d} highlight="today" />
                  ))}
                </div>
              </section>
            )}

            {/* By Region */}
            {sortedRegions.map((regionName) => {
              const regionDentists = byRegion[regionName];
              if (regionDentists.length === 0) return null;
              const show = regionDentists.slice(0, 3);
              const hasMore = regionDentists.length > 3;
              return (
                <section key={regionName}>
                  <SectionHeader
                    icon={<MapPin className="w-5 h-5 text-blue-500" />}
                    title={regionName}
                    subtitle={`${regionDentists.length} ${regionDentists.length === 1 ? "profesional" : "profesionales"} en esta región`}
                    action={
                      hasMore ? (
                        <Link
                          href={`/buscar?region=${encodeURIComponent(regionName)}`}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          Ver todos <ChevronRight className="w-4 h-4" />
                        </Link>
                      ) : undefined
                    }
                  />
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {show.map((d) => (
                      <DentistCard key={d.id} d={d} />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Browse by commune */}
            {communes.length > 0 && (
              <section>
                <SectionHeader
                  icon={<TrendingUp className="w-5 h-5 text-violet-500" />}
                  title="Buscar por comuna"
                  subtitle="Encuentra profesionales cerca de ti"
                />
                <div className="flex flex-wrap gap-2 mt-4">
                  {communes.sort().map((c) => (
                    <Link
                      key={c}
                      href={`/buscar?commune=${encodeURIComponent(c as string)}`}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:shadow-md transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {c}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* CTA */}
            <section className="bg-gradient-to-r from-blue-600 to-sky-500 rounded-2xl p-8 md:p-12 text-white text-center">
              <Heart className="w-8 h-8 mx-auto mb-3 text-white/80" />
              <h3 className="text-2xl md:text-3xl font-bold">¿Eres dentista?</h3>
              <p className="text-blue-100 mt-2 max-w-xl mx-auto">
                Únete a DentCode y recibe pacientes desde tu perfil público. Gratis por 14 días.
              </p>
              <Link
                href="/registro"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-xl font-semibold hover:shadow-xl transition"
              >
                Registrarme gratis <ArrowRight className="w-4 h-4" />
              </Link>
            </section>
          </div>
        )}
      </div>

      {/* Footer mini */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-sky-500 grid place-items-center text-white font-bold text-[10px]">D</div>
            <span>© 2026 DentCode · <a href="https://www.leucode.cl" className="text-blue-600 hover:underline">Leucode.IA</a></span>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-slate-900">Inicio</Link>
            <Link href="/buscar" className="hover:text-slate-900">Buscar</Link>
            <a href="https://www.leucode.cl/privacidad" className="hover:text-slate-900">Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────── Components ──────────────────── */

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function DentistCard({
  d,
  rank,
  highlight,
}: {
  d: EnrichedDentist;
  rank?: number;
  highlight?: "today";
}) {
  return (
    <Link
      href={`/dentista/${d.slug}`}
      className={`group bg-white border rounded-2xl p-5 hover:shadow-lg transition relative overflow-hidden ${
        highlight === "today"
          ? "border-emerald-200 hover:border-emerald-300"
          : "border-slate-200 hover:border-blue-300"
      }`}
    >
      {rank && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-amber-50 border border-amber-200 text-amber-600 grid place-items-center text-xs font-bold">
          #{rank}
        </div>
      )}
      {highlight === "today" && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
          HOY
        </div>
      )}

      <div className="flex gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-sky-100 text-blue-700 grid place-items-center font-bold text-base flex-shrink-0 overflow-hidden">
          {d.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.photoUrl} alt={d.fullName} className="w-full h-full object-cover" />
          ) : (
            d.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("")
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition">
              {d.fullName}
            </h3>
            {d.verificationStatus === "verified" && (
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
          </div>
          {d.specialty && (
            <p className="text-sm text-blue-600 truncate">{d.specialty}</p>
          )}

          {d.reviewCount > 0 ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.round(d.rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-700">{d.rating.toFixed(1)}</span>
              <span className="text-xs text-slate-400">({d.reviewCount} {d.reviewCount === 1 ? "reseña" : "reseñas"})</span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1.5">Nuevo en DentCode</p>
          )}
        </div>
      </div>

      {/* Location + availability */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {d.locations[0] && (
            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {[d.locations[0].commune, d.locations[0].city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="text-xs text-right flex-shrink-0">
          {d.nextSlot ? (
            <p className="font-medium text-emerald-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatSlot(d.nextSlot)}
            </p>
          ) : (
            <p className="text-slate-400">Consultar</p>
          )}
        </div>
      </div>

      {/* Hover CTA */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition">
        <Calendar className="w-3.5 h-3.5" /> Ver perfil y agendar <ArrowRight className="w-3 h-3" />
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center">
      <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <p className="font-semibold text-slate-700 text-lg">No encontramos resultados</p>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        Intenta con otros términos de búsqueda, otra comuna, o explora sin filtros.
      </p>
      <Link
        href="/buscar"
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
      >
        <Search className="w-4 h-4" /> Explorar todos
      </Link>
    </div>
  );
}

/* ──────────────────── Helpers ──────────────────── */
function formatSlot(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tgt = new Date(d);
  const day = new Date(tgt);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  const time = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Hoy ${time}`;
  if (diff === 1) return `Mañana ${time}`;
  return `${d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}
