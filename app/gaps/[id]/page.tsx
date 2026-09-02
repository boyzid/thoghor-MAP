import GapDetailClient from "./GapDetailClient";

export default function GapDetailPage({ params }: { params: { id: string } }) {
  return <GapDetailClient gapId={params.id} />;
}
