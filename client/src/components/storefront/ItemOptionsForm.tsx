import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export interface SelectedOption {
  optionGroupLabel: string;
  choices: Array<{ label: string; priceCents: number }>;
}

export interface ItemOptionsFormProps {
  options: any[];
  selectedOptions: SelectedOption[];
  onChange: (updater: (prev: SelectedOption[]) => SelectedOption[]) => void;
  formatPrice: (price: number | string) => string;
}

// Extracted (behavior-identical) from Storefront.tsx's Item Options dialog body so
// the product detail page can render the same option groups inline, without a Dialog.
export function ItemOptionsForm({ options, selectedOptions, onChange, formatPrice }: ItemOptionsFormProps) {
  return (
    <div className="space-y-6">
      {options.map((optionGroup: any, optionIndex: number) => (
        <div key={optionIndex} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{optionGroup.label}</h3>
            {optionGroup.required && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>

          {optionGroup.type === 'single' ? (
            <RadioGroup
              value={
                selectedOptions.find((o) => o.optionGroupLabel === optionGroup.label)?.choices[0]?.label || ""
              }
              onValueChange={(value) => {
                const choice = optionGroup.choices.find((c: any) => c.label === value);
                if (choice) {
                  onChange((prev) => [
                    ...prev.filter((o) => o.optionGroupLabel !== optionGroup.label),
                    { optionGroupLabel: optionGroup.label, choices: [choice] },
                  ]);
                }
              }}
            >
              {optionGroup.choices.map((choice: any, choiceIndex: number) => (
                <div key={choiceIndex} className="flex items-center space-x-2 border rounded-lg p-3 hover-elevate">
                  <RadioGroupItem value={choice.label} id={`option-${optionIndex}-${choiceIndex}`} />
                  <label
                    htmlFor={`option-${optionIndex}-${choiceIndex}`}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <span>{choice.label}</span>
                    {choice.priceCents > 0 && (
                      <span className="text-sm text-muted-foreground">
                        +{formatPrice((choice.priceCents / 100).toFixed(2))}
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="space-y-2">
              {optionGroup.choices.map((choice: any, choiceIndex: number) => {
                const selectedGroup = selectedOptions.find((o) => o.optionGroupLabel === optionGroup.label);
                const isSelected = selectedGroup?.choices.some((c) => c.label === choice.label);

                return (
                  <div key={choiceIndex} className="flex items-center space-x-2 border rounded-lg p-3 hover-elevate">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onChange((prev) => {
                            const existing = prev.find((o) => o.optionGroupLabel === optionGroup.label);
                            if (existing) {
                              return prev.map((o) =>
                                o.optionGroupLabel === optionGroup.label
                                  ? { ...o, choices: [...o.choices, choice] }
                                  : o
                              );
                            }
                            return [...prev, { optionGroupLabel: optionGroup.label, choices: [choice] }];
                          });
                        } else {
                          onChange((prev) =>
                            prev
                              .map((o) =>
                                o.optionGroupLabel === optionGroup.label
                                  ? { ...o, choices: o.choices.filter((c) => c.label !== choice.label) }
                                  : o
                              )
                              .filter((o) => o.choices.length > 0)
                          );
                        }
                      }}
                      id={`option-${optionIndex}-${choiceIndex}`}
                    />
                    <label
                      htmlFor={`option-${optionIndex}-${choiceIndex}`}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <span>{choice.label}</span>
                      {choice.priceCents > 0 && (
                        <span className="text-sm text-muted-foreground">
                          +{formatPrice((choice.priceCents / 100).toFixed(2))}
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
