"use client";

import { Filter } from "lucide-react";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@launchthatapp/ui/dialog";
import { Input } from "@launchthatapp/ui/input";

import {
  ADVANCED_DATE_OPERATORS,
  ADVANCED_OPERATOR_LABELS,
  ADVANCED_TEXT_OPERATORS,
  getBoardColumnTargetForCondition,
  isAdvancedFilterOperator,
} from "../../helpers";
import type {
  AdvancedFilterCondition,
  AdvancedFilterMatchMode,
  AdvancedFilterOperator,
  SavedAdvancedFilterPreset,
} from "../../types";

export type BoardFilterSelectOption = {
  value: string;
  label: string;
};

export type AdvancedFiltersDialogProps = {
  activeAdvancedFilterConditionsCount: number;
  advancedFilterConditions: AdvancedFilterCondition[];
  advancedFilterMatchMode: AdvancedFilterMatchMode;
  onAdvancedFilterMatchModeChange: (mode: AdvancedFilterMatchMode) => void;
  filteredRecordsCount: number;
  recordsCount: number;
  boardColumnFilterOptions: string[];
  boardColumnFilterKindByLabel: Map<string, "text" | "date">;
  boardColumnValueOptionsByLabel: Map<string, string[]>;
  ownerOptions: BoardFilterSelectOption[];
  onAddCondition: () => void;
  onClearAll: () => void;
  onRemoveCondition: (conditionId: string) => void;
  onChangeTarget: (conditionId: string, target: string) => void;
  onChangeOperator: (conditionId: string, operator: AdvancedFilterOperator) => void;
  onChangeValue: (conditionId: string, value: string) => void;
  onChangeValueTo: (conditionId: string, valueTo: string) => void;
  pendingSavedAdvancedFilterName: string;
  onPendingSavedAdvancedFilterNameChange: (name: string) => void;
  onSavePreset: () => void;
  isSavingAdvancedFilterPreset: boolean;
  sessionToken: string | null;
  presetScopeOwnerId: string;
  savedAdvancedFilterPresets: SavedAdvancedFilterPreset[];
  activeSavedAdvancedFilterId: string | null;
  onApplyPreset: (preset: SavedAdvancedFilterPreset) => void;
  onDeletePreset: (presetId: string) => void;
  deletingAdvancedFilterPresetIds: Record<string, boolean>;
};

export const AdvancedFiltersDialog = ({
  activeAdvancedFilterConditionsCount,
  advancedFilterConditions,
  advancedFilterMatchMode,
  onAdvancedFilterMatchModeChange,
  filteredRecordsCount,
  recordsCount,
  boardColumnFilterOptions,
  boardColumnFilterKindByLabel,
  boardColumnValueOptionsByLabel,
  ownerOptions,
  onAddCondition,
  onClearAll,
  onRemoveCondition,
  onChangeTarget,
  onChangeOperator,
  onChangeValue,
  onChangeValueTo,
  pendingSavedAdvancedFilterName,
  onPendingSavedAdvancedFilterNameChange,
  onSavePreset,
  isSavingAdvancedFilterPreset,
  sessionToken,
  presetScopeOwnerId,
  savedAdvancedFilterPresets,
  activeSavedAdvancedFilterId,
  onApplyPreset,
  onDeletePreset,
  deletingAdvancedFilterPresetIds,
}: AdvancedFiltersDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 shrink-0 px-2.5" title="Advanced Filters">
          <Filter className="h-3.5 w-3.5" />
          {activeAdvancedFilterConditionsCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 py-0 leading-none text-[10px]">
              {activeAdvancedFilterConditionsCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-hidden border-2 border-border/80 bg-linear-to-b from-background to-muted/20 p-0 shadow-xl">
        <DialogHeader className="border-b-2 border-border/70 bg-muted/35 px-6 py-4">
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogDescription>
            Build multi-condition logic, preview result count, and save presets per owner board.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 rounded-md border-2 border-border/70 bg-card/70 p-3 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border border-border/60 bg-primary/10 text-xs">
                {activeAdvancedFilterConditionsCount} active
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/80 text-xs">
                {advancedFilterConditions.length} total
              </Badge>
              <span className="text-muted-foreground text-xs">
                Showing {filteredRecordsCount} of {recordsCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="advanced-filter-match-mode"
                className="text-muted-foreground text-xs font-medium"
              >
                Match mode
              </label>
              <select
                id="advanced-filter-match-mode"
                value={advancedFilterMatchMode}
                onChange={(event) => {
                  const value = event.target.value === "any" ? "any" : "all";
                  onAdvancedFilterMatchModeChange(value);
                }}
                className="border-input h-8 rounded-md border-2 bg-background px-2 text-sm shadow-sm"
              >
                <option value="all">Match all conditions</option>
                <option value="any">Match any condition</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border-2 border-border/70 bg-muted/15 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Conditions</p>
                <p className="text-muted-foreground text-xs">
                  Add or remove conditions that run against Monday board columns.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-2 px-3 text-xs shadow-sm"
                  onClick={onAddCondition}
                >
                  Add condition
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  onClick={onClearAll}
                  disabled={advancedFilterConditions.length === 0}
                >
                  Clear all
                </Button>
              </div>
            </div>

            {advancedFilterConditions.length === 0 ? (
              <div className="rounded-md border-2 border-dashed border-border/70 bg-background/70 p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  No conditions yet. Add a condition to start filtering records.
                </p>
              </div>
            ) : (
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {advancedFilterConditions.map((condition, index) => {
                  const conditionTarget = getBoardColumnTargetForCondition(condition);
                  const boardColumnKind =
                    boardColumnFilterKindByLabel.get(conditionTarget) ?? "text";
                  const operatorOptions =
                    boardColumnKind === "date" ? ADVANCED_DATE_OPERATORS : ADVANCED_TEXT_OPERATORS;
                  const shouldHideValueInput =
                    condition.operator === "is_empty" || condition.operator === "is_not_empty";
                  const isDateField = boardColumnKind === "date";
                  const targetLabelLower = conditionTarget.toLowerCase();
                  const usesOwnerOptions =
                    targetLabelLower === "owner" && ownerOptions.length > 0;
                  const selectedBoardColumnOptions = isDateField
                    ? []
                    : (boardColumnValueOptionsByLabel.get(conditionTarget) ?? []);
                  const usesBoardColumnValueOptions =
                    selectedBoardColumnOptions.length > 0 && !usesOwnerOptions;
                  const hasBoardColumnOptions = boardColumnFilterOptions.length > 0;
                  return (
                    <div
                      key={condition.id}
                      className={`space-y-2 overflow-hidden rounded-md border-2 shadow-sm ${
                        index % 2 === 0
                          ? "border-border/75 bg-background"
                          : "border-border/75 bg-muted/25"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
                        <p className="text-[11px] font-semibold tracking-wide text-foreground/80 uppercase">
                          Condition {index + 1}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => onRemoveCondition(condition.id)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-end gap-2 px-3 pb-3">
                        <label className="space-y-1">
                          <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                            Column
                          </span>
                          <select
                            value={conditionTarget}
                            onChange={(event) =>
                              onChangeTarget(condition.id, event.target.value)
                            }
                            className="border-input h-8 min-w-[220px] rounded-md border-2 bg-background/95 px-2 text-sm shadow-sm"
                          >
                            {!hasBoardColumnOptions ? (
                              <option value="">No board columns loaded</option>
                            ) : null}
                            {hasBoardColumnOptions ? (
                              <option value="">Select board column</option>
                            ) : null}
                            {boardColumnFilterOptions.map((label) => (
                              <option key={label} value={label}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                            Operator
                          </span>
                          <select
                            value={condition.operator}
                            onChange={(event) => {
                              if (!isAdvancedFilterOperator(event.target.value)) return;
                              onChangeOperator(condition.id, event.target.value);
                            }}
                            className="border-input h-8 rounded-md border-2 bg-background/95 px-2 text-sm shadow-sm"
                          >
                            {operatorOptions.map((operator) => (
                              <option key={operator} value={operator}>
                                {ADVANCED_OPERATOR_LABELS[operator]}
                              </option>
                            ))}
                          </select>
                        </label>

                        {!shouldHideValueInput ? (
                          <label className="space-y-1">
                            <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                              Value
                            </span>
                            {usesOwnerOptions ? (
                              <select
                                value={condition.value}
                                onChange={(event) =>
                                  onChangeValue(condition.id, event.target.value)
                                }
                                className="border-input h-8 min-w-[220px] rounded-md border-2 bg-background/95 px-2 text-sm shadow-sm"
                              >
                                <option value="">Select owner</option>
                                {!ownerOptions.some(
                                  (option) => option.value === condition.value,
                                ) && condition.value.trim().length > 0 ? (
                                  <option value={condition.value}>
                                    {`Owner ${condition.value} (selected)`}
                                  </option>
                                ) : null}
                                {ownerOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : usesBoardColumnValueOptions ? (
                              <select
                                value={condition.value}
                                onChange={(event) =>
                                  onChangeValue(condition.id, event.target.value)
                                }
                                className="border-input h-8 min-w-[200px] rounded-md border-2 bg-background/95 px-2 text-sm shadow-sm"
                              >
                                <option value="">Select value</option>
                                {!selectedBoardColumnOptions.includes(condition.value) &&
                                condition.value.trim().length > 0 ? (
                                  <option value={condition.value}>
                                    {`${condition.value} (selected)`}
                                  </option>
                                ) : null}
                                {selectedBoardColumnOptions.map((value) => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type={isDateField ? "date" : "text"}
                                value={condition.value}
                                onChange={(event) =>
                                  onChangeValue(condition.id, event.target.value)
                                }
                                placeholder="Value"
                                className="h-8 min-w-[200px] border-2 bg-background/95 text-sm shadow-sm"
                              />
                            )}
                          </label>
                        ) : (
                          <div className="pb-1">
                            <p className="text-muted-foreground text-xs">
                              No value input required for this operator.
                            </p>
                          </div>
                        )}

                        {condition.operator === "between" ? (
                          <label className="space-y-1">
                            <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                              {isDateField ? "End date" : "Second value"}
                            </span>
                            <Input
                              type={isDateField ? "date" : "text"}
                              value={condition.valueTo}
                              onChange={(event) =>
                                onChangeValueTo(condition.id, event.target.value)
                              }
                              placeholder={isDateField ? "End date" : "Second value"}
                              className="h-8 min-w-[200px] border-2 bg-background/95 text-sm shadow-sm"
                            />
                          </label>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border-2 border-primary/25 bg-primary/5 p-4 shadow-sm">
            <div>
              <p className="text-sm font-medium">Saved Presets</p>
              <p className="text-muted-foreground text-xs">
                Save the active filter setup and reuse it for this owner board.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={pendingSavedAdvancedFilterName}
                onChange={(event) =>
                  onPendingSavedAdvancedFilterNameChange(event.target.value)
                }
                placeholder="Saved filter name"
                className="h-8 w-full max-w-xs border-2 bg-background/95 text-sm shadow-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-2 px-3 text-xs shadow-sm"
                onClick={onSavePreset}
                disabled={
                  isSavingAdvancedFilterPreset ||
                  !sessionToken ||
                  presetScopeOwnerId.length === 0
                }
              >
                {isSavingAdvancedFilterPreset ? "Saving..." : "Save preset"}
              </Button>
            </div>
            {presetScopeOwnerId.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Select an owner board to enable preset saving.
              </p>
            ) : null}

            {savedAdvancedFilterPresets.length > 0 ? (
              <div className="flex max-h-40 flex-wrap items-center gap-1.5 overflow-y-auto pr-1">
                {savedAdvancedFilterPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="bg-background/95 flex items-center rounded-md border-2 border-border/70 pr-1 shadow-sm"
                  >
                    <Button
                      size="sm"
                      variant={activeSavedAdvancedFilterId === preset.id ? "default" : "ghost"}
                      className="h-8 rounded-r-none px-2 text-xs"
                      onClick={() => onApplyPreset(preset)}
                    >
                      {preset.name}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground h-8 px-1.5 text-xs"
                      onClick={() => onDeletePreset(preset.id)}
                      disabled={!!deletingAdvancedFilterPresetIds[preset.id]}
                    >
                      {deletingAdvancedFilterPresetIds[preset.id] ? "..." : "X"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No saved filter presets yet.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
