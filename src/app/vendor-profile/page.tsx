'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronLeft,
  Star,
  MapPin,
  Clock,
  ShoppingBag,
  Heart,
  Share2,
  ChefHat,
  Users,
  Flame,
  Zap,
  CheckCircle } from
'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import CustomizationModal, {
  type CartItemCustomization,
  type ModifierGroup } from
'./components/CustomizationModal';
import CartDrawer from './components/CartDrawer';
import OrdersTab from './components/OrdersTab';
import ChefReviews, { MOCK_REVIEWS } from './components/ChefReviews';

interface DbMeal {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  available: boolean;
  modifier_groups?: ModifierGroup[] | null;
}

interface DbVendorProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  bio: string | null;
  location: string | null;
  followers_count?: number | null;
  delivery_fee?: number | null;
  business_hours?: string | null;
  closed_days?: string[] | null;
  availability_override?: 'open' | 'closed' | null;
}

function parseBusinessHoursFromBio(bio?: string | null) {
  const match = bio?.match(/Hours:\s*([^\n]+)/i);
  return match?.[1]?.trim() || null;
}

function resolveBusinessHours(vendor: Partial<DbVendorProfile> & { bio?: string | null }) {
  return vendor.business_hours || parseBusinessHoursFromBio(vendor.bio) || null;
}

function getTodayOpenState(hoursText?: string | null, availabilityOverride?: 'open' | 'closed' | null) {
  if (availabilityOverride === 'open') {
    return { label: 'Open now', isOpen: true };
  }

  if (availabilityOverride === 'closed') {
    return { label: 'Closed manually', isOpen: false };
  }

  if (!hoursText || hoursText.toLowerCase().includes('closed all week')) {
    return { label: 'Closed now', isOpen: false };
  }

  const [daysPart = '', timePart = ''] = hoursText.split('•').map((part) => part.trim());
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const openDays = daysPart.split(',').map((part) => part.trim()).filter(Boolean);

  if (!openDays.includes(today)) {
    return { label: 'Closed now', isOpen: false };
  }

  const timeMatch = timePart.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!timeMatch) {
    return { label: 'Open today', isOpen: true };
  }

  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = toMinutes(timeMatch[1]);
  const closeMinutes = toMinutes(timeMatch[2]);
  const isOpenNow = nowMinutes >= openMinutes && nowMinutes < closeMinutes;

  if (isOpenNow) {
    return { label: 'Open now', isOpen: true };
  }

  if (nowMinutes < openMinutes) {
    return { label: `Opens at ${timeMatch[1]}`, isOpen: false };
  }

  return { label: 'Closed now', isOpen: false };
}

interface MenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  imageAlt: string;
  category: string;
  availability: 'available' | 'limited' | 'sold_out';
  availabilityLabel?: string;
  popular?: boolean;
  calories?: number;
  modifierGroups?: ModifierGroup[];
}

const VENDOR_DATA: Record<string, {
  id: string;
  name: string;
  username: string;
  avatar: string;
  coverImage: string;
  coverAlt: string;
  cuisine: string;
  bio: string;
  rating: number;
  reviewCount: number;
  followers: number;
  location: string;
  distance?: string;
  deliveryTime: string;
  deliveryFee?: number;
  minOrder: number;
  menu: MenuItem[];
}> = {
  'chef-marco': {
    id: 'chef-marco',
    name: 'Marco Valentini',
    username: 'chef_marco',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_11bf75089-1771893965240.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_11bf75089-1771893965240.png",
    coverAlt: 'Elegant Italian restaurant kitchen with fresh pasta and ingredients',
    cuisine: 'Italian Fine Dining',
    bio: 'Born in Naples, trained in Rome. I bring authentic Italian flavors to your table — every dish made from scratch with imported ingredients and a whole lot of love.',
    rating: 4.9,
    reviewCount: 312,
    followers: 9840,
    location: 'Washington, DC',
    distance: '1.2 miles away',
    deliveryTime: '35–50 min',
    minOrder: 30,
    menu: [
    {
      id: 'truffle-tag',
      title: 'Truffle Tagliatelle',
      description: 'Handmade tagliatelle with black truffle cream sauce, aged Parmigiano-Reggiano, and fresh herbs.',
      price: 38,
      image: 'https://images.unsplash.com/photo-1685022135825-b74ac61b5e14',
      imageAlt: 'Handmade tagliatelle pasta with truffle cream sauce in a white bowl',
      category: 'Pasta',
      availability: 'limited',
      availabilityLabel: 'Limited Plates',
      popular: true,
      calories: 620,
      modifierGroups: [
      {
        id: 'pasta-size',
        name: 'Portion Size',
        required: true,
        multiSelect: false,
        options: [
        { id: 'regular', label: 'Regular', priceAdd: 0 },
        { id: 'large', label: 'Large', priceAdd: 8 }]

      },
      {
        id: 'pasta-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-truffle', label: 'Extra Truffle Shavings', priceAdd: 6 },
        { id: 'extra-parm', label: 'Extra Parmigiano', priceAdd: 2 },
        { id: 'add-protein', label: 'Add Grilled Chicken', priceAdd: 7 }]

      }]

    },
    {
      id: 'burrata',
      title: 'Burrata & Heirloom Tomato',
      description: 'Creamy burrata with Sonoma heirloom tomatoes, basil oil, and sea salt flakes.',
      price: 22,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_11b9f9a5e-1772072806488.png",
      imageAlt: 'Fresh burrata with colorful heirloom tomatoes and basil',
      category: 'Starters',
      availability: 'available',
      availabilityLabel: 'Available Today',
      calories: 380,
      modifierGroups: [
      {
        id: 'burrata-bread',
        name: 'Add Bread',
        required: false,
        multiSelect: false,
        options: [
        { id: 'focaccia', label: 'Focaccia', priceAdd: 3 },
        { id: 'sourdough', label: 'Sourdough', priceAdd: 3 },
        { id: 'no-bread', label: 'No Bread', priceAdd: 0 }]

      }]

    },
    {
      id: 'osso-buco',
      title: 'Osso Buco alla Milanese',
      description: 'Slow-braised veal shank with gremolata, saffron risotto, and roasted root vegetables.',
      price: 58,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1b980db99-1772710002548.png",
      imageAlt: 'Braised veal osso buco with saffron risotto on a white plate',
      category: 'Mains',
      availability: 'available',
      availabilityLabel: 'Available Today',
      popular: true,
      calories: 780,
      modifierGroups: [
      {
        id: 'osso-side',
        name: 'Choose Your Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'risotto', label: 'Saffron Risotto', priceAdd: 0 },
        { id: 'polenta', label: 'Creamy Polenta', priceAdd: 0 },
        { id: 'roasted-veg', label: 'Roasted Vegetables', priceAdd: 0 },
        { id: 'mac-cheese', label: 'Mac and Cheese', priceAdd: 2 }]

      },
      {
        id: 'osso-spice',
        name: 'Spice Level',
        required: false,
        multiSelect: false,
        options: [
        { id: 'mild', label: 'Mild', priceAdd: 0 },
        { id: 'medium', label: 'Medium', priceAdd: 0 },
        { id: 'spicy', label: 'Spicy', priceAdd: 0 }]

      },
      {
        id: 'osso-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'water', label: 'Still Water', priceAdd: 0 },
        { id: 'sparkling', label: 'Sparkling Water', priceAdd: 1 },
        { id: 'wine', label: 'House Red Wine', priceAdd: 9 }]

      }]

    },
    {
      id: 'tiramisu',
      title: 'Tiramisu Classico',
      description: 'Traditional Venetian tiramisu with Illy espresso, mascarpone, and Savoiardi biscuits.',
      price: 16,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_12d6730d9-1773176609800.png",
      imageAlt: 'Classic tiramisu dessert with cocoa powder dusting',
      category: 'Desserts',
      availability: 'available',
      calories: 420
    },
    {
      id: 'cacio-pepe',
      title: 'Cacio e Pepe',
      description: 'Roman classic — tonnarelli pasta, Pecorino Romano, and freshly cracked black pepper.',
      price: 28,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1e568055d-1772085885754.png",
      imageAlt: 'Cacio e pepe pasta with black pepper and pecorino cheese',
      category: 'Pasta',
      availability: 'available',
      calories: 540,
      modifierGroups: [
      {
        id: 'cacio-size',
        name: 'Portion Size',
        required: true,
        multiSelect: false,
        options: [
        { id: 'regular', label: 'Regular', priceAdd: 0 },
        { id: 'large', label: 'Large', priceAdd: 6 }]

      },
      {
        id: 'cacio-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-sauce', label: 'Extra Sauce', priceAdd: 1 },
        { id: 'extra-cheese', label: 'Extra Pecorino', priceAdd: 2 }]

      }]

    },
    {
      id: 'panna-cotta',
      title: 'Vanilla Panna Cotta',
      description: 'Silky panna cotta with Madagascar vanilla, seasonal berry coulis, and candied pistachios.',
      price: 14,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_10f17521a-1765319153356.png",
      imageAlt: 'Vanilla panna cotta with berry coulis and pistachios',
      category: 'Desserts',
      availability: 'sold_out',
      calories: 310
    }]

  },
  'chef-aisha': {
    id: 'chef-aisha',
    name: 'Aisha Kamara',
    username: 'chef_aisha',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_14cdffd73-1767751305516.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_14cdffd73-1767751305516.png",
    coverAlt: 'Vibrant West African food spread with colorful dishes and spices',
    cuisine: 'West African Fusion',
    bio: "West African roots, California soul. My kitchen is a love letter to my grandmother's recipes — reimagined with local, seasonal ingredients.",
    rating: 4.8,
    reviewCount: 198,
    followers: 7230,
    location: 'Washington, DC',
    distance: '3.4 miles away',
    deliveryTime: '40–55 min',
    minOrder: 25,
    menu: [
    {
      id: 'mango-salmon',
      title: 'Mango Habanero Glazed Salmon',
      description: 'Seared Atlantic salmon with mango habanero glaze, coconut rice, and microgreens.',
      price: 44,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1cdc31a08-1772058323789.png",
      imageAlt: 'Seared salmon fillet with mango salsa and microgreens on a dark slate plate',
      category: 'Mains',
      availability: 'available',
      availabilityLabel: 'Available Today',
      popular: true,
      calories: 580,
      modifierGroups: [
      {
        id: 'salmon-side',
        name: 'Choose Your Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'coconut-rice', label: 'Coconut Rice', priceAdd: 0 },
        { id: 'jollof-rice', label: 'Jollof Rice', priceAdd: 0 },
        { id: 'plantains', label: 'Fried Plantains', priceAdd: 0 },
        { id: 'greens', label: 'Sautéed Greens', priceAdd: 0 }]

      },
      {
        id: 'salmon-spice',
        name: 'Spice Level',
        required: true,
        multiSelect: false,
        options: [
        { id: 'mild', label: 'Mild', priceAdd: 0 },
        { id: 'medium', label: 'Medium', priceAdd: 0 },
        { id: 'hot', label: 'Hot 🌶️', priceAdd: 0 },
        { id: 'extra-hot', label: 'Extra Hot 🔥', priceAdd: 0 }]

      },
      {
        id: 'salmon-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'water', label: 'Water', priceAdd: 0 },
        { id: 'soda', label: 'Soda', priceAdd: 1 },
        { id: 'lemonade', label: 'Lemonade', priceAdd: 1 },
        { id: 'hibiscus', label: 'Hibiscus Tea', priceAdd: 2 }]

      },
      {
        id: 'salmon-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-sauce', label: 'Extra Mango Sauce', priceAdd: 1 },
        { id: 'extra-shrimp', label: 'Add Grilled Shrimp', priceAdd: 4 }]

      }]

    },
    {
      id: 'sunday-thali',
      title: 'Sunday Thali',
      description: 'A full spread: dal makhani, saag paneer, jeera rice, naan, raita, and mango pickle.',
      price: 36,
      image: 'https://images.unsplash.com/photo-1568228780318-159300cb712d',
      imageAlt: 'Colorful Indian thali platter with various curries and breads',
      category: 'Specials',
      availability: 'limited',
      availabilityLabel: 'Selling Fast',
      popular: true,
      calories: 920,
      modifierGroups: [
      {
        id: 'thali-bread',
        name: 'Bread Choice',
        required: true,
        multiSelect: false,
        options: [
        { id: 'naan', label: 'Naan', priceAdd: 0 },
        { id: 'roti', label: 'Roti', priceAdd: 0 },
        { id: 'paratha', label: 'Paratha', priceAdd: 1 }]

      }]

    },
    {
      id: 'jollof-rice',
      title: 'Party Jollof Rice',
      description: 'Smoky party-style jollof rice with fried plantains, coleslaw, and grilled chicken.',
      price: 28,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_14367d2be-1772058275191.png",
      imageAlt: 'Smoky jollof rice with fried plantains and grilled chicken',
      category: 'Mains',
      availability: 'available',
      calories: 760,
      modifierGroups: [
      {
        id: 'jollof-protein',
        name: 'Choose Protein',
        required: true,
        multiSelect: false,
        options: [
        { id: 'chicken', label: 'Grilled Chicken', priceAdd: 0 },
        { id: 'fish', label: 'Fried Fish', priceAdd: 2 },
        { id: 'shrimp', label: 'Grilled Shrimp', priceAdd: 4 },
        { id: 'veggie', label: 'Vegetarian', priceAdd: 0 }]

      },
      {
        id: 'jollof-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-sauce', label: 'Extra Sauce', priceAdd: 0.5 },
        { id: 'extra-plantains', label: 'Extra Plantains', priceAdd: 2 },
        { id: 'coleslaw', label: 'Extra Coleslaw', priceAdd: 1 }]

      }]

    }]

  },
  'chef-hana': {
    id: 'chef-hana',
    name: 'Hana Matsumoto',
    username: 'chef_hana',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1cee2aa39-1764809775886.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_1cee2aa39-1764809775886.png",
    coverAlt: 'Japanese omakase sushi spread on a dark lacquered tray',
    cuisine: 'Japanese Omakase',
    bio: 'Trained in Tokyo for 8 years. Every plate is a meditation. I offer intimate omakase experiences and curated bento boxes for those who appreciate the art of Japanese cuisine.',
    rating: 4.9,
    reviewCount: 445,
    followers: 18200,
    location: 'Washington, DC',
    distance: '2.3 miles away',
    deliveryTime: '45–60 min',
    minOrder: 60,
    menu: [
    {
      id: 'omakase',
      title: 'Sunday Omakase (7 courses)',
      description: "Chef's choice 7-course experience: seasonal sashimi, nigiri, miso soup, and dessert.",
      price: 120,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f90c3226-1764809778059.png",
      imageAlt: 'Elegant Japanese omakase spread with sashimi and maki rolls',
      category: 'Omakase',
      availability: 'limited',
      availabilityLabel: 'Limited Plates',
      popular: true,
      calories: 680,
      modifierGroups: [
      {
        id: 'omakase-dietary',
        name: 'Dietary Preferences',
        required: false,
        multiSelect: true,
        options: [
        { id: 'no-shellfish', label: 'No Shellfish', priceAdd: 0 },
        { id: 'no-raw', label: 'No Raw Fish', priceAdd: 0 },
        { id: 'vegetarian', label: 'Vegetarian Substitutions', priceAdd: 0 }]

      },
      {
        id: 'omakase-sake',
        name: 'Add Sake Pairing',
        required: false,
        multiSelect: false,
        options: [
        { id: 'no-sake', label: 'No Sake', priceAdd: 0 },
        { id: 'junmai', label: 'Junmai Sake (3 pours)', priceAdd: 28 },
        { id: 'daiginjo', label: 'Daiginjo Sake (3 pours)', priceAdd: 45 }]

      }]

    },
    {
      id: 'lava-cake',
      title: 'Matcha Lava Cake',
      description: 'Warm matcha lava cake with white chocolate ganache center and yuzu ice cream.',
      price: 18,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_14e8599a7-1773214296359.png",
      imageAlt: 'Matcha lava cake with white chocolate and yuzu ice cream',
      category: 'Desserts',
      availability: 'available',
      availabilityLabel: 'Available Today',
      popular: true,
      calories: 490,
      modifierGroups: [
      {
        id: 'cake-icecream',
        name: 'Ice Cream Flavor',
        required: false,
        multiSelect: false,
        options: [
        { id: 'yuzu', label: 'Yuzu', priceAdd: 0 },
        { id: 'black-sesame', label: 'Black Sesame', priceAdd: 0 },
        { id: 'vanilla', label: 'Vanilla', priceAdd: 0 },
        { id: 'extra-scoop', label: 'Extra Scoop', priceAdd: 3 }]

      }]

    }]

  },
  'chef-carlos': {
    id: 'chef-carlos',
    name: 'Carlos Mendez',
    username: 'chef_carlos',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_121e76a7f-1772156511695.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_121e76a7f-1772156511695.png",
    coverAlt: 'Authentic Mexican street tacos with carnitas on a wooden board',
    cuisine: 'Mexican Street Food',
    bio: "Food truck chef bringing authentic Mexican street food to DC. Slow-braised meats, fresh tortillas, and my abuela's salsas — made with love every single day.",
    rating: 4.7,
    reviewCount: 267,
    followers: 5410,
    location: 'Washington, DC',
    distance: '0.8 miles away',
    deliveryTime: '20–35 min',
    minOrder: 15,
    menu: [
    {
      id: 'carnitas-tacos',
      title: 'Carnitas Taco Plate (3)',
      description: 'Three slow-braised pork carnitas tacos on fresh corn tortillas with cilantro, onion, and salsa verde.',
      price: 18,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f8319c3d-1772076522406.png",
      imageAlt: 'Authentic Mexican street tacos with carnitas and cilantro',
      category: 'Tacos',
      availability: 'limited',
      availabilityLabel: 'Selling Fast',
      popular: true,
      calories: 520,
      modifierGroups: [
      {
        id: 'taco-side',
        name: 'Choose Your Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'rice', label: 'Mexican Rice', priceAdd: 0 },
        { id: 'beans', label: 'Refried Beans', priceAdd: 0 },
        { id: 'elote', label: 'Street Corn (Elote)', priceAdd: 2 },
        { id: 'mac-cheese', label: 'Mac and Cheese', priceAdd: 2 },
        { id: 'greens', label: 'Greens', priceAdd: 0 }]

      },
      {
        id: 'taco-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'water', label: 'Water', priceAdd: 0 },
        { id: 'soda', label: 'Soda', priceAdd: 1 },
        { id: 'lemonade', label: 'Lemonade', priceAdd: 1 },
        { id: 'horchata', label: 'Horchata', priceAdd: 2 }]

      },
      {
        id: 'taco-spice',
        name: 'Salsa Choice',
        required: false,
        multiSelect: true,
        maxSelect: 2,
        options: [
        { id: 'salsa-verde', label: 'Salsa Verde', priceAdd: 0 },
        { id: 'salsa-roja', label: 'Salsa Roja', priceAdd: 0 },
        { id: 'habanero', label: 'Habanero 🔥', priceAdd: 0 }]

      },
      {
        id: 'taco-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'guac', label: 'Guacamole', priceAdd: 1.5 },
        { id: 'cheese', label: 'Cotija Cheese', priceAdd: 0.5 },
        { id: 'crema', label: 'Mexican Crema', priceAdd: 0.5 }]

      }]

    },
    {
      id: 'birria-tacos',
      title: 'Birria Quesatacos (2)',
      description: 'Crispy cheese-dipped birria tacos with consommé for dipping, cilantro, and pickled onions.',
      price: 22,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_141a7b6c9-1772056083860.png",
      imageAlt: 'Crispy birria quesatacos with consommé dipping broth',
      category: 'Tacos',
      availability: 'available',
      availabilityLabel: 'Available Today',
      popular: true,
      calories: 640,
      modifierGroups: [
      {
        id: 'birria-side',
        name: 'Choose Your Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'rice', label: 'Mexican Rice', priceAdd: 0 },
        { id: 'beans', label: 'Refried Beans', priceAdd: 0 },
        { id: 'mac-cheese', label: 'Mac and Cheese', priceAdd: 2 },
        { id: 'greens', label: 'Greens', priceAdd: 0 }]

      },
      {
        id: 'birria-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-consomme', label: 'Extra Consommé', priceAdd: 1 },
        { id: 'extra-cheese', label: 'Extra Cheese', priceAdd: 1.5 },
        { id: 'extra-shrimp', label: 'Add Shrimp', priceAdd: 4 }]

      }]

    },
    {
      id: 'elote',
      title: 'Elote (Mexican Street Corn)',
      description: 'Grilled corn on the cob with mayo, cotija cheese, chili powder, and fresh lime.',
      price: 8,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1bb78de1b-1772893487688.png",
      imageAlt: 'Mexican street corn elote with cotija cheese and chili powder',
      category: 'Sides',
      availability: 'available',
      calories: 280,
      modifierGroups: [
      {
        id: 'elote-style',
        name: 'Style',
        required: true,
        multiSelect: false,
        options: [
        { id: 'on-cob', label: 'On the Cob', priceAdd: 0 },
        { id: 'in-cup', label: 'In a Cup (Esquites)', priceAdd: 0 }]

      },
      {
        id: 'elote-spice',
        name: 'Spice Level',
        required: false,
        multiSelect: false,
        options: [
        { id: 'mild', label: 'Mild', priceAdd: 0 },
        { id: 'medium', label: 'Medium', priceAdd: 0 },
        { id: 'hot', label: 'Hot 🌶️', priceAdd: 0 }]

      }]

    }]

  },
  // ── Nearby marketplace vendors ──────────────────────────────────────────────
  'wing-queen': {
    id: 'wing-queen',
    name: "Queen's Wing Spot",
    username: 'wing_queen',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_133fdde6d-1770812088006.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_133fdde6d-1770812088006.png",
    coverAlt: 'Crispy golden chicken wings with dipping sauces on a wooden board',
    cuisine: 'American Soul',
    bio: "DC's favorite wing spot. We do wings right — crispy, saucy, and made to order. Over 12 signature sauces, fresh tenders, and sides that slap.",
    rating: 4.7,
    reviewCount: 189,
    followers: 4320,
    location: 'Washington, DC',
    distance: '0.8 miles away',
    deliveryTime: '20–30 min',
    minOrder: 12,
    menu: [
    {
      id: 'lemon-pepper-wings',
      title: 'Lemon Pepper Wings',
      description: 'Crispy fried wings tossed in our house lemon pepper blend. Served with ranch or blue cheese.',
      price: 14,
      image: 'https://images.unsplash.com/photo-1709556722349-4ed11c9f8f28',
      imageAlt: 'Lemon pepper wings with ranch dip and celery sticks',
      category: 'Wings',
      availability: 'available',
      availabilityLabel: 'Available Now',
      popular: true,
      calories: 680,
      modifierGroups: [
      {
        id: 'wing-count',
        name: 'Wing Count',
        required: true,
        multiSelect: false,
        options: [
        { id: '6pc', label: '6 Piece', priceAdd: 0 },
        { id: '10pc', label: '10 Piece', priceAdd: 5 },
        { id: '15pc', label: '15 Piece', priceAdd: 10 }]

      },
      {
        id: 'wing-side',
        name: 'Choose a Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'fries', label: 'Seasoned Fries', priceAdd: 0 },
        { id: 'mac', label: 'Mac & Cheese', priceAdd: 2 },
        { id: 'coleslaw', label: 'Coleslaw', priceAdd: 0 },
        { id: 'greens', label: 'Collard Greens', priceAdd: 0 }]

      },
      {
        id: 'wing-dip',
        name: 'Dipping Sauce',
        required: false,
        multiSelect: false,
        options: [
        { id: 'ranch', label: 'Ranch', priceAdd: 0 },
        { id: 'blue-cheese', label: 'Blue Cheese', priceAdd: 0 },
        { id: 'honey-mustard', label: 'Honey Mustard', priceAdd: 0 }]

      },
      {
        id: 'wing-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'water', label: 'Still Water', priceAdd: 0 },
        { id: 'sparkling', label: 'Sparkling Water', priceAdd: 1 },
        { id: 'lemonade', label: 'Lemonade', priceAdd: 1.5 }]

      }]

    },
    {
      id: 'buffalo-wings',
      title: 'Classic Buffalo Wings',
      description: 'Saucy buffalo wings with the perfect heat-to-flavor ratio. A crowd favorite.',
      price: 13,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1c39b8004-1773192310795.png",
      imageAlt: 'Saucy buffalo wings with celery sticks and blue cheese dip',
      category: 'Wings',
      availability: 'available',
      popular: true,
      calories: 720,
      modifierGroups: [
      {
        id: 'buffalo-count',
        name: 'Wing Count',
        required: true,
        multiSelect: false,
        options: [
        { id: '6pc', label: '6 Piece', priceAdd: 0 },
        { id: '10pc', label: '10 Piece', priceAdd: 5 },
        { id: '15pc', label: '15 Piece', priceAdd: 10 }]

      },
      {
        id: 'buffalo-spice',
        name: 'Spice Level',
        required: true,
        multiSelect: false,
        options: [
        { id: 'mild', label: 'Mild', priceAdd: 0 },
        { id: 'medium', label: 'Medium', priceAdd: 0 },
        { id: 'hot', label: 'Hot 🌶️', priceAdd: 0 },
        { id: 'extra-hot', label: 'Extra Hot 🔥', priceAdd: 0 }]

      },
      {
        id: 'buffalo-side',
        name: 'Choose a Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'fries', label: 'Seasoned Fries', priceAdd: 0 },
        { id: 'mac', label: 'Mac & Cheese', priceAdd: 2 },
        { id: 'coleslaw', label: 'Coleslaw', priceAdd: 0 }]

      },
      {
        id: 'buffalo-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-sauce', label: 'Extra Sauce', priceAdd: 0.5 },
        { id: 'extra-celery', label: 'Extra Celery & Carrots', priceAdd: 0 }]

      }]

    },
    {
      id: 'honey-garlic-wings',
      title: 'Honey Garlic Wings',
      description: 'Sweet and savory honey garlic glazed wings with sesame seeds and scallions.',
      price: 14,
      image: 'https://images.unsplash.com/photo-1594309208645-031ae032e2df',
      imageAlt: 'Honey garlic wings with sesame seeds and green onions',
      category: 'Wings',
      availability: 'limited',
      availabilityLabel: 'Selling Fast',
      calories: 700,
      modifierGroups: [
      {
        id: 'hg-count',
        name: 'Wing Count',
        required: true,
        multiSelect: false,
        options: [
        { id: '6pc', label: '6 Piece', priceAdd: 0 },
        { id: '10pc', label: '10 Piece', priceAdd: 5 }]

      },
      {
        id: 'hg-side',
        name: 'Choose a Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'fries', label: 'Seasoned Fries', priceAdd: 0 },
        { id: 'rice', label: 'Steamed Rice', priceAdd: 0 },
        { id: 'mac', label: 'Mac & Cheese', priceAdd: 2 }]

      }]

    },
    {
      id: 'wing-combo',
      title: 'Wing Combo Platter',
      description: '20 wings with your choice of 2 sauces, 2 sides, and 2 drinks. Perfect for sharing.',
      price: 38,
      image: "https://images.unsplash.com/photo-1625415641688-e50cdec35615",
      imageAlt: 'Large wing combo platter with multiple sauces and sides',
      category: 'Combos',
      availability: 'available',
      calories: 1800,
      modifierGroups: [
      {
        id: 'combo-sauce1',
        name: 'Sauce #1',
        required: true,
        multiSelect: false,
        options: [
        { id: 'lemon-pepper', label: 'Lemon Pepper', priceAdd: 0 },
        { id: 'buffalo', label: 'Buffalo', priceAdd: 0 },
        { id: 'honey-garlic', label: 'Honey Garlic', priceAdd: 0 },
        { id: 'bbq', label: 'BBQ', priceAdd: 0 }]

      },
      {
        id: 'combo-sauce2',
        name: 'Sauce #2',
        required: true,
        multiSelect: false,
        options: [
        { id: 'lemon-pepper', label: 'Lemon Pepper', priceAdd: 0 },
        { id: 'buffalo', label: 'Buffalo', priceAdd: 0 },
        { id: 'honey-garlic', label: 'Honey Garlic', priceAdd: 0 },
        { id: 'mango-habanero', label: 'Mango Habanero', priceAdd: 0 }]

      },
      {
        id: 'combo-drinks',
        name: 'Drinks (2)',
        required: false,
        multiSelect: true,
        maxSelect: 2,
        options: [
        { id: 'soda', label: 'Soda', priceAdd: 0 },
        { id: 'lemonade', label: 'Lemonade', priceAdd: 0 },
        { id: 'water', label: 'Water', priceAdd: 0 }]

      }]

    }]

  },
  'sweet-tooth': {
    id: 'sweet-tooth',
    name: 'Sweet Tooth Bakery',
    username: 'sweet_tooth_dc',
    avatar: "https://images.unsplash.com/photo-1688205792559-3e0dbc7c5dc9",
    coverImage: "https://images.unsplash.com/photo-1688205792559-3e0dbc7c5dc9",
    coverAlt: 'Colorful artisan pastries and cakes displayed in a bakery case',
    cuisine: 'Artisan Desserts',
    bio: 'Handcrafted desserts made with love in small batches. From decadent cakes to flaky croissants — every bite is a moment of joy.',
    rating: 4.8,
    reviewCount: 241,
    followers: 6100,
    location: 'Washington, DC',
    distance: '1.5 miles away',
    deliveryTime: '25–40 min',
    minOrder: 15,
    menu: [
    {
      id: 'choc-lava-cake',
      title: 'Chocolate Lava Cake',
      description: 'Warm chocolate lava cake with a molten center, served with vanilla ice cream and berry coulis.',
      price: 12,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_175723fdb-1772529810192.png",
      imageAlt: 'Chocolate lava cake with molten center and vanilla ice cream',
      category: 'Cakes',
      availability: 'available',
      availabilityLabel: 'Available Now',
      popular: true,
      calories: 480,
      modifierGroups: [
      {
        id: 'lava-icecream',
        name: 'Ice Cream Flavor',
        required: false,
        multiSelect: false,
        options: [
        { id: 'vanilla', label: 'Vanilla Bean', priceAdd: 0 },
        { id: 'strawberry', label: 'Strawberry', priceAdd: 0 },
        { id: 'no-icecream', label: 'No Ice Cream', priceAdd: 0 },
        { id: 'extra-scoop', label: 'Extra Scoop', priceAdd: 2 }]

      },
      {
        id: 'lava-extras',
        name: 'Add-Ons',
        required: false,
        multiSelect: true,
        options: [
        { id: 'whipped-cream', label: 'Whipped Cream', priceAdd: 0.5 },
        { id: 'caramel-drizzle', label: 'Caramel Drizzle', priceAdd: 0.5 },
        { id: 'extra-berries', label: 'Extra Berries', priceAdd: 1 }]

      }]

    },
    {
      id: 'macarons',
      title: 'Assorted Macarons (6)',
      description: 'Six handcrafted French macarons in seasonal flavors — light, crispy shells with creamy ganache filling.',
      price: 18,
      image: 'https://images.unsplash.com/photo-1716545176409-df373b95dd64',
      imageAlt: 'Assorted pastel macarons in a gift box',
      category: 'Pastries',
      availability: 'available',
      popular: true,
      calories: 360,
      modifierGroups: [
      {
        id: 'macaron-box',
        name: 'Box Size',
        required: true,
        multiSelect: false,
        options: [
        { id: '6pc', label: '6 Piece', priceAdd: 0 },
        { id: '12pc', label: '12 Piece', priceAdd: 16 },
        { id: '24pc', label: '24 Piece (Gift Box)', priceAdd: 34 }]

      }]

    },
    {
      id: 'croissants',
      title: 'Butter Croissants (2)',
      description: 'Freshly baked all-butter croissants with a golden, flaky crust and soft layered interior.',
      price: 8,
      image: 'https://images.unsplash.com/photo-1683195298849-5a1f16060132',
      imageAlt: 'Freshly baked golden butter croissants on a cooling rack',
      category: 'Pastries',
      availability: 'limited',
      availabilityLabel: 'Closes Soon',
      calories: 440,
      modifierGroups: [
      {
        id: 'croissant-filling',
        name: 'Filling (Optional)',
        required: false,
        multiSelect: false,
        options: [
        { id: 'plain', label: 'Plain', priceAdd: 0 },
        { id: 'almond', label: 'Almond Cream', priceAdd: 1.5 },
        { id: 'chocolate', label: 'Chocolate', priceAdd: 1 },
        { id: 'ham-cheese', label: 'Ham & Cheese', priceAdd: 2 }]

      }]

    },
    {
      id: 'custom-cake',
      title: 'Custom Celebration Cake',
      description: 'Personalized layered cake for any occasion. Choose your flavor, frosting, and message.',
      price: 65,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_193492893-1772087243794.png",
      imageAlt: 'Custom layered celebration cake with decorative frosting',
      category: 'Cakes',
      availability: 'available',
      calories: 0,
      modifierGroups: [
      {
        id: 'cake-flavor',
        name: 'Cake Flavor',
        required: true,
        multiSelect: false,
        options: [
        { id: 'vanilla', label: 'Vanilla', priceAdd: 0 },
        { id: 'chocolate', label: 'Chocolate', priceAdd: 0 },
        { id: 'red-velvet', label: 'Red Velvet', priceAdd: 5 },
        { id: 'lemon', label: 'Lemon', priceAdd: 0 }]

      },
      {
        id: 'cake-frosting',
        name: 'Frosting',
        required: true,
        multiSelect: false,
        options: [
        { id: 'buttercream', label: 'Buttercream', priceAdd: 0 },
        { id: 'cream-cheese', label: 'Cream Cheese', priceAdd: 0 },
        { id: 'ganache', label: 'Chocolate Ganache', priceAdd: 8 },
        { id: 'fondant', label: 'Fondant', priceAdd: 15 }]

      },
      {
        id: 'cake-size',
        name: 'Cake Size',
        required: true,
        multiSelect: false,
        options: [
        { id: '6inch', label: '6" (serves 8)', priceAdd: 0 },
        { id: '8inch', label: '8" (serves 12)', priceAdd: 20 },
        { id: '10inch', label: '10" (serves 20)', priceAdd: 40 }]

      },
      {
        id: 'cake-extras',
        name: 'Add-Ons',
        required: false,
        multiSelect: true,
        options: [
        { id: 'pumpkin-spice', label: 'Pumpkin Spice', priceAdd: 1 },
        { id: 'cocoa-nibs', label: 'Cocoa Nibs', priceAdd: 0.5 },
        { id: 'coconut-sherbet', label: 'Coconut Sherbet', priceAdd: 1 }]

      }]

    }]

  },
  'rolling-smoke': {
    id: 'rolling-smoke',
    name: 'Rolling Smoke BBQ',
    username: 'rolling_smoke_bbq',
    avatar: 'https://images.unsplash.com/photo-1731848358994-c06e72c1ae58',
    coverImage: 'https://images.unsplash.com/photo-1731848358994-c06e72c1ae58',
    coverAlt: 'Smoky BBQ brisket being sliced on a cutting board with sides',
    cuisine: 'Texas BBQ',
    bio: 'Low and slow is the only way we know. Texas-style BBQ smoked for 12–18 hours over post oak wood. Brisket, ribs, pulled pork — all made the right way.',
    rating: 4.6,
    reviewCount: 156,
    followers: 3870,
    location: 'Washington, DC',
    distance: '2.3 miles away',
    deliveryTime: '40–55 min',
    minOrder: 20,
    menu: [
    {
      id: 'bbq-ribs',
      title: 'BBQ Pork Ribs (Half Rack)',
      description: 'Slow-smoked pork ribs with our signature dry rub and house BBQ sauce. Fall-off-the-bone tender.',
      price: 28,
      image: 'https://images.unsplash.com/photo-1694717475960-c7b9fd7226f1',
      imageAlt: 'Pork ribs with BBQ sauce and coleslaw on a wooden board',
      category: 'Mains',
      availability: 'available',
      availabilityLabel: 'Available Now',
      popular: true,
      calories: 920,
      modifierGroups: [
      {
        id: 'ribs-side1',
        name: 'Side #1',
        required: true,
        multiSelect: false,
        options: [
        { id: 'fries', label: 'Seasoned Fries', priceAdd: 0 },
        { id: 'mac', label: 'Mac & Cheese', priceAdd: 2 },
        { id: 'coleslaw', label: 'Coleslaw', priceAdd: 0 },
        { id: 'baked-beans', label: 'Baked Beans', priceAdd: 0 }]

      },
      {
        id: 'ribs-side2',
        name: 'Side #2',
        required: false,
        multiSelect: false,
        options: [
        { id: 'cornbread', label: 'Cornbread', priceAdd: 0 },
        { id: 'greens', label: 'Collard Greens', priceAdd: 0 },
        { id: 'potato-salad', label: 'Potato Salad', priceAdd: 0 }]

      },
      {
        id: 'ribs-sauce',
        name: 'BBQ Sauce',
        required: false,
        multiSelect: false,
        options: [
        { id: 'original', label: 'Original', priceAdd: 0 },
        { id: 'spicy', label: 'Spicy', priceAdd: 0 },
        { id: 'sweet', label: 'Sweet & Tangy', priceAdd: 0 },
        { id: 'no-sauce', label: 'Dry Rub Only', priceAdd: 0 }]

      },
      {
        id: 'ribs-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'water', label: 'Water', priceAdd: 0 },
        { id: 'soda', label: 'Soda', priceAdd: 1 },
        { id: 'sweet-tea', label: 'Sweet Tea', priceAdd: 1.5 },
        { id: 'lemonade', label: 'Lemonade', priceAdd: 1.5 }]

      }]

    },
    {
      id: 'brisket-plate',
      title: 'Smoked Brisket Plate',
      description: 'Thick-cut smoked brisket with a perfect bark crust. Served with 2 sides and pickles.',
      price: 26,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1182e59e5-1772474020621.png",
      imageAlt: 'Thick-cut smoked brisket with bark crust and pickles',
      category: 'Mains',
      availability: 'available',
      popular: true,
      calories: 840,
      modifierGroups: [
      {
        id: 'brisket-cut',
        name: 'Cut Preference',
        required: true,
        multiSelect: false,
        options: [
        { id: 'lean', label: 'Lean Cut', priceAdd: 0 },
        { id: 'fatty', label: 'Fatty Cut', priceAdd: 0 },
        { id: 'mixed', label: 'Mixed', priceAdd: 0 }]

      },
      {
        id: 'brisket-side',
        name: 'Choose 2 Sides',
        required: true,
        multiSelect: true,
        maxSelect: 2,
        options: [
        { id: 'mac', label: 'Mac & Cheese', priceAdd: 0 },
        { id: 'coleslaw', label: 'Coleslaw', priceAdd: 0 },
        { id: 'baked-beans', label: 'Baked Beans', priceAdd: 0 },
        { id: 'cornbread', label: 'Cornbread', priceAdd: 0 },
        { id: 'greens', label: 'Collard Greens', priceAdd: 0 }]

      },
      {
        id: 'brisket-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-meat', label: 'Extra Brisket (2oz)', priceAdd: 5 },
        { id: 'extra-sauce', label: 'Extra BBQ Sauce', priceAdd: 0.5 }]

      }]

    },
    {
      id: 'loaded-potato',
      title: 'Loaded BBQ Potato',
      description: 'Baked potato loaded with pulled pork, cheddar, sour cream, and chives.',
      price: 14,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_11f60102a-1772419526645.png",
      imageAlt: 'Loaded baked potato with pulled pork and cheddar cheese',
      category: 'Sides',
      availability: 'available',
      calories: 620,
      modifierGroups: [
      {
        id: 'potato-protein',
        name: 'Protein',
        required: true,
        multiSelect: false,
        options: [
        { id: 'pulled-pork', label: 'Pulled Pork', priceAdd: 0 },
        { id: 'brisket', label: 'Brisket', priceAdd: 3 },
        { id: 'chicken', label: 'Smoked Chicken', priceAdd: 0 }]

      },
      {
        id: 'potato-extras',
        name: 'Extra Toppings',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-cheese', label: 'Extra Cheddar', priceAdd: 1 },
        { id: 'jalapenos', label: 'Jalapeños', priceAdd: 0.5 },
        { id: 'bacon-bits', label: 'Bacon Bits', priceAdd: 1.5 }]

      }]

    }]

  },
  'taco-loco': {
    id: 'taco-loco',
    name: 'Taco Loco Truck',
    username: 'taco_loco_dc',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1f8319c3d-1772076522406.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_1f8319c3d-1772076522406.png",
    coverAlt: 'Colorful food truck with Mexican street tacos and fresh toppings',
    cuisine: 'Mexican Street Food',
    bio: 'Authentic Mexican street food on wheels. We park, we cook, we feed the city. Fresh tortillas, slow-braised meats, and salsas made from scratch every morning.',
    rating: 4.5,
    reviewCount: 98,
    followers: 2140,
    location: 'Washington, DC',
    distance: '0.5 miles away',
    deliveryTime: '15–25 min',
    minOrder: 10,
    menu: [
    {
      id: 'street-tacos',
      title: 'Street Tacos (3)',
      description: 'Three street tacos on fresh corn tortillas with your choice of protein, cilantro, onion, and salsa.',
      price: 13,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f8319c3d-1772076522406.png",
      imageAlt: 'Street tacos with cilantro, onion, and salsa on corn tortillas',
      category: 'Tacos',
      availability: 'available',
      availabilityLabel: 'Available Now',
      popular: true,
      calories: 480,
      modifierGroups: [
      {
        id: 'taco-protein',
        name: 'Choose Protein',
        required: true,
        multiSelect: false,
        options: [
        { id: 'carnitas', label: 'Carnitas (Pork)', priceAdd: 0 },
        { id: 'carne-asada', label: 'Carne Asada (Beef)', priceAdd: 1 },
        { id: 'chicken', label: 'Grilled Chicken', priceAdd: 0 },
        { id: 'shrimp', label: 'Grilled Shrimp', priceAdd: 2 },
        { id: 'veggie', label: 'Veggie (Mushroom & Peppers)', priceAdd: 0 }]

      },
      {
        id: 'taco-salsa',
        name: 'Salsa',
        required: false,
        multiSelect: true,
        maxSelect: 2,
        options: [
        { id: 'salsa-verde', label: 'Salsa Verde', priceAdd: 0 },
        { id: 'salsa-roja', label: 'Salsa Roja', priceAdd: 0 },
        { id: 'habanero', label: 'Habanero 🔥', priceAdd: 0 }]

      },
      {
        id: 'taco-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'guac', label: 'Guacamole', priceAdd: 1.5 },
        { id: 'cheese', label: 'Cotija Cheese', priceAdd: 0.5 },
        { id: 'crema', label: 'Mexican Crema', priceAdd: 0.5 }]

      },
      {
        id: 'taco-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'agua-fresca', label: 'Agua Fresca', priceAdd: 2 },
        { id: 'horchata', label: 'Horchata', priceAdd: 2 },
        { id: 'soda', label: 'Soda', priceAdd: 1 },
        { id: 'water', label: 'Water', priceAdd: 0 }]

      }]

    },
    {
      id: 'burrito',
      title: 'Loaded Burrito',
      description: 'Loaded flour tortilla burrito with rice, beans, protein, cheese, sour cream, and guacamole.',
      price: 14,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_186aab0eb-1769175005554.png",
      imageAlt: 'Loaded burrito with rice, beans, and fresh toppings',
      category: 'Burritos',
      availability: 'available',
      popular: true,
      calories: 820,
      modifierGroups: [
      {
        id: 'burrito-protein',
        name: 'Choose Protein',
        required: true,
        multiSelect: false,
        options: [
        { id: 'carnitas', label: 'Carnitas', priceAdd: 0 },
        { id: 'carne-asada', label: 'Carne Asada', priceAdd: 1 },
        { id: 'chicken', label: 'Grilled Chicken', priceAdd: 0 },
        { id: 'shrimp', label: 'Shrimp', priceAdd: 2 }]

      },
      {
        id: 'burrito-spice',
        name: 'Spice Level',
        required: false,
        multiSelect: false,
        options: [
        { id: 'mild', label: 'Mild', priceAdd: 0 },
        { id: 'medium', label: 'Medium', priceAdd: 0 },
        { id: 'hot', label: 'Hot 🌶️', priceAdd: 0 }]

      },
      {
        id: 'burrito-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-guac', label: 'Extra Guacamole', priceAdd: 1.5 },
        { id: 'extra-cheese', label: 'Extra Cheese', priceAdd: 1 },
        { id: 'jalapenos', label: 'Jalapeños', priceAdd: 0 }]

      }]

    },
    {
      id: 'elote',
      title: 'Elote (Mexican Street Corn)',
      description: 'Grilled corn on the cob with mayo, cotija cheese, chili powder, and fresh lime.',
      price: 6,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1bb78de1b-1772893487688.png",
      imageAlt: 'Mexican street corn elote with cotija cheese and chili powder',
      category: 'Sides',
      availability: 'available',
      calories: 260,
      modifierGroups: [
      {
        id: 'elote-style',
        name: 'Style',
        required: true,
        multiSelect: false,
        options: [
        { id: 'on-cob', label: 'On the Cob', priceAdd: 0 },
        { id: 'in-cup', label: 'In a Cup (Esquites)', priceAdd: 0 }]

      },
      {
        id: 'elote-spice',
        name: 'Spice Level',
        required: false,
        multiSelect: false,
        options: [
        { id: 'mild', label: 'Mild', priceAdd: 0 },
        { id: 'medium', label: 'Medium', priceAdd: 0 },
        { id: 'hot', label: 'Hot 🌶️', priceAdd: 0 }]

      }]

    }]

  },
  'ocean-catch': {
    id: 'ocean-catch',
    name: "Ocean's Catch",
    username: 'oceans_catch_dc',
    avatar: "https://images.unsplash.com/photo-1655992829036-ce6c395d4909",
    coverImage: "https://images.unsplash.com/photo-1703847262387-b484162cc009",
    coverAlt: 'Fresh seafood platter with lobster, shrimp, and crab on ice',
    cuisine: 'Fresh Seafood',
    bio: 'Straight from the dock to your door. We source the freshest seafood daily and prepare it simply — letting the quality of the catch speak for itself.',
    rating: 4.8,
    reviewCount: 203,
    followers: 5680,
    location: 'Washington, DC',
    distance: '1.9 miles away',
    deliveryTime: '30–45 min',
    minOrder: 25,
    menu: [
    {
      id: 'lobster-tail',
      title: 'Grilled Lobster Tail',
      description: 'Butterflied lobster tail grilled with garlic herb butter, lemon, and fresh herbs.',
      price: 42,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_11733dc26-1772250152920.png",
      imageAlt: 'Grilled lobster tail with garlic butter and lemon',
      category: 'Mains',
      availability: 'limited',
      availabilityLabel: 'Limited Plates',
      popular: true,
      calories: 380,
      modifierGroups: [
      {
        id: 'lobster-side',
        name: 'Choose Your Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'garlic-butter-rice', label: 'Garlic Butter Rice', priceAdd: 0 },
        { id: 'roasted-veg', label: 'Roasted Vegetables', priceAdd: 0 },
        { id: 'mac', label: 'Mac & Cheese', priceAdd: 2 },
        { id: 'fries', label: 'Seasoned Fries', priceAdd: 0 }]

      },
      {
        id: 'lobster-butter',
        name: 'Butter Sauce',
        required: false,
        multiSelect: false,
        options: [
        { id: 'garlic-herb', label: 'Garlic Herb', priceAdd: 0 },
        { id: 'lemon-butter', label: 'Lemon Butter', priceAdd: 0 },
        { id: 'cajun-butter', label: 'Cajun Butter', priceAdd: 0 }]

      },
      {
        id: 'lobster-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'water', label: 'Still Water', priceAdd: 0 },
        { id: 'sparkling', label: 'Sparkling Water', priceAdd: 1 },
        { id: 'lemonade', label: 'Lemonade', priceAdd: 1.5 }]

      }]

    },
    {
      id: 'shrimp-grits',
      title: 'Shrimp & Grits',
      description: 'Cajun-spiced shrimp over creamy stone-ground grits with andouille sausage and bell peppers.',
      price: 28,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_14dc0715e-1768243004327.png",
      imageAlt: 'Shrimp and grits with cajun seasoning and andouille sausage',
      category: 'Mains',
      availability: 'available',
      popular: true,
      calories: 620,
      modifierGroups: [
      {
        id: 'shrimp-spice',
        name: 'Spice Level',
        required: true,
        multiSelect: false,
        options: [
        { id: 'mild', label: 'Mild', priceAdd: 0 },
        { id: 'medium', label: 'Medium', priceAdd: 0 },
        { id: 'hot', label: 'Cajun Hot 🌶️', priceAdd: 0 }]

      },
      {
        id: 'shrimp-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-shrimp', label: 'Extra Shrimp (4pc)', priceAdd: 4 },
        { id: 'extra-sausage', label: 'Extra Andouille', priceAdd: 3 },
        { id: 'extra-sauce', label: 'Extra Cajun Sauce', priceAdd: 0.5 }]

      }]

    },
    {
      id: 'crab-cakes',
      title: 'Jumbo Lump Crab Cakes',
      description: 'Pan-seared jumbo lump crab cakes with remoulade sauce, microgreens, and lemon.',
      price: 32,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1fbaeb691-1773849003458.png",
      imageAlt: 'Jumbo lump crab cakes with remoulade sauce and microgreens',
      category: 'Mains',
      availability: 'available',
      calories: 440,
      modifierGroups: [
      {
        id: 'crab-side',
        name: 'Choose Your Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'mixed-greens', label: 'Mixed Greens Salad', priceAdd: 0 },
        { id: 'roasted-veg', label: 'Roasted Vegetables', priceAdd: 0 },
        { id: 'fries', label: 'Old Bay Fries', priceAdd: 0 },
        { id: 'mac', label: 'Mac & Cheese', priceAdd: 2 }]

      },
      {
        id: 'crab-sauce',
        name: 'Sauce',
        required: false,
        multiSelect: false,
        options: [
        { id: 'remoulade', label: 'Remoulade', priceAdd: 0 },
        { id: 'tartar', label: 'Tartar Sauce', priceAdd: 0 },
        { id: 'cocktail', label: 'Cocktail Sauce', priceAdd: 0 }]

      }]

    },
    {
      id: 'seafood-boil',
      title: 'Mini Seafood Boil',
      description: 'Shrimp, crab legs, corn, and potatoes in our signature Cajun boil seasoning.',
      price: 38,
      image: 'https://images.unsplash.com/photo-1703847262387-b484162cc009',
      imageAlt: 'Seafood boil with shrimp, crab, corn, and potatoes',
      category: 'Boils',
      availability: 'limited',
      availabilityLabel: 'Limited Plates',
      calories: 780,
      modifierGroups: [
      {
        id: 'boil-spice',
        name: 'Spice Level',
        required: true,
        multiSelect: false,
        options: [
        { id: 'mild', label: 'Mild', priceAdd: 0 },
        { id: 'medium', label: 'Medium', priceAdd: 0 },
        { id: 'hot', label: 'Hot 🌶️', priceAdd: 0 },
        { id: 'extra-hot', label: 'Extra Hot 🔥', priceAdd: 0 }]

      },
      {
        id: 'boil-extras',
        name: 'Add to Your Boil',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-shrimp', label: 'Extra Shrimp', priceAdd: 5 },
        { id: 'extra-crab', label: 'Extra Crab Legs', priceAdd: 8 },
        { id: 'sausage', label: 'Andouille Sausage', priceAdd: 3 },
        { id: 'extra-corn', label: 'Extra Corn', priceAdd: 1 }]

      }]

    }]

  },
  'green-bowl': {
    id: 'green-bowl',
    name: 'Green Bowl Co.',
    username: 'green_bowl_co',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1d6965a2e-1772054986882.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_1d6965a2e-1772054986882.png",
    coverAlt: 'Colorful vegan grain bowl with roasted vegetables and tahini dressing',
    cuisine: 'Plant-Based',
    bio: 'Nourishing plant-based bowls, smoothies, and wraps made with whole ingredients. Eat well, feel good — no compromise on flavor.',
    rating: 4.4,
    reviewCount: 87,
    followers: 1920,
    location: 'Washington, DC',
    distance: '1.1 miles away',
    deliveryTime: '20–35 min',
    minOrder: 12,
    menu: [
    {
      id: 'buddha-bowl',
      title: 'Buddha Bowl',
      description: 'Quinoa, roasted sweet potato, chickpeas, avocado, cucumber, and tahini dressing.',
      price: 16,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_13da08aa3-1772139613628.png",
      imageAlt: 'Buddha bowl with quinoa, roasted veggies, and tahini dressing',
      category: 'Bowls',
      availability: 'available',
      availabilityLabel: 'Available Now',
      popular: true,
      calories: 520,
      modifierGroups: [
      {
        id: 'buddha-base',
        name: 'Bowl Base',
        required: true,
        multiSelect: false,
        options: [
        { id: 'quinoa', label: 'Quinoa', priceAdd: 0 },
        { id: 'brown-rice', label: 'Brown Rice', priceAdd: 0 },
        { id: 'mixed-greens', label: 'Mixed Greens', priceAdd: 0 },
        { id: 'cauliflower-rice', label: 'Cauliflower Rice', priceAdd: 0 }]

      },
      {
        id: 'buddha-protein',
        name: 'Add Protein',
        required: false,
        multiSelect: false,
        options: [
        { id: 'chickpeas', label: 'Roasted Chickpeas', priceAdd: 0 },
        { id: 'tofu', label: 'Crispy Tofu', priceAdd: 2 },
        { id: 'tempeh', label: 'Marinated Tempeh', priceAdd: 3 },
        { id: 'falafel', label: 'Falafel (3pc)', priceAdd: 3 }]

      },
      {
        id: 'buddha-dressing',
        name: 'Dressing',
        required: false,
        multiSelect: false,
        options: [
        { id: 'tahini', label: 'Tahini', priceAdd: 0 },
        { id: 'lemon-herb', label: 'Lemon Herb', priceAdd: 0 },
        { id: 'miso-ginger', label: 'Miso Ginger', priceAdd: 0 },
        { id: 'avocado-lime', label: 'Avocado Lime', priceAdd: 0 }]

      },
      {
        id: 'buddha-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-avocado', label: 'Extra Avocado', priceAdd: 2 },
        { id: 'hemp-seeds', label: 'Hemp Seeds', priceAdd: 0.5 },
        { id: 'pickled-veg', label: 'Pickled Vegetables', priceAdd: 0.5 }]

      }]

    },
    {
      id: 'smoothie-bowl',
      title: 'Açaí Smoothie Bowl',
      description: 'Thick açaí blend topped with granola, fresh berries, banana, coconut flakes, and honey.',
      price: 14,
      image: 'https://images.unsplash.com/photo-1538013928906-afba81f4830d',
      imageAlt: 'Açaí smoothie bowl with granola and fresh berries',
      category: 'Bowls',
      availability: 'available',
      popular: true,
      calories: 420,
      modifierGroups: [
      {
        id: 'smoothie-base',
        name: 'Base Flavor',
        required: true,
        multiSelect: false,
        options: [
        { id: 'acai', label: 'Açaí', priceAdd: 0 },
        { id: 'pitaya', label: 'Pitaya (Dragon Fruit)', priceAdd: 0 },
        { id: 'mango', label: 'Mango', priceAdd: 0 }]

      },
      {
        id: 'smoothie-extras',
        name: 'Extra Toppings',
        required: false,
        multiSelect: true,
        options: [
        { id: 'nut-butter', label: 'Almond Butter', priceAdd: 1 },
        { id: 'chia-seeds', label: 'Chia Seeds', priceAdd: 0.5 },
        { id: 'cacao-nibs', label: 'Cacao Nibs', priceAdd: 0.5 },
        { id: 'extra-granola', label: 'Extra Granola', priceAdd: 0.5 }]

      }]

    },
    {
      id: 'avocado-toast',
      title: 'Avocado Toast',
      description: 'Sourdough toast with smashed avocado, microgreens, everything bagel seasoning, and lemon.',
      price: 12,
      image: 'https://images.unsplash.com/photo-1601261117161-9374344c2210',
      imageAlt: 'Avocado toast with microgreens and everything bagel seasoning',
      category: 'Toasts',
      availability: 'limited',
      availabilityLabel: 'Closes Soon',
      calories: 380,
      modifierGroups: [
      {
        id: 'toast-bread',
        name: 'Bread',
        required: true,
        multiSelect: false,
        options: [
        { id: 'sourdough', label: 'Sourdough', priceAdd: 0 },
        { id: 'multigrain', label: 'Multigrain', priceAdd: 0 },
        { id: 'gluten-free', label: 'Gluten-Free', priceAdd: 1.5 }]

      },
      {
        id: 'toast-extras',
        name: 'Add-Ons',
        required: false,
        multiSelect: true,
        options: [
        { id: 'poached-egg', label: 'Poached Egg', priceAdd: 1.5 },
        { id: 'smoked-salmon', label: 'Smoked Salmon', priceAdd: 4 },
        { id: 'feta', label: 'Crumbled Feta', priceAdd: 1 },
        { id: 'tomatoes', label: 'Heirloom Tomatoes', priceAdd: 0.5 }]

      }]

    }]

  },
  'mamas-soul': {
    id: 'mamas-soul',
    name: "Mama's Soul Kitchen",
    username: 'mamas_soul_kitchen',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_156a1ca02-1772507931597.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_156a1ca02-1772507931597.png",
    coverAlt: 'Southern soul food spread with fried chicken, collard greens, and cornbread',
    cuisine: 'Southern Soul Food',
    bio: "Cooking like Mama taught me. Every plate is made with love, seasoned with soul, and served with a side of Southern hospitality. Come hungry, leave happy.",
    rating: 4.9,
    reviewCount: 427,
    followers: 12300,
    location: 'Washington, DC',
    distance: '2.7 miles away',
    deliveryTime: '45–60 min',
    minOrder: 18,
    menu: [
    {
      id: 'fried-chicken',
      title: 'Southern Fried Chicken Plate',
      description: 'Crispy Southern fried chicken with honey drizzle. Served with 2 sides and cornbread.',
      price: 18,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1ff1dcd0c-1772147536543.png",
      imageAlt: 'Crispy fried chicken with honey drizzle and sides',
      category: 'Mains',
      availability: 'available',
      availabilityLabel: 'Available Now',
      popular: true,
      calories: 980,
      modifierGroups: [
      {
        id: 'chicken-pieces',
        name: 'Piece Count',
        required: true,
        multiSelect: false,
        options: [
        { id: '2pc', label: '2 Piece', priceAdd: 0 },
        { id: '3pc', label: '3 Piece', priceAdd: 4 },
        { id: '4pc', label: '4 Piece', priceAdd: 8 }]

      },
      {
        id: 'chicken-side1',
        name: 'Side #1',
        required: true,
        multiSelect: false,
        options: [
        { id: 'mac', label: 'Mac & Cheese', priceAdd: 0 },
        { id: 'greens', label: 'Collard Greens', priceAdd: 0 },
        { id: 'yams', label: 'Candied Yams', priceAdd: 0 },
        { id: 'potato-salad', label: 'Potato Salad', priceAdd: 0 }]

      },
      {
        id: 'chicken-side2',
        name: 'Side #2',
        required: true,
        multiSelect: false,
        options: [
        { id: 'mac', label: 'Mac & Cheese', priceAdd: 0 },
        { id: 'greens', label: 'Collard Greens', priceAdd: 0 },
        { id: 'cornbread', label: 'Cornbread', priceAdd: 0 },
        { id: 'baked-beans', label: 'Baked Beans', priceAdd: 0 }]

      },
      {
        id: 'chicken-spice',
        name: 'Seasoning',
        required: false,
        multiSelect: false,
        options: [
        { id: 'classic', label: 'Classic Southern', priceAdd: 0 },
        { id: 'spicy', label: 'Spicy', priceAdd: 0 },
        { id: 'honey-butter', label: 'Honey Butter', priceAdd: 0 },
        { id: 'lemon-pepper', label: 'Lemon Pepper', priceAdd: 0 }]

      },
      {
        id: 'chicken-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'sweet-tea', label: 'Sweet Tea', priceAdd: 1.5 },
        { id: 'lemonade', label: 'Lemonade', priceAdd: 1.5 },
        { id: 'water', label: 'Water', priceAdd: 0 },
        { id: 'soda', label: 'Soda', priceAdd: 1 }]

      }]

    },
    {
      id: 'mac-cheese',
      title: 'Baked Mac & Cheese',
      description: 'Creamy baked mac and cheese with a golden breadcrumb crust. Made from scratch daily.',
      price: 10,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1beb1562f-1772222748789.png",
      imageAlt: 'Creamy baked mac and cheese with golden breadcrumb topping',
      category: 'Sides',
      availability: 'available',
      popular: true,
      calories: 480,
      modifierGroups: [
      {
        id: 'mac-size',
        name: 'Size',
        required: true,
        multiSelect: false,
        options: [
        { id: 'small', label: 'Small (1 serving)', priceAdd: 0 },
        { id: 'large', label: 'Large (2–3 servings)', priceAdd: 6 },
        { id: 'family', label: 'Family (4–6 servings)', priceAdd: 16 }]

      },
      {
        id: 'mac-extras',
        name: 'Add-Ons',
        required: false,
        multiSelect: true,
        options: [
        { id: 'pulled-pork', label: 'Pulled Pork', priceAdd: 3 },
        { id: 'extra-cheese', label: 'Extra Cheddar', priceAdd: 1.5 },
        { id: 'jalapenos', label: 'Jalapeños', priceAdd: 0.5 }]

      }]

    },
    {
      id: 'cornbread',
      title: 'Cornbread Muffins (4)',
      description: 'Sweet and buttery Southern cornbread muffins with honey butter on the side.',
      price: 7,
      image: 'https://images.unsplash.com/photo-1704520764255-dc303a705ac2',
      imageAlt: 'Cornbread muffins with butter and honey on a wooden board',
      category: 'Sides',
      availability: 'available',
      calories: 320,
      modifierGroups: [
      {
        id: 'cornbread-extras',
        name: 'Add-Ons',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-honey', label: 'Extra Honey Butter', priceAdd: 0.5 },
        { id: 'jalapeno-cheddar', label: 'Jalapeño Cheddar Style', priceAdd: 1 }]

      }]

    },
    {
      id: 'soul-plate',
      title: 'Full Soul Food Plate',
      description: 'The full spread — fried chicken, mac & cheese, collard greens, candied yams, and cornbread.',
      price: 28,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_156a1ca02-1772507931597.png",
      imageAlt: 'Full Southern soul food plate with fried chicken and all the sides',
      category: 'Mains',
      availability: 'limited',
      availabilityLabel: 'Selling Fast',
      popular: true,
      calories: 1400,
      modifierGroups: [
      {
        id: 'soul-chicken',
        name: 'Chicken Seasoning',
        required: true,
        multiSelect: false,
        options: [
        { id: 'classic', label: 'Classic Southern', priceAdd: 0 },
        { id: 'spicy', label: 'Spicy', priceAdd: 0 },
        { id: 'honey-butter', label: 'Honey Butter', priceAdd: 0 }]

      },
      {
        id: 'soul-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'sweet-tea', label: 'Sweet Tea', priceAdd: 1.5 },
        { id: 'lemonade', label: 'Lemonade', priceAdd: 1.5 },
        { id: 'water', label: 'Water', priceAdd: 0 }]

      },
      {
        id: 'soul-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-chicken', label: 'Extra Chicken Piece', priceAdd: 5 },
        { id: 'extra-mac', label: 'Extra Mac & Cheese', priceAdd: 3 },
        { id: 'extra-cornbread', label: 'Extra Cornbread', priceAdd: 2 }]

      }]

    }]

  }
};

const AVAILABILITY_STYLES: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  limited: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  sold_out: 'bg-muted text-muted-foreground'
};

const CATEGORY_ICONS: Record<string, string> = {
  Starters: '🥗',
  Pasta: '🍝',
  Mains: '🍽️',
  Desserts: '🍮',
  Specials: '⭐',
  Omakase: '🍣',
  Tacos: '🌮',
  Sides: '🌽',
  Wings: '🍗',
  Combos: '🎉',
  Burritos: '🌯',
  Cakes: '🎂',
  Pastries: '🥐',
  Bowls: '🥗',
  Toasts: '🍞',
  Boils: '🦞'
};

async function syncFollowerCounts(supabase: ReturnType<typeof createClient>, followerId: string, followingId: string) {
  const [{ count: followingCount }, { count: followersCount }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', followerId),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', followingId),
  ]);

  await Promise.all([
    supabase.from('user_profiles').update({ following_count: followingCount || 0 }).eq('id', followerId),
    supabase.from('user_profiles').update({ followers_count: followersCount || 0 }).eq('id', followingId),
  ]);
}

function VendorProfileContent() {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get('id') ?? 'chef-marco';
  const supabase = createClient();
  const { user } = useAuth();
  const [vendorOverride, setVendorOverride] = useState<(typeof VENDOR_DATA)[string] | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const vendor = vendorOverride ?? VENDOR_DATA[vendorId] ?? VENDOR_DATA['chef-marco'];

  const [cart, setCart] = useState<CartItemCustomization[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItemCustomization | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'posts' | 'orders' | 'reviews'>('menu');
  const [vendorPosts, setVendorPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const businessHours = resolveBusinessHours(vendor as any);
  const openState = getTodayOpenState(businessHours, (vendor as any)?.availability_override || null);
  const isOwnVendorProfile = !!user?.id && user.id === vendor.id;

  useEffect(() => {
    loadVendor();
    if (user?.id) {
      loadFollowState();
    }
  }, [vendorId, user?.id]);

  const loadVendor = async () => {
    setVendorLoading(true);
    try {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(vendorId);
      if (!isUuid) {
        setVendorOverride(null);
        setVendorLoading(false);
        return;
      }

      const [{ data: profile, error: profileError }, { data: meals, error: mealsError }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, full_name, username, avatar_url, cover_url, bio, location, followers_count, delivery_fee, business_hours, closed_days, availability_override')
          .eq('id', vendorId)
          .single(),
        supabase
          .from('meals')
          .select('id, title, description, price, image_url, category, available, modifier_groups')
          .eq('chef_id', vendorId)
          .order('created_at', { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (mealsError) throw mealsError;
      if (!profile) {
        setVendorOverride(null);
        return;
      }

      const dbVendor = profile as DbVendorProfile;
      const dbMeals = (meals as DbMeal[] | null) ?? [];

      const mappedMenu: MenuItem[] = dbMeals.map((meal) => ({
        id: meal.id,
        title: meal.title,
        description: meal.description || '',
        price: Number(meal.price),
        image: meal.image_url || '/assets/images/no_image.png',
        imageAlt: meal.title,
        category: meal.category || 'Mains',
        availability: meal.available ? 'available' : 'sold_out',
        modifierGroups: meal.modifier_groups ?? [],
      }));

      setVendorOverride({
        id: dbVendor.id,
        name: dbVendor.full_name || 'Chef',
        username: dbVendor.username || (dbVendor.full_name || 'chef').toLowerCase().replace(/\s+/g, '_'),
        avatar: dbVendor.avatar_url || '/assets/images/no_image.png',
        coverImage: dbVendor.cover_url || dbVendor.avatar_url || '/assets/images/no_image.png',
        coverAlt: `${dbVendor.full_name || 'Chef'} profile`,
        cuisine: 'Local Chef',
        bio: dbVendor.bio || 'Local chef on InHouse.',
        rating: 0,
        reviewCount: 0,
        followers: dbVendor.followers_count || 0,
        location: dbVendor.location || 'Location unavailable',
        distance: undefined,
        deliveryFee: Number(dbVendor.delivery_fee || 0),
        deliveryTime: 'TBD',
        minOrder: mappedMenu.length > 0 ? Math.min(...mappedMenu.map((item) => item.price)) : 0,
        menu: mappedMenu,
      });
    } catch {
      setVendorOverride(null);
    } finally {
      setVendorLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('inhouse_vendor_name', vendor.name);
    window.localStorage.setItem('inhouse_vendor_avatar', vendor.avatar);
    window.localStorage.setItem('inhouse_vendor_location', vendor.location || '');
    window.localStorage.setItem('inhouse_vendor_delivery_fee', String((vendor as any).deliveryFee ?? 0));
  }, [vendor.name, vendor.avatar, vendor.location, vendor]);

  const categories = ['all', ...Array.from(new Set(vendor.menu.map((item) => item.category)))];
  const filteredMenu = activeCategory === 'all' ?
  vendor.menu :
  vendor.menu.filter((item) => item.category === activeCategory);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice * item.qty, 0);

  // Build a map of itemId -> modifierGroups for CartDrawer
  const modifierGroupsMap: Record<string, ModifierGroup[]> = {};
  vendor.menu.forEach((item) => {
    if (item.modifierGroups) {
      modifierGroupsMap[item.id] = item.modifierGroups;
    }
  });

  const openCustomization = (item: MenuItem, existingCartItem?: CartItemCustomization) => {
    if (item.availability === 'sold_out') return;
    setCustomizingItem(item);
    setEditingCartItem(existingCartItem ?? null);
  };

  const handleCustomizationConfirm = (customization: CartItemCustomization) => {
    setCart((prev) => {
      if (editingCartItem) {
        return prev.map((c) =>
        c.cartKey === editingCartItem.cartKey ? customization : c
        );
      }
      const existing = prev.find((c) => c.cartKey === customization.cartKey);
      if (existing) {
        return prev.map((c) =>
        c.cartKey === customization.cartKey ?
        { ...c, qty: c.qty + customization.qty } :
        c
        );
      }
      return [...prev, customization];
    });
    toast.success(`🛒 ${customization.title} added to cart!`, {
      description: `$${(customization.totalPrice * customization.qty).toFixed(2)} · From ${vendor.name}`,
      action: {
        label: 'View Cart',
        onClick: () => setShowCart(true)
      },
      duration: 4000
    });
    setCustomizingItem(null);
    setEditingCartItem(null);
  };

  const handleRemoveFromCart = (cartKey: string) => {
    const item = cart.find((c) => c.cartKey === cartKey);
    setCart((prev) => prev.filter((c) => c.cartKey !== cartKey));
    if (item) {
      toast(`🗑️ ${item.title} removed`, {
        description: 'Item removed from your cart',
        duration: 2500
      });
    }
  };

  const handleEditCartItem = (cartItem: CartItemCustomization) => {
    const menuItem = vendor.menu.find((m) => m.id === cartItem.itemId);
    if (!menuItem) return;
    setShowCart(false);
    openCustomization(menuItem, cartItem);
  };

  const loadVendorPosts = async () => {
    try {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(vendorId);
      if (!isUuid) {
        setVendorPosts([]);
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('id, caption, media_url, media_type, created_at, location, likes_count, comments_count')
        .eq('user_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendorPosts(data || []);
    } catch {
      setVendorPosts([]);
    }
  };

  const loadFollowState = async () => {
    if (!user?.id || !/^[0-9a-fA-F-]{36}$/.test(vendorId)) return;
    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', vendorId)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch {
      setIsFollowing(false);
    }
  };

  const handleFollow = async () => {
    if (followLoading) return;
    if (!user?.id) {
      toast.error('Please sign in to follow chefs.');
      return;
    }
    if (!/^[0-9a-fA-F-]{36}$/.test(vendorId)) {
      toast('Demo profile follow is not persisted yet.', { duration: 2000 });
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', vendorId);
        if (error) throw error;
        setIsFollowing(false);
        toast(`Unfollowed ${vendor.name}`, { duration: 2000 });
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: vendorId });
        if (error) throw error;
        const { data: vendorSettings } = await supabase
          .from('user_settings')
          .select('notif_new_follower')
          .eq('user_id', vendorId)
          .maybeSingle();
        if ((vendorSettings as any)?.notif_new_follower !== false) {
          await supabase.from('notifications').insert({
            user_id: vendorId,
            actor_id: user.id,
            type: 'follow',
            title: 'New follower',
            body: `${profile?.full_name || 'Someone'} started following you.`,
            entity_id: user.id,
            entity_type: 'user_profile',
          });
        }
        setIsFollowing(true);
        toast.success(`Following ${vendor.name}!`, {
          description: "You'll see their new posts in your feed",
          duration: 3000
        });
      }

      await syncFollowerCounts(supabase, user.id, vendorId);
      await loadVendor();
    } catch {
      toast.error('Could not update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Determine back link — go to /nearby if vendor is a marketplace vendor
  const nearbyVendorIds = ['wing-queen', 'sweet-tooth', 'rolling-smoke', 'taco-loco', 'ocean-catch', 'green-bowl', 'mama-soul'];
  const backHref = nearbyVendorIds.includes(vendorId) ? '/nearby' : '/home-feed';

  if (vendorLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto xl:max-w-screen-md pb-32">
        {/* Cover Image */}
        <div className="relative h-52 sm:h-64 overflow-hidden bg-muted">
          <img
            src={vendor.coverImage}
            alt={vendor.coverAlt}
            className="w-full h-full object-cover" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Back button */}
          <Link href={backHref} className="absolute top-4 left-4">
            <button
              suppressHydrationWarning
              className="w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
              aria-label="Go back">
              
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>

          {/* Share button */}
          <button
            suppressHydrationWarning
            className="absolute top-4 right-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
            aria-label="Share vendor"
            onClick={() => toast.success('Link copied!')}>
            
            <Share2 className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Vendor Info */}
        <div className="px-4 pb-4 bg-card border-b border-border/50">
          <div className="flex items-end gap-4 -mt-8 sm:-mt-10 mb-3.5">
            <div className="relative shrink-0">
              <div className="w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] rounded-2xl overflow-hidden border-[3px] border-card shadow-elevated bg-card">
                <img src={vendor.avatar} alt={`${vendor.name} chef avatar`} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center border-2 border-card text-xs shadow-sm">
                👨‍🍳
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 flex-1 min-w-0 pt-2">
              <div className="text-center">
                <p className="text-[18px] font-700 text-foreground font-tabular tracking-snug">{vendor.menu.length}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Menu</p>
              </div>
              <div className="text-center">
                <p className="text-[18px] font-700 text-foreground font-tabular tracking-snug">{vendor.followers >= 1000 ? `${(vendor.followers / 1000).toFixed(1)}k` : vendor.followers}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-[18px] font-700 text-foreground font-tabular tracking-snug">{vendor.reviewCount}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Reviews</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[18px] sm:text-[20px] font-700 text-foreground leading-tight tracking-snug">{vendor.name}</h1>
                <span className="flex items-center gap-1 bg-[#FFE5D0] text-[#C2410C] dark:bg-orange-500/15 dark:text-[#FB923C] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#FFD2B3]">
                  <ChefHat className="w-3 h-3" />Chef
                </span>
              </div>
              <p className="text-[13px] font-semibold text-foreground">@{vendor.username}</p>
            </div>

            <p className="text-[14px] text-muted-foreground leading-relaxed">{vendor.bio}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{vendor.location}</span>
                {vendor.distance && <span className="text-primary font-500">· {vendor.distance}</span>}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{vendor.deliveryTime === 'TBD' ? 'Pickup / delivery details coming soon' : vendor.deliveryTime}</span>
              </div>
              {vendor.minOrder > 0 && (
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>From ${vendor.minOrder}</span>
                </div>
              )}
            </div>

            {businessHours && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <div className="inline-flex items-center gap-2 text-[12px] text-muted-foreground bg-muted px-3 py-2 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{businessHours}</span>
                </div>
                <div className={`inline-flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl font-700 ${openState.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${openState.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {openState.label}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3.5 flex-wrap">
            <button
              suppressHydrationWarning
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-[13px] font-600 px-4 py-2.5 rounded-xl active:scale-95 transition-all duration-200 shadow-sm ${
              isFollowing ?
              'bg-muted text-muted-foreground border border-border/60 hover:border-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20' :
              'bg-primary text-white hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20'} ${
              followLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {followLoading ?
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> :
              <>
                  <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-current' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </>
              }
            </button>
            <button
              suppressHydrationWarning
              className="h-[42px] px-4 border border-border rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Share vendor"
              onClick={() => toast.success('Link copied!')}>
              <Share2 className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="bg-card border-b border-border/50 px-4 sticky top-14 z-30">
          <div className="flex">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex-1 py-3 text-[13px] font-600 border-b-2 transition-all tracking-snug ${
              activeTab === 'menu' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
              }>
              
              Menu
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 text-[13px] font-600 border-b-2 transition-all tracking-snug ${
              activeTab === 'reviews' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
              }>
              Reviews
            </button>
            {isOwnVendorProfile && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-3 text-[13px] font-600 border-b-2 transition-all tracking-snug ${
                activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
                }>
                Orders
              </button>
            )}
          </div>
        </div>

        {activeTab === 'posts' ? (
          <div className="px-4 py-4 space-y-4">
            {vendorPosts.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-700 text-foreground mb-1">No posts yet</h3>
                <p className="text-sm text-muted-foreground">This chef has not posted anything yet.</p>
              </div>
            ) : (
              vendorPosts.map((post) => (
                <article key={post.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="aspect-square bg-muted">
                    {post.media_type === 'video' ? (
                      <video src={post.media_url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={post.media_url} alt={post.caption || 'Chef post'} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{post.caption || 'No caption'}</p>
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3">
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <span>{post.likes_count || 0} likes</span>
                      <span>{post.comments_count || 0} comments</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : activeTab === 'orders' && isOwnVendorProfile ? (
          <OrdersTab />
        ) : activeTab === 'reviews' ? (
          vendor.reviewCount > 0 ? (
            <ChefReviews
              chefName={vendor.name}
              aggregateRating={vendor.rating}
              reviewCount={vendor.reviewCount}
              reviews={MOCK_REVIEWS}
            />
          ) : (
            <div className="px-4 py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-700 text-foreground mb-1">No reviews yet</h3>
              <p className="text-sm text-muted-foreground">This chef has not received any reviews yet.</p>
            </div>
          )
        ) : (
          <>
            {/* Category Filter */}
            <div className="bg-card border-b border-border/50 px-4 py-3 z-20">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    suppressHydrationWarning
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-600 transition-all duration-150 tracking-snug ${
                      activeCategory === cat
                        ? 'bg-primary text-white shadow-sm shadow-primary/20'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat !== 'all' && <span>{CATEGORY_ICONS[cat] || '🍴'}</span>}
                    {cat === 'all' ? 'All Items' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            <div className="divide-y divide-border/40 px-1">
              {filteredMenu.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-700 text-foreground mb-1">No menu items yet</h3>
                  <p className="text-sm text-muted-foreground">This chef has not added meals yet.</p>
                </div>
              ) : (
                filteredMenu.map((item) => {
                  const isSoldOut = item.availability === 'sold_out';
                  const cartQty = cart
                    .filter((c) => c.itemId === item.id)
                    .reduce((sum, c) => sum + c.qty, 0);

                  return (
                    <div
                      key={item.id}
                      className={`flex gap-4 p-4 bg-card transition-all duration-200 rounded-xl my-0.5 hover:bg-muted/25 ${
                        isSoldOut ? 'opacity-60' : 'cursor-pointer'
                      }`}
                    >
                      {/* Item Image */}
                      <button
                        onClick={() => openCustomization(item)}
                        disabled={isSoldOut}
                        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-muted shrink-0 focus:outline-none group/img"
                        aria-label={`Customize ${item.title}`}
                      >
                        <img
                          src={item.image}
                          alt={item.imageAlt}
                          className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        {item.popular && (
                          <div className="absolute top-1.5 left-1.5 bg-amber-400 text-white text-[9px] font-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" />
                            Popular
                          </div>
                        )}
                        {cartQty > 0 && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary text-white text-[10px] font-700 rounded-full flex items-center justify-center font-tabular">
                            {cartQty}
                          </div>
                        )}
                      </button>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => openCustomization(item)}
                          disabled={isSoldOut}
                          className="text-left w-full"
                        >
                          <h3 className="text-[14px] font-700 text-foreground leading-snug tracking-snug">{item.title}</h3>
                          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{item.description}</p>
                        </button>

                        {/* Availability badge */}
                        {item.availabilityLabel && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-600 px-2 py-0.5 rounded-full ${AVAILABILITY_STYLES[item.availability]}`}>
                              {item.availability === 'limited' && <Zap className="w-2.5 h-2.5" />}
                              {item.availability === 'available' && <CheckCircle className="w-2.5 h-2.5" />}
                              {item.availabilityLabel}
                            </span>
                          </div>
                        )}

                        {/* Price + Add button */}
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <span className="text-[15px] font-700 text-foreground font-tabular tracking-snug">${item.price}</span>
                            {item.calories && item.calories > 0 && (
                              <span className="text-[11px] text-muted-foreground ml-1.5">{item.calories} cal</span>
                            )}
                          </div>

                          {isSoldOut ? (
                            <span className="text-[12px] font-600 text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                              Sold Out
                            </span>
                          ) : (
                            <button
                              onClick={() => openCustomization(item)}
                              className={`flex items-center gap-1.5 text-[12px] font-600 px-3.5 py-1.5 rounded-full active:scale-95 transition-all duration-150 shadow-sm shadow-primary/15 ${
                                cartQty > 0
                                  ? 'bg-primary/8 text-primary border border-primary/20 hover:bg-primary hover:text-white hover:border-primary'
                                  : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20'
                              }`}
                            >
                              {cartQty > 0 ? (
                                <>
                                  <span className="font-tabular">{cartQty}</span>
                                  <span>in cart</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-base leading-none">+</span>
                                  Add
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Modifier groups hint */}
                        {item.modifierGroups && item.modifierGroups.length > 0 && !isSoldOut && (
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            Customizable · {item.modifierGroups.filter((g) => g.required).length > 0 ? 'Required choices' : 'Optional add-ons'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chef badge */}
            <div className="mx-4 mt-4 mb-2 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <ChefHat className="w-[18px] h-[18px] text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-600 text-foreground tracking-snug">Verified InHouse Vendor</p>
                <p className="text-[12px] text-muted-foreground">All ingredients sourced fresh. Orders prepared to order.</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky Cart Bar */}
      {cartCount > 0 &&
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-transparent pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
            onClick={() => setShowCart(true)}
            className="w-full flex items-center justify-between bg-primary text-white px-5 py-3.5 rounded-2xl shadow-elevated shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-700">
                  {cartCount}
                </div>
                <span className="font-600 tracking-snug">View Cart</span>
              </div>
              <span className="font-700 font-tabular">${cartTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      }

      {/* Customization Modal */}
      {customizingItem &&
      <CustomizationModal
        item={customizingItem}
        modifierGroups={customizingItem.modifierGroups ?? []}
        chefName={vendor.name}
        chefAvatar={vendor.avatar}
        existingCartItem={editingCartItem}
        onConfirm={handleCustomizationConfirm}
        onClose={() => {
          setCustomizingItem(null);
          setEditingCartItem(null);
        }} />

      }

      {/* Cart Drawer */}
      {showCart &&
      <CartDrawer
        cart={cart}
        modifierGroupsMap={modifierGroupsMap}
        onEdit={handleEditCartItem}
        onRemove={handleRemoveFromCart}
        onClose={() => setShowCart(false)} />

      }
    </AppLayout>);

}

export default function VendorProfilePage() {
  return (
    <Suspense fallback={
    <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    }>
      <VendorProfileContent />
    </Suspense>);

}