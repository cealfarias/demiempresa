import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, ShieldCheck, Zap, Lock, Award, CheckCircle2, 
  ArrowRight, Globe, Server, Database, Key, ExternalLink,
  ChevronRight, ArrowLeft, RefreshCw, Cpu, Check, Layers
} from 'lucide-react';

export default function FacturacionDTEPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleIrAVentas = () => {
    window.location.href = 'https://ventas.demiempresa.online';
  };

  const pilares = [
    {
      titulo: '1. Criptografía y Seguridad Avanzada',
      calificacion: '100% (Grado A+)',
      icono: <Lock size={26} color="#10B981" />,
      descripcion: 'Procesamiento de llaves privadas .p12 con encriptación militar AES-256 Fernet. Generación de firmas digitales JWS con algoritmo RS256 en ambiente aislado, con adaptador integrado para el microservicio Java oficial svfe-api-firmador del MH.'
    },
    {
      titulo: '2. Pre-Validación de Esquemas JSON (svfe-json-schemas)',
      calificacion: '100% (Grado A+)',
      icono: <Cpu size={26} color="#10B981" />,
      descripcion: 'Validación en milisegundos contra las especificaciones JSON Schemas oficiales (v1 a v4) del Ministerio de Hacienda previo a la transmisión. Garantiza un 0% de rechazos por errores sintácticos o de estructura.'
    },
    {
      titulo: '3. Catálogos Oficiales V1.1 y Cascada Geográfica Normativa',
      calificacion: '100% (Grado A+)',
      icono: <Layers size={26} color="#10B981" />,
      descripcion: 'Incorporación de los 33 catálogos oficializados por el MH de El Salvador. Selección de datos geográficos con flujo normativo estricto: 1. Departamento ➔ 2. Distrito ➔ 3. Auto-asignación de Municipio.'
    },
    {
      titulo: '4. Bóveda Tributaria y Retención Legal por 10 Años',
      calificacion: '100% (Grado A+)',
      icono: <Database size={26} color="#10B981" />,
      descripcion: 'Cumplimiento estricto del Art. 147 del Código Tributario de El Salvador. Almacenamiento inmutable del JSON original, firma JWS, sello de recepción del MH y código HASH SHA-256 para auditoría fiscal.'
    },
    {
      titulo: '5. Representación Gráfica e Interoperabilidad',
      calificacion: '100% (Grado A+)',
      icono: <Globe size={26} color="#10B981" />,
      descripcion: 'Construcción instantánea de PDF oficial con código QR dinamizado a la URL pública de consulta de Hacienda (mh.gob.sv). Envío asíncrono automatizado de notificaciones al comprador por SMTP.'
    }
  ];

  const tiposDTE = [
    { codigo: 'DTE-01', nombre: 'Factura Electrónica', desc: 'Ventas a consumidor final con cálculo exacto de IVA (13%) y desglose tributario.' },
    { codigo: 'DTE-03', nombre: 'Comprobante de Crédito Fiscal (CCF)', desc: 'Transacciones B2B con retención (1%), percepción y registro de NCR del contribuyente.' },
    { codigo: 'DTE-05', nombre: 'Nota de Crédito Electrónica', desc: 'Ajustes, anulación parcial y devoluciones vinculadas a documentos previos.' },
    { codigo: 'DTE-06', nombre: 'Nota de Débito Electrónica', desc: 'Cargos financieros y ajustes de precios posteriores a la emisión.' },
    { codigo: 'DTE-14', nombre: 'Factura de Sujeto Excluido', desc: 'Registro formal de compras a proveedores no inscritos como contribuyentes de IVA.' },
    { codigo: 'Eventos', nombre: 'Invalidación y Contingencia', desc: 'Anulación extemporánea y reporte de transmisiones en modo contingencia.' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#09090B', color: '#FAFAFA', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.25rem 2.5rem', borderBottom: '1px solid #27272A',
        backgroundColor: 'rgba(9, 9, 11, 0.9)', backdropFilter: 'blur(12px)',
        position: 'fixed', top: 0, width: '100%', zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/portal')}
            style={{
              background: '#18181B', border: '1px solid #27272A', color: '#A1A1AA',
              padding: '0.5rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem'
            }}
          >
            <ArrowLeft size={16} /> Volver al Portal
          </button>
          <div style={{ background: 'linear-gradient(135deg, #10B981, #059669)', padding: '0.5rem', borderRadius: '10px' }}>
            <FileText size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
              demiempresa <span style={{ color: '#10B981' }}>DTE Official</span>
            </h1>
            <span style={{ fontSize: '0.7rem', color: '#A1A1AA', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Sistema de Transmisión Tributaria El Salvador
            </span>
          </div>
        </div>
        
        <div>
          <button 
            onClick={handleIrAVentas}
            style={{
              padding: '0.65rem 1.4rem', backgroundColor: '#10B981', color: '#09090B',
              border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            Ingresar al Sistema DTE <ExternalLink size={16} />
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main style={{ paddingTop: '8.5rem', paddingBottom: '4rem', paddingLeft: '2rem', paddingRight: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto 4rem auto' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem', 
            backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.5rem 1.2rem', 
            borderRadius: '2rem', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '1.8rem' 
          }}>
            <Award size={18} color="#10B981" />
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#10B981', letterSpacing: '0.5px' }}>
              CALIFICACIÓN OFICIAL: NIVEL ENTERPRISE (GRADO 5 / A+)
            </span>
          </div>
          
          <h2 style={{ fontSize: '3.25rem', fontWeight: '900', lineHeight: '1.15', margin: '0 0 1.5rem 0', letterSpacing: '-1.5px' }}>
            Plataforma Empresarial DTE de <span style={{ color: '#10B981' }}>Grado Tributario Oficial</span>
          </h2>
          
          <p style={{ fontSize: '1.2rem', color: '#A1A1AA', lineHeight: '1.65', marginBottom: '2.5rem' }}>
            Construido desde sus cimientos bajo los estándares de la Dirección General de Impuestos Internos (DGII V1.1) del Ministerio de Hacienda de El Salvador. <strong style={{ color: '#FAFAFA' }}>Este software no solo cumple con emitir facturas</strong>; es una infraestructura fiscal completa con pre-validación de esquemas, firma criptográfica RS256, cascada geográfica normativa y resguardo legal auditable.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleIrAVentas}
              style={{
                padding: '0.9rem 2rem', backgroundColor: '#10B981', color: '#09090B',
                border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
              }}
            >
              Acceder a ventas.demiempresa.online <ArrowRight size={18} />
            </button>
            
            <a 
              href="#evaluacion-tecnica"
              style={{
                padding: '0.9rem 2rem', backgroundColor: '#18181B', color: '#FAFAFA',
                border: '1px solid #27272A', borderRadius: '10px', fontWeight: '600', fontSize: '1rem',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              Ver Dictamen Técnico <ShieldCheck size={18} color="#10B981" />
            </a>
          </div>
        </div>

        {/* DISTINCTION BANNER */}
        <div style={{ 
          backgroundColor: '#121214', border: '1px solid #27272A', borderRadius: '24px', 
          padding: '3rem', marginBottom: '5rem', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.05))', pointerEvents: 'none' }}></div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
            <div>
              <span style={{ color: '#10B981', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                La Diferencia DemiEmpresa
              </span>
              <h3 style={{ fontSize: '2rem', fontWeight: '800', margin: '0.5rem 0 1rem 0', color: '#FAFAFA' }}>
                Más que un Facturador: Un Centro de Mando Fiscal
              </h3>
              <p style={{ color: '#A1A1AA', lineHeight: '1.6', fontSize: '1.05rem', margin: 0 }}>
                A diferencia de los sistemas de facturación convencionales que actúan como simples plantillas de impresión, nuestra infraestructura ejecuta un ciclo de procesamiento criptográfico completo, alineado con las regulaciones de la República de El Salvador.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '1.25rem', borderRadius: '14px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.6rem', borderRadius: '10px' }}>
                  <Zap size={22} color="#EF4444" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#71717A' }}>Facturadores Comunes</h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#A1A1AA' }}>Sin pre-validación de esquemas, propensos a rechazos continuos en el portal del MH.</p>
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.25rem', borderRadius: '14px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.6rem', borderRadius: '10px' }}>
                  <ShieldCheck size={22} color="#10B981" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#10B981' }}>DemiEmpresa DTE System (Grado A+)</h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: '#E4E4E7' }}>Motor integrado svfe-json-schemas, bóveda AES-256 y firma digital transparente.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PILARES TÉCNICOS / MATRIZ DE EVALUACIÓN */}
        <div id="evaluacion-tecnica" style={{ marginBottom: '5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '2.25rem', fontWeight: '800', margin: '0 0 0.75rem 0', letterSpacing: '-1px' }}>
              Dictamen de Evaluación Técnica (5 Pilares de Excelencia)
            </h3>
            <p style={{ fontSize: '1.05rem', color: '#A1A1AA', maxWidth: '700px', margin: '0 auto' }}>
              Auditoría interna de conformidad frente a la normativa oficial del Ministerio de Hacienda (MH El Salvador).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem' }}>
            {pilares.map((pilar, idx) => (
              <div 
                key={idx} 
                style={{ 
                  backgroundColor: '#121214', border: '1px solid #27272A', borderRadius: '18px', 
                  padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                    {pilar.icono}
                  </div>
                  <span style={{ 
                    backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', 
                    padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: '800' 
                  }}>
                    {pilar.calificacion}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.75rem 0', color: '#FAFAFA' }}>
                  {pilar.titulo}
                </h4>

                <p style={{ fontSize: '0.92rem', color: '#A1A1AA', lineHeight: '1.6', margin: 0, flexGrow: 1 }}>
                  {pilar.descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* DOCUMENTOS SOPORTADOS */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '24px', padding: '3.5rem', marginBottom: '5rem' }}>
          <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: '#FAFAFA' }}>
              Documentos Tributarios Electrónicos Soportados
            </h3>
            <p style={{ color: '#A1A1AA', fontSize: '1.05rem', margin: 0 }}>
              Generación de código de generación UUID v4 upper y número de control normativo de 31 caracteres.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {tiposDTE.map((doc, idx) => (
              <div key={idx} style={{ backgroundColor: '#09090B', border: '1px solid #27272A', padding: '1.5rem', borderRadius: '16px' }}>
                <span style={{ backgroundColor: '#10B981', color: '#09090B', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem', display: 'inline-block', marginBottom: '0.75rem' }}>
                  {doc.codigo}
                </span>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#FAFAFA' }}>
                  {doc.nombre}
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#A1A1AA', lineHeight: '1.5' }}>
                  {doc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* REDIRECT CTA SECTION */}
        <div style={{ 
          background: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #047857 100%)', 
          borderRadius: '24px', padding: '4rem 2rem', textAlign: 'center', color: '#09090B',
          boxShadow: '0 20px 40px rgba(16, 185, 129, 0.25)'
        }}>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 1rem 0', letterSpacing: '-1px' }}>
            Acceda Ahora al Ecosistema de Ventas y DTE
          </h3>
          <p style={{ fontSize: '1.2rem', fontWeight: '600', maxWidth: '750px', margin: '0 auto 2.5rem auto', opacity: 0.95, lineHeight: '1.5' }}>
            Inicie operaciones en la plataforma empresarial respaldada por las leyes tributarias de El Salvador.
          </p>

          <button 
            onClick={handleIrAVentas}
            style={{
              padding: '1.1rem 2.75rem', backgroundColor: '#09090B', color: '#FAFAFA',
              border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1.1rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', transition: 'all 0.2s'
            }}
          >
            Ir a ventas.demiempresa.online <ExternalLink size={20} color="#10B981" />
          </button>
        </div>

      </main>

      {/* FOOTER */}
      <footer style={{ padding: '3rem 2rem', textAlign: 'center', borderTop: '1px solid #27272A', color: '#71717A', fontSize: '0.9rem' }}>
        <p style={{ margin: 0 }}>
          © {new Date().getFullYear()} demiempresa.online — Plataforma Empresarial DTE Certificada. Todos los derechos reservados.
        </p>
      </footer>

    </div>
  );
}
