import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase/client';
import {RunwayCard} from '../components/dashboard/RunwayCard';
import { Wallet } from 'lucide-react';

const PaymentsPage = () => {
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data, error } = await supabase
        .from('storage_payments')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (!error && data) setPaymentInfo(data);
      setLoading(false);
    };
    fetchPayments();
  }, []);

  if (loading) return <div className="text-center text-gray-400">Loading payments...</div>;

  const runwayDays = paymentInfo?.estimated_runway ?? 0;
  const percentage = paymentInfo?.storage_spend_rate ? Math.min(100, (paymentInfo.filecoin_balance / (paymentInfo.storage_spend_rate * 30) * 100)) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Wallet className="h-6 w-6 text-shamrock" /> Payments
      </h1>
      <RunwayCard days={runwayDays} percentage={percentage} />
    </div>
  );
};

export default PaymentsPage;