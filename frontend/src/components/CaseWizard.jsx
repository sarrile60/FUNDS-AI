// Wizard — multi-step case creation flow
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Plus, Trash2, FileWarning } from "lucide-react";
import { api } from "../api";
import { useI18n } from "../i18n";

// Type catalogs (id-based; bilingual labels)
const SCAM_TYPES = [
  { id: "forex_broker",  it: "Truffa Forex / Trading Online", en: "Forex / Online Trading scam" },
  { id: "fake_broker",   it: "Broker non autorizzato",        en: "Unauthorized broker" },
  { id: "crypto",        it: "Crypto scam",                   en: "Crypto scam" },
  { id: "sepa",          it: "Bonifico SEPA",                 en: "SEPA wire transfer" },
  { id: "instant_sepa",  it: "Bonifico istantaneo",           en: "Instant SEPA wire" },
  { id: "postepay",      it: "PostePay / PostePay Evolution", en: "PostePay / PostePay Evolution" },
  { id: "bancoposta",    it: "BancoPosta",                    en: "BancoPosta" },
  { id: "card",          it: "Carta di credito/debito",       en: "Credit/debit card" },
  { id: "paypal",        it: "PayPal",                        en: "PayPal" },
  { id: "revolut",       it: "Revolut",                       en: "Revolut" },
  { id: "wise",          it: "Wise",                          en: "Wise" },
  { id: "satispay",      it: "Satispay",                      en: "Satispay" },
  { id: "skrill",        it: "Skrill / Neteller",             en: "Skrill / Neteller" },
  { id: "paysafecard",   it: "Paysafecard / Mooney / SisalPay", en: "Paysafecard / Mooney / SisalPay" },
  { id: "western_union", it: "Western Union / MoneyGram",     en: "Western Union / MoneyGram" },
  { id: "phishing",      it: "Phishing / Smishing / Vishing", en: "Phishing / Smishing / Vishing" },
  { id: "fake_recovery", it: "Falso recupero fondi",          en: "Fake recovery scam" },
  { id: "marketplace",   it: "Marketplace scam",              en: "Marketplace scam" },
  { id: "romance",       it: "Romance investment scam",       en: "Romance investment scam" },
  { id: "other",         it: "Altro",                         en: "Other" },
];

const PAY_METHODS = [
  { id: "sepa",         it: "Bonifico SEPA",                 en: "SEPA wire" },
  { id: "instant_sepa", it: "Bonifico SEPA Istantaneo",      en: "Instant SEPA wire" },
  { id: "postepay",     it: "PostePay / PostePay Evolution", en: "PostePay / PostePay Evolution" },
  { id: "bancoposta",   it: "BancoPosta",                    en: "BancoPosta" },
  { id: "card",         it: "Carta di credito/debito",       en: "Credit/debit card" },
  { id: "paypal",       it: "PayPal",                        en: "PayPal" },
  { id: "revolut",      it: "Revolut",                       en: "Revolut" },
  { id: "wise",         it: "Wise",                          en: "Wise" },
  { id: "satispay",     it: "Satispay",                      en: "Satispay" },
  { id: "skrill",       it: "Skrill / Neteller",             en: "Skrill / Neteller" },
  { id: "paysafecard",  it: "Paysafecard / Mooney",          en: "Paysafecard / Mooney" },
  { id: "western_union",it: "Western Union / MoneyGram",     en: "Western Union / MoneyGram" },
  { id: "crypto",       it: "Crypto",                        en: "Crypto" },
  { id: "other",        it: "Altro",                         en: "Other" },
];

const EVIDENCE_TYPES = [
  { id: "screenshot",       it: "Screenshot",                          en: "Screenshot" },
  { id: "email",            it: "Email",                               en: "Email" },
  { id: "chat",             it: "Chat (WhatsApp/Telegram)",            en: "Chat (WhatsApp/Telegram)" },
  { id: "sms",              it: "SMS",                                 en: "SMS" },
  { id: "ricevuta",         it: "Ricevuta bancaria / pagamento",       en: "Bank / payment receipt" },
  { id: "iban",             it: "IBAN beneficiario",                   en: "Beneficiary IBAN" },
  { id: "transaction_hash", it: "Transaction hash crypto",             en: "Crypto transaction hash" },
  { id: "wallet_address",   it: "Wallet address",                      en: "Wallet address" },
  { id: "broker_dashboard", it: "Screenshot dashboard broker",         en: "Broker dashboard screenshot" },
  { id: "withdrawal_denial",it: "Messaggio di prelievo bloccato",      en: "Blocked withdrawal message" },
  { id: "fake_authority",   it: "Falso documento autorità",            en: "Fake authority document" },
  { id: "url",              it: "URL sito sospetto",                   en: "Suspicious site URL" },
  { id: "phone",            it: "Numero di telefono scammer",          en: "Scammer phone number" },
  { id: "denuncia",         it: "Denuncia già depositata",             en: "Police report already filed" },
  { id: "reclamo_banca",    it: "Reclamo banca già inviato",           en: "Bank complaint already sent" },
];

const NETWORKS = ["Bitcoin", "Ethereum", "BNB Chain", "Polygon", "Tron", "Solana", "Arbitrum", "Base", "Other"];

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
  const { t, lang } = useI18n();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const STEPS = [
    { id: 1, label: t("wiz.s1") }, { id: 2, label: t("wiz.s2") },
    { id: 3, label: t("wiz.s3") }, { id: 4, label: t("wiz.s4") }, { id: 5, label: t("wiz.s5") },
  ];

  // form state
  const [scamType, setScamType] = useState("");
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
  const [payMethod, setPayMethod] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [tx, setTx] = useState({});
  const [evidence, setEvidence] = useState([]);

  const canNext = useMemo(() => {
    if (step === 1) return !!scamType;
    if (step === 2) return !!lossAmount;
    if (step === 3) return !!payMethod;
    return true;
  }, [step, scamType, lossAmount, payMethod]);

  const addTx = () => {
    if (!tx.amount && !tx.iban && !tx.tx_hash && !tx.reference_number) {
      toast.error(t("wiz.tx_warn")); return;
    }
    setTransactions([...transactions, { payment_type: payMethod, currency: "EUR", ...tx, amount: parseFloat(tx.amount || 0) }]);
    setTx({});
    toast.success(t("wiz.tx_added"));
  };

  const removeTx = (idx) => setTransactions(transactions.filter((_, i) => i !== idx));

  const submitCase = async () => {
    setBusy(true);
    try {
      const created = await api.createCase({
        scam_type: scamType, country: "IT", region,
        loss_amount: parseFloat(lossAmount || 0), currency: "EUR",
        first_payment_date: firstDate || null, last_contact_date: lastDate || null,
        payment_method: payMethod,
        scammer_still_active: scammerActive, requested_extra_fee: requestedExtra,
        impersonated_authority: impersonated, seed_phrase_shared: seedShared,
        otp_shared: otpShared, remote_access_installed: remoteAccess,
        withdrawal_blocked: withdrawalBlocked,
      });
      for (const t of transactions) await api.addTransaction(created.id, t);
      for (const ev of evidence) {
        const def = EVIDENCE_TYPES.find(e => e.id === ev);
        await api.addEvidence(created.id, { evidence_type: ev, title: def ? def[lang] || def.it : ev, collected: true });
      }
      toast.success(t("wiz.case_created"));
      onCaseReady && onCaseReady(created);
    } catch (e) {
      const d = e?.response?.data?.detail;
      const msg = typeof d === "string" ? d : Array.isArray(d) ? d.map(x => x?.msg || JSON.stringify(x)).join(", ") : t("wiz.case_error");
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="aif-card aif-glow p-5 md:p-8 relative overflow-hidden" data-testid="wizard">
      <div className="aif-grid-overlay absolute inset-0 opacity-40 pointer-events-none"/>
      <div className="relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9]">{t("wiz.tag")}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">{t("wiz.title")}</h2>
          </div>
          <div className="text-[12px] text-[var(--aif-text-dim)]">{t("wiz.step")} {step} / {STEPS.length}</div>
        </div>

        <div className="grid grid-cols-5 gap-1 my-4">
          {STEPS.map((s) => (
            <div key={s.id} className={`h-1 rounded-full ${s.id <= step ? "bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF]" : "bg-white/5"}`}/>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-[13px] text-[var(--aif-text-dim)] mb-4">{t("wiz.help1")}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SCAM_TYPES.map((s) => (
                  <button key={s.id} onClick={() => setScamType(s.id)} data-testid={`scam-${s.id}`}
                    className={`aif-card !rounded-xl p-3 text-left transition ${scamType === s.id ? "!border-[#5FE3C9] aif-glow" : ""}`}>
                    <div className="text-[13px] text-white">{s[lang] || s.it}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid md:grid-cols-2 gap-4">
              <Field label={t("wiz.region")}>
                <input className="aif-input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder={t("wiz.region_ph")} data-testid="w-region"/>
              </Field>
              <Field label={t("wiz.amount")}>
                <input type="number" className="aif-input" value={lossAmount} onChange={(e) => setLossAmount(e.target.value)} placeholder="0" data-testid="w-amount"/>
              </Field>
              <Field label={t("wiz.first_date")}>
                <input type="date" className="aif-input" value={firstDate} onChange={(e) => setFirstDate(e.target.value)} data-testid="w-first-date"/>
              </Field>
              <Field label={t("wiz.last_date")}>
                <input type="date" className="aif-input" value={lastDate} onChange={(e) => setLastDate(e.target.value)} data-testid="w-last-date"/>
              </Field>
              <Field label={t("wiz.impersonated")}>
                <select className="aif-input" value={impersonated} onChange={(e) => setImpersonated(e.target.value)}>
                  <option value="">{t("wiz.impersonated_none")}</option>
                  <option>CONSOB</option><option>Banca d'Italia</option><option>Polizia / Polizia Postale</option>
                  <option>ECB / BCE</option><option>ESMA</option><option>Interpol / Europol</option>
                  <option>Bank</option><option>Exchange</option><option>Lawyer</option><option>Other</option>
                </select>
              </Field>
              <div className="md:col-span-2 grid sm:grid-cols-2 gap-2">
                <Toggle checked={scammerActive} onChange={setScammerActive} label={t("wiz.q_active")}/>
                <Toggle checked={requestedExtra} onChange={setRequestedExtra} label={t("wiz.q_extra")}/>
                <Toggle checked={withdrawalBlocked} onChange={setWithdrawalBlocked} label={t("wiz.q_blocked")}/>
                <Toggle checked={remoteAccess} onChange={setRemoteAccess} label={t("wiz.q_remote")}/>
                <Toggle checked={otpShared} onChange={setOtpShared} label={t("wiz.q_otp")}/>
                <Toggle checked={seedShared} onChange={setSeedShared} label={t("wiz.q_seed")}/>
              </div>
              {(seedShared || otpShared) && (
                <div className="md:col-span-2 aif-card !border-l-4 !border-l-[#FF6B7A] p-4 flex items-start gap-3">
                  <ShieldAlert className="text-[#FF6B7A]" size={18}/>
                  <div className="text-[13px] text-white"><strong>{t("wiz.urgent_title")}</strong> {t("wiz.urgent_body")}</div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Field label={t("wiz.pay_method")}>
                <select className="aif-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} data-testid="w-pay-method">
                  <option value="">{t("wiz.pay_select")}</option>
                  {PAY_METHODS.map((p) => <option key={p.id} value={p.id}>{p[lang] || p.it}</option>)}
                </select>
              </Field>

              {payMethod && (
                <div className="mt-5">
                  <div className="text-[12px] uppercase tracking-[0.18em] text-[#5FE3C9] mb-2">{t("wiz.add_tx_section")}</div>
                  <PaymentFields method={payMethod} tx={tx} setTx={setTx} t={t}/>
                  <button onClick={addTx} className="aif-btn-ghost mt-3 inline-flex items-center gap-2 !py-2 !text-sm" data-testid="w-add-tx">
                    <Plus size={14}/> {t("wiz.add_tx_btn")}
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
                              {t.date && <>{t.date}</>}
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
              <p className="text-[13px] text-[var(--aif-text-dim)] mb-4">{t("wiz.help4")}</p>
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
                      <span className="text-[13px] text-white">{e[lang] || e.it}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 aif-card p-4 flex items-start gap-3 !border-l-4 !border-l-[#FFB454]">
                <FileWarning size={18} className="text-[#FFB454] shrink-0"/>
                <div className="text-[12px] text-[var(--aif-text-dim)]">{t("wiz.help_evidence_safety")}</div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Summary t={t} lang={lang} {...{ scamType, payMethod, lossAmount, region, firstDate, lastDate, transactions, evidence }}/>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-7 flex items-center justify-between">
          <button disabled={step === 1} onClick={() => setStep(step - 1)} className="aif-btn-ghost inline-flex items-center gap-2 disabled:opacity-40" data-testid="w-prev">
            <ArrowLeft size={16}/> {t("wiz.prev")}
          </button>
          {step < STEPS.length ? (
            <button disabled={!canNext} onClick={() => setStep(step + 1)} className="aif-btn-primary inline-flex items-center gap-2 disabled:opacity-50" data-testid="w-next">
              {t("wiz.next")} <ArrowRight size={16}/>
            </button>
          ) : (
            <button disabled={busy} onClick={submitCase} className="aif-btn-primary inline-flex items-center gap-2 disabled:opacity-50" data-testid="w-start-tracing">
              {busy ? t("wiz.saving") : t("wiz.start_tracing")} <ArrowRight size={16}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Summary({ t, lang, scamType, payMethod, lossAmount, region, firstDate, lastDate, transactions, evidence }) {
  const items = [
    [t("wiz.sum.scam"),   (SCAM_TYPES.find(s => s.id === scamType) || {})[lang] || (SCAM_TYPES.find(s => s.id === scamType) || {}).it || t("wiz.dash")],
    [t("wiz.sum.method"), (PAY_METHODS.find(m => m.id === payMethod) || {})[lang] || (PAY_METHODS.find(m => m.id === payMethod) || {}).it || t("wiz.dash")],
    [t("wiz.sum.amount"), lossAmount ? `€ ${parseFloat(lossAmount).toFixed(2)}` : t("wiz.dash")],
    [t("wiz.sum.region"), region || t("wiz.dash")],
    [t("wiz.sum.first"),  firstDate || t("wiz.dash")],
    [t("wiz.sum.last"),   lastDate || t("wiz.dash")],
    [t("wiz.sum.txs"),    String(transactions.length)],
    [t("wiz.sum.evs"),    String(evidence.length)],
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

function PaymentFields({ method, tx, setTx, t }) {
  const set = (k, v) => setTx({ ...tx, [k]: v });
  const common = (
    <>
      <Field label={t("wiz.f.amount")}><input type="number" className="aif-input" value={tx.amount || ""} onChange={(e) => set("amount", e.target.value)} placeholder="0"/></Field>
      <Field label={t("wiz.f.datetime")}><input type="datetime-local" className="aif-input" value={tx.date || ""} onChange={(e) => set("date", e.target.value)}/></Field>
      <Field label={t("wiz.f.notes")}><input className="aif-input" value={tx.notes || ""} onChange={(e) => set("notes", e.target.value)}/></Field>
    </>
  );
  if (method === "sepa" || method === "instant_sepa") return (
    <div className="grid md:grid-cols-2 gap-3">
      <Field label={t("wiz.f.bank")}><input className="aif-input" value={tx.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)} placeholder={t("wiz.f.bank_ph")}/></Field>
      <Field label={t("wiz.f.recipient")}><input className="aif-input" value={tx.recipient_name || ""} onChange={(e) => set("recipient_name", e.target.value)}/></Field>
      <Field label={t("wiz.f.iban")}><input className="aif-input" value={tx.iban || ""} onChange={(e) => set("iban", e.target.value)} placeholder="ITxx…"/></Field>
      <Field label={t("wiz.f.iban_country")}><input className="aif-input" value={tx.iban_country || ""} onChange={(e) => set("iban_country", e.target.value)} placeholder={t("wiz.f.iban_country_ph")}/></Field>
      <Field label={t("wiz.f.cro")}><input className="aif-input" value={tx.reference_number || ""} onChange={(e) => set("reference_number", e.target.value)}/></Field>
      {common}
    </div>
  );
  if (method === "postepay" || method === "bancoposta") return (
    <div className="grid md:grid-cols-2 gap-3">
      <Field label={t("wiz.f.tool")}><input className="aif-input" value={tx.platform_name || ""} onChange={(e) => set("platform_name", e.target.value)} placeholder={t("wiz.f.tool_ph")}/></Field>
      <Field label={t("wiz.f.recipient2")}><input className="aif-input" value={tx.recipient_name || ""} onChange={(e) => set("recipient_name", e.target.value)}/></Field>
      <Field label={t("wiz.f.iban2")}><input className="aif-input" value={tx.iban || ""} onChange={(e) => set("iban", e.target.value)}/></Field>
      <Field label={t("wiz.f.receipt_n")}><input className="aif-input" value={tx.reference_number || ""} onChange={(e) => set("reference_number", e.target.value)}/></Field>
      {common}
    </div>
  );
  if (method === "card") return (
    <div className="grid md:grid-cols-2 gap-3">
      <Field label={t("wiz.f.card_bank")}><input className="aif-input" value={tx.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)}/></Field>
      <Field label={t("wiz.f.merchant")}><input className="aif-input" value={tx.merchant_descriptor || ""} onChange={(e) => set("merchant_descriptor", e.target.value)} placeholder={t("wiz.f.merchant_ph")}/></Field>
      <Field label={t("wiz.f.tx_ref")}><input className="aif-input" value={tx.reference_number || ""} onChange={(e) => set("reference_number", e.target.value)}/></Field>
      {common}
    </div>
  );
  if (method === "crypto") return (
    <div className="grid md:grid-cols-2 gap-3">
      <Field label={t("wiz.f.exchange")}><input className="aif-input" value={tx.platform_name || ""} onChange={(e) => set("platform_name", e.target.value)} placeholder={t("wiz.f.exchange_ph")}/></Field>
      <Field label={t("wiz.f.network")}>
        <select className="aif-input" value={tx.network || ""} onChange={(e) => set("network", e.target.value)}>
          <option value="">{t("wiz.pay_select")}</option>
          {NETWORKS.map(n => <option key={n}>{n}</option>)}
        </select>
      </Field>
      <Field label={t("wiz.f.wallet")}><input className="aif-input" value={tx.wallet_address || ""} onChange={(e) => set("wallet_address", e.target.value)} placeholder="0x… / bc1…"/></Field>
      <Field label={t("wiz.f.tx_hash")}><input className="aif-input" value={tx.tx_hash || ""} onChange={(e) => set("tx_hash", e.target.value)} placeholder="0x… / hash"/></Field>
      {common}
    </div>
  );
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Field label={t("wiz.f.platform")}><input className="aif-input" value={tx.platform_name || ""} onChange={(e) => set("platform_name", e.target.value)} placeholder={t("wiz.f.platform_ph")}/></Field>
      <Field label={t("wiz.f.account")}><input className="aif-input" value={tx.recipient_name || ""} onChange={(e) => set("recipient_name", e.target.value)}/></Field>
      <Field label={t("wiz.f.tx_id")}><input className="aif-input" value={tx.reference_number || ""} onChange={(e) => set("reference_number", e.target.value)}/></Field>
      {common}
    </div>
  );
}
