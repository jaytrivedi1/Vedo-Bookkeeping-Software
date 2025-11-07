import { useState, useEffect, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Edit2, Check, X } from "lucide-react";

interface ExchangeRateInputProps {
  fromCurrency: string;
  toCurrency: string;
  value: number;
  onChange: (value: number, shouldUpdate: boolean) => void;
  isLoading?: boolean;
  disabled?: boolean;
  date?: Date;
  label?: string;
}

export function ExchangeRateInput({
  fromCurrency,
  toCurrency,
  value,
  onChange,
  isLoading = false,
  disabled = false,
  date,
  label
}: ExchangeRateInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  useEffect(() => {
    if (!isEditing) {
      setEditValue(value.toFixed(6));
    }
  }, [value, isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(value.toFixed(6));
  };

  const handleSave = () => {
    const newValue = parseFloat(editValue);
    if (!isNaN(newValue) && newValue > 0) {
      onChange(newValue, true);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value.toFixed(6));
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        {label || `Exchange Rate (1 ${fromCurrency} = ? ${toCurrency})`}
      </Label>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-gray-50">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            <span className="text-sm text-gray-500">Loading rate...</span>
          </div>
        ) : isEditing ? (
          <>
            <Input
              type="number"
              step="0.000001"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              autoFocus
              data-testid="input-exchange-rate-edit"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              variant="default"
              data-testid="button-save-rate"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCancel}
              variant="outline"
              data-testid="button-cancel-rate"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex-1 h-10 px-3 border rounded-md bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-medium" data-testid="text-exchange-rate">
                {value.toFixed(6)}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleStartEdit}
              variant="outline"
              disabled={disabled}
              data-testid="button-edit-rate"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500">
        1 {fromCurrency} = {value.toFixed(6)} {toCurrency}
      </p>
    </div>
  );
}
