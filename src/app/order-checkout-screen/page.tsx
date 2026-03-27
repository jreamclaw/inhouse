import AppLayout from '@/components/AppLayout';
import CheckoutFlow from './components/CheckoutFlow';

export default function OrderCheckoutPage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto xl:max-w-screen-lg px-0 xl:px-6 2xl:px-10 py-0 xl:py-6">
        <CheckoutFlow />
      </div>
    </AppLayout>
  );
}