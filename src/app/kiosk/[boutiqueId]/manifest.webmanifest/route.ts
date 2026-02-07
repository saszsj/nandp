import { NextRequest, NextResponse } from "next/server";

type Context = {
  params: Promise<{ boutiqueId: string }>;
};

export async function GET(_: NextRequest, context: Context) {
  const { boutiqueId } = await context.params;
  const manifest = {
    name: "Nouveautes & Promos",
    short_name: "N&P",
    description: "Plateforme B2B2C de promotions et nouveautes.",
    lang: "fr",
    start_url: `/kiosk/${boutiqueId}`,
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "content-type": "application/manifest+json",
    },
  });
}
