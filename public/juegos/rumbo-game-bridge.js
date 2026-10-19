/**
 * RUMBO A MI DESTINO - ARCADE & WALLET STREAK BRIDGE (v1.0)
 * Conecta los 13 minijuegos de C:\juegos con la Billetera de Lealtad DemiEmpresa
 * Regla: Jugar mínimo 60 segundos o sumar 1,000 puntos para validar el día (Racha 7/7 = $1.00 USD).
 */

(function () {
  'use strict';

  // Extraer parámetros de URL (ej. ?userId=...&gameId=...)
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/');
  const inferredGameId = pathParts[pathParts.indexOf('games') + 1] || 'arcade-game';
  const gameId = urlParams.get('gameId') || inferredGameId;

  // Obtener userId de query param, localStorage del padre (mismo dominio), o demo fallback
  let userId = urlParams.get('userId');
  if (!userId) {
    try {
      const passenger = JSON.parse(localStorage.getItem('demiempresa_passenger') || '{}');
      userId = passenger.id || passenger.userId || null;
    } catch (e) {
      userId = null;
    }
  }

  // Estado de la sesión de juego
  let secondsPlayed = 0;
  let currentScore = 0;
  let isQualified = false;
  let timerInterval = null;
  let isPageActive = true;

  // 1. Crear HUD flotante dentro del juego
  function createStreakHud() {
    if (document.getElementById('rumbo-streak-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'rumbo-streak-hud';
    hud.innerHTML = `
      <div style="
        position: fixed;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(245, 158, 11, 0.5);
        color: #fff;
        padding: 5px 12px;
        border-radius: 9999px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
        user-select: none;
        pointer-events: auto;
        transition: all 0.3s ease;
      ">
        <button id="rumbo-hud-back-btn" title="Volver a Rumbo Viajes" style="
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fbbf24;
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
          padding: 2px 8px;
          border-radius: 999px;
          margin-right: 2px;
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          ◀ Salir
        </button>

        <span style="color: #fbbf24;">⚡ Racha Rumbo:</span>
        <span id="rumbo-hud-timer" style="color: #38bdf8; font-family: monospace;">⏱️ 0s / 60s</span>
        <span id="rumbo-hud-score" style="color: #a7f3d0; font-family: monospace; display: none;">🪙 0 pts</span>
        <span id="rumbo-hud-badge" style="
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
          border: 1px solid rgba(245, 158, 11, 0.4);
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 9px;
          letter-spacing: 0.5px;
        ">
          DÍA 7 = $1.00 USD
        </span>
      </div>
    `;

    document.body.appendChild(hud);

    // Evento botón volver
    const backBtn = document.getElementById('rumbo-hud-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'RUMBO_CLOSE_ARCADE' }, '*');
        } else {
          window.location.href = '/viajes';
        }
      });
    }
  }

  // 2. Actualizar HUD y verificar calificación
  function updateProgress() {
    if (!isPageActive) return;

    secondsPlayed += 1;
    const timerEl = document.getElementById('rumbo-hud-timer');
    if (timerEl) {
      timerEl.textContent = `⏱️ ${secondsPlayed}s / 60s`;
    }

    // Verificar si califica por tiempo (60s) o puntos (1,000)
    if (!isQualified && (secondsPlayed >= 60 || currentScore >= 1000)) {
      triggerQualification();
    }
  }

  // 3. Notificar calificación
  async function triggerQualification() {
    isQualified = true;
    const hudContainer = document.querySelector('#rumbo-streak-hud > div');
    const badgeEl = document.getElementById('rumbo-hud-badge');

    if (hudContainer) {
      hudContainer.style.borderColor = '#10b981';
      hudContainer.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.7)';
    }
    if (badgeEl) {
      badgeEl.style.background = '#10b981';
      badgeEl.style.color = '#022c22';
      badgeEl.style.fontWeight = '900';
      badgeEl.textContent = '✓ DÍA ASEGURADO';
    }

    // Enviar mensaje al parent (React SPA)
    const payload = {
      type: 'RUMBO_GAME_QUALIFIED',
      userId,
      gameId,
      durationSeconds: secondsPlayed,
      score: currentScore
    };

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }

    // Enviar directamente a la API si tenemos userId
    if (userId) {
      try {
        await fetch('/api/wallet/game-streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('[RumboBridge] Error sincronizando racha:', err);
      }
    }
  }

  // 4. API Pública accesible por los juegos para reportar score
  window.RumboBridge = {
    setUserId: function (id) {
      userId = id;
    },
    reportScore: function (score) {
      currentScore = Math.max(currentScore, parseInt(score, 10) || 0);
      const scoreEl = document.getElementById('rumbo-hud-score');
      if (scoreEl) {
        scoreEl.style.display = 'inline';
        scoreEl.textContent = `🪙 ${currentScore} pts`;
      }
      if (!isQualified && currentScore >= 1000) {
        triggerQualification();
      }
    },
    getStats: function () {
      return { secondsPlayed, currentScore, isQualified, gameId, userId };
    }
  };

  // 5. Escuchar cambios de visibilidad para no contar tiempo si la pestaña está en segundo plano
  document.addEventListener('visibilitychange', function () {
    isPageActive = !document.hidden;
  });

  // 6. Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createStreakHud();
      timerInterval = setInterval(updateProgress, 1000);
    });
  } else {
    createStreakHud();
    timerInterval = setInterval(updateProgress, 1000);
  }
})();
