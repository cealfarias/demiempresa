import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, FileText, Scale, Zap, Shield, Sparkles, 
  ArrowRight, CheckCircle2, Lock, UserPlus, LogIn, Laptop, Globe, 
  ChevronRight, Award, BarChart3, HelpCircle, Layers, Grid, CreditCard,
  Briefcase, Activity, Settings, PieChart, ShieldCheck
} from 'lucide-react';

export default function LandingPortal() {
  const navigate = useNavigate();

  useEffect(() => {
    const isFirstTime = localStorage.getItem('avatar_landing_greeted') !== 'true';
    if (isFirstTime) {
      localStorage.setItem('avatar_landing_greeted', 'true');
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatar:say', {
          detail: {
            text: '¡Bienvenido a demiempresa! Aquí materializamos la visión integral de tu negocio.',
            highlightId: null,
            options: []
          }
        }));
      }, 1500);

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatar:say', {
          detail: {
            text: 'Te acompañamos desde la constitución legal de tu empresa, hasta la emisión de la última factura electrónica en tus sucursales.',
            highlightId: null,
            options: []
          }
        }));
      }, 7000);

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('avatar:say', {
          detail: {
            text: 'Conectamos tu operación diaria, la gestión del talento humano y tus activos físicos en un centro de mando robusto y confiable, centralizando todo en contabilidad.',
            highlightId: null,
            options: [
              { label: '¡Explorar Ecosistema!', action: null }
            ]
          }
        }));
      }, 16000);
    }
  }, []);

  const mainApps = [
    {
      id: 'contabilidad',
      nombre: 'Contabilidad y Finanzas',
      badge: 'NÚCLEO FINANCIERO',
      badgeColor: '#059669',
      descripcion: 'Acceso directo a estados financieros, partidas contables y reportes NIIF. El corazón financiero de tu empresa.',
      icon: <PieChart size={32} color="#10B981" />,
      url: 'https://contabilidad.demiempresa.online',
      gradient: 'linear-gradient(135deg, #064E3B 0%, #059669 100%)',
      borderColor: 'rgba(16, 185, 129, 0.4)'
    },
    {
      id: 'dte',
      nombre: 'Facturación Electrónica',
      badge: 'DTE OFICIAL',
      badgeColor: '#7C3AED',
      descripcion: 'Emite y administra Comprobantes de Crédito Fiscal y Facturas con autorización directa del Ministerio de Hacienda.',
      icon: <Zap size={32} color="#8B5CF6" />,
      url: 'https://ventas.demiempresa.online',
      gradient: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)',
      borderColor: 'rgba(139, 92, 246, 0.4)'
    },
    {
      id: 'planilla',
      nombre: 'Planilla y RRHH',
      badge: 'GESTIÓN DE TALENTO',
      badgeColor: '#2563EB',
      descripcion: 'Control integral de tu personal. Cálculo automático de ISSS, AFP, retenciones de renta y finiquitos.',
      icon: <Users size={32} color="#3B82F6" />,
      url: 'https://planilla.demiempresa.online',
      gradient: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
      borderColor: 'rgba(59, 130, 246, 0.4)'
    },
    {
      id: 'activofijo',
      nombre: 'Activos Fijos',
      badge: 'CONTROL PATRIMONIAL',
      badgeColor: '#0284C7',
      descripcion: 'Administra la depreciación, asignación y ubicación física de todos los bienes y equipos de la empresa.',
      icon: <Building2 size={32} color="#0EA5E9" />,
      url: 'https://activofijo.demiempresa.online',
      gradient: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 100%)',
      borderColor: 'rgba(14, 165, 233, 0.4)'
    },
    {
      id: 'inventario',
      nombre: 'Inventarios y POS',
      badge: 'OPERACIONES',
      badgeColor: '#EA580C',
      descripcion: 'Kardex actualizado en tiempo real, múltiples bodegas y control de ventas en puntos de venta físicos.',
      icon: <Layers size={32} color="#F97316" />,
      url: 'https://ventas.demiempresa.online',
      gradient: 'linear-gradient(135deg, #7C2D12 0%, #EA580C 100%)',
      borderColor: 'rgba(249, 115, 22, 0.4)'
    },
    {
      id: 'legal',
      nombre: 'Legal y Constitución',
      badge: 'TRÁMITES OFICIALES',
      badgeColor: '#D97706',
      descripcion: 'Gestiona la creación de nuevas empresas y mantén al día las obligaciones mercantiles en el CNR.',
      icon: <Scale size={32} color="#F59E0B" />,
      url: 'https://demiempresa.online/crear-empresa',
      internalRoute: '/crear-empresa',
      gradient: 'linear-gradient(135deg, #78350F 0%, #D97706 100%)',
      borderColor: 'rgba(245, 158, 11, 0.4)'
    },
    {
      id: 'cooperativas',
      nombre: 'Cooperativas',
      badge: 'FINANCIERO',
      badgeColor: '#475569',
      descripcion: 'Gestión de asociados, aportaciones mensuales, préstamos e intereses para cooperativas de ahorro y crédito.',
      icon: <CreditCard size={32} color="#94A3B8" />,
      url: 'https://cooperativas.demiempresa.online',
      gradient: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)',
      borderColor: 'rgba(71, 85, 105, 0.4)'
    },
    {
      id: 'ajedrez',
      nombre: 'Entrenamiento Cerebral',
      badge: 'PRODUCTIVIDAD',
      badgeColor: '#DC2626',
      descripcion: 'Ejercicios de concentración estratégica, análisis táctico y agilidad mental para líderes.',
      icon: <Award size={32} color="#EF4444" />,
      url: 'https://ajedrez.demiempresa.online',
      gradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)',
      borderColor: 'rgba(220, 38, 38, 0.4)'
    }
  ];

  const handleEntrarApp = (app) => {
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
      <main style={{ paddingTop: '10rem', paddingBottom: '4rem', paddingLeft: '2rem', paddingRight: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 5rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#18181B', padding: '0.4rem 1rem', borderRadius: '2rem', border: '1px solid #27272A', marginBottom: '1.5rem' }}>
            <ShieldCheck size={16} color="#10B981" />
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#A1A1AA' }}>El Ecosistema para Propietarios</span>
          </div>
          
          <h2 style={{ fontSize: '3.75rem', fontWeight: '800', lineHeight: '1.1', margin: '0 0 1.5rem 0', letterSpacing: '-1.5px' }}>
            Todo el control de tu empresa, <br/>
            <span style={{ background: 'linear-gradient(to right, #60A5FA, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>en un solo lugar.</span>
          </h2>
          
          <p style={{ fontSize: '1.125rem', color: '#A1A1AA', lineHeight: '1.6', marginBottom: '2.5rem' }}>
            demiempresa es el sitio al que acuden los líderes y propietarios para administrar todas las funciones de su empresa. Toma el mando con acceso directo a finanzas, facturación, recursos humanos y más.
          </p>
        </div>

        {/* APPS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {mainApps.map(app => (
            <div 
              key={app.id} 
              onClick={() => handleEntrarApp(app)} 
              className="app-card"
              style={{
                backgroundColor: '#18181B', border: `1px solid #27272A`, borderRadius: '20px',
                padding: '2rem', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', height: '100%',
                '--card-border-color': app.borderColor
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: app.gradient }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ background: `${app.borderColor.replace('0.4', '0.15')}`, padding: '0.75rem', borderRadius: '12px' }}>
                  {app.icon}
                </div>
                <span style={{ fontSize: '0.65rem', backgroundColor: `${app.badgeColor}20`, color: app.badgeColor, padding: '0.35rem 0.75rem', borderRadius: '1rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                  {app.badge}
                </span>
              </div>
              
              <h3 style={{ fontSize: '1.35rem', fontWeight: '700', margin: '0 0 0.75rem 0', color: '#FAFAFA', letterSpacing: '-0.5px' }}>
                {app.nombre}
              </h3>
              
              <p style={{ fontSize: '0.95rem', color: '#A1A1AA', lineHeight: '1.5', margin: '0 0 1.5rem 0', flexGrow: 1 }}>
                {app.descripcion}
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: app.badgeColor, fontWeight: '600', fontSize: '0.9rem', marginTop: 'auto' }}>
                Acceder al Módulo <ArrowRight size={16} />
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
