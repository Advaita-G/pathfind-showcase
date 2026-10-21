// src/components/JsonLd.tsx
//
// Renders a JSON-LD data block. Because this happens inside the React tree, the markup
// ends up in the prerendered HTML *and* in the hydrated page, so it survives both a
// Googlebot fetch of the static file and client-side navigation.

export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
