'use client';

import React from 'react';
import { X, Pencil, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { CartItemCustomization, ModifierGroup } from './CustomizationModal';

interface CartDrawerProps {
  cart: CartItemCustomization[];
  modifierGroupsMap: Record<string, ModifierGroup[]>; // itemId -> groups
  onEdit: (cartItem: CartItemCustomization) => void;
  onRemove: (cartKey: string) => void;
  onClose: () => void;
}

function formatSelections(
  selections: Record<string, string[]>,
  modifierGroups: ModifierGroup[]
): string[] {
  const lines: string[] = [];
  for (const group of modifierGroups) {
    const selected = selections[group.id] ?? [];
    if (selected.length === 0) continue;
    const labels = selected.map(optId => {
      const opt = group.options.find(o => o.id === optId);
      if (!opt) return '';
      return opt.priceAdd > 0 ? `${opt.label} +$${opt.priceAdd.toFixed(2)}` : opt.label;
    }).filter(Boolean);
    if (labels.length > 0) {
      lines.push(`${group.name}: ${labels.join(', ')}`);
    }
  }
  return lines;
}

export default function CartDrawer({
  cart,
  modifierGroupsMap,
  onEdit,
  onRemove,
  onClose,
}: CartDrawerProps) {
  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const persistCartForCheckout = () => {
    if (typeof window === 'undefined') return;

    const checkoutCart = cart.map((item) => ({
      id: item.cartKey,
      mealId: item.itemId,
      title: item.title,
      description: item.notes || '',
      price: item.totalPrice,
      qty: item.qty,
      image: item.image,
      imageAlt: item.imageAlt,
      selections: item.selections,
      notes: item.notes || '',
      chef: {
        id: window.location.search.includes('id=')
          ? new URLSearchParams(window.location.search).get('id')
          : null,
        name: window.localStorage.getItem('inhouse_vendor_name') || undefined,
        avatar: window.localStorage.getItem('inhouse_vendor_avatar') || undefined,
        rating: 5,
      },
    }));

    window.localStorage.setItem('inhouse_checkout_cart', JSON.stringify(checkoutCart));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-card h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-700 text-foreground">Your Cart</h2>
            <span className="w-6 h-6 bg-primary text-white text-xs font-700 rounded-full flex items-center justify-center font-tabular">
              {cartCount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-0 py-10 text-center px-4">
              {/* Illustration */}
              <div className="relative mb-5">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <ShoppingBag className="w-11 h-11 text-muted-foreground/40" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border-2 border-card">
                  <span className="text-lg">🍽️</span>
                </div>
              </div>
              <h3 className="text-base font-700 text-foreground mb-1.5">Your basket is empty</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-[220px]">
                Add items from the menu to start building your order.
              </p>
              {/* Tip */}
              <div className="w-full bg-primary/5 border border-primary/15 rounded-2xl p-3.5 text-left">
                <p className="text-xs font-600 text-primary mb-1">💡 How to order</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Browse the menu below, tap <span className="font-600 text-foreground">Add to Cart</span> on any item, then customize and checkout.
                </p>
              </div>
            </div>
          ) : (
            cart.map(cartItem => {
              const groups = modifierGroupsMap[cartItem.itemId] ?? [];
              const customLines = formatSelections(cartItem.selections, groups);
              return (
                <div key={cartItem.cartKey} className="bg-muted/40 rounded-2xl p-3 border border-border">
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                      <img
                        src={cartItem.image}
                        alt={cartItem.imageAlt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-700 text-foreground leading-snug">{cartItem.title}</p>
                        <span className="text-sm font-700 text-foreground font-tabular shrink-0 ml-1">
                          ${(cartItem.totalPrice * cartItem.qty).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Qty: {cartItem.qty} × ${cartItem.totalPrice.toFixed(2)}
                      </p>

                      {/* Customization lines */}
                      {customLines.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {customLines.map((line, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground leading-snug">
                              • {line}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {cartItem.notes && (
                        <p className="text-[11px] text-muted-foreground mt-1 italic">
                          Note: {cartItem.notes}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onEdit(cartItem)}
                          className="flex items-center gap-1 text-xs font-600 text-primary hover:text-primary/80 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <span className="text-border">·</span>
                        <button
                          onClick={() => {
                            onRemove(cartItem.cartKey);
                            toast(`🗑️ ${cartItem.title} removed`, {
                              description: 'Item removed from your cart',
                              duration: 2500,
                              action: {
                                label: 'Undo',
                                onClick: () => {
                                  // Undo is handled by re-adding — for now just inform
                                  toast.success('Add the item again from the menu to restore it.');
                                },
                              },
                            });
                          }}
                          className="flex items-center gap-1 text-xs font-600 text-red-500 hover:text-red-600 transition-colors active:scale-95"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-border bg-card shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-base font-700 text-foreground font-tabular">${cartTotal.toFixed(2)}</span>
            </div>
            <Link href="/order-checkout-screen" onClick={() => { persistCartForCheckout(); onClose(); }}>
              <button className="w-full flex items-center justify-between bg-primary text-white px-5 py-4 rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 font-700">
                <span>Proceed to Checkout</span>
                <span className="font-tabular">${cartTotal.toFixed(2)}</span>
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
