"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const PdfResumePreview = (props: {
  fileUrl: string;
  fileName: string;
}) => {
  const [numPages, setNumPages] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastMeasuredWidthRef = useRef(0);

  useEffect(() => {
    setNumPages(0);
    setErrorMessage(null);
  }, [props.fileUrl]);

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const parentWidth = container.parentElement?.clientWidth ?? container.clientWidth;
      const next = Math.floor(parentWidth - 24);
      if (!Number.isFinite(next) || next <= 0) return;
      const normalized = Math.max(280, next);
      if (Math.abs(normalized - lastMeasuredWidthRef.current) < 2) {
        return;
      }
      lastMeasuredWidthRef.current = normalized;
      setContainerWidth(normalized);
    };

    const measureOnNextFrame = () => {
      window.requestAnimationFrame(() => {
        measure();
      });
    };
    measureOnNextFrame();

    const handleResize = () => {
      measure();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const pageNumbers = useMemo(() => {
    if (numPages <= 0) return [];
    return Array.from({ length: numPages }, (_, index) => index + 1);
  }, [numPages]);

  if (errorMessage) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-sm font-medium">Unable to preview this PDF inline.</p>
        <p className="text-muted-foreground text-xs">{errorMessage}</p>
        <a
          href={props.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-xs underline"
        >
          Open resume in new tab
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-auto p-3">
      <Document
        file={props.fileUrl}
        loading={
          <div className="text-muted-foreground py-8 text-center text-sm">Loading PDF…</div>
        }
        error={
          <div className="text-muted-foreground py-8 text-center text-sm">
            Preview unavailable for this PDF.
          </div>
        }
        onLoadSuccess={(document) => {
          setNumPages(document.numPages);
          setErrorMessage(null);
        }}
        onLoadError={(error) => {
          setNumPages(0);
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to render PDF preview",
          );
        }}
      >
        <div className="space-y-3">
          {pageNumbers.map((pageNumber) => (
            <div key={pageNumber} className="mx-auto flex w-full justify-center rounded border bg-white">
              <Page
                pageNumber={pageNumber}
                width={containerWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={<div className="text-muted-foreground p-4 text-xs">Loading page…</div>}
              />
            </div>
          ))}
        </div>
      </Document>
      {numPages > 0 ? (
        <p className="text-muted-foreground mt-3 text-center text-xs">
          {props.fileName} · {numPages} page{numPages === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
};
