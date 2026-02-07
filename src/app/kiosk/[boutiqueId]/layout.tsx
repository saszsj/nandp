import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: { boutiqueId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    manifest: `/kiosk/${params.boutiqueId}/manifest.webmanifest`,
  };
}

export default function KioskLayout({ children }: Props) {
  return children;
}
