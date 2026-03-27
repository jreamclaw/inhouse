'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';

export interface ModifierOption {
  id: string;
  label: string;
  priceAdd: number; // 0 if no extra charge
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: ModifierOption[];
}

export interface CartItemCustomization {
  cartKey: string; // unique key = itemId + JSON(selections)
  itemId: string;
  title: string;
  basePrice: number;
  totalPrice: number; // basePrice + all add-ons
  qty: number;
  image: string;
  imageAlt: string;
  chefName: string;
  chefAvatar: string;
  selections: Record<string, string[]>; // groupId -> selected option ids
  notes: string;
}

interface CustomizationModalProps {
  item: {
    id: string;
    title: string;
    description: string;
    price: number;
    image: string;
    imageAlt: string;
    calories?: number;
  };
  modifierGroups: ModifierGroup[];
  chefName: string;
  chefAvatar: string;
  existingCartItem?: CartItemCustomization | null; // for editing
  onConfirm: (customization: CartItemCustomization) => void;
  onClose: () => void;
}

export default function CustomizationModal({
  item,
  modifierGroups,
  chefName,
  chefAvatar,
  existingCartItem,
  onConfirm,
  onClose,
}: CustomizationModalProps) {
  const [qty, setQty] = useState(existingCartItem?.qty ?? 1);
  const [selections, setSelections] = useState<Record<string, string[]>>(
    existingCartItem?.selections ?? {}
  );
  const [notes, setNotes] = useState(existingCartItem?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate total price
  const addOnTotal = modifierGroups.reduce((sum, group) => {
    const selected = selections[group.id] ?? [];
    return sum + selected.reduce((s, optId) => {
      const opt = group.options.find(o => o.id === optId);
      return s + (opt?.priceAdd ?? 0);
    }, 0);
  }, 0);
  const unitPrice = item.price + addOnTotal;
  const totalPrice = unitPrice * qty;

  const toggleOption = (group: ModifierGroup, optionId: string) => {
    setSelections(prev => {
      const current = prev[group.id] ?? [];
      if (group.multiSelect) {
        const maxSel = group.maxSelect ?? Infinity;
        if (current.includes(optionId)) {
          return { ...prev, [group.id]: current.filter(id => id !== optionId) };
        } else {
          if (current.length >= maxSel) return prev;
          return { ...prev, [group.id]: [...current, optionId] };
        }
      } else {
        // single select — toggle off if same, else replace
        if (current.includes(optionId)) {
          return { ...prev, [group.id]: [] };
        }
        return { ...prev, [group.id]: [optionId] };
      }
    });
    // clear error for this group
    setErrors(prev => {
      const next = { ...prev };
      delete next[group.id];
      return next;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const group of modifierGroups) {
      if (group.required) {
        const selected = selections[group.id] ?? [];
        const min = group.minSelect ?? 1;
        if (selected.length < min) {
          newErrors[group.id] = group.multiSelect
            ? `Please select at least ${min} option${min > 1 ? 's' : ''}`
            : `Please select an option`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    const cartKey = `${item.id}__${JSON.stringify(selections)}__${notes}`;
    onConfirm({
      cartKey,
      itemId: item.id,
      title: item.title,
      basePrice: item.price,
      totalPrice: unitPrice,
      qty,
      image: item.image,
      imageAlt: item.imageAlt,
      chefName,
      chefAvatar,
      selections,
      notes,
    });
  };

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-lg font-700 text-foreground leading-tight truncate">{item.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Base price: <span className="font-600 text-foreground font-tabular">${item.price.toFixed(2)}</span>
              {item.calories && <span className="ml-2">{item.calories} cal</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Modifier Groups */}
          {modifierGroups.map(group => {
            const selected = selections[group.id] ?? [];
            const hasError = !!errors[group.id];
            return (
              <div key={group.id}>
                {/* Group header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <span className="text-sm font-700 text-foreground">{group.name}</span>
                    {group.required ? (
                      <span className="ml-2 text-[10px] font-700 bg-primary/10 text-primary px-2 py-0.5 rounded-full">Required</span>
                    ) : (
                      <span className="ml-2 text-[10px] font-600 bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Optional</span>
                    )}
                  </div>
                  {group.multiSelect && group.maxSelect && (
                    <span className="text-xs text-muted-foreground">
                      {selected.length}/{group.maxSelect}
                    </span>
                  )}
                </div>

                {hasError && (
                  <p className="text-xs text-red-500 mb-2">{errors[group.id]}</p>
                )}

                {/* Options */}
                <div className="space-y-2">
                  {group.options.map(opt => {
                    const isSelected = selected.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleOption(group, opt.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-150 text-left ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : hasError
                            ? 'border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10' :'border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox / Radio indicator */}
                          <div className={`w-5 h-5 rounded-${group.multiSelect ? 'md' : 'full'} border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-primary bg-primary' : 'border-border'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-sm font-500 text-foreground">{opt.label}</span>
                        </div>
                        {opt.priceAdd > 0 && (
                          <span className="text-sm font-600 text-primary font-tabular shrink-0 ml-2">
                            +${opt.priceAdd.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-700 text-foreground mb-2">
              Special Instructions
              <span className="ml-2 text-[10px] font-600 bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Optional</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any allergies, preferences, or special requests..."
              rows={3}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer: Quantity + Add to Cart */}
        <div className="px-5 py-4 border-t border-border bg-card shrink-0 space-y-3">
          {/* Quantity selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-600 text-foreground">Quantity</span>
            <div className="flex items-center gap-3 bg-muted rounded-full px-1 py-1">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-8 h-8 bg-card border border-border text-foreground rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-base font-700 text-foreground font-tabular w-6 text-center">{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Add to Cart button */}
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-between bg-primary text-white px-5 py-4 rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 font-700"
          >
            <span>{existingCartItem ? 'Update Cart' : 'Add to Cart'}</span>
            <span className="font-tabular">${totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
