import QRCode from "qrcode";
import { CopyButton } from "./copy-button";

/**
 * Copy-link and QR panel for a class's public page. The QR is rendered to SVG
 * on the server so there is no client-side QR library in the bundle.
 */
export async function ShareTools({ url }: { url: string }) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <div className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      {/* White plate regardless of theme — scanners need the contrast. */}
      <div
        className="mx-auto h-40 w-40 shrink-0 rounded-lg bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h3 className="font-medium">Share with students</h3>
          <p className="mt-1 text-sm text-muted">
            Students scan the code or open the link — no account needed.
          </p>
        </div>

        <code className="block truncate rounded-lg border border-border bg-surface-muted px-3 py-2 font-mono text-xs">
          {url}
        </code>

        <div className="flex flex-wrap gap-2">
          <CopyButton value={url} className="btn-secondary px-3 py-1.5" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary px-3 py-1.5"
          >
            Open
          </a>
        </div>
      </div>
    </div>
  );
}
