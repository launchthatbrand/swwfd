"use client";

import { useEffect, useRef, useState } from "react";

export const DocxResumePreview = (props: {
  fileUrl: string;
  fileName: string;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const abortController = new AbortController();
    const container = containerRef.current;

    const renderDocx = async () => {
      if (!container) return;

      container.innerHTML = "";
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const { renderAsync } = await import("docx-preview");
        const response = await fetch(props.fileUrl, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch document (${response.status})`);
        }

        const fileBuffer = await response.arrayBuffer();
        if (disposed) return;

        await renderAsync(fileBuffer, container, undefined, {
          inWrapper: true,
          breakPages: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          ignoreWidth: false,
        });

        if (disposed) return;
        setIsLoading(false);
      } catch (error) {
        if (disposed || abortController.signal.aborted) return;
        setIsLoading(false);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to render Word preview",
        );
      }
    };

    void renderDocx();

    return () => {
      disposed = true;
      abortController.abort();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [props.fileUrl]);

  if (errorMessage) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-sm font-medium">Unable to preview this Word document inline.</p>
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
    <div className="h-full overflow-auto bg-white p-3">
      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center text-sm">Loading Word document...</div>
      ) : null}
      <div
        ref={containerRef}
        className="[&_.docx]:mx-auto [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0"
      />
      {!isLoading ? (
        <p className="text-muted-foreground mt-3 text-center text-xs">{props.fileName}</p>
      ) : null}
    </div>
  );
};
