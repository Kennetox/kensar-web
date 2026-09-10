import { redirect } from "next/navigation";

export default async function LoyaltyBenefitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/?beneficio=${encodeURIComponent(token)}`);
}
