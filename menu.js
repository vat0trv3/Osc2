
window.addEventListener('DOMContentLoaded', () => {
  // Crear menú
  const menuContainer = document.createElement('div');
  menuContainer.id = 'menu-editable';
  menuContainer.innerHTML = `
    <button class="close-btn">X</button>
    <div class="menu-box">
      <h3>Configuración</h3>

      <label>Idioma:</label>
      <select id="idioma-selector">
        <option value="ES">Español</option>
        <option value="EN">English</option>
      </select>

      <label>Tempo (BPM):</label>
      <input type="range" id="tempo-slider" min="60" max="180" value="120">
      <span id="tempo-value">120</span>

      <label>Texto a dibujar:</label>
      <input type="text" id="texto-input" placeholder="Escribe aquí...">

      <button id="instrucciones-btn">Instrucciones</button>

      <label>Tema visual:</label>
      <select id="tema-selector">
        <option value="oscuro">Oscuro</option>
        <option value="claro">Claro</option>
      </select>

      <!-- Acordes -->
      <label>Columna 1:</label>
      <select id="columna1-selector">
        <option value="Em">Em</option>
        <option value="Am">Am</option>
        <option value="Dm">Dm</option>
        <option value="Bm">Bm</option>
      </select>

      <label>Columna 2:</label>
      <select id="columna2-selector">
        <option value="Em">Em</option>
        <option value="Am">Am</option>
        <option value="Dm">Dm</option>
        <option value="Bm">Bm</option>
      </select>

      <label>Columna 3:</label>
      <select id="columna3-selector">
        <option value="Em">Em</option>
        <option value="Am">Am</option>
        <option value="Dm">Dm</option>
        <option value="Bm">Bm</option>
      </select>

      <label>Columna 4:</label>
      <select id="columna4-selector">
        <option value="Em">Em</option>
        <option value="Am">Am</option>
        <option value="Dm">Dm</option>
        <option value="Bm">Bm</option>
      </select>
    </div>
  `;
  document.body.appendChild(menuContainer);

  // Abrir menú
  const openBtn = document.getElementById('open-menu-btn');
  openBtn.addEventListener('click', () => {
    menuContainer.style.display = 'block';
    openBtn.style.display = 'none';
  });

  // Cerrar menú
  const closeBtn = menuContainer.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    menuContainer.style.display = 'none';
    openBtn.style.display = 'block';
  });

  // === Resto de tus listeners ===
  const tempoSlider = document.getElementById('tempo-slider');
  const tempoValue = document.getElementById('tempo-value');
  tempoSlider.addEventListener('input', () => {
    tempoValue.textContent = tempoSlider.value;
  });

  const textoInput = document.getElementById('texto-input');
  textoInput.addEventListener('input', () => {
    window.phrase = textoInput.value || "VAVATOTOTRATRAVAVEVE";
    window.phraseIndex = 0;
  });

  const temaSelector = document.getElementById('tema-selector');
  temaSelector.addEventListener('change', () => {
    window.fondoBlanco = temaSelector.value === 'claro';
  });

  const instruccionesBtn = document.getElementById('instrucciones-btn');
  instruccionesBtn.addEventListener('click', () => {
    alert("Toca la pantalla para generar visuales. Usa los botones para cambiar modos. Puedes grabar y exportar tu sesión.");
  });

  window.acordesPorColumna = ['Em', 'Am', 'Dm', 'Bm'];
  ['columna1','columna2','columna3','columna4'].forEach((id,i)=>{
    document.getElementById(`${id}-selector`).addEventListener('change', e=>{
      window.acordesPorColumna[i] = e.target.value;
    });
  });
});
