import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Terminal, 
  Cpu, 
  HardDrive, 
  Trash2, 
  FileCheck2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ExternalLink,
  Smartphone,
  Copy,
  Check
} from 'lucide-react';

export default function AntigravityDownloadPage() {
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText('ADBAntigravityPro-v1.0.0-SHA256-AUTHENTIC');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Header / Nav */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                ADB Antigravity Pro
              </span>
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
                v1.0 Oficial
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="https://wa.me/50369574224?text=Hola,%20solicito%20soporte%20o%20activación%20para%20ADB%20Antigravity%20Pro"
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Soporte Técnico
            </a>
            <a
              href="/downloads/ADBAntigravityPro.exe"
              download="ADBAntigravityPro.exe"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20"
            >
              <Download className="w-3.5 h-3.5" /> Descargar (.exe)
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-cyan-400 text-xs font-medium mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Binario Firmado & Verificado en demiempresa.online
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Desinfección y Limpieza Forense <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
              Para Android sin Root
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Elimina secuestradores de pantalla, adware agresivo, troyanos persistentes y purga gigabytes de basura y duplicados conectando el celular por cable USB.
          </p>

          {/* Download Box */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/downloads/ADBAntigravityPro.zip"
              download="ADBAntigravityPro.zip"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:from-cyan-300 hover:to-sky-300 shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-5 h-5 text-slate-950" />
              <span>Descargar Paquete ZIP (Recomendado)</span>
              <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded text-slate-950 font-mono">19.2 MB</span>
            </a>

            <a
              href="/downloads/ADBAntigravityPro.exe"
              download="ADBAntigravityPro.exe"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-semibold text-slate-300 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition-all text-xs"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Descarga Directa .exe</span>
            </a>

            <a
              href="https://wa.me/50369574224?text=Hola,%20deseo%20activar%20mi%20licencia%20de%20ADB%20Antigravity%20Pro"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 hover:bg-cyan-900/40 transition-all text-sm"
            >
              <span>Solicitar Licencia</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </a>
          </div>

          <div className="pt-2 text-xs text-slate-500 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Compatible con Windows 10 & 11</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Motor ADB Autónomo</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sin dependencias externas</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 border-t border-slate-900 bg-slate-950/60 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white">Capacidades del Sistema</h2>
            <p className="text-slate-400 text-sm mt-1">Herramienta de grado técnico para talleres y usuarios exigentes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white mb-2">Desinstalación Forzada</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Remoción inmediata de paquetes abusivos a nivel `pm uninstall -k --user 0`, evitando que el malware bloquee la pantalla o revierta su borrado.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white mb-2">Purga Profunda de Espacio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Limpia cachés de sistema inaccesibles por apps normales, miniaturas `.thumbnails`, restos de APKs residuales y logs huérfanos.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white mb-2">Duplicados Forenses MD5</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Escaneo byte por byte de fotos, videos y audios duplicados. Detecta copias idénticas conservando siempre el archivo original intacto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guide / How to use */}
      <section className="py-14 px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Guía de Inicio Rápido</h2>

        <div className="space-y-4">
          <div className="flex gap-4 p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-sm flex items-center justify-center shrink-0">1</div>
            <div>
              <h4 className="font-semibold text-white text-sm">Descarga y ejecuta el programa</h4>
              <p className="text-xs text-slate-400 mt-1">
                Haz clic en el botón de descarga. No requiere instalación ni privilegios de administrador para iniciar.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-sm flex items-center justify-center shrink-0">2</div>
            <div>
              <h4 className="font-semibold text-white text-sm">Activa la Depuración USB en tu Android</h4>
              <p className="text-xs text-slate-400 mt-1">
                Ve a <i>Ajustes &gt; Acerca del teléfono</i> y pulsa 7 veces sobre <i>Número de compilación</i>. Luego ve a <i>Opciones de desarrollador</i> y activa <b>Depuración USB</b>.
              </p>
              <div className="mt-2 text-[11px] p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <b>Nota para Xiaomi / Honor / Huawei:</b> Conecta en modo <i>Transferencia de archivos (MTP)</i> y en Xiaomi activa también <i>Depuración USB (Ajustes de seguridad)</i>.
              </div>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-sm flex items-center justify-center shrink-0">3</div>
            <div>
              <h4 className="font-semibold text-white text-sm">Abre el panel en tu navegador</h4>
              <p className="text-xs text-slate-400 mt-1">
                El ejecutable levantará automáticamente un panel visual moderno en <b>http://127.0.0.1:8000</b> donde podrás auditar, limpiar y remediar con un solo clic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Verification Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="text-xs text-slate-400">
            Distribuido y alojado oficialmente por <b>demiempresa.online</b>. Seguro contra malware y libre de software espía.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <span>WhatsApp Soporte: +503 6957-4224</span>
            <span>•</span>
            <a href="/portal" className="text-cyan-400 hover:underline">Portal Principal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
