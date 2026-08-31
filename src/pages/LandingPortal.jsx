import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, FileText, Scale, Zap, Shield, Sparkles, 
  ArrowRight, CheckCircle2, Lock, UserPlus, LogIn, Laptop, Globe, 
  ChevronRight, Award, BarChart3, HelpCircle, Layers, Grid, CreditCard,
  Briefcase, Activity, Settings, PieChart, ShieldCheck, ShoppingCart, Truck
} from 'lucide-react';

export default function LandingPortal() {
  const navigate = useNavigate();

  useEffect(() => {
    // Hide initially if it's their first time
    const isFirstTime = localStorage.getItem('avatar_landing_greeted') !== 'true';
    if (isFirstTime) {
      const container = document.getElementById('demiempresa-avatar-container');
      if (container) container.style.display = 'none';

      localStorage.setItem('avatar_landing_greeted', 'true');
      
      // Wait 15 seconds, then materialize
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatar:materialize'));
      }, 15000);

      // Start talking shortly after materializing
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatar:say', {
          detail: {
            text: '¡Bienvenido a demiempresa! Aquí materializamos la visión integral de tu negocio.',
            highlightId: null,
            options: []
          }
        }));
      }, 17500);

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatar:say', {
          detail: {
            text: 'Te acompañamos desde la constitución legal de tu empresa, hasta la emisión de la última factura electrónica en tus sucursales.',
            highlightId: null,
            options: []
          }
        }));
      }, 23000);

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatar:say', {
          detail: {
            text: 'Conectamos tu operación diaria, la gestión del talento humano y tus activos físicos en un centro de mando robusto y confiable, centralizando todo en contabilidad.',
            highlightId: null,
            options: []
          }
        }));
      }, 31000);

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatar:say', {
          detail: {
            text: 'Y lo más importante: todo bajo las leyes de la República de El Salvador.',
            highlightId: null,
            options: []
          }
        }));
      }, 43000);

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatar:say', {
          detail: {
            text: 'Garantizamos el estricto cumplimiento de las Leyes vigentes tales como El Código Tributario, el Código de Trabajo, las normativas del Ministerio de Hacienda, las NIIF para PYMES, y demás leyes que regulan las actividades de la empresa en general.',
            highlightId: null,
            options: [
              { label: '¡Explorar Ecosistema!', action: null }
            ]
          }
        }));
      }, 48000);
    }
  }, []);

  let hoverTimeout = null;

  const handleCardHover = (app) => {
    // Only queue if they hover for at least 600ms (avoids spamming when moving mouse quickly across cards)
    if (hoverTimeout) clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('avatar:say', {
        detail: {
          text: `Módulo de ${app.nombre}: ${app.descripcion}`,
          highlightId: null,
          options: []
        }
      }));
    }, 600);
  };

  const handleCardLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
  };

  const areas = [
    {
      titulo: '1. Operaciones y Comercialización',
      descripcion: 'Constituye el motor principal del negocio, abarcando la cadena desde el abastecimiento hasta la entrega final al cliente.',
      color: '#F97316',
      badgeColor: 'rgba(249, 115, 22, 0.1)',
      apps: [
        {
          id: 'logistica',
          nombre: 'Logística e Inventarios',
          descripcion: 'Gestión de múltiples bodegas, entradas, salidas y actualización del kardex en tiempo real.',
          icon: <Layers size={28} color="#F97316" />,
          url: 'https://ventas.demiempresa.online'
        },
        {
          id: 'pos',
          nombre: 'Ventas y Facturación POS',
          descripcion: 'Ejecución de ventas en puntos físicos, manejo de cajas y trato directo con el cliente final.',
          icon: <Zap size={28} color="#F97316" />,
          url: 'https://ventas.demiempresa.online'
        },
        {
          id: 'compras',
          nombre: 'Compras y Abastecimiento',
          descripcion: 'Negociación con proveedores y adquisición de materia prima o productos terminados para la reventa.',
          icon: <Globe size={28} color="#F97316" />,
          url: 'https://ventas.demiempresa.online'
        }
      ]
    },
    {
      titulo: '2. Contabilidad y Finanzas',
      descripcion: 'Se encarga de la administración del capital, la precisión de los registros y el cumplimiento de las obligaciones tributarias.',
      color: '#10B981',
      badgeColor: 'rgba(16, 185, 129, 0.1)',
      apps: [
        {
          id: 'contable',
          nombre: 'Gestión Contable',
          descripcion: 'Generación de partidas, conciliaciones bancarias, emisión de estados financieros y reportes estructurados bajo NIIF.',
          icon: <PieChart size={28} color="#10B981" />,
          url: 'https://contabilidad.demiempresa.online'
        },
        {
          id: 'dteoficial',
          nombre: 'Facturación Oficial (DTE)',
          descripcion: 'Emisión, validación y resguardo de Documentos Tributarios Electrónicos bajo lineamientos del Ministerio de Hacienda.',
          icon: <FileText size={28} color="#10B981" />,
          url: 'https://ventas.demiempresa.online'
        },
        {
          id: 'activofijo',
          nombre: 'Control Patrimonial',
          descripcion: 'Seguimiento de la ubicación física, asignación y cálculo de depreciación de todos los activos fijos.',
          icon: <Building2 size={28} color="#10B981" />,
          url: 'https://activofijo.demiempresa.online'
        },
        {
          id: 'cooperativas',
          nombre: 'Cooperativas Financieras',
          descripcion: 'Gestión de asociados, aportaciones mensuales, préstamos e intereses para cooperativas de ahorro y crédito.',
          icon: <CreditCard size={28} color="#10B981" />,
          url: 'https://cooperativas.demiempresa.online'
        }
      ]
    },
    {
      titulo: '3. Gestión de Talento y Recursos Humanos',
      descripcion: 'Administra el ciclo de vida, la legalidad y la retribución del personal que opera la empresa.',
      color: '#3B82F6',
      badgeColor: 'rgba(59, 130, 246, 0.1)',
      apps: [
        {
          id: 'planilla',
          nombre: 'Procesamiento de Planilla',
          descripcion: 'Cálculo matemático de salarios, retenciones legales de ISSS, AFP y el impuesto sobre la renta.',
          icon: <Users size={28} color="#3B82F6" />,
          url: 'https://planilla.demiempresa.online'
        },
        {
          id: 'laboral',
          nombre: 'Administración Laboral',
          descripcion: 'Elaboración de contratos, cálculo de vacaciones, aguinaldos y finiquitos legales.',
          icon: <Briefcase size={28} color="#3B82F6" />,
          url: 'https://planilla.demiempresa.online'
        },
        {
          id: 'desarrollo',
          nombre: 'Desarrollo Organizacional',
          descripcion: 'Capacitación técnica, evaluación de desempeño y entrenamiento cerebral enfocado en la productividad.',
          icon: <Award size={28} color="#3B82F6" />,
          url: 'https://ajedrez.demiempresa.online'
        }
      ]
    },
    {
      titulo: '4. Administración y Control Legal',
      descripcion: 'Asegura la integración de las demás funciones y mantiene a la empresa dentro del marco jurídico mercantil.',
      color: '#F59E0B',
      badgeColor: 'rgba(245, 158, 11, 0.1)',
      apps: [
        {
          id: 'estrategia',
          nombre: 'Dirección Estratégica',
          descripcion: 'Planificación de objetivos, análisis de datos en paneles centralizados y toma de decisiones a nivel gerencial.',
          icon: <BarChart3 size={28} color="#F59E0B" />,
          url: 'https://planilla.demiempresa.online/login'
        },
        {
          id: 'mercantil',
          nombre: 'Cumplimiento Mercantil',
          descripcion: 'Formalización de la sociedad, renovación de matrículas de comercio y gestión de trámites oficiales ante el CNR.',
          icon: <Scale size={28} color="#F59E0B" />,
          url: 'https://demiempresa.online/crear-empresa',
          internalRoute: '/crear-empresa'
        },
        {
          id: 'seguridad',
          nombre: 'Seguridad Integral',
          descripcion: 'Protección física de las instalaciones y resguardo informático de los datos y servidores de la compañía.',
          icon: <Shield size={28} color="#F59E0B" />,
          url: '#'
        }
      ]
    }
  ];

  const handleEntrarApp = (app) => {
    if (app.url === '#') return; // En desarrollo
    if (app.internalRoute) {
      navigate(app.internalRoute);
    } else {
      window.location.href = app.url;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#09090B', color: '#FAFAFA' }}>
      
      {/* HEADER NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.25rem 2.5rem', borderBottom: '1px solid #27272A',
        backgroundColor: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(12px)',
        position: 'fixed', top: 0, width: '100%', zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', padding: '0.5rem', borderRadius: '10px' }}>
            <Activity size={24} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
              demiempresa
            </h1>
            <span style={{ fontSize: '0.7rem', color: '#A1A1AA', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Centro de Administración
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="https://planilla.demiempresa.online/login" style={{
            padding: '0.6rem 1.2rem', backgroundColor: '#FAFAFA', color: '#09090B',
            textDecoration: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
          }}>
            <Lock size={16} /> Panel Global
          </a>
        </div>
      </nav>

      {/* HERO / HUB INTRO */}
      <main style={{ paddingTop: '8rem', paddingBottom: '4rem', paddingLeft: '2rem', paddingRight: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 4rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#18181B', padding: '0.4rem 1rem', borderRadius: '2rem', border: '1px solid #27272A', marginBottom: '1.5rem' }}>
            <ShieldCheck size={16} color="#10B981" />
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#A1A1AA' }}>El Ecosistema Corporativo</span>
          </div>
          
          <h2 style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1.1', margin: '0 0 1.5rem 0', letterSpacing: '-1.5px' }}>
            Áreas Estructurales de tu Empresa
          </h2>
          
          <p style={{ fontSize: '1.125rem', color: '#A1A1AA', lineHeight: '1.6', marginBottom: '2.5rem' }}>
            Las funciones de una empresa se dividen en áreas clave que garantizan su operatividad, sostenibilidad y crecimiento. Selecciona el módulo al que deseas acceder:
          </p>
        </div>

        {/* ESTRUCTURAS ORGANIZACIONALES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          {areas.map((area, idx) => (
            <div key={idx} style={{ padding: '2rem', backgroundColor: '#121214', border: '1px solid #27272A', borderRadius: '24px' }}>
              <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #27272A' }}>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: area.color, margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
                  {area.titulo}
                </h3>
                <p style={{ fontSize: '1rem', color: '#A1A1AA', margin: 0, lineHeight: '1.5', maxWidth: '800px' }}>
                  {area.descripcion}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {area.apps.map(app => (
                  <div 
                    key={app.id} 
                    onClick={() => handleEntrarApp(app)} 
                    onMouseEnter={() => handleCardHover(app)}
                    onMouseLeave={handleCardLeave}
                    className="app-card"
                    style={{
                      backgroundColor: '#18181B', border: `1px solid #27272A`, borderRadius: '16px',
                      padding: '1.5rem', cursor: app.url === '#' ? 'default' : 'pointer', position: 'relative', overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', height: '100%',
                      opacity: app.url === '#' ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ backgroundColor: area.badgeColor, padding: '0.75rem', borderRadius: '12px' }}>
                        {app.icon}
                      </div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: '#FAFAFA' }}>
                        {app.nombre}
                      </h4>
                    </div>
                    
                    <p style={{ fontSize: '0.9rem', color: '#A1A1AA', lineHeight: '1.5', margin: '0 0 1.25rem 0', flexGrow: 1 }}>
                      {app.descripcion}
                    </p>
                    
                    {app.url !== '#' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: area.color, fontWeight: '600', fontSize: '0.85rem', marginTop: 'auto' }}>
                        Acceder <ArrowRight size={16} />
                      </div>
                    )}
                    {app.url === '#' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#52525B', fontWeight: '600', fontSize: '0.85rem', marginTop: 'auto' }}>
                        Próximamente
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* VALUE PROPOSITION SECTION */}
      <section style={{ backgroundColor: '#18181B', borderTop: '1px solid #27272A', borderBottom: '1px solid #27272A', padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 1.5rem 0', color: '#FAFAFA', lineHeight: '1.2', letterSpacing: '-1px' }}>
              Por qué los propietarios eligen <span style={{ color: '#3B82F6' }}>demiempresa</span>
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#A1A1AA', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              Administrar una empresa requiere precisión, legalidad y visión. Nuestra plataforma integra todas las áreas críticas de tu negocio para que puedas tomar las riendas de tu compañía con absoluta seguridad.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                { title: 'Control Centralizado', desc: 'Gestiona todas las operaciones desde un único panel sin saltar entre múltiples proveedores.' },
                { title: 'Información en Tiempo Real', desc: 'Conoce la salud financiera, el estado de las ventas y la nómina al instante.' },
                { title: 'Cumplimiento Legal Total', desc: 'Facturación DTE, NIIF, y planillas apegadas a las normativas del Ministerio de Hacienda y CNR.' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '50%' }}>
                    <CheckCircle2 size={24} color="#10B981" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: '700', color: '#E4E4E7' }}>{item.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#A1A1AA', lineHeight: '1.5' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ backgroundColor: '#09090B', border: '1px solid #27272A', borderRadius: '24px', padding: '3.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', background: '#3B82F6', width: '200px', height: '200px', filter: 'blur(100px)', opacity: 0.3, borderRadius: '50%' }}></div>
            <Grid size={48} color="#A1A1AA" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1rem', color: '#FAFAFA', letterSpacing: '-0.5px' }}>
              Visión Integral de tu Negocio
            </h3>
            <p style={{ color: '#A1A1AA', lineHeight: '1.6', fontSize: '1.1rem' }}>
              Desde la constitución legal de tu empresa hasta la emisión de la última factura electrónica de tus sucursales. Conecta tu operación diaria, el talento de recursos humanos y tus activos físicos en un centro de mando robusto y confiable.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '4rem 2rem', textAlign: 'center', color: '#71717A', fontSize: '0.95rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Activity size={24} color="#A1A1AA" />
          <span style={{ fontWeight: '800', color: '#E4E4E7', fontSize: '1.1rem', letterSpacing: '-0.5px' }}>demiempresa</span>
        </div>
        <p style={{ margin: 0, color: '#52525B' }}>
          © {new Date().getFullYear()} El Centro de Administración Empresarial. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
