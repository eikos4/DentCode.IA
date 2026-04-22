import { prisma } from "@/lib/prisma";
import { getDentistFromAuth } from "@/lib/auth";
import { ReviewsClient } from "./reviews-client";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const dentist = await getDentistFromAuth();

  const [reviews, pendingRequests] = await Promise.all([
    prisma.review.findMany({
      where: { dentistId: dentist.id },
      orderBy: [{ published: "asc" }, { date: "desc" }],
    }),
    prisma.reviewRequest.findMany({
      where: { dentistId: dentist.id, submittedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const publishedCount = reviews.filter((r: typeof reviews[number]) => r.published).length;
  const pendingCount = reviews.filter((r: typeof reviews[number]) => !r.published).length;
  const avg =
    publishedCount > 0
      ? reviews.filter((r: typeof reviews[number]) => r.published).reduce((s: number, r: typeof reviews[number]) => s + r.rating, 0) / publishedCount
      : 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reseñas</h1>
        <p className="text-sm text-slate-600 mt-1">
          Gestiona las reseñas de tus pacientes y solicítales una al finalizar la atención.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Publicadas" value={publishedCount} accent="emerald" />
        <StatCard label="Pendientes" value={pendingCount} accent="amber" />
        <StatCard label="Calificación" value={avg ? avg.toFixed(1) : "—"} accent="blue" />
        <StatCard label="Solicitudes" value={pendingRequests.length} accent="slate" />
      </div>

      <ReviewsClient
        reviews={reviews.map((r: typeof reviews[number]) => ({
          id: r.id,
          patientName: r.patientName,
          rating: r.rating,
          comment: r.comment,
          treatment: r.treatment,
          date: r.date.toISOString(),
          verified: r.verified,
          published: r.published,
        }))}
        pendingRequests={pendingRequests.map((r: typeof pendingRequests[number]) => ({
          id: r.id,
          patientName: r.patientName,
          patientPhone: r.patientPhone,
          token: r.token,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: React.ReactNode; accent: "emerald" | "amber" | "blue" | "slate" }) {
  const colors = {
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200",
    amber: "from-amber-50 to-amber-100 text-amber-700 border-amber-200",
    blue: "from-blue-50 to-blue-100 text-blue-700 border-blue-200",
    slate: "from-slate-50 to-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[accent]} border rounded-xl p-4`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
