import type { Metadata } from "next";
import { Suspense } from "react";
import PersonalizaExperience from "./PersonalizaExperience";

export const metadata: Metadata = {
  title: "Personaliza tu instrumento",
  description:
    "Configura campanas, güiros y maracas con estilos predefinidos y texto personalizado.",
  alternates: {
    canonical: "/personaliza",
  },
};

export default function PersonalizaPage() {
  return (
    <Suspense fallback={null}>
      <PersonalizaExperience />
    </Suspense>
  );
}
