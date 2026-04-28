// Wizard — multi-step case creation flow
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Plus, Trash2, FileWarning } from "lucide-react";
import { api } from "../api";

const SCAM_TYPES = [
  { id: "forex_broker",  label: "Truffa Forex / Trading Online" },
  { id: "fake_broker",   label: "Broker non autorizzato" },
  { id: "crypto",        label: "Crypto scam" },
  { id: "sepa",          label: "Bonifico SEPA" },
  { id: "instant_sepa",  label: "Bonifico istantaneo" },
  { id: "postepay",      label: "PostePay / PostePay Evolution" },
  { id: "bancoposta",    label: "BancoPosta" },
  { id: "card",          label: "Carta di credito/debito" },
  { id: "paypal",        label: "PayPal" },
  { id: "revolut",       label: "Revolut" },
  { id: "wise",          label: "Wise" },
  { id: "satispay",      label: "Satispay" },
  { id: "skrill",        label: "Skrill / Neteller" },
  { id: "paysafecard",   label: "Paysafecard / Mooney / SisalPay" },
  { id: "western_union", label: "Western Union / MoneyGram" },
  { id: "phishing",      label: "Phishing / Smishing / Vishing" },
  { id: "fake_recovery", label: "Falso recupero fondi" },
  { id: "marketplace",   label: "Marketplace scam" },
  { id: "romance",       label: "Romance investment scam" },
  { id: "other",         label: "Altro" },
];

const PAY_METHODS = [
  { id: "sepa",         label: "Bonifico SEPA" },
  { id: "instant_sepa", label: "Bonifico SEPA Istantaneo" },
  { id: "postepay",     label: "PostePay / PostePay Evolution" },
  { id: "bancoposta",   label: "BancoPosta" },
  { id: "card",         label: "Carta di credito/debito" },
  { id: "paypal",       label: "PayPal" },
  { id: "revolut",      label: "Revolut" },
  { id: "wise",         label: "Wise" },
  { id: "satispay",     label: "Satispay" },
  { id: "skrill",       label: "Skrill / Neteller" },
  { id: "paysafecard",  label: "Paysafecard / Mooney" },
  { id: "western_union",label: "Western Union / MoneyGram" },
  { id: "crypto",       label: "Crypto" },
  { id: "other",        label: "Altro" },
];

const EVIDENCE_TYPES = [
  { id: "screenshot",       label: "Screenshot" },
  { id: "email",            label: "Email" },
  { id: "chat",             label: "Chat (WhatsApp/Telegram)" },
  { id: "sms",              label: "SMS" },
  { id: "ricevuta",         label: "Ricevuta bancaria / pagamento" },
  { id: "iban",             label: "IBAN beneficiario" },
  { id: "transaction_hash", label: "Transaction hash crypto" },
  { id: "wallet_address",   label: "Wallet address" },
  { id: "broker_dashboard", label: "Screenshot dashboard broker" },
  { id: "withdrawal_denial",label: "Messaggio di prelievo bloccato" },
  { id: "fake_authority",   label: "Falso documento autorità" },
  { id: "url",              label: "URL sito sospetto" },
  { id: "phone",            label: "Numero di telefono scammer" },
  { id: "denuncia",         label: "Denuncia già depositata" },
  { id: "reclamo_banca",    label: "Reclamo banca già inviato" },
];

const NETWORKS = ["Bitcoin", "Ethereum", "BNB Chain", "Polygon", "Tron", "Solana", "Arbitrum", "Base", "Other"];

const STEPS = [
  { id: 1, label: "Tipologia di truffa" },
  { id: 2, label: "Vittima e perdita" },
  { id: 3, label: "Dettagli pagamento" },
  { id: 4, label: "Prove" },
  { id: 5, label: "Riepilogo" },
];

function Field({ label, children }) {
  return <div><label className="aif-label">{label}</label>{children}</div>;
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className={`aif-card !rounded-xl p-3 flex items-center gap-3 cursor-pointer transition ${checked ? "!border-[#5FE3C9]" : ""}`}>
      <input type="checkbox" className="accent-[#5FE3C9]" checked={!!checked} onChange={(e) => onChange(e.target.checked)}/>
      <span className="text-[13px] text-white">{label}</span>
    </label>
  );
}

export default function CaseWizard({ onCaseReady }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [scamType, setScamType] = useState("");

  // Step 2
  const [region, setRegion] = useState("");
  const [lossAmount, setLossAmount] = useState("");
  const [firstDate, setFirstDate] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [scammerActive, setScammerActive] = useState(false);
  const [requestedExtra, setRequestedExtra] = useState(false);
  const [impersonated, setImpersonated] = useState("");
  const [seedShared, setSeedShared] = useState(false);
  const [otpShared, setOtpShared] = useState(false);
  const [remoteAccess, setRemoteAccess] = useState(false);
  const [withdrawalBlocked, setWithdrawalBlocked] = useState(false);

  // Step 3
  const [payMethod, setPayMethod] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [tx, setTx] = useState({}); // current draft

  // Step 4
  const [evidence, setEvidence] = useState([]); // selected types

  const canNext = useMemo(() => {
    if (step === 1) return !!scamType;
    if (step === 2) return !!lossAmount;
    if (step === 3) return !!payMethod;
    return true;
  }, [step, scamType, lossAmount, payMethod]);

  const addTx = () => {
    if (!tx.amount && !tx.iban && !tx.tx_hash && !tx.reference_number) {
      toast.error("Inserisci almeno un dettaglio della transazione");
      return;
    }
    const draft = { payment_type: payMethod, currency: "EUR", ...tx, amount: parseFloat(tx.amount || 0) };
    setTransactions([...transactions, draft]);
    setTx({});
    toast.success("Transazione aggiunta");
  };

  const removeTx = (idx) => setTransactions(transactions.filter((_, i) => i !== idx));

  const submitCase = async () => {
    setBusy(true);
    try {
      const created = await api.createCase({
        scam_type: scamType,
        country: "IT",
        region,
        loss_amount: parseFloat(lossAmount || 0),
        currency: "EUR",
        first_payment_date: firstDate || null,
        last_contact_date: lastDate || null,
        payment_method: payMethod,
        scammer_still_active: scammerActive,
        requested_extra_fee: requestedExtra,
        impersonated_authority: impersonated,
        seed_phrase_shared: seedShared,
        otp_shared: otpShared,
        remote_access_installed: remoteAccess,
        withdrawal_blocked: withdrawalBlocked,
      });
      // Add transactions
      for (const t of transactions) {
        await api.addTransaction(created.id, t);
      }
      // Add evidence
      for (const ev of evidence) {
        await api.addEvidence(created.id, { evidence_type: ev, title: EVIDENCE_TYPES.find(e => e.id === ev)?.label || ev, collected: true });
      }
      toast.success("Caso creato. Avvio tracciamento…");
      onCaseReady && onCaseReady(created);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Errore nel salvataggio del caso");
    } finally { setBusy(false); }
  };

  // ==== UI ====
  return (
    <div className="aif-card aif-glow p-5 md:p-8 relative overflow-hidden" data-testid="wizard">
      <div className="aif-grid-overlay absolute inset-0 opacity-40 pointer-events-none"/>
      <div className="relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9]">Wizard</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Analisi Caso</h2>
          </div>
          <div className="text-[12px] text-[var(--aif-text-dim)]">Step {step} / {STEPS.length}</div>
        </div>

        <div className="grid grid-cols-5 gap-1 my-4">
          {STEPS.map((s) => (
            <div key={s.id} className={`h-1 rounded-full ${s.id <= step ? "bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF]" : "bg-white/5"}`}/>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-[13px] text-[var(--aif-text-dim)] mb-4">Seleziona la tipologia che meglio rappresenta la presunta truffa subita.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SCAM_TYPES.map((s) => (
                  <button key={s.id} onClick={() => setScamType(s.id)} data-testid={`scam-${s.id}`}
                    className={`aif-card !rounded-xl p-3 text-left transition ${scamType === s.id ? "!border-[#5FE3C9] aif-glow" : ""}`}>
                    <div className="text-[13px] text-white">{s.label}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid md:grid-cols-2 gap-4">
              <Field label="Regione/Città (opzionale)">
                <input className="aif-input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="es. Milano" data-testid="w-region"/>
              </Field>
              <Field label="Importo perso (EUR)">
                <input type="number" className="aif-input" value={lossAmount} onChange={(e) => setLossAmount(e.target.value)} placeholder="0" data-testid="w-amount"/>
              </Field>
              <Field label="Data primo pagamento">
                <input type="date" className="aif-input" value={firstDate} onChange={(e) => setFirstDate(e.target.value)} data-testid="w-first-date"/>
              </Field>
              <Field label="Data ultimo contatto">
                <input type="date" className="aif-input" value={lastDate} onChange={(e) => setLastDate(e.target.value)} data-testid="w-last-date"/>
              </Field>
              <Field label="Falsa identità (autorità impersonata)">
                <select className="aif-input" value={impersonated} onChange={(e) => setImpersonated(e.target.value)}>
                  <option value="">Nessuna</option>
                  <option>CONSOB</option><option>Banca d'Italia</option><option>Polizia / Polizia Postale</option>
                  <option>ECB / BCE</option><option>ESMA</option><option>Interpol / Europol</option>
                  <option>Banca</option><option>Exchange</option><option>Avvocato</option><option>Altro</option>
                </select>
              </Field>
              <div className="md:col-span-2 grid sm:grid-cols-2 gap-2">
                <Toggle checked={scammerActive} onChange={setScammerActive} label="Lo scammer è ancora in contatto?"/>
                <Toggle checked={requestedExtra} onChange={setRequestedExtra} label="Hanno chiesto altri pagamenti / tassa di sblocco?"/>
                <Toggle checked={withdrawalBlocked} onChange={setWithdrawalBlocked} label="Prelievo bloccato dalla piattaforma?"/>
                <Toggle checked={remoteAccess} onChange={setRemoteAccess} label="Hai installato AnyDesk/TeamViewer su loro richiesta?"/>
                <Toggle checked={otpShared} onChange={setOtpShared} label="Hai condiviso codici OTP / credenziali bancarie?"/>
                <Toggle checked={seedShared} onChange={setSeedShared} label="Hai condiviso seed phrase / private key?"/>
              </div>
              {(seedShared || otpShared) && (
                <div className="md:col-span-2 aif-card !border-l-4 !border-l-[#FF6B7A] p-4 flex items-start gap-3">
                  <ShieldAlert className="text-[#FF6B7A]" size={18}/>
                  <div className="text-[13px] text-white">
                    <strong>URGENTE.</strong> Se hai condiviso seed phrase o codici OTP, contatta immediatamente la tua banca (per OTP) o sposta i fondi residui in un nuovo wallet (per seed phrase). Non condividere mai queste informazioni con nessuno.
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Field label="Metodo di pagamento principale">
                <select className="aif-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} data-testid="w-pay-method">
                  <option value="">Seleziona…</option>
                  {PAY_METHODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </Field>

              {payMethod && (
                <div className="mt-5">
                  <div className="text-[12px] uppercase tracking-[0.18em] text-[#5FE3C9] mb-2">Aggiungi transazioni</div>
                  <PaymentFields method={payMethod} tx={tx} setTx={setTx}/>
                  <button onClick={addTx} className="aif-btn-ghost mt-3 inline-flex items-center gap-2 !py-2 !text-sm" data-testid="w-add-tx">
                    <Plus size={14}/> Aggiungi transazione
                  </button>

                  {transactions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {transactions.map((t, i) => (
                        <div key={i} className="aif-card !rounded-xl p-3 flex items-start justify-between gap-3">
                          <div className="text-[13px] text-white">
                            <div><strong>€{Number(t.amount || 0).toFixed(2)}</strong> {t.currency || "EUR"} · {t.payment_type}</div>
                            <div className="text-[12px] text-[var(--aif-text-dim)] mt-0.5">
                              {t.iban && <>IBAN {t.iban} ({t.iban_country || "?"}) · </>}
                              {t.recipient_name && <>{t.recipient_name} · </>}
                              {t.tx_hash && <>hash: {t.tx_hash.slice(0, 16)}… · </>}
                              {t.wallet_address && <>wallet: {t.wallet_address.slice(0, 16)}… · </>}
                              {t.reference_number && <>ref: {t.reference_number} · </>}
                              {t.date && <>data: {t.date}</>}
                            </div>
                          </div>
                          <button onClick={() => removeTx(i)} className="text-[var(--aif-text-dim)] hover:text-[#FF6B7A]"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-[13px] text-[var(--aif-text-dim)] mb-4">Spunta le prove che hai disponibili. Le prove mancanti verranno indicate nel dossier.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {EVIDENCE_TYPES.map((e) => {
                  const checked = evidence.includes(e.id);
                  return (
                    <button key={e.id} onClick={() => setEvidence(checked ? evidence.filter(x => x !== e.id) : [...evidence, e.id])}
                      data-testid={`ev-${e.id}`}
                      className={`aif-card !rounded-xl p-3 text-left flex items-center gap-3 transition ${checked ? "!border-[#5FE3C9]" : ""}`}>
                      <div className={`w-5 h-5 rounded border ${checked ? "bg-[#5FE3C9] border-[#5FE3C9]" : "border-[var(--aif-line)]"} flex items-center justify-center`}>
                        {checked && <CheckCircle2 size={14} className="text-[#06122A]"/>}
                      </div>
                      <span className="text-[13px] text-white">{e.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 aif-card p-4 flex items-start gap-3 !border-l-4 !border-l-[#FFB454]">
                <FileWarning size={18} className="text-[#FFB454] shrink-0"/>
                <div className="text-[12px] text-[var(--aif-text-dim)]">
                  Non caricare seed phrase, private key, password bancarie, codici OTP o numeri completi di carta.
                  In questa fase MVP raccogliamo solo l'inventario delle prove (l'upload file arriverà a breve).
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Summary {...{ scamType, payMethod, lossAmount, region, firstDate, lastDate, transactions, evidence }}/>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-7 flex items-center justify-between">
          <button disabled={step === 1} onClick={() => setStep(step - 1)} className="aif-btn-ghost inline-flex items-center gap-2 disabled:opacity-40" data-testid="w-prev">
            <ArrowLeft size={16}/> Indietro
          </button>
          {step < STEPS.length ? (
            <button disabled={!canNext} onClick={() => setStep(step + 1)} className="aif-btn-primary inline-flex items-center gap-2 disabled:opacity-50" data-testid="w-next">
              Avanti <ArrowRight size={16}/>
            </button>
          ) : (
            <button disabled={busy} onClick={submitCase} className="aif-btn-primary inline-flex items-center gap-2 disabled:opacity-50" data-testid="w-start-tracing">
              {busy ? "Salvataggio…" : "Avvia Tracciamento"} <ArrowRight size={16}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Summary(p) {
  const items = [
    ["Tipologia", SCAM_TYPES.find(s => s.id === p.scamType)?.label || "—"],
    ["Metodo di pagamento", PAY_METHODS.find(m => m.id === p.payMethod)?.label || "—"],
    ["Importo", p.lossAmount ? `€ ${parseFloat(p.lossAmount).toFixed(2)}` : "—"],
    ["Regione", p.region || "—"],
    ["Primo pagamento", p.firstDate || "—"],
    ["Ultimo contatto", p.lastDate || "—"],
    ["Transazioni inserite", String(p.transactions.length)],
    ["Prove selezionate", String(p.evidence.length)],
  ];
  return (
    <div className="grid md:grid-cols-2 gap-2">
      {items.map(([k, v]) => (
        <div key={k} className="aif-card !rounded-xl p-3 flex items-center justify-between">
          <span className="text-[12px] text-[var(--aif-text-dim)]">{k}</span>
          <span className="text-[13px] text-white font-medium text-right">{v}</span>
        </div>
      ))}
    </div>
  );
}

function PaymentFields({ method, tx, setTx }) {
  const set = (k, v) => setTx({ ...tx, [k]: v });
  // Common
  const common = (
    <>
      <Field label="Importo (EUR)"><input type="number" className="aif-input" value={tx.amount || ""} onChange={(e) => set("amount", e.target.value)} placeholder="0"/></Field>
      <Field label="Data / ora"><input type="datetime-local" className="aif-input" value={tx.date || ""} onChange={(e) => set("date", e.target.value)}/></Field>
      <Field label="Note"><input className="aif-input" value={tx.notes || ""} onChange={(e) => set("notes", e.target.value)}/></Field>
    </>
  );

  if (method === "sepa" || method === "instant_sepa") {
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Banca emittente"><input className="aif-input" value={tx.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)} placeholder="es. Intesa Sanpaolo"/></Field>
        <Field label="Beneficiario (nome/azienda)"><input className="aif-input" value={tx.recipient_name || ""} onChange={(e) => set("recipient_name", e.target.value)}/></Field>
        <Field label="IBAN beneficiario"><input className="aif-input" value={tx.iban || ""} onChange={(e) => set("iban", e.target.value)} placeholder="ITxx…"/></Field>
        <Field label="Paese IBAN"><input className="aif-input" value={tx.iban_country || ""} onChange={(e) => set("iban_country", e.target.value)} placeholder="IT, DE, LT, …"/></Field>
        <Field label="CRO / TRN / Riferimento"><input className="aif-input" value={tx.reference_number || ""} onChange={(e) => set("reference_number", e.target.value)}/></Field>
        {common}
      </div>
    );
  }
  if (method === "postepay" || method === "bancoposta") {
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Tipo strumento"><input className="aif-input" value={tx.platform_name || ""} onChange={(e) => set("platform_name", e.target.value)} placeholder="PostePay Evolution / BancoPosta"/></Field>
        <Field label="Destinatario"><input className="aif-input" value={tx.recipient_name || ""} onChange={(e) => set("recipient_name", e.target.value)}/></Field>
        <Field label="IBAN/Conto destinatario"><input className="aif-input" value={tx.iban || ""} onChange={(e) => set("iban", e.target.value)}/></Field>
        <Field label="Numero ricevuta"><input className="aif-input" value={tx.reference_number || ""} onChange={(e) => set("reference_number", e.target.value)}/></Field>
        {common}
      </div>
    );
  }
  if (method === "card") {
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Banca emittente carta"><input className="aif-input" value={tx.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)}/></Field>
        <Field label="Merchant descriptor"><input className="aif-input" value={tx.merchant_descriptor || ""} onChange={(e) => set("merchant_descriptor", e.target.value)} placeholder="Come compare in estratto conto"/></Field>
        <Field label="Riferimento transazione"><input className="aif-input" value={tx.reference_number || ""} onChange={(e) => set("reference_number", e.target.value)}/></Field>
        {common}
      </div>
    );
  }
  if (method === "crypto") {
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Exchange usato"><input className="aif-input" value={tx.platform_name || ""} onChange={(e) => set("platform_name", e.target.value)} placeholder="Binance, Coinbase, …"/></Field>
        <Field label="Network">
          <select className="aif-input" value={tx.network || ""} onChange={(e) => set("network", e.target.value)}>
            <option value="">Seleziona…</option>
            {NETWORKS.map(n => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Wallet address destinatario"><input className="aif-input" value={tx.wallet_address || ""} onChange={(e) => set("wallet_address", e.target.value)} placeholder="0x… / bc1…"/></Field>
        <Field label="Transaction hash"><input className="aif-input" value={tx.tx_hash || ""} onChange={(e) => set("tx_hash", e.target.value)} placeholder="0x… / hash"/></Field>
        {common}
      </div>
    );
  }
  // PayPal/Revolut/Wise/Satispay/etc
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Field label="Piattaforma"><input className="aif-input" value={tx.platform_name || ""} onChange={(e) => set("platform_name", e.target.value)} placeholder="PayPal / Revolut / Wise / …"/></Field>
      <Field label="Account destinatario (email/handle/nome)"><input className="aif-input" value={tx.recipient_name || ""} onChange={(e) => set("recipient_name", e.target.value)}/></Field>
      <Field label="ID Transazione / Riferimento"><input className="aif-input" value={tx.reference_number || ""} onChange={(e) => set("reference_number", e.target.value)}/></Field>
      {common}
    </div>
  );
}
