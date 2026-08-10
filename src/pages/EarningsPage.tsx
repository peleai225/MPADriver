import { useEffect, useState } from 'react';
import { Wallet, Clock, ChevronDown, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { formatFCFA, formatDate } from '../lib/format';
import type { EarningsSummary, Earning } from '../lib/types';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetCloseButton } from '../components/ui/sheet';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';

function RemittanceForm({ debt, onSuccess, onClose }: { debt: any; onSuccess: () => void; onClose: () => void }) {
  const { show } = useToast();
  const [method, setMethod] = useState('wave');
  const [waveRef, setWaveRef] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.declareCashRemittance({
        debt_id: debt.id,
        amount_xof: debt.amount_xof,
        method,
        wave_reference: waveRef || undefined,
      });
      onSuccess();
    } catch (e: any) {
      show(e.message || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Moyen de paiement</label>
        <select value={method} onChange={e => setMethod(e.target.value)} className="w-full mt-1 px-4 py-3 border rounded-xl">
          <option value="wave">Wave</option>
          <option value="orange_money">Orange Money</option>
          <option value="mtn_money">MTN MoMo</option>
          <option value="moov_money">Moov Money</option>
          <option value="cash">Cash (en main propre)</option>
        </select>
      </div>
      {method !== 'cash' && (
        <div>
          <label className="text-sm font-medium">Référence transaction (optionnel)</label>
          <input value={waveRef} onChange={e => setWaveRef(e.target.value)} placeholder="Ex: W123456789" className="w-full mt-1 px-4 py-3 border rounded-xl" />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-3 border rounded-xl text-sm font-semibold">Annuler</button>
        <button onClick={submit} disabled={loading} className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
          {loading ? 'Envoi...' : 'Confirmer'}
        </button>
      </div>
    </div>
  );
}

export function EarningsPage() {
  const { driver } = useAuth();
  const { show } = useToast();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [history, setHistory] = useState<Earning[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showPayout, setShowPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutPhone, setPayoutPhone] = useState(driver?.phone ?? '');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [cashBalance, setCashBalance] = useState<{total_owed_xof: number; debts: any[]} | null>(null);
  const [showRemittanceSheet, setShowRemittanceSheet] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);

  useEffect(() => {
    api.getEarnings().then(setSummary).catch(() => {});
    api.getEarningsHistory(1)
      .then(r => { setHistory(r.data); setLastPage(r.meta.last_page); setLoading(false); })
      .catch(() => setLoading(false));
    api.getCashBalance().then(setCashBalance).catch(() => {});
  }, []);

  const loadMore = async () => {
    const next = page + 1;
    const r = await api.getEarningsHistory(next);
    setHistory(h => [...h, ...r.data]);
    setPage(next);
  };

  const handlePayout = async () => {
    const amount = parseInt(payoutAmount);
    if (!amount || amount < 500) { show('Minimum 500 FCFA.', 'error'); return; }
    if (!payoutPhone) { show('Entrez votre numéro Wave.', 'error'); return; }
    setPayoutLoading(true);
    try {
      await api.requestPayout(amount, payoutPhone);
      show('Demande de virement envoyée !', 'success');
      setShowPayout(false);
      setPayoutAmount('');
      api.getEarnings().then(setSummary).catch(() => {});
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally {
      setPayoutLoading(false);
    }
  };

  const stats = [
    { label: "Aujourd'hui",  value: summary?.today ?? 0 },
    { label: 'Cette semaine', value: summary?.this_week ?? 0 },
    { label: 'Ce mois',       value: summary?.this_month ?? 0 },
    { label: 'Total cumulé',  value: summary?.total_lifetime ?? 0 },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-safe pb-6" style={{ background: '#1C1C1C' }}>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={18} style={{ color: '#FF6100' }} />
          <h1 className="text-white font-bold text-lg">Mes gains</h1>
        </div>

        {/* Solde hero */}
        <div className="relative rounded-3xl p-5 text-center overflow-hidden mb-4" style={{ background: 'linear-gradient(135deg, #FF3301, #FF6100)' }}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
          <p className="text-white/70 text-xs mb-1 relative">Solde disponible</p>
          <p className="text-white font-extrabold text-4xl relative">{formatFCFA(summary?.balance_available ?? 0)}</p>
          <p className="text-white/60 text-xs mt-1 mb-4 relative">
            {summary?.deliveries_total ?? 0} livraison{(summary?.deliveries_total ?? 0) !== 1 ? 's' : ''} totales
          </p>
          <Button
            onClick={() => setShowPayout(true)}
            disabled={!summary || summary.balance_available < 500}
            variant="dark"
            size="pill"
            className="relative border border-white/20"
          >
            💸 Demander un virement Wave
          </Button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <p className="text-white/50 text-xs">{s.label}</p>
              <p className="text-white font-bold text-sm mt-0.5">{formatFCFA(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dettes cash */}
      {cashBalance && cashBalance.total_owed_xof > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mx-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-amber-900">Argent à reverser</h3>
            <span className="font-black text-amber-700 text-lg">
              {cashBalance.total_owed_xof.toLocaleString('fr-FR')} F
            </span>
          </div>
          <div className="space-y-2">
            {cashBalance.debts.map((debt: any) => (
              <div key={debt.id} className="bg-white rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{debt.restaurant_name}</p>
                  <p className="text-xs text-neutral-500">Cmd {debt.order_ref}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{debt.amount_xof.toLocaleString('fr-FR')} F</p>
                  <button
                    onClick={() => { setSelectedDebt(debt); setShowRemittanceSheet(true); }}
                    className="text-xs text-orange-600 font-semibold mt-0.5"
                  >
                    Déclarer versement
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historique */}
      <div className="px-4 mt-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-ink-400" />
          <h2 className="font-bold text-ink-900">Historique des gains</h2>
        </div>

        {loading ? (
          [0, 1, 2].map(i => <div key={i} className="h-16 rounded-2xl skeleton mb-2" />)
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-ink-400">
            <Wallet size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucun gain pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(e => (
              <div key={e.id} className="bg-white rounded-2xl shadow-soft p-3.5 flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl grid place-items-center shrink-0',
                  e.status === 'paid' ? 'bg-success-50' : 'bg-brand-50',
                )}>
                  <Wallet size={17} className={e.status === 'paid' ? 'text-success-600' : 'text-brand-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-900 text-sm">{e.order?.reference ?? `#${e.id}`}</p>
                  <p className="text-ink-400 text-xs mt-0.5">{formatDate(e.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success-600 text-sm">+{formatFCFA(e.net_amount)}</p>
                  <span className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    e.status === 'paid' ? 'bg-success-50 text-success-700' : 'bg-brand-50 text-brand-700',
                  )}>
                    {e.status === 'paid' ? 'Viré' : 'Disponible'}
                  </span>
                </div>
              </div>
            ))}
            {page < lastPage && (
              <button onClick={loadMore} className="w-full py-3 text-sm text-brand-600 font-semibold tap flex items-center justify-center gap-1">
                <ChevronDown size={16} /> Voir plus
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sheet Remittance */}
      {showRemittanceSheet && selectedDebt && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">Déclarer un reversement</h2>
            <p className="text-sm text-neutral-500">
              Pour : <strong>{selectedDebt.restaurant_name}</strong> — {selectedDebt.amount_xof.toLocaleString('fr-FR')} F
            </p>
            <RemittanceForm
              debt={selectedDebt}
              onSuccess={() => {
                setShowRemittanceSheet(false);
                api.getCashBalance().then(setCashBalance).catch(() => {});
                show('Reversement déclaré. En attente de confirmation du restaurant.', 'success');
              }}
              onClose={() => setShowRemittanceSheet(false)}
            />
          </div>
        </div>
      )}

      {/* Sheet Payout */}
      <Sheet open={showPayout} onOpenChange={setShowPayout}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Demande de virement</SheetTitle>
            <SheetCloseButton />
          </SheetHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="bg-brand-50 rounded-2xl p-3 flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <p className="text-xs font-semibold text-brand-700">Solde disponible</p>
                <p className="font-bold text-brand-600 text-lg">{formatFCFA(summary?.balance_available ?? 0)}</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="payout-amount">Montant (FCFA) *</Label>
              <Input
                id="payout-amount"
                type="number"
                value={payoutAmount}
                onChange={e => setPayoutAmount(e.target.value)}
                placeholder={`Min 500 FCFA`}
              />
            </div>
            <div>
              <Label htmlFor="payout-phone">Numéro Wave *</Label>
              <Input
                id="payout-phone"
                type="tel"
                value={payoutPhone}
                onChange={e => setPayoutPhone(e.target.value)}
                placeholder="0701234567"
              />
            </div>
            <p className="text-xs text-ink-400">Maximum 3 virements par jour. Traitement sous 24h.</p>
            <Button
              onClick={handlePayout}
              disabled={payoutLoading}
              className="w-full h-13"
            >
              {payoutLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Envoi...
                </span>
              ) : 'Confirmer le virement'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
