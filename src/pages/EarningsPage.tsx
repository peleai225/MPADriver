import { useEffect, useState } from 'react';
import {
  Wallet, ChevronDown, Clock, TrendingUp, CalendarDays,
  Calendar, Award, CreditCard, AlertTriangle, Send,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { formatFCFA, formatDate } from '../lib/format';
import type { EarningsSummary, Earning } from '../lib/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetCloseButton } from '../components/ui/sheet';
import { Separator } from '../components/ui/separator';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

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
    if (!payoutPhone) { show('Entrez votre numero Wave.', 'error'); return; }
    setPayoutLoading(true);
    try {
      await api.requestPayout(amount, payoutPhone);
      show('Demande de virement envoyee !', 'success');
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
      show('Reversement declare !', 'success');
      setShowRemittance(false);
      api.getCashBalance().then(setCashBalance).catch(() => {});
    } catch (e: any) {
      show(e.message || 'Erreur', 'error');
    } finally { setRemitLoading(false); }
  };

  const STATS = [
    { label: "Aujourd'hui", value: summary?.today ?? 0, icon: CalendarDays, bg: 'bg-primary/10', color: 'text-primary' },
    { label: 'Cette semaine', value: summary?.this_week ?? 0, icon: Calendar, bg: 'bg-info-50', color: 'text-info-600' },
    { label: 'Ce mois', value: summary?.this_month ?? 0, icon: TrendingUp, bg: 'bg-success-50', color: 'text-success-600' },
    { label: 'Total cumule', value: summary?.total_lifetime ?? 0, icon: Award, bg: 'bg-warning-50', color: 'text-warning-600' },
  ];

  return (
    <div className="min-h-screen pb-28 bg-background">

      <PageHeader title="Gains" subtitle="Votre tableau de bord financier" />

      <div className="px-5 mt-3 space-y-3">

        {/* HERO BALANCE */}
        <Card className="overflow-hidden border-0 gradient-hero shadow-pop">
          <CardContent className="p-5 relative">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none bg-white/10" />
            <div className="absolute bottom-0 right-0 opacity-10"><Wallet size={80} className="text-white" /></div>

            <p className="text-white/70 text-xs mb-1 relative">Solde disponible</p>
            <p className="text-white font-extrabold text-4xl tabular relative">{formatFCFA(summary?.balance_available ?? 0)}</p>
            <p className="text-white/50 text-xs mt-1 tabular relative">{summary?.deliveries_total ?? 0} livraison{(summary?.deliveries_total ?? 0) !== 1 ? 's' : ''} au total</p>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPayout(true)}
              disabled={!summary || summary.balance_available < 500}
              className="mt-4 relative bg-white/20 text-white border border-white/30 hover:bg-white/30"
            >
              <Send size={14} /> Demander un virement
            </Button>
          </CardContent>
        </Card>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 gap-2">
          {STATS.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="shadow-xs">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.bg}`}>
                      <Icon size={14} className={s.color} />
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                  </div>
                  <p className="font-extrabold text-lg leading-tight tabular text-foreground">{formatFCFA(s.value)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CASH DEBTS */}
        {cashBalance && cashBalance.total_owed_xof > 0 && (
          <Card className="border-warning-200 bg-warning-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-warning-100">
                    <AlertTriangle size={16} className="text-warning-600" />
                  </div>
                  <p className="font-bold text-sm text-warning-700">Argent a reverser</p>
                </div>
                <p className="font-extrabold text-lg tabular text-warning-600">{formatFCFA(cashBalance.total_owed_xof)}</p>
              </div>
              <div className="space-y-2">
                {cashBalance.debts.map((debt: any) => (
                  <Card key={debt.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{debt.restaurant_name}</p>
                        <p className="text-xs text-muted-foreground tabular">Cmd {debt.order_ref}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm tabular text-foreground">{formatFCFA(debt.amount_xof)}</p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setSelectedDebt(debt); setShowRemittance(true); }}>
                          Declarer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* HISTORY */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <p className="font-bold text-sm text-foreground">Historique des gains</p>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-muted">
                  <Wallet size={24} className="text-muted-foreground" />
                </div>
                <p className="font-bold text-foreground">Aucun gain pour le moment</p>
                <p className="text-sm mt-1 text-muted-foreground">Vos gains apparaitront ici apres chaque livraison.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map(e => (
                <Card key={e.id} className="shadow-xs">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${e.status === 'paid' ? 'bg-success-50' : 'bg-primary/10'}`}>
                      <Wallet size={17} className={e.status === 'paid' ? 'text-success-600' : 'text-primary'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground tabular">{e.order?.reference ?? `#${e.id}`}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={10} className="text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-base tabular text-success-500">+{formatFCFA(e.net_amount)}</p>
                      <Badge variant={e.status === 'paid' ? 'success' : 'default'} className="text-[10px]">
                        {e.status === 'paid' ? 'Vire' : 'Disponible'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {page < lastPage && (
                <Button variant="ghost" className="w-full" onClick={loadMore}>
                  <ChevronDown size={16} /> Voir plus
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SHEET PAYOUT */}
      <Sheet open={showPayout} onOpenChange={setShowPayout}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Demande de virement</SheetTitle>
            <SheetCloseButton />
          </SheetHeader>
          <div className="px-6 pb-6 space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <CreditCard size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary">Solde disponible</p>
                  <p className="font-extrabold text-lg tabular text-foreground">{formatFCFA(summary?.balance_available ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Separator />
            <div>
              <Label htmlFor="payout-amount">Montant (FCFA) *</Label>
              <Input id="payout-amount" type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="Min 500 FCFA" />
            </div>
            <div>
              <Label htmlFor="payout-phone">Numero Wave *</Label>
              <Input id="payout-phone" type="tel" value={payoutPhone} onChange={e => setPayoutPhone(e.target.value)} placeholder="0701234567" />
            </div>
            <p className="text-xs text-muted-foreground">Maximum 3 virements par jour. Traitement sous 24h.</p>
            <Button onClick={handlePayout} disabled={payoutLoading} className="w-full" size="lg">
              {payoutLoading ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> : 'Confirmer le virement'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* SHEET REMITTANCE */}
      <Sheet open={showRemittance} onOpenChange={setShowRemittance}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Declarer un reversement</SheetTitle>
            <SheetCloseButton />
          </SheetHeader>
          <div className="px-6 pb-6 space-y-4">
            {selectedDebt && (
              <Card className="border-warning-200 bg-warning-50">
                <CardContent className="p-3">
                  <p className="text-sm font-bold text-warning-700">{selectedDebt.restaurant_name}</p>
                  <p className="font-extrabold text-lg tabular text-warning-600">{formatFCFA(selectedDebt.amount_xof)}</p>
                </CardContent>
              </Card>
            )}
            <div>
              <Label>Moyen de paiement</Label>
              <select
                value={remitMethod}
                onChange={e => setRemitMethod(e.target.value)}
                className="w-full mt-1.5 h-13 px-4 rounded-xl border border-input bg-background text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="mtn_money">MTN MoMo</option>
                <option value="cash">Cash (en main propre)</option>
              </select>
            </div>
            {remitMethod !== 'cash' && (
              <div>
                <Label>Reference transaction</Label>
                <Input value={remitRef} onChange={e => setRemitRef(e.target.value)} placeholder="Ex: W123456789" />
              </div>
            )}
            <Button onClick={handleRemit} disabled={remitLoading} className="w-full" size="lg">
              {remitLoading ? <span className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> : 'Confirmer le reversement'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
