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
interface ChefOrderStatRow { total: number; status: string; created_at: string; }
interface ChefRevenueStatRow { chef_earnings: number; status: string; created_at: string; }
interface ModifierOption { id: string; label: string; priceAdd: number; }
interface ModifierGroup { id: string; name: string; required: boolean; multiSelect: boolean; maxSelect?: number; options: ModifierOption[]; }

const CATEGORIES = ['Starters', 'Pasta', 'Mains', 'Desserts', 'Drinks', 'Sides'];
const SAMPLE_VENDOR_STATS = { todayOrders: 0, todayRevenue: 0, pendingPayout: 0, avgPrepTime: '?', conversionHint: 'Live after first order' };
const emptyForm: MealFormData = { title: '', description: '', price: '', category: 'Mains', available: true, imageFile: null, imagePreview: null, existingImageUrl: null };
function generateId() { return Math.random().toString(36).slice(2, 10); }
function emptyGroup(): ModifierGroup { return { id: generateId(), name: '', required: false, multiSelect: false, options: [{ id: generateId(), label: '', priceAdd: 0 }] }; }

function ModifierEditor({ groups, onChange }: { groups: ModifierGroup[]; onChange: (groups: ModifierGroup[]) => void; }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const addGroup = () => { const g = emptyGroup(); onChange([...groups, g]); setExpandedId(g.id); };
  const removeGroup = (id: string) => onChange(groups.filter(g => g.id !== id));
  const updateGroup = (id: string, patch: Partial<ModifierGroup>) => onChange(groups.map(g => g.id === id ? { ...g, ...patch } : g));
  const addOption = (groupId: string) => onChange(groups.map(g => g.id === groupId ? { ...g, options: [...g.options, { id: generateId(), label: '', priceAdd: 0 }] } : g));
  const removeOption = (groupId: string, optId: string) => onChange(groups.map(g => g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optId) } : g));
  const updateOption = (groupId: string, optId: string, patch: Partial<ModifierOption>) => onChange(groups.map(g => g.id === groupId ? { ...g, options: g.options.map(o => o.id === optId ? { ...o, ...patch } : o) } : g));

  return <div className="space-y-3">...</div>;
}

export default function ChefMenuPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('0.00');
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliverySaved, setDeliverySaved] = useState(false);
  const [orderStats, setOrderStats] = useState(SAMPLE_VENDOR_STATS);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) checkChefAndLoadMeals();
  }, [user, authLoading, router]);

  const handleStripeConnect = async () => {
    try {
      const response = await fetch('/api/stripe/connect', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload?.url) throw new Error(payload?.error || 'Unable to start Stripe setup.');
      window.location.href = payload.url;
    } catch (err: any) { toast.error(err?.message || 'Unable to start Stripe setup right now.'); }
  };

  const checkChefAndLoadMeals = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase.from('user_profiles').select('role, delivery_enabled, delivery_fee').eq('id', user.id).single();
      if (profile?.role !== 'chef') {
        setIsChef(false);
        setLoading(false);
        return;
      }
      setIsChef(true);
      setDeliveryEnabled(profile?.delivery_enabled ?? false);
      setDeliveryFee(profile?.delivery_fee != null ? Number(profile.delivery_fee).toFixed(2) : '0.00');
      await Promise.all([loadMeals(), loadOrderStats()]);
    } catch { setLoading(false); }
  };

  const loadMeals = async () => { if (!user) return; setLoading(true); try { const { data, error } = await supabase.from('meals').select('*').eq('chef_id', user.id).order('created_at', { ascending: false }); if (error) throw error; setMeals(data || []); } catch { toast.error('Failed to load meals'); } finally { setLoading(false); } };
  const loadOrderStats = async () => { if (!user) return; try { setOrderStats(SAMPLE_VENDOR_STATS); } catch { setOrderStats(SAMPLE_VENDOR_STATS); } };
  const openCreateForm = () => { setEditingMeal(null); setFormData(emptyForm); setModifierGroups([]); setShowForm(true); };
  const openEditForm = (meal: Meal) => { setEditingMeal(meal); setFormData({ title: meal.title, description: meal.description || '', price: meal.price.toString(), category: meal.category, available: meal.available, imageFile: null, imagePreview: meal.image_url, existingImageUrl: meal.image_url }); setModifierGroups([]); setShowForm(true); };
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) return toast.error('Please select an image file'); if (file.size > 10485760) return toast.error('Image must be under 10MB'); setFormData(prev => ({ ...prev, imageFile: file, imagePreview: URL.createObjectURL(file) })); };
  const handleSave = async () => { if (!user) return; toast.success('Saved'); };
  const handleDelete = async () => {};
  const handleSaveDeliverySettings = async () => {};

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Checking your account...</span>
        </div>
      </div>
    );
  }

  if (!loading && !isChef) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-600 text-foreground">Chef Access Required</p>
        </div>
      </div>
    );
  }

  return <AppLayout><div className="max-w-2xl mx-auto px-4 py-4"><h1 className="text-[18px] font-700 text-foreground leading-tight">My Menu</h1></div></AppLayout>;
}
