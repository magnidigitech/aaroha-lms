import React, { useState } from 'react';
import { Award, Printer, Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';

/**
 * High-Fidelity Accredited Digital Certificate Document
 * Calibrated for Academic Rigor, Official Print & PDF Export
 */
export default function CertificateDocument({ certificate }) {
  const [copied, setCopied] = useState(false);

  if (!certificate) return null;

  const handleCopyCode = () => {
    if (certificate.certificate_code) {
      navigator.clipboard?.writeText(certificate.certificate_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const dateToFormat = certificate.issued_at ? new Date(certificate.issued_at) : null;
  const formattedDate = dateToFormat
    ? dateToFormat.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'November 14, 2026';

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>Verified Credential</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-sm font-semibold text-slate-200">
              Code: <span className="font-mono text-white select-all">{certificate.certificate_code}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={handleCopyCode}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-xs active:scale-95"
            title="Copy Verification ID"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy ID</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable Certificate Container */}
      <div 
        id="aaroha-certificate-print-region"
        className="relative bg-[#fffdf9] text-slate-900 rounded-2xl border-8 border-double border-[#0f172a] p-6 sm:p-12 shadow-2xl overflow-hidden font-serif select-text transition-all"
        style={{
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), inset 0 0 0 2px #d4af37, inset 0 0 0 6px #ffffff, inset 0 0 0 9px #d4af37'
        }}
      >
        {/* Subtle Guilloche / Security Watermark Background */}
        <div 
          aria-hidden="true" 
          className="absolute inset-0 pointer-events-none opacity-[0.035] flex items-center justify-center select-none"
        >
          <div className="w-[500px] h-[500px] rounded-full border-[30px] border-slate-900 flex items-center justify-center">
            <span className="text-9xl font-black text-slate-900 tracking-widest uppercase">AIT</span>
          </div>
        </div>

        {/* Corner Filigree Flourishes */}
        <div className="absolute top-3 left-3 text-amber-600/60 font-serif text-lg select-none">✦</div>
        <div className="absolute top-3 right-3 text-amber-600/60 font-serif text-lg select-none">✦</div>
        <div className="absolute bottom-3 left-3 text-amber-600/60 font-serif text-lg select-none">✦</div>
        <div className="absolute bottom-3 right-3 text-amber-600/60 font-serif text-lg select-none">✦</div>

        {/* Certificate Inner Layout */}
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6 sm:space-y-8 py-4 sm:py-6">
          
          {/* Institution Header & Seal */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3">
              <img
                src={aarohaLogo}
                alt="Aaroha Institute of Technology"
                className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-xs"
              />
            </div>
            
            <h1 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-[#0056D2] font-sans">
              Aaroha Institute of Technology
            </h1>
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 font-sans">
              Faculty of Distributed Systems & Computer Engineering
            </div>
          </div>

          {/* Decorative Divider */}
          <div className="flex items-center justify-center gap-3 my-2">
            <div className="w-16 sm:w-28 h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-amber-600" />
            <div className="w-2.5 h-2.5 rotate-45 bg-amber-500 border border-amber-600 shrink-0" />
            <div className="w-16 sm:w-28 h-[1px] bg-gradient-to-l from-transparent via-amber-500 to-amber-600" />
          </div>

          {/* Credential Title */}
          <div className="space-y-1">
            <h2 className="text-lg sm:text-2xl font-black uppercase tracking-[0.15em] text-slate-900 font-serif">
              Certificate of Academic & Technical Excellence
            </h2>
            <p className="text-xs sm:text-sm italic text-slate-600 font-serif">
              By the authority of the Curriculum Committee and Academic Faculty, this document certifies that
            </p>
          </div>

          {/* Recipient Full Name */}
          <div className="py-2 sm:py-4">
            <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight font-serif capitalize">
              {certificate.recipient_name}
            </div>
            <div className="w-48 sm:w-80 h-1 bg-gradient-to-r from-transparent via-slate-900 to-transparent mx-auto mt-3" />
          </div>

          {/* Conferral Statement & Course Title */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 font-serif">
              has successfully fulfilled all curriculum requirements, defended specialized project deliverables, and demonstrated verified mastery in
            </p>
            <div className="text-lg sm:text-2xl font-black text-[#0056D2] leading-snug font-sans px-4 py-1">
              {certificate.course_title}
            </div>
          </div>

          {/* Distinction / Honors Pill */}
          {certificate.grade && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-bold font-sans shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{certificate.grade}</span>
            </div>
          )}

          {/* Signatures & Accreditation Footer */}
          <div className="pt-8 sm:pt-12 grid grid-cols-1 sm:grid-cols-3 items-end gap-6 border-t border-slate-200/80">
            
            {/* Faculty Instructor Signatory */}
            <div className="space-y-1 text-center sm:text-left">
              <div className="font-serif italic text-base sm:text-lg text-slate-800 tracking-wide border-b border-slate-400 pb-1 inline-block min-w-[160px]">
                {certificate.issuer_name || 'Faculty Director'}
              </div>
              <div className="text-[11px] font-bold text-slate-900 font-sans">
                {certificate.issuer_title || 'Director of Curriculum'}
              </div>
              <div className="text-[10px] text-slate-500 font-sans">
                Aaroha Systems Faculty
              </div>
            </div>

            {/* Official Gold Embossed Stamp / Seal */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-1 shadow-lg flex items-center justify-center border-2 border-amber-300">
                <div className="w-full h-full rounded-full border-2 border-dashed border-amber-200/90 flex flex-col items-center justify-center text-center p-1 bg-amber-500">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  <span className="text-[7px] font-black uppercase tracking-wider text-amber-100 font-sans mt-0.5">
                    Official Seal
                  </span>
                  <span className="text-[6px] font-bold text-amber-200 font-sans">
                    ACCREDITED
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Dean Signatory */}
            <div className="space-y-1 text-center sm:text-right">
              <div className="font-serif italic text-base sm:text-lg text-slate-800 tracking-wide border-b border-slate-400 pb-1 inline-block min-w-[160px]">
                Academic Board & Dean
              </div>
              <div className="text-[11px] font-bold text-slate-900 font-sans">
                Board of Academic Review
              </div>
              <div className="text-[10px] text-slate-500 font-sans">
                Conferred: {formattedDate}
              </div>
            </div>
          </div>

          {/* Verification Bar Bottom */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-sans">
            <div>
              Verification ID: <span className="font-mono font-bold text-slate-700">{certificate.certificate_code}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aaroha Cryptographic Verification Protocol · Tamper-Evident</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
