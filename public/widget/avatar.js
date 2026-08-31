// avatar.js - Demiempresa Global Avatar Widget

(function() {
  if (document.getElementById('demiempresa-avatar-container')) return; // Already loaded

  // 1. Inject CSS
  const cssUrl = new URL('./avatar.css', document.currentScript ? document.currentScript.src : window.location.origin + '/widget/').href;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssUrl;
  document.head.appendChild(link);

  // 2. Base HTML structure
  const container = document.createElement('div');
  container.id = 'demiempresa-avatar-container';
  container.innerHTML = `
    <div id="avatar-dialog" class="avatar-bubble" style="display: none;">
      <div class="avatar-bubble-close" id="avatar-close-btn">&times;</div>
      <p id="avatar-text" class="avatar-text"></p><span id="avatar-cursor" class="avatar-cursor"></span>
      <div id="avatar-options" class="avatar-options"></div>
    </div>
    
    <div class="avatar-orb-wrapper" id="avatar-drag-handle" title="Asistente Virtual Demiempresa">
      <div id="avatar-glow" class="avatar-glow" style="display: none;"></div>
      <div id="avatar-orb" class="avatar-orb">
        <video id="avatar-vid-idle" class="avatar-video" src="/avatar-idle.mp4" autoplay loop muted playsinline onerror="this.style.display='none'"></video>
        <video id="avatar-vid-talking" class="avatar-video" src="/avatar-talking.mp4" autoplay loop muted playsinline style="opacity: 0;" onerror="this.style.display='none'"></video>
        <svg class="avatar-icon-fallback" viewBox="0 0 24 24"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // 3. State & Elements
  const dialog = document.getElementById('avatar-dialog');
  const textEl = document.getElementById('avatar-text');
  const cursorEl = document.getElementById('avatar-cursor');
  const optionsEl = document.getElementById('avatar-options');
  const closeBtn = document.getElementById('avatar-close-btn');
  const glow = document.getElementById('avatar-glow');
  const orb = document.getElementById('avatar-orb');
  const vidIdle = document.getElementById('avatar-vid-idle');
  const vidTalking = document.getElementById('avatar-vid-talking');
  const dragHandle = document.getElementById('avatar-drag-handle');

  let isActive = false;
  let typeInterval = null;
  let currentMessage = '';
  
  // Highlighting
  let currentHighlightId = null;

  function setSpeakingState(speaking) {
    isActive = speaking;
    if (speaking) {
      glow.style.display = 'block';
      orb.classList.add('active');
      vidIdle.style.opacity = '0';
      vidTalking.style.opacity = '1';
    } else {
      glow.style.display = 'none';
      orb.classList.remove('active');
      vidIdle.style.opacity = '1';
      vidTalking.style.opacity = '0';
      if (currentHighlightId) {
        removeHighlight(currentHighlightId);
        currentHighlightId = null;
      }
    }
  }

  function removeHighlight(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('avatar-highlighted');
      el.style.boxShadow = '';
      el.style.border = '';
    }
  }

  function applyHighlight(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('avatar-highlighted');
      el.style.boxShadow = '0 0 0 4px #818cf8';
      el.style.border = '2px solid #4f46e5';
      el.style.transition = 'all 0.3s';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function dismiss() {
    setSpeakingState(false);
    dialog.style.display = 'none';
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (typeInterval) clearInterval(typeInterval);
  }

  closeBtn.addEventListener('click', dismiss);

  function speakTTS(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const svVoice = voices.find(v => v.lang === 'es-SV' || v.lang === 'es_SV' || v.name.includes('Salvador'));
      if (svVoice) utterance.voice = svVoice;
      else {
        const esVoice = voices.find(v => v.lang.startsWith('es-') && (v.name.includes('Google') || v.name.includes('Microsoft')));
        if (esVoice) utterance.voice = esVoice;
      }
      try { window.speechSynthesis.speak(utterance); } catch (e) { console.warn(e); }
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
      setTimeout(setVoiceAndSpeak, 1000);
    } else {
      setVoiceAndSpeak();
    }
  }

  function typeText(text, optionsArray) {
    if (typeInterval) clearInterval(typeInterval);
    textEl.textContent = '';
    optionsEl.innerHTML = '';
    cursorEl.style.display = 'inline-block';
    
    let i = 0;
    typeInterval = setInterval(() => {
      textEl.textContent = text.substring(0, i + 1);
      i++;
      if (i >= text.length) {
        clearInterval(typeInterval);
        cursorEl.style.display = 'none';
        
        // Render options if any
        if (optionsArray && optionsArray.length > 0) {
          optionsArray.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.textContent = opt.label;
            btn.className = 'avatar-btn ' + (idx === 0 ? 'avatar-btn-primary' : 'avatar-btn-secondary');
            btn.onclick = () => {
              if (opt.action) {
                // If the action is a string, dispatch it as an event back to the app
                window.dispatchEvent(new CustomEvent(opt.action));
              }
              dismiss();
            };
            optionsEl.appendChild(btn);
          });
        }
      }
    }, 40);
  }

  // 4. API for Host Applications
  window.DemiempresaAvatar = {
    say: function(text, highlightId = null, interactiveOptions = null) {
      setSpeakingState(true);
      dialog.style.display = 'block';
      
      if (currentHighlightId) removeHighlight(currentHighlightId);
      if (highlightId) {
        currentHighlightId = highlightId;
        applyHighlight(highlightId);
      }
      
      speakTTS(text);
      typeText(text, interactiveOptions);
    },
    dismiss: dismiss
  };

  // 5. Global Event Listener for Cross-Domain triggers
  window.addEventListener('avatar:say', (e) => {
    const { text, highlightId, options } = e.detail;
    window.DemiempresaAvatar.say(text, highlightId, options);
  });

  // 6. Dragging Logic
  let isDragging = false;
  let startX, startY;
  let posX = 0, posY = 0;

  dragHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;
    container.style.transform = `translate(${posX}px, ${posY}px)`;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
})();
