import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  FileText, 
  UserCheck, 
  Car, 
  Store, 
  Globe, 
  Lock, 
  MapPin, 
  Mic, 
  Tv, 
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function TermsAndConditionsModal({ isOpen, onClose, initialTab = 'ALL' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Términos de Referencia & Políticas</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  v2.0 Oficial
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Rumbo a mi Destino • demiempresa.online (República de El Salvador)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Navegación por Pestañas */}
        <div className="px-3 sm:px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex gap-1.5 overflow-x-auto text-xs font-semibold no-scrollbar">
          {[
            { id: 'ALL', label: 'Todo el Contrato', icon: FileText },
            { id: 'INTERMEDIACION', label: 'Intermediación', icon: ShieldCheck },
            { id: 'EXENCIONES', label: 'Exenciones de Responsabilidad', icon: AlertTriangle },
            { id: 'EXTRANJEROS', label: 'Extranjeros', icon: Globe },
            { id: 'COMERCIANTES', label: 'Comercios & Publicidad', icon: Store },
            { id: 'PERMISOS', label: 'Permisos & Privacidad', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Contenido Desplazable del Contrato */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans select-text">
          
          {/* Alerta Resumen de Blindaje */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-black text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>DECLARACIÓN DE PRINCIPIOS LEGALES</span>
            </div>
            <p>
              Rumbo a mi Destino es una <strong>aplicación web de servicio de contactos e intermediación digital entre particulares</strong>. No somos empresa de transporte ni patrono. Las tarifas son pactadas libremente bajo la <strong>ley de la oferta y la demanda</strong> (0% comisión). Cada usuario asume la total responsabilidad de sus conductas, pertenencias y legalidad de sus traslados.
            </p>
          </div>

          {(activeTab === 'ALL' || activeTab === 'INTERMEDIACION') && (
            <section className="space-y-3 border-b border-slate-800/80 pb-5">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 inline-flex items-center justify-center text-xs font-mono">1</span>
                <span>Naturaleza Estrictamente Intermediadora (App Web de Contactos)</span>
              </h3>
              <p>
                <strong>1.1 Naturaleza del Software:</strong> RUMBO es única y exclusivamente una plataforma tecnológica web que facilita el contacto y la comunicación entre personas particulares que desean movilizarse (<strong>Viajeros / Pasajeros</strong>) y conductores particulares que disponen de un vehículo privado (<strong>Conductores</strong>), así como la promoción comercial geolocalizada de negocios locales (<strong>Comerciantes</strong>).
              </p>
              <p>
                <strong>1.2 Inexistencia de Servicio de Transporte Público:</strong> RUMBO <strong>NO es una empresa de transporte público, mercantil ni privado</strong>, ni cuenta con flota de vehículos, ni establece itinerarios obligatorios.
              </p>
              <p>
                <strong>1.3 Inexistencia de Relación Laboral o Patronal:</strong> RUMBO no mantiene ningún vínculo laboral, patronal ni de subordinación con los conductores. Cada conductor es un socio independiente que decide cuándo conectarse, qué solicitudes aceptar o declinar y las rutas a seguir.
              </p>
            </section>
          )}

          {(activeTab === 'ALL' || activeTab === 'EXENCIONES') && (
            <section className="space-y-3 border-b border-slate-800/80 pb-5">
              <h3 className="text-base font-black text-white flex items-center gap-2 text-rose-400">
                <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 inline-flex items-center justify-center text-xs font-mono">2</span>
                <span>Blindaje Legal y Exención Total de Responsabilidad de RUMBO</span>
              </h3>
              <p className="text-slate-300">
                Habida cuenta de su condición de mero proveedor de soporte técnico e intermediación digital, <strong>RUMBO queda expresamente exonerada de toda responsabilidad civil, penal, laboral o administrativa</strong> ante los siguientes hechos:
              </p>
              <ul className="space-y-2.5 pl-3 list-disc list-outside text-slate-300">
                <li>
                  <strong className="text-white">Interrelaciones Personales y Conductas:</strong> RUMBO no supervisa ni responde por el trato verbal, discusiones, desavenencias, agresiones físicas o verbales, actos de acoso o delitos ocurridos entre usuarios en el lapso de tiempo que se conduzcan o interactúen.
                </li>
                <li>
                  <strong className="text-white">Objetos Perdidos, Olvidados o Hurtados:</strong> La custodia de bolsos, dinero, teléfonos móviles, maletas o pertenencias es responsabilidad exclusiva del pasajero. RUMBO no se hace responsable por objetos extraviados, dañados o sustraídos en los vehículos.
                </li>
                <li>
                  <strong className="text-white">Sustancias Ilícitas y Armas:</strong> Queda terminantemente prohibido el porte, traslado o facilitación de drogas, estupefacientes, armas de fuego o mercadería de contrabando. Los usuarios son los únicos responsables legales ante la PNC y la FGR.
                </li>
                <li>
                  <strong className="text-white">Trata de Personas y Privación de Libertad:</strong> RUMBO rechaza y colaborará penalmente contra cualquier uso del aplicativo para fines de trata de personas, tráfico ilegal o secuestro.
                </li>
                <li>
                  <strong className="text-white">Transporte de Personas sin Identificación:</strong> Es obligación del pasajero portar su documento oficial (DUI o Pasaporte). RUMBO declina toda responsabilidad por traslados de personas indocumentadas.
                </li>
                <li>
                  <strong className="text-white">Accidentes Viales y Averías:</strong> RUMBO no responde por colisiones, lesiones, fallas mecánicas o contingencias climáticas. Corresponden al ámbito del conductor y sus pólizas de seguro particulares.
                </li>
              </ul>
            </section>
          )}

          {(activeTab === 'ALL' || activeTab === 'EXTRANJEROS') && (
            <section className="space-y-3 border-b border-slate-800/80 pb-5">
              <h3 className="text-base font-black text-white flex items-center gap-2 text-sky-400">
                <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 inline-flex items-center justify-center text-xs font-mono">3</span>
                <span>Régimen Especial para Extranjeros (Viajeros y Conductores)</span>
              </h3>
              <p>
                <strong>3.1 Identificación por Pasaporte o Residencia:</strong> Los ciudadanos extranjeros (turistas, residentes o personas de negocios) pueden registrarse y viajar acreditando su identidad mediante <strong>Pasaporte Vigente</strong> o <strong>Carné de Residencia</strong> emitido por la Dirección General de Migración y Extranjería (DGME).
              </p>
              <p>
                <strong>3.2 Moneda Legal en USD:</strong> Todas las tarifas, cuotas de membresía y cálculos se efectúan en <strong>Dólares de los Estados Unidos de América (USD)</strong> conforme a la Ley de Integración Monetaria de El Salvador.
              </p>
              <p>
                <strong>3.3 Prohibición Estricta de Cruces Fronterizos / Puntos Ciegos:</strong> La plataforma opera exclusivamente para traslados en vías habilitadas dentro del territorio salvadoreño. Queda terminantemente prohibido solicitar o realizar viajes hacia puntos ciegos o pasos no autorizados para eludir controles migratorios (*coyotaje*). RUMBO reportará de inmediato cualquier caso a las autoridades.
              </p>
              <p>
                <strong>3.4 Conductores Extranjeros:</strong> Deberán presentar pasaporte/residencia vigente, licencia de conducir autorizada para circular en El Salvador, tarjeta de circulación del auto y solvencias legales.
              </p>
            </section>
          )}

          {(activeTab === 'ALL' || activeTab === 'COMERCIANTES') && (
            <section className="space-y-3 border-b border-slate-800/80 pb-5">
              <h3 className="text-base font-black text-white flex items-center gap-2 text-emerald-400">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 inline-flex items-center justify-center text-xs font-mono">4</span>
                <span>Comerciantes Afiliados, Canje de Bonos y Pago de Publicidad en RUMBO</span>
              </h3>
              <p>
                <strong>4.1 Participación de Comercios Locales:</strong> Talleres mecánicos, llanterías, lubricentros, farmacias, restaurantes y negocios afines pueden afiliarse y anunciarse en la plataforma.
              </p>
              <p>
                <strong>4.2 Aceptación de Créditos como Forma de Pago:</strong> Los comercios afiliados convienen en <strong>aceptar los créditos y bonos digitales de la plataforma</strong> transferidos por conductores o pasajeros como forma de pago (parcial o total) o descuento directo en sus bienes o servicios (a razón de <strong>$1.00 USD por bono</strong>).
              </p>
              <p>
                <strong>4.3 RUMBO Acepta Créditos para Pagar Publicidad:</strong> Los comerciantes que acumulen créditos podrán <strong>utilizarlos para pagar sus pautas publicitarias dentro de la plataforma RUMBO</strong> (banners geolocalizados, anuncios en el Hub Comercial y videos cortos tipo Reels durante el trayecto). Se consolida así un <strong>círculo económico cerrado</strong>: el conductor gasta sus bonos en comercios locales y el comercio los reinvierte en publicidad para atraer más clientes.
              </p>
              <p>
                <strong>4.4 Exención de Responsabilidad Comercial:</strong> La calidad, inocuidad, garantía y cumplimiento de los productos o servicios brindados por los comercios es de su exclusiva responsabilidad frente al consumidor según la Ley de Protección al Consumidor.
              </p>
            </section>
          )}

          {(activeTab === 'ALL' || activeTab === 'PERMISOS') && (
            <section className="space-y-3">
              <h3 className="text-base font-black text-white flex items-center gap-2 text-amber-400">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 inline-flex items-center justify-center text-xs font-mono">5</span>
                <span>Consentimientos Obligatorios, Wallet Criptográfica y Privacidad</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <MapPin className="w-4 h-4" />
                    <span>1. Geolocalización GPS</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Autorización para rastreo en tiempo real para emparejamiento por proximidad (radio 1 km) y seguridad.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <Mic className="w-4 h-4" />
                    <span>2. Acceso a Micrófono</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Para activar la grabación de audio en cabina como protocolo preventivo de seguridad y emergencias.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Tv className="w-4 h-4" />
                    <span>3. Publicidad Segmentada</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Despliegue de promociones, comercios y reels de la zona de destino durante tiempos de viaje y espera.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 mt-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Wallet Criptográfica Inmutable (Ledger SHA-256)</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cada usuario dispone de una billetera digital encadenada matemáticamente para auditar el historial de movimientos de bonos de bienvenida ($1.00 USD con caducidad de 7 días), bonificaciones 7+7, cuotas de membresía ($15 semanales con tope de 15 bonos o $3 diarios) y canjes comerciales.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs space-y-1 mt-2">
                <strong className="text-emerald-400 block font-bold">
                  🔒 COMPROMISO DE NO VENTA DE DATOS
                </strong>
                <p className="text-slate-300">
                  Rumbo a mi Destino se compromete solemnemente a guardar bajo estricta confidencialidad toda la información personal, DUIs, pasaportes, teléfonos y datos de viaje. <strong>Bajo ninguna circunstancia vendemos, cedemos ni comercializamos tus datos con terceros o empresas de publicidad externas.</strong>
                </p>
              </div>
            </section>
          )}

        </div>

        {/* Pie del Modal con Acción de Cierre */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Leyes de la República de El Salvador • Tribunales de San Salvador
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-transform active:scale-95 cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Entendido y Conforme</span>
          </button>
        </div>
      </div>
    </div>
  );
}
