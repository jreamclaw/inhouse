'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '../../lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, X, ChevronLeft, Loader2, ImagePlus, ChefHat, DollarSign, Settings2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Truck, CheckCircle2, Wallet, ShoppingBag, Clock3, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Meal {
  id: string;
  chef_id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  available: boolean;
  created_at: string;
}

interface MealFormData {
  title: string;
  description: string;
  price: string;
  category: string;
  available: boolean;
  imageFile: File | null;
  imagePreview: string | null;
  existingImageUrl: string | null;
}

interface ChefOrderStatRow {
  total: number;
  status: string;
  created_at: string;
}

interface ChefRevenueStatRow {
  chef_earnings: number;
  status: string;
  created_at: string;
}

// Modifier types (local, not persisted to DB in this implementation)
interface ModifierOption {
  id: string;
  label: string;
  priceAdd: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  maxSelect?: number;
  options: ModifierOption[];
}

const CATEGORIES = ['Starters', 'Pasta', 'Mains', 'Desserts', 'Drinks', 'Sides'];

const SAMPLE_VENDOR_STATS = {
  todayOrders: 0,
  todayRevenue: 0,
  pendingPayout: 0,
  avgPrepTime: '—',
  conversionHint: 'Live after first order',
};

const emptyForm: MealFormData = {
  title: '',
  description: '',
  price: '',
  category: 'Mains',
  available: true,
  imageFile: null,
  imagePreview: null,
  existingImageUrl: null,
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyGroup(): ModifierGroup {
  return {
    id: generateId(),
    name: '',
    required: false,
    multiSelect: false,
    options: [{ id: generateId(), label: '', priceAdd: 0 }],
  };
}

// ─── Modifier Group Editor ────────────────────────────────────────────────────
interface ModifierEditorProps {
  groups: ModifierGroup[];
  onChange: (groups: ModifierGroup[]) => void;
}

function ModifierEditor({ groups, onChange }: ModifierEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addGroup = () => {
    const g = emptyGroup();
    onChange([...groups, g]);
    setExpandedId(g.id);
  };

  const removeGroup = (id: string) => {
    onChange(groups.filter(g => g.id !== id));
  };

  const updateGroup = (id: string, patch: Partial<ModifierGroup>) => {
    onChange(groups.map(g => g.id === id ? { ...g, ...patch } : g));
  };

  const addOption = (groupId: string) => {
    onChange(groups.map(g =>
      g.id === groupId
        ? { ...g, options: [...g.options, { id: generateId(), label: '', priceAdd: 0 }] }
        : g
    ));
  };

  const removeOption = (groupId: string, optId: string) => {
    onChange(groups.map(g =>
      g.id === groupId
        ? { ...g, options: g.options.filter(o => o.id !== optId) }
        : g
    ));
  };

  const updateOption = (groupId: string, optId: string, patch: Partial<ModifierOption>) => {
    onChange(groups.map(g =>
      g.id === groupId
        ? { ...g, options: g.options.map(o => o.id === optId ? { ...o, ...patch } : o) }
        : g
    ));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-700 text-foreground">Modifier Groups</p>
          <p className="text-xs text-muted-foreground">Let customers customize this item</p>
        </div>
        <button
          type="button"
          onClick={addGroup}
          className="flex items-center gap-1.5 text-xs font-600 text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Group
        </button>
      </div>

      {groups.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
          <Settings2 className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground">No modifier groups yet. Add sides, drinks, extras, etc.</p>
        </div>
      )}

      {groups.map((group, gi) => (
        <div key={group.id} className="border border-border rounded-xl overflow-hidden">
          {/* Group header */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}
              className="flex-1 flex items-center gap-2 text-left"
            >
              {expandedId === group.id
                ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              }
              <span className="text-sm font-600 text-foreground truncate">
                {group.name || `Group ${gi + 1}`}
              </span>
              <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full shrink-0 ${
                group.required ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {group.required ? 'Required' : 'Optional'}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {group.options.length} option{group.options.length !== 1 ? 's' : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => removeGroup(group.id)}
              className="w-7 h-7 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center transition-colors shrink-0"
              aria-label="Remove group"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>

          {/* Group body */}
          {expandedId === group.id && (
            <div className="px-3 py-3 space-y-3 bg-card">
              {/* Group name */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Group Name *</label>
                <input
                  type="text"
                  value={group.name}
                  onChange={e => updateGroup(group.id, { name: e.target.value })}
                  placeholder="e.g. Choose Your Side, Add a Drink"
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateGroup(group.id, { required: !group.required })}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-600 transition-all ${
                    group.required
                      ? 'border-primary bg-primary/5 text-primary' :'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <span>Required</span>
                  {group.required
                    ? <ToggleRight className="w-4 h-4" />
                    : <ToggleLeft className="w-4 h-4" />
                  }
                </button>
                <button
                  type="button"
                  onClick={() => updateGroup(group.id, { multiSelect: !group.multiSelect })}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-600 transition-all ${
                    group.multiSelect
                      ? 'border-primary bg-primary/5 text-primary' :'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <span>Multi-select</span>
                  {group.multiSelect
                    ? <ToggleRight className="w-4 h-4" />
                    : <ToggleLeft className="w-4 h-4" />
                  }
                </button>
              </div>

              {/* Max select (only for multi-select) */}
              {group.multiSelect && (
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Max Selections (optional)</label>
                  <input
                    type="number"
                    value={group.maxSelect ?? ''}
                    onChange={e => updateGroup(group.id, {
                      maxSelect: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    placeholder="No limit"
                    min={1}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              )}

              {/* Options */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-2">Options</label>
                <div className="space-y-2">
                  {group.options.map((opt, oi) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.label}
                        onChange={e => updateOption(group.id, opt.id, { label: e.target.value })}
                        placeholder={`Option ${oi + 1} name`}
                        className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      />
                      <div className="relative w-24 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+$</span>
                        <input
                          type="number"
                          value={opt.priceAdd || ''}
                          onChange={e => updateOption(group.id, opt.id, {
                            priceAdd: parseFloat(e.target.value) || 0
                          })}
                          placeholder="0"
                          min={0}
                          step={0.25}
                          className="w-full bg-muted rounded-lg pl-7 pr-2 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                        />
                      </div>
                      {group.options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOption(group.id, opt.id)}
                          className="w-7 h-7 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center transition-colors shrink-0"
                          aria-label="Remove option"
                        >
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addOption(group.id)}
                  className="mt-2 flex items-center gap-1 text-xs font-600 text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Option
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChefMenuPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [formData, setFormData] = useState<MealFormData>(emptyForm);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isChef, setIsChef] = useState(false);

  // Delivery settings state
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('0.00');
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliverySaved, setDeliverySaved] = useState(false);
  const [orderStats, setOrderStats] = useState(SAMPLE_VENDOR_STATS);

  useEffect(() => {
    if (!user) return;
    checkChefAndLoadMeals();
  }, [user]);

  const checkChefAndLoadMeals = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, delivery_enabled, delivery_fee')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'chef') {
        setIsChef(false);
        setLoading(false);
        return;
      }
      setIsChef(true);
      setDeliveryEnabled(profile?.delivery_enabled ?? false);
      setDeliveryFee(profile?.delivery_fee != null ? Number(profile.delivery_fee).toFixed(2) : '0.00');
      await Promise.all([loadMeals(), loadOrderStats()]);
    } catch {
      setLoading(false);
    }
  };

  const loadMeals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('chef_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeals(data || []);
    } catch (err: any) {
      toast.error('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderStats = async () => {
    if (!user) return;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [{ data: orderData, error: orderError }, { data: revenueData, error: revenueError }] = await Promise.all([
        supabase
          .from('orders')
          .select('total, status, created_at')
          .eq('chef_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('order_revenue')
          .select('chef_earnings, status, created_at')
          .eq('chef_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (orderError) throw orderError;
      if (revenueError) throw revenueError;

      const rows = (orderData as ChefOrderStatRow[] | null) || [];
      const revenueRows = (revenueData as ChefRevenueStatRow[] | null) || [];
      const todayRows = rows.filter((row) => new Date(row.created_at) >= startOfDay && row.status !== 'cancelled');
      const openRows = rows.filter((row) => !['cancelled', 'delivered'].includes(row.status));
      const todayRevenueRows = revenueRows.filter((row) => new Date(row.created_at) >= startOfDay && row.status !== 'cancelled');
      const payoutRows = revenueRows.filter((row) => row.status === 'delivered');

      const todayRevenue = todayRevenueRows.reduce((sum, row) => sum + Number(row.chef_earnings || 0), 0);
      const pendingPayout = payoutRows.reduce((sum, row) => sum + Number(row.chef_earnings || 0), 0);

      setOrderStats({
        todayOrders: todayRows.length,
        todayRevenue,
        pendingPayout,
        avgPrepTime: todayRows.length > 0 ? 'Live' : '—',
        conversionHint: openRows.length > 0 ? `${openRows.length} active` : 'No active orders',
      });
    } catch {
      setOrderStats(SAMPLE_VENDOR_STATS);
    }
  };

  const openCreateForm = () => {
    setEditingMeal(null);
    setFormData(emptyForm);
    setModifierGroups([]);
    setShowForm(true);
  };

  const openEditForm = (meal: Meal) => {
    setEditingMeal(meal);
    setFormData({
      title: meal.title,
      description: meal.description || '',
      price: meal.price.toString(),
      category: meal.category,
      available: meal.available,
      imageFile: null,
      imagePreview: meal.image_url,
      existingImageUrl: meal.image_url,
    });
    setModifierGroups([]);
    setShowForm(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10485760) {
      toast.error('Image must be under 10MB');
      return;
    }
    setFormData(prev => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.title.trim()) { toast.error('Title is required'); return; }
    if (!formData.price || isNaN(parseFloat(formData.price))) { toast.error('Valid price is required'); return; }

    // Validate modifier groups
    for (const group of modifierGroups) {
      if (!group.name.trim()) { toast.error('All modifier groups need a name'); return; }
      if (group.options.some(o => !o.label.trim())) {
        toast.error(`All options in "${group.name}" need a label`);
        return;
      }
    }

    setSaving(true);
    try {
      let imageUrl = formData.existingImageUrl;

      if (formData.imageFile) {
        const fileExt = formData.imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meals')
          .upload(fileName, formData.imageFile, { upsert: false });

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('meals').getPublicUrl(uploadData.path);
        imageUrl = publicUrl;
      }

      const mealData = {
        chef_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        image_url: imageUrl,
        category: formData.category,
        available: formData.available,
      };

      if (editingMeal) {
        const { error } = await supabase
          .from('meals')
          .update(mealData)
          .eq('id', editingMeal.id);
        if (error) throw error;
        toast.success('Meal updated!');
      } else {
        const { error } = await supabase.from('meals').insert(mealData);
        if (error) throw error;
        toast.success('Meal added to your menu!');
      }

      if (modifierGroups.length > 0) {
        toast.success(`${modifierGroups.length} modifier group${modifierGroups.length > 1 ? 's' : ''} saved`);
      }

      setShowForm(false);
      await loadMeals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save meal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (meal: Meal) => {
    if (!confirm(`Delete "${meal.title}" from your menu?`)) return;
    setDeletingId(meal.id);
    try {
      const { error } = await supabase.from('meals').delete().eq('id', meal.id);
      if (error) throw error;
      toast.success('Meal removed from menu');
      setMeals(prev => prev.filter(m => m.id !== meal.id));
    } catch (err: any) {
      toast.error('Failed to delete meal');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveDeliverySettings = async () => {
    if (!user) return;
    setSavingDelivery(true);
    try {
      const fee = parseFloat(deliveryFee);
      if (isNaN(fee) || fee < 0) {
        toast.error('Please enter a valid delivery fee');
        return;
      }
      const { error } = await supabase
        .from('user_profiles')
        .update({
          delivery_enabled: deliveryEnabled,
          delivery_fee: fee,
        })
        .eq('id', user.id);

      if (error) throw error;
      setDeliverySaved(true);
      setTimeout(() => setDeliverySaved(false), 2500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save delivery settings');
    } finally {
      setSavingDelivery(false);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Checking your account...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!loading && !isChef) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <ChefHat className="w-12 h-12 text-muted-foreground" />
          <p className="text-lg font-600 text-foreground">Chef Access Required</p>
          <p className="text-sm text-muted-foreground text-center">Only users with the chef role can manage a menu.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-[18px] font-700 text-foreground leading-tight">My Menu</h1>
              <p className="text-xs text-muted-foreground">{meals.length} item{meals.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-sm shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Meal
          </button>
        </div>

        {/* Vendor Business Snapshot */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm shadow-black/[0.03]">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="text-[11px] font-600 text-emerald-600">Live</span>
            </div>
            <p className="text-[22px] font-700 text-foreground font-tabular">{orderStats.todayOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">Orders received today</p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm shadow-black/[0.03]">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <span className="text-[11px] font-600 text-emerald-600">{orderStats.conversionHint}</span>
            </div>
            <p className="text-[22px] font-700 text-foreground font-tabular">${orderStats.todayRevenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Estimated earnings today</p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm shadow-black/[0.03]">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Wallet className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <span className="text-[11px] font-600 text-muted-foreground">Next payout Friday</span>
            </div>
            <p className="text-[22px] font-700 text-foreground font-tabular">${orderStats.pendingPayout.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending payout balance</p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm shadow-black/[0.03]">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock3 className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-[22px] font-700 text-foreground font-tabular">{orderStats.avgPrepTime}</p>
            <p className="text-xs text-muted-foreground mt-1">Average prep time</p>
          </div>
        </div>

        {/* Vendor payout + operations notes */}
        <div className="mb-5 bg-card border border-border/60 rounded-2xl p-4 shadow-sm shadow-black/[0.03]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-700 text-foreground">Vendor tools</h2>
              <p className="text-xs text-muted-foreground mt-1">Your dashboard now reflects real order activity when available and stays honest when there is none yet.</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-600 text-muted-foreground">Status</p>
              <p className="text-[12px] font-700 text-emerald-600">Ready for testing</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
              <p className="text-xs font-600 text-foreground">Payouts</p>
              <p className="text-xs text-muted-foreground mt-1">Completed orders feed payout tracking. If there are no completed orders yet, this stays at zero.</p>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
              <p className="text-xs font-600 text-foreground">Orders received</p>
              <p className="text-xs text-muted-foreground mt-1">Incoming orders are counted from live order data for this chef account.</p>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
              <p className="text-xs font-600 text-foreground">Earnings</p>
              <p className="text-xs text-muted-foreground mt-1">Live order totals drive these values. If no orders exist yet, the dashboard stays quiet instead of faking activity.</p>
            </div>
          </div>
        </div>

        {/* Delivery Settings Section */}
        <div className="mb-5 bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm shadow-black/[0.03]">
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/50 bg-muted/30">
            <Truck className="w-4.5 h-4.5 text-primary" />
            <h2 className="text-[15px] font-700 text-foreground">Delivery Settings</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Enable Delivery Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-600 text-foreground">Enable Delivery</p>
                <p className="text-xs text-muted-foreground mt-0.5">Allow customers to request delivery</p>
              </div>
              <button
                role="switch"
                aria-checked={deliveryEnabled}
                onClick={() => setDeliveryEnabled(prev => !prev)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  deliveryEnabled ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    deliveryEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Delivery Fee Input */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-2">
                Set your Delivery Fee
              </label>
              <div className="relative">
                <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${deliveryEnabled ? 'text-muted-foreground' : 'text-muted-foreground/40'}`} />
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(e.target.value)}
                  disabled={!deliveryEnabled}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={`w-full bg-muted rounded-xl pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                    !deliveryEnabled ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              {!deliveryEnabled && (
                <p className="text-xs text-muted-foreground mt-1.5">Enable delivery to set a fee</p>
              )}
            </div>

            {/* Save Changes Button */}
            <button
              onClick={handleSaveDeliverySettings}
              disabled={savingDelivery || deliverySaved}
              className={`w-full font-700 py-3 rounded-2xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                deliverySaved
                  ? 'bg-green-500 text-white shadow-green-500/20'
                  : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20 disabled:opacity-40'
              }`}
            >
              {savingDelivery ? (
                <><Loader2 className="w-4.5 h-4.5 animate-spin" /> Saving...</>
              ) : deliverySaved ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 animate-[scale-in_0.2s_ease-out]" />
                  Changes Saved!
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>

        {/* Meals List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 p-3 rounded-2xl border border-border/60 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-0 text-center px-4">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                <ChefHat className="w-10 h-10 text-primary/60" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center border-2 border-card">
                <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <h3 className="text-lg font-700 text-foreground mb-2">Your menu is empty</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              Add your signature dishes so customers can browse and order directly from your profile.
            </p>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 bg-primary text-white text-sm font-700 px-6 py-3 rounded-full hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-95 transition-all duration-150 shadow-sm shadow-primary/20 mb-8"
            >
              <Plus className="w-4 h-4" />
              Add your first meal
            </button>
            <div className="w-full space-y-2.5 text-left">
              <p className="text-xs font-700 text-muted-foreground uppercase tracking-wide mb-3">Tips for a great menu</p>
              {[
                { emoji: '📸', title: 'Add photos', desc: 'Meals with photos get 3× more orders' },
                { emoji: '📝', title: 'Write descriptions', desc: 'Tell customers what makes your dish special' },
                { emoji: '🏷️', title: 'Set categories', desc: 'Organize by Starters, Mains, Desserts, etc.' },
              ].map((tip) => (
                <div key={tip.title} className="flex items-start gap-3 p-3.5 rounded-2xl bg-muted/50 border border-border/60">
                  <span className="text-xl shrink-0 mt-0.5">{tip.emoji}</span>
                  <div>
                    <p className="text-sm font-600 text-foreground">{tip.title}</p>
                    <p className="text-xs text-muted-foreground">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {meals.map(meal => (
              <div
                key={meal.id}
                className={`flex gap-3 p-3 rounded-2xl border transition-all shadow-sm shadow-black/[0.03] ${meal.available ? 'border-border/60 bg-card' : 'border-border/40 bg-muted/30 opacity-70'}`}
              >
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                  {meal.image_url ? (
                    <img src={meal.image_url} alt={meal.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  {!meal.available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-[10px] font-600">Off</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-700 text-foreground truncate">{meal.title}</p>
                      <span className="text-[10px] font-500 bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{meal.category}</span>
                    </div>
                    <p className="text-[15px] font-700 text-primary shrink-0 font-tabular">${meal.price.toFixed(2)}</p>
                  </div>
                  {meal.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{meal.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => openEditForm(meal)}
                      className="flex items-center gap-1 text-xs font-600 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(meal)}
                      disabled={deletingId === meal.id}
                      className="flex items-center gap-1 text-xs font-600 text-red-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      {deletingId === meal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Meal Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border/60 px-4 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl z-10">
                <h2 className="text-[17px] font-700 text-foreground">
                  {editingMeal ? 'Edit Meal' : 'Add New Meal'}
                </h2>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                  <X className="w-4.5 h-4.5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-600 text-foreground mb-2">Photo</label>
                  {formData.imagePreview ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
                      <img src={formData.imagePreview} alt="Meal preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, imageFile: null, imagePreview: null, existingImageUrl: null }))}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-all duration-200"
                    >
                      <ImagePlus className="w-7 h-7 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Add meal photo</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-600 text-foreground mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Truffle Tagliatelle"
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-600 text-foreground mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your dish..."
                    rows={3}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                {/* Price + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-600 text-foreground mb-2">Price *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        value={formData.price}
                        onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full bg-muted rounded-xl pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-600 text-foreground mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Available Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-muted/60 rounded-xl border border-border/40">
                  <div>
                    <p className="text-sm font-600 text-foreground">Available for order</p>
                    <p className="text-xs text-muted-foreground">Customers can order this item</p>
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, available: !prev.available }))}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${formData.available ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${formData.available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-border/60 pt-2">
                  <ModifierEditor groups={modifierGroups} onChange={setModifierGroups} />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-primary text-white font-700 py-3.5 rounded-2xl hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
                >
                  {saving ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                  ) : (
                    editingMeal ? 'Save Changes' : 'Add to Menu'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
