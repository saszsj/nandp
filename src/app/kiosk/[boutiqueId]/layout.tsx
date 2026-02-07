import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ boutiqueId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boutiqueId } = await params;
  return {
    manifest: `/kiosk/${boutiqueId}/manifest.webmanifest`,
  };
}

export default function KioskLayout({ children }: Props) {
  return children;
}
