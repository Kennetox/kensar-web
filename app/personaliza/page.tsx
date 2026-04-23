import type { Metadata } from "next";
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
  return <PersonalizaExperience />;
}
