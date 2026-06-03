"use client";

import { DocxResumePreview } from "./DocxResumePreview";
import { PdfResumePreview } from "./PdfResumePreview";

export type ResumePreviewContentProps = {
  fileName: string;
  href: string;
  /** Tailwind height class for the preview container. Defaults to `h-[65vh]`. */
  previewHeightClass?: string;
};

const isPdfFile = (lowerName: string) => lowerName.endsWith(".pdf");

const isDocxDocument = (lowerName: string) =>
  lowerName.endsWith(".docx") ||
  lowerName.endsWith(".docm") ||
  lowerName.endsWith(".dotx") ||
  lowerName.endsWith(".dotm");

const isLegacyWordDocument = (lowerName: string) =>
  lowerName.endsWith(".doc") || lowerName.endsWith(".rtf");

const isImageFile = (lowerName: string) =>
  lowerName.endsWith(".png") ||
  lowerName.endsWith(".jpg") ||
  lowerName.endsWith(".jpeg") ||
  lowerName.endsWith(".gif") ||
  lowerName.endsWith(".webp") ||
  lowerName.endsWith(".svg");

export const ResumePreviewContent = ({
  fileName,
  href,
  previewHeightClass = "h-[65vh]",
}: ResumePreviewContentProps) => {
  const lowerName = fileName.toLowerCase();
  const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    href,
  )}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-xs underline"
        >
          Open in new tab
        </a>
      </div>
      <div
        className={`bg-muted/20 ${previewHeightClass} overflow-hidden rounded-md border`}
      >
        {isPdfFile(lowerName) ? (
          <PdfResumePreview fileUrl={href} fileName={fileName} />
        ) : isDocxDocument(lowerName) ? (
          <DocxResumePreview fileUrl={href} fileName={fileName} />
        ) : isLegacyWordDocument(lowerName) ? (
          <iframe
            src={officeEmbedUrl}
            title={`Word preview: ${fileName}`}
            className="h-full w-full border-0 bg-white"
          />
        ) : isImageFile(lowerName) ? (
          <object data={href} className="h-full w-full">
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <p className="text-sm font-medium">Image preview unavailable</p>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs underline"
              >
                Open resume in new tab
              </a>
            </div>
          </object>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <p className="text-sm font-medium">This file type cannot be previewed inline.</p>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs underline"
            >
              Open resume in new tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
