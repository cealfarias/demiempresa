import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, Scale, FileText, CheckCircle2, ShieldCheck, 
  ExternalLink, Send, Sparkles, Award, Phone, Mail, User, HelpCircle, Globe, ArrowLeft 
} from 'lucide-react';

export default function AsesoriaCreacionEmpresa() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEmpresa, setTipoEmpresa] = useState('SA_DE_CV');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !telefono.trim()) {
      alert("Por favor completa tu Nombre, Correo y Teléfono/WhatsApp de contacto.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setEnviado(true);
      setLoading(false);
    }, 800);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Boton Regresar */}
      <div>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '0.4rem 0.85rem', backgroundColor: '#1E293B', color: '#94A3B8', border: '1px solid #334155', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <ArrowLeft size={14} /> Volver a demiempresa.online
        </button>
      </div>

      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
        color: 'white',
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '0.75rem', backgroundColor: '#D97706', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 'bold' }}>
            🏛️ SERVICIO LEGAL OFICIAL EL SALVADOR
          </span>
          <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.15)', color: '#E2E8F0', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: '500' }}>
            Conectado con creaempresa.cnr.gob.sv
          </span>
        </div>

        <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '800', lineHeight: '1.2' }}>
          Asesoría & Acompañamiento Legal para la <br />
          <span style={{ color: '#60A5FA' }}>Constitución de tu Empresa en El Salvador</span>
        </h1>

        <p style={{ margin: 0, fontSize: '0.95rem', color: '#94A3B8', maxWidth: '800px', lineHeight: '1.6' }}>
          Te acompañamos paso a paso con abogados notarios certificados por la Corte Suprema de Justicia (CSJ) en la redacción de Escrituras, inscripción en el Registro de Comercio (CNR), Ministerio de Hacienda (NIT/NRC) e inscripción patronal en ISSS y AFP.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <a
            href="https://creaempresa.cnr.gob.sv/ServiciosOL/creaEmpresa.htm"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: '#D97706',
              color: 'white',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)'
            }}
          >
            <Globe size={16} /> Portal Oficial CreaEmpresa CNR <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Planes y Paquetes de Asesoría Legal */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
          💼 Paquetes de Constitución Legal de Empresa
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          
          {/* Plan 1 */}
          <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid #334155', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.7rem', backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 'bold' }}>
                PERSONA NATURAL
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', margin: '0.5rem 0 0.25rem 0' }}>
                Comerciante Individual
              </h3>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#34D399', margin: '0.5rem 0 1rem 0' }}>
                $150.00 <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 'normal' }}>/ trámite completo</span>
              </div>

              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.825rem', color: '#CBD5E1', lineHeight: '1.7', margin: 0 }}>
                <li>Registro de Matrícula de Comercio en CNR</li>
                <li>Tramitación de NIT y Registro de Contribuyente (NRC IVA)</li>
                <li>Inscripción Patronal en ISSS y AFP</li>
                <li>Balance Inicial auditado</li>
              </ul>
            </div>
          </div>

          {/* Plan 2 */}
          <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '2px solid #2563EB', padding: '1.5rem', boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '-12px', right: '16px', backgroundColor: '#2563EB', color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.75rem', borderRadius: '999px', fontWeight: 'bold' }}>
              RECOMENDADO SOCIEDADES
            </span>

            <div>
              <span style={{ fontSize: '0.7rem', backgroundColor: '#FEF3C7', color: '#78350F', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 'bold' }}>
                PERSONA JURÍDICA
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', margin: '0.5rem 0 0.25rem 0' }}>
                Sociedad S.A. de C.V. / S. de R.L.
              </h3>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#34D399', margin: '0.5rem 0 1rem 0' }}>
                $450.00 <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 'normal' }}>/ honorarios notariales incluidos</span>
              </div>

              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.825rem', color: '#CBD5E1', lineHeight: '1.7', margin: 0 }}>
                <li>Redacción y protocolización de Escritura de Constitución (Notario CSJ)</li>
                <li>Inscripción de Escritura y Matrícula de Comercio en CNR</li>
                <li>Obtención de NIT y NRC en el Ministerio de Hacienda</li>
                <li>Depósito de Balance Inicial e inscripción en ISSS, AFP y Ministerio de Trabajo</li>
              </ul>
            </div>
          </div>

          {/* Plan 3 */}
          <div style={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid #334155', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.7rem', backgroundColor: '#F3E8FF', color: '#6B21A8', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 'bold' }}>
                CONSULTA 1-A-1
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', margin: '0.5rem 0 0.25rem 0' }}>
                Asesoría Exprés con Abogado CSJ
              </h3>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#34D399', margin: '0.5rem 0 1rem 0' }}>
                $49.99 <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 'normal' }}>/ sesión 45 min</span>
              </div>

              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.825rem', color: '#CBD5E1', lineHeight: '1.7', margin: 0 }}>
                <li>Evaluación del tipo de sociedad conveniente para tu rubro</li>
                <li>Revisión de requisitos legales y estructura accionaria</li>
                <li>Resolución de dudas tributarias (Hacienda, IVA, Pago a Cuenta)</li>
                <li>Sesión por videollamada o presencial</li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Formulario de Solicitud de Asesoría */}
      <div style={{ backgroundColor: '#1E293B', padding: '2rem', borderRadius: '14px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Scale size={20} color="#60A5FA" /> Solicita tu Asesoría Legal Gratuita
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: '1.55', margin: '0 0 1.25rem 0' }}>
            Completa tus datos y un Abogado Corporativo notario certificado CSJ se comunicará contigo vía WhatsApp o llamada telefónica en menos de 2 horas.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem', color: '#E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#34D399" /> Acompañamiento 100% Garantizado en la Ventanilla CNR
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#34D399" /> Redacción de Escritura por Notario CSJ Certificado
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#34D399" /> Integración directa con SaaS Planilla e ISSS
            </div>
          </div>
        </div>

        <div>
          {enviado ? (
            <div style={{ backgroundColor: '#064E3B', border: '1px solid #059669', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
              <CheckCircle2 size={40} color="#34D399" style={{ margin: '0 auto 0.5rem auto' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'white', fontWeight: 'bold' }}>¡Solicitud Enviada con Éxito!</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#A7F3D0' }}>
                Un especialista de nuestro equipo legal se pondrá en contacto contigo muy pronto.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#E2E8F0' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Lic. Carlos Alberto Martínez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: 'white', fontSize: '0.825rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#E2E8F0' }}>
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: 'white', fontSize: '0.825rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#E2E8F0' }}>
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="7000-0000"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: 'white', fontSize: '0.825rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#E2E8F0' }}>
                  Tipo de Empresa a Constituir *
                </label>
                <select
                  value={tipoEmpresa}
                  onChange={(e) => setTipoEmpresa(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: 'white', fontSize: '0.825rem' }}
                >
                  <option value="SA_DE_CV">Sociedad Anónima de C.V. (S.A. de C.V.)</option>
                  <option value="S_DE_RL">Sociedad de Resp. Ltda. (S. de R.L.)</option>
                  <option value="COMERCIANTE_INDIVIDUAL">Comerciante Individual</option>
                  <option value="OTRO">Consulta Legal Personalizada</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#E2E8F0' }}>
                  Detalles adicionales (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Cuéntanos brevemente sobre el giro comercial o dudas específicas..."
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0F172A', color: 'white', fontSize: '0.825rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.7rem 1.5rem',
                  backgroundColor: '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                <Send size={16} /> {loading ? 'Enviando Solicitud...' : 'Enviar Solicitud de Asesoría Legal'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Visor del Portal Oficial CNR */}
      <div style={{ backgroundColor: '#1E293B', padding: '1.5rem', borderRadius: '14px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Globe size={18} color="#D97706" /> Visor del Portal Oficial: creaempresa.cnr.gob.sv/ServiciosOL/creaEmpresa.htm
          </h3>
          <a
            href="https://creaempresa.cnr.gob.sv/ServiciosOL/creaEmpresa.htm"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.8rem', color: '#60A5FA', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            Abrir en ventana completa <ExternalLink size={14} />
          </a>
        </div>

        <iframe
          src="https://creaempresa.cnr.gob.sv/ServiciosOL/creaEmpresa.htm"
          title="CreaEmpresa CNR El Salvador"
          style={{ width: '100%', height: '550px', border: '1px solid #475569', borderRadius: '10px', backgroundColor: 'white' }}
        />
      </div>

    </div>
  );
}
