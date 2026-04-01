import Link from "next/link";

const WHATSAPP_PHONE = "573185657508";
const WHATSAPP_MESSAGE =
  "Hola, quiero información sobre productos disponibles en la tienda web de Kensar.";

export default function FloatingWhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="floating-whatsapp-btn"
      aria-label="Abrir WhatsApp de Kensar"
      title="Escribir por WhatsApp"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3a8.95 8.95 0 0 0-7.77 13.37L3 21l4.8-1.2A9 9 0 1 0 12 3Zm0 16.2a7.17 7.17 0 0 1-3.66-1.01l-.26-.15-2.84.71.76-2.77-.17-.28A7.2 7.2 0 1 1 12 19.2Zm3.95-5.4c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.17-.49.06-.22-.11-.94-.34-1.8-1.09-.66-.58-1.1-1.3-1.23-1.52-.13-.22-.01-.34.1-.45.1-.1.22-.26.34-.39.11-.13.15-.22.22-.37.08-.15.04-.28-.02-.39-.06-.11-.5-1.21-.69-1.66-.18-.43-.36-.38-.5-.39h-.43c-.15 0-.39.06-.6.28-.2.22-.78.76-.78 1.86s.8 2.16.91 2.31c.11.15 1.57 2.4 3.8 3.37.53.23.95.37 1.28.47.54.17 1.04.15 1.43.09.44-.07 1.3-.53 1.49-1.04.18-.5.18-.93.13-1.02-.06-.09-.2-.15-.42-.26Z"
          fill="currentColor"
        />
      </svg>
    </Link>
  );
}
