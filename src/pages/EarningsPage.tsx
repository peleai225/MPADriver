import { useEffect, useState } from 'react';
import { Wallet, ChevronDown, Bell, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { formatFCFA, formatDate } from '../lib/format';
import type { EarningsSummary, Earning } from '../lib/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetCloseButton } from '../components/ui/sheet';
import { Separator } from '../components/ui/separator';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

const BG = '#F5F0EB';
const ORANGE = '#FF6100';

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
  const [cashBalance, setCashBalance] = useState<{ total_owed_xof: number; debts: any[] } | null>(null);
  const [showRemittance, setShowRemittance] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [remitMethod, setRemitMethod] = useState('wave');
  const [remitRef, setRemitRef] = useState('');
  const [remitLoading, setRemitLoading] = useState(false);

  useEffect(() => {
    api.getEarnings().then(setSummary).catch(() => {});
    api.getEarningsHistory(1).then(r => { setHistory(r.data); setLastPage(r.meta.last_page); setLoading(false); }).catch(() => setLoading(false));
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
      setShowPayout(false); setPayoutAmount('');
      api.getEarnings().then(setSummary).catch(() => {});
    } catch (err: any) {
      show(err.message || 'Erreur.', 'error');
    } finally { setPayoutLoading(false); }
  };

  const handleRemit = async () => {
    if (!selectedDebt) return;
    setRemitLoading(true);
    try {
      await api.declareCashRemittance({ debt_id: selectedDebt.id, amount_xof: selectedDebt.amount_xof, method: remitMethod, wave_reference: remitRef || undefined });
      show('Reversement déclaré !', 'success');
      setShowRemittance(false);
      api.getCashBalance().then(setCashBalance).catch(() => {});
    } catch (e: any) {
      show(e.message || 'Erreur', 'error');
    } finally { setRemitLoading(false); }
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: BG }}>

      {/* ── HEADER ── */}
      <div className="px-5 pt-safe pt-5 pb-2 flex items-start justify-between">
        <div>
          <h1 className="font-extrabold text-3xl leading-tight" style={{ color: '#1C1C1C' }}>Gains</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0A0A0' }}>Votre tableau de bord financier</p>
        </div>
        <div className="relative mt-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center tap" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Bell size={20} style={{ color: '#1C1C1C' }} />
          </div>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: ORANGE }} />
        </div>
      </div>

      <div className="px-5 mt-3 space-y-3">

        {/* ── HERO SOLDE ── */}
        <div
          className="rounded-3xl p-5 overflow-hidden relative"
          style={{ background: `linear-gradient(135deg, #FF3301, ${ORANGE})`, boxShadow: '0 8px 32px rgba(255,97,0,.35)' }}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute bottom-0 right-0 opacity-10"><Wallet size={80} className="text-white" /></div>

          <p className="text-white/70 text-xs mb-1 relative">Solde disponible</p>
          <p className="text-white font-extrabold text-4xl relative">{formatFCFA(summary?.balance_available ?? 0)}</p>
          <p className="text-white/50 text-xs mt-1 relative">{summary?.deliveries_total ?? 0} livraison{(summary?.deliveries_total ?? 0) !== 1 ? 's' : ''} au total</p>

          <button
            onClick={() => setShowPayout(true)}
            disabled={!summary || summary.balance_available < 500}
            className="mt-4 relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold tap disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            💸 Demander un virement Wave
          </button>
        </div>

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Aujourd'hui", value: summary?.today ?? 0, icon: '📅' },
            { label: 'Cette semaine', value: summary?.this_week ?? 0, icon: '📆' },
            { label: 'Ce mois', value: summary?.this_month ?? 0, icon: '🗓️' },
            { label: 'Total cumulé', value: summary?.total_lifetime ?? 0, icon: '🏆' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3.5" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #EEEEEE' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{s.icon}</span>
                <p className="text-xs" style={{ color: '#A0A0A0' }}>{s.label}</p>
              </div>
              <p className="font-extrabold text-lg leading-tight" style={{ color: '#1C1C1C' }}>{formatFCFA(s.value)}</p>
            </div>
          ))}
        </div>

        {/* ── DETTES CASH ── */}
        {cashBalance && cashBalance.total_owed_xof > 0 && (
          <div className="rounded-3xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <p className="font-bold text-sm" style={{ color: '#92400E' }}>Argent à reverser</p>
              </div>
              <p className="font-extrabold text-lg" style={{ color: '#D97706' }}>{formatFCFA(cashBalance.total_owed_xof)}</p>
            </div>
            <div className="space-y-2">
              {cashBalance.debts.map((debt: any) => (
                <div key={debt.id} className="bg-white rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1C1C1C' }}>{debt.restaurant_name}</p>
                    <p className="text-xs" style={{ color: '#A0A0A0' }}>Cmd {debt.order_ref}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: '#1C1C1C' }}>{formatFCFA(debt.amount_xof)}</p>
                    <button onClick={() => { setSelectedDebt(debt); setShowRemittance(true); }} className="text-xs font-bold tap" style={{ color: ORANGE }}>
                      Déclarer →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORIQUE ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: ORANGE }} />
            <p className="font-extrabold text-base" style={{ color: '#1C1C1C' }}>Historique des gains</p>
          </div>

          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="h-16 rounded-2xl skeleton mb-2" />)
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="text-5xl mb-3">💰</span>
              <p className="font-bold" style={{ color: '#1C1C1C' }}>Aucun gain pour le moment</p>
              <p className="text-sm mt-1" style={{ color: '#A0A0A0' }}>Vos gains apparaîtront ici après chaque livraison.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(e => (
                <div key={e.id} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #EEEEEE' }}>
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: e.status === 'paid' ? '#F0FDF4' : 'rgba(255,97,0,0.1)' }}
                  >
                    <Wallet size={18} style={{ color: e.status === 'paid' ? '#16A34A' : ORANGE }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: '#1C1C1C' }}>{e.order?.reference ?? `#${e.id}`}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={10} style={{ color: '#A0A0A0' }} />
                      <p className="text-xs" style={{ color: '#A0A0A0' }}>{formatDate(e.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-base" style={{ color: '#22C55E' }}>+{formatFCFA(e.net_amount)}</p>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: e.status === 'paid' ? '#F0FDF4' : 'rgba(255,97,0,0.1)',
                        color: e.status === 'paid' ? '#16A34A' : ORANGE,
                      }}
                    >
                      {e.status === 'paid' ? 'Viré' : 'Disponible'}
                    </span>
                  </div>
                </div>
              ))}
              {page < lastPage && (
                <button onClick={loadMore} className="w-full py-3 text-sm font-semibold tap flex items-center justify-center gap-1" style={{ color: ORANGE }}>
                  <ChevronDown size={16} /> Voir plus
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SHEET PAYOUT ── */}
      <Sheet open={showPayout} onOpenChange={setShowPayout}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Demande de virement</SheetTitle>
            <SheetCloseButton />
          </SheetHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,97,0,0.08)' }}>
              <span className="text-2xl">💳</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: ORANGE }}>Solde disponible</p>
                <p className="font-extrabold text-lg" style={{ color: '#1C1C1C' }}>{formatFCFA(summary?.balance_available ?? 0)}</p>
              </div>
            </div>
            <Separator />
            <div>
              <Label htmlFor="payout-amount">Montant (FCFA) *</Label>
              <Input id="payout-amount" type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="Min 500 FCFA" />
            </div>
            <div>
              <Label htmlFor="payout-phone">Numéro Wave *</Label>
              <Input id="payout-phone" type="tel" value={payoutPhone} onChange={e => setPayoutPhone(e.target.value)} placeholder="0701234567" />
            </div>
            <p className="text-xs" style={{ color: '#A0A0A0' }}>Maximum 3 virements par jour. Traitement sous 24h.</p>
            <button
              onClick={handlePayout}
              disabled={payoutLoading}
              className="w-full h-13 rounded-2xl text-white font-bold tap disabled:opacity-60 flex items-center justify-center gap-2 gradient-flame"
              style={{ boxShadow: '0 8px 24px rgba(255,97,0,.3)' }}
            >
              {payoutLoading ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Confirmer le virement'}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── SHEET REMITTANCE ── */}
      <Sheet open={showRemittance} onOpenChange={setShowRemittance}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Déclarer un reversement</SheetTitle>
            <SheetCloseButton />
          </SheetHeader>
          <div className="px-6 pb-6 space-y-4">
            {selectedDebt && (
              <div className="rounded-2xl p-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="text-sm font-bold" style={{ color: '#92400E' }}>{selectedDebt.restaurant_name}</p>
                <p className="font-extrabold text-lg" style={{ color: '#D97706' }}>{formatFCFA(selectedDebt.amount_xof)}</p>
              </div>
            )}
            <div>
              <Label>Moyen de paiement</Label>
              <select value={remitMethod} onChange={e => setRemitMethod(e.target.value)} className="w-full mt-1 px-4 py-3 border border-ink-200 rounded-xl text-sm">
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="mtn_money">MTN MoMo</option>
                <option value="cash">Cash (en main propre)</option>
              </select>
            </div>
            {remitMethod !== 'cash' && (
              <div>
                <Label>Référence transaction</Label>
                <Input value={remitRef} onChange={e => setRemitRef(e.target.value)} placeholder="Ex: W123456789" />
              </div>
            )}
            <button
              onClick={handleRemit}
              disabled={remitLoading}
              className="w-full h-13 rounded-2xl text-white font-bold tap disabled:opacity-60 gradient-flame"
            >
              {remitLoading ? '...' : 'Confirmer le reversement'}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
