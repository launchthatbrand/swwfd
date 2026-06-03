"use client";

import type { MondayEmailTemplate } from "../../../types";
import { formatUpdatedAt } from "../../../helpers";

export type TemplatesTabProps = {
  emailTemplates: MondayEmailTemplate[];
  selectedTemplate: MondayEmailTemplate | null;
  isLoadingTemplates: boolean;
  onSelectTemplateId: (templateId: string) => void;
};

export const TemplatesTab = ({
  emailTemplates,
  selectedTemplate,
  isLoadingTemplates,
  onSelectTemplateId,
}: TemplatesTabProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Templates ({emailTemplates.length})
        </p>
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {emailTemplates.map((template) => {
            const isActive = template.id === selectedTemplate?.id;
            return (
              <button
                key={template.id}
                type="button"
                className={[
                  "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted/60",
                ].join(" ")}
                onClick={() => {
                  onSelectTemplateId(template.id);
                }}
              >
                <p className="line-clamp-1 font-medium">{template.name}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Updated {formatUpdatedAt(template.updatedAt)}
                </p>
              </button>
            );
          })}
          {emailTemplates.length === 0 && !isLoadingTemplates ? (
            <p className="text-muted-foreground text-sm">
              No templates found on board 18401299370.
            </p>
          ) : null}
          {isLoadingTemplates ? (
            <p className="text-muted-foreground text-sm">
              Loading templates...
            </p>
          ) : null}
        </div>
      </div>
      <div className="bg-background min-h-[420px] rounded-md border p-4">
        {selectedTemplate ? (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="text-xs font-semibold tracking-wide uppercase">
                Subject
              </p>
              <p className="mt-1 text-base font-medium">
                {selectedTemplate.name}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase">
                Email Preview (Lead View)
              </p>
              <div className="bg-card mt-2 rounded-md border p-4">
                {selectedTemplate.content.trim().length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No content found in column doc_mm0wq4r.
                  </p>
                ) : selectedTemplate.renderedHtml.trim().length > 0 ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none **:wrap-break-word"
                    style={{ whiteSpace: "pre-wrap" }}
                    dangerouslySetInnerHTML={{
                      __html: selectedTemplate.renderedHtml,
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedTemplate.content}
                  </div>
                )}
                {selectedTemplate.docLink ? (
                  <p className="mt-3 text-xs">
                    <a
                      href={selectedTemplate.docLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      Open source Monday Workdoc
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select an email template to preview.
          </p>
        )}
      </div>
    </div>
  );
};
