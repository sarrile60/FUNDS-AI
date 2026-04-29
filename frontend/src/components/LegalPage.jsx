// LegalPage — generic page used for /terms, /privacy, /cookies
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";
import { useI18n } from "../i18n";

const CONTENT = {
  terms: {
    it: {
      title: "Termini di Servizio",
      updated: "Ultimo aggiornamento: Gennaio 2026",
      body: [
        ["1. Accettazione dei Termini",
         `Utilizzando Traccia Fondi l'utente accetta integralmente i presenti Termini di Servizio. Se non si accettano questi termini, è necessario interrompere immediatamente l'uso della piattaforma.`],
        ["2. Descrizione del servizio",
         `Traccia Fondi è una piattaforma di tracciamento fondi e supporto al recupero per vittime italiane di truffe online. Il servizio è destinato esclusivamente a soggetti maggiorenni residenti in Italia o nello Spazio Economico Europeo.`],
        ["3. Account utente",
         `Gli account vengono creati e gestiti dall'amministratore della piattaforma. L'utente è responsabile della riservatezza delle proprie credenziali e di tutte le attività svolte attraverso il proprio account. Traccia Fondi non chiederà mai password, codici OTP, seed phrase o chiavi private.`],
        ["4. Uso accettabile",
         `L'utente si impegna a fornire informazioni veritiere e accurate. È vietato utilizzare la piattaforma per scopi illeciti, fraudolenti, o per fornire informazioni false. Traccia Fondi si riserva il diritto di sospendere o terminare account che violino questi termini.`],
        ["5. Limitazione di responsabilità",
         `Nei limiti di legge, Traccia Fondi non sarà responsabile per danni indiretti, incidentali o consequenziali derivanti dall'uso della piattaforma. La responsabilità complessiva di Traccia Fondi sarà limitata all'importo eventualmente corrisposto dall'utente nei 12 mesi precedenti.`],
        ["6. Proprietà intellettuale",
         `Tutti i contenuti, marchi, loghi, design e codice della piattaforma sono di proprietà esclusiva di Traccia Fondi. È vietata la riproduzione, distribuzione o uso commerciale senza autorizzazione scritta.`],
        ["7. Modifiche ai Termini",
         `Traccia Fondi si riserva il diritto di aggiornare questi Termini in qualsiasi momento. Le modifiche saranno effettive dalla pubblicazione sulla piattaforma. L'uso continuato del servizio costituisce accettazione delle modifiche.`],
        ["8. Legge applicabile e foro competente",
         `I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia sarà competente in via esclusiva il Foro di Milano, salvo applicazione di norme inderogabili a tutela del consumatore.`],
        ["9. Contatti",
         `Per qualsiasi domanda relativa ai presenti Termini, contattare: legal@traccia-fondi.com`],
      ],
    },
    en: {
      title: "Terms of Service",
      updated: "Last updated: January 2026",
      body: [
        ["1. Acceptance of Terms",
         `By using Traccia Fondi, the user fully accepts these Terms of Service. If you do not accept these terms, please stop using the platform immediately.`],
        ["2. Service description",
         `Traccia Fondi is a fund-tracing and recovery-support platform for Italian victims of online scams. The service is intended exclusively for adults residing in Italy or the European Economic Area.`],
        ["3. User accounts",
         `Accounts are created and managed by the platform administrator. The user is responsible for the confidentiality of their credentials and all activities carried out through their account. Traccia Fondi will never ask for passwords, OTP codes, seed phrases or private keys.`],
        ["4. Acceptable use",
         `The user agrees to provide truthful and accurate information. It is forbidden to use the platform for illegal, fraudulent, or false-information purposes. Traccia Fondi reserves the right to suspend or terminate accounts that violate these terms.`],
        ["5. Limitation of liability",
         `Within the limits of the law, Traccia Fondi shall not be liable for indirect, incidental, or consequential damages arising from the use of the platform. The total liability of Traccia Fondi shall be limited to the amount paid by the user in the previous 12 months, if any.`],
        ["6. Intellectual property",
         `All content, trademarks, logos, design, and code on the platform are the exclusive property of Traccia Fondi. Reproduction, distribution, or commercial use without written authorization is prohibited.`],
        ["7. Changes to Terms",
         `Traccia Fondi reserves the right to update these Terms at any time. Changes will be effective upon publication on the platform. Continued use of the service constitutes acceptance of changes.`],
        ["8. Applicable law and jurisdiction",
         `These Terms are governed by Italian law. For any dispute, the Court of Milan shall have exclusive jurisdiction, subject to the application of mandatory consumer-protection rules.`],
        ["9. Contact",
         `For any questions regarding these Terms, contact: legal@traccia-fondi.com`],
      ],
    },
  },
  privacy: {
    it: {
      title: "Informativa sulla Privacy",
      updated: "Ultimo aggiornamento: Gennaio 2026",
      body: [
        ["1. Titolare del trattamento",
         `Il titolare del trattamento dei dati personali è Traccia Fondi. Per qualsiasi richiesta in materia di privacy, contattare: privacy@traccia-fondi.com`],
        ["2. Dati raccolti",
         `Raccogliamo solo i dati strettamente necessari al servizio: nome, cognome, indirizzo email, password (gestita in modo sicuro), e dettagli del caso forniti volontariamente dall'utente. Non raccogliamo seed phrase, chiavi private, password bancarie o codici OTP.`],
        ["3. Finalità del trattamento",
         `I dati vengono trattati per: (a) fornire il servizio di tracciamento fondi; (b) generare report; (c) comunicare con l'utente; (d) adempimenti legali e contabili.`],
        ["4. Base giuridica",
         `Il trattamento è basato sull'esecuzione di un contratto (art. 6.1.b GDPR), sul consenso esplicito dell'utente (art. 6.1.a GDPR) e sull'interesse legittimo del titolare (art. 6.1.f GDPR).`],
        ["5. Conservazione dei dati",
         `I dati vengono conservati per il tempo strettamente necessario alle finalità del trattamento e per gli obblighi legali, generalmente non oltre 10 anni dalla chiusura del caso.`],
        ["6. Diritti dell'interessato",
         `Ai sensi del Regolamento (UE) 2016/679 (GDPR), l'utente ha diritto di: accedere ai propri dati, rettificarli, cancellarli, limitarne il trattamento, opporsi al trattamento e richiedere la portabilità. Per esercitare questi diritti, scrivere a: privacy@traccia-fondi.com`],
        ["7. Sicurezza",
         `Adottiamo misure tecniche e organizzative adeguate: crittografia TLS 1.3 in transito, AES-256 a riposo, controllo accessi basato su ruoli, audit log, backup criptati.`],
        ["8. Trasferimenti extra-UE",
         `Eventuali trasferimenti di dati al di fuori dello Spazio Economico Europeo avvengono solo verso paesi con decisione di adeguatezza della Commissione Europea o tramite Clausole Contrattuali Standard.`],
        ["9. Reclami",
         `L'utente ha diritto di proporre reclamo al Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).`],
      ],
    },
    en: {
      title: "Privacy Policy",
      updated: "Last updated: January 2026",
      body: [
        ["1. Data controller",
         `The data controller is Traccia Fondi. For any privacy-related request, contact: privacy@traccia-fondi.com`],
        ["2. Data collected",
         `We collect only data strictly necessary for the service: first name, last name, email, password (securely managed), and case details provided voluntarily by the user. We do not collect seed phrases, private keys, banking passwords, or OTP codes.`],
        ["3. Purpose of processing",
         `Data is processed to: (a) provide the fund-tracing service; (b) generate reports; (c) communicate with the user; (d) comply with legal and accounting obligations.`],
        ["4. Legal basis",
         `Processing is based on contract performance (Art. 6.1.b GDPR), explicit user consent (Art. 6.1.a GDPR), and the controller's legitimate interest (Art. 6.1.f GDPR).`],
        ["5. Data retention",
         `Data is kept for the time strictly necessary for the purposes of processing and legal obligations, generally no longer than 10 years from case closure.`],
        ["6. Your rights",
         `Under Regulation (EU) 2016/679 (GDPR), users have the right to: access their data, rectify, delete, restrict processing, object to processing, and request portability. To exercise these rights, write to: privacy@traccia-fondi.com`],
        ["7. Security",
         `We adopt adequate technical and organizational measures: TLS 1.3 in transit, AES-256 at rest, role-based access control, audit logs, encrypted backups.`],
        ["8. Non-EU transfers",
         `Any data transfers outside the European Economic Area occur only to countries with an adequacy decision by the European Commission or through Standard Contractual Clauses.`],
        ["9. Complaints",
         `Users have the right to lodge a complaint with the Italian Data Protection Authority (www.garanteprivacy.it).`],
      ],
    },
  },
  cookies: {
    it: {
      title: "Cookie Policy",
      updated: "Ultimo aggiornamento: Gennaio 2026",
      body: [
        ["1. Cosa sono i cookie",
         `I cookie sono piccoli file di testo che i siti web salvano sul dispositivo dell'utente per memorizzare informazioni sulla sessione, preferenze e attività.`],
        ["2. Cookie tecnici",
         `Utilizziamo cookie strettamente necessari per il funzionamento della piattaforma: gestione della sessione utente (token JWT), preferenza di lingua (IT/EN), consenso cookie. Questi cookie non richiedono consenso preventivo ai sensi della normativa italiana.`],
        ["3. Cookie analitici",
         `Attualmente non utilizziamo cookie analitici di terze parti. Qualora venissero introdotti in futuro, saranno preceduti da idonea informativa e richiesta di consenso.`],
        ["4. Cookie di profilazione",
         `Non utilizziamo cookie di profilazione né strumenti di marketing comportamentale.`],
        ["5. Gestione dei cookie",
         `L'utente può eliminare o bloccare i cookie tramite le impostazioni del proprio browser. La disabilitazione dei cookie tecnici può compromettere il funzionamento della piattaforma.`],
        ["6. Browser più comuni",
         `Chrome: chrome://settings/cookies — Firefox: about:preferences#privacy — Safari: Preferenze > Privacy — Edge: edge://settings/content/cookies`],
        ["7. Aggiornamenti",
         `La presente Cookie Policy può essere aggiornata. Si invita l'utente a consultarla periodicamente.`],
      ],
    },
    en: {
      title: "Cookie Policy",
      updated: "Last updated: January 2026",
      body: [
        ["1. What cookies are",
         `Cookies are small text files that websites save on the user's device to store session, preferences, and activity information.`],
        ["2. Technical cookies",
         `We use cookies strictly necessary for the platform's operation: user session management (JWT token), language preference (IT/EN), cookie consent. These cookies do not require prior consent under Italian law.`],
        ["3. Analytics cookies",
         `We currently do not use third-party analytics cookies. Should they be introduced in the future, they will be preceded by appropriate notice and consent request.`],
        ["4. Profiling cookies",
         `We do not use profiling cookies or behavioral marketing tools.`],
        ["5. Cookie management",
         `Users can delete or block cookies through their browser settings. Disabling technical cookies may impair the platform's functionality.`],
        ["6. Most common browsers",
         `Chrome: chrome://settings/cookies — Firefox: about:preferences#privacy — Safari: Preferences > Privacy — Edge: edge://settings/content/cookies`],
        ["7. Updates",
         `This Cookie Policy may be updated. Users are encouraged to review it periodically.`],
      ],
    },
  },
};

export default function LegalPage({ kind }) {
  const { lang, t } = useI18n();
  const data = (CONTENT[kind] && CONTENT[kind][lang]) || CONTENT[kind].it;
  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <header className="border-b border-[var(--aif-line)] bg-[rgba(6,11,24,0.92)]">
          <div className="max-w-4xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="aif-btn-ghost !py-2 !text-sm inline-flex items-center gap-2">
              <ArrowLeft size={14}/> {t("nav.back")}
            </Link>
            <Link to="/"><Logo/></Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-5 lg:px-8 py-12 md:py-16">
          <div className="aif-chip mb-4">{data.updated}</div>
          <h1 className="section-title">{data.title}</h1>

          <div className="mt-8 space-y-6">
            {data.body.map(([title, body], i) => (
              <section key={i} className="aif-card p-6">
                <h2 className="text-white font-semibold text-lg">{title}</h2>
                <p className="text-[var(--aif-text-dim)] mt-2 leading-relaxed text-[14px]">{body}</p>
              </section>
            ))}
          </div>
        </main>
        <Footer/>
      </div>
    </div>
  );
}
