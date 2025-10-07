// --- CONFIGURACIÓN GLOBAL DEL PROYECTO ---
const CONFIG = {
  // Partículas del Plexus
  PARTICLE_LIFESPAN_DECAY: 1.2,
  PARTICLE_CONNECTION_DISTANCE: 50,
  PARTICLE_MAX_PER_SYSTEM: 100,
  SINE_WAVE_ROTATION: 0.01,
  TRIANGLE_WAVE_ROTATION_MIN: -0.1,
  TRIANGLE_WAVE_ROTATION_MAX: 0.1,

  // Comportamiento de Ondas
  SQUARE_WAVE_TURN_INTERVAL: 30, // en frames
  SAW_WAVE_GRAVITY: 0.08,

  // Partículas de Texto ('Letras')
  LETRA_LIFESPAN_DECAY: 1.5,
  LETRA_MAX_SPEED: 4,
  LETRA_MAX_FORCE: 0.3,
  LETRA_ROTATION_SPEED_FACTOR: 0.02,

  // Interfaz
  NOTA_ICON_RADIO: 30,
  ARPEGGIO_SPEED_MIN: 50,  // ms
  ARPEGGIO_SPEED_MAX: 400, // ms
  AUDIO_AMP_ATTACK: 0.05,
  AUDIO_AMP_RELEASE: 0.1
};

// --- VARIABLES GLOBALES ---
let interfaz, plano;
let particleSystems = [];
let letterParticleSystems = []; // Cambiado de letraSystems
let modo = 'sonido';
let osciladorSonido, osciladorLetras;
let contextoAudioActivado = false;
let haIniciado = false;

let arpegioClock = 0;
let arpegioNoteIndex = 0;

let waveTypes = ['sine', 'triangle', 'square', 'saw'];
let currentWaveIndex = 0;

let mouseTouchActivo = false;
let mouseTouchPos = { x: 0, y: 0 };
let phrase = "POWERED BY VATOTRAVE"; // Frase limpia
let phraseIndex = 0;

let notaX, notaY;
let botonGrabar, botonBack, botonLetras, botonParticulas;
let fondoBlanco = false;

const colors = {
  black: "#000000",
  white: "#F2F2F2"
};

// --- CLASES ---

// Clase para el Plexus (del osc2 principal)
class Particle {
  constructor(x, y, origin) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.5, 2));
    this.acc = createVector(0, 0);
    this.lifespan = 255;
    this.r = random(4, 8);
    this.origin = origin.copy();
    this.turnTimer = 0;
  }
  update() {
    let currentWave = waveTypes[currentWaveIndex];
    switch (currentWave) {
      case 'sine': this.vel.rotate(CONFIG.SINE_WAVE_ROTATION); break;
      case 'triangle': this.vel.rotate(random(CONFIG.TRIANGLE_WAVE_ROTATION_MIN, CONFIG.TRIANGLE_WAVE_ROTATION_MAX)); break;
      case 'square':
        this.turnTimer++;
        if (this.turnTimer > CONFIG.SQUARE_WAVE_TURN_INTERVAL) {
          this.vel.rotate(random() > 0.5 ? HALF_PI : -HALF_PI);
          this.turnTimer = 0;
        }
        break;
      case 'saw':
        let dir = p5.Vector.sub(this.origin, this.pos);
        dir.normalize();
        dir.mult(CONFIG.SAW_WAVE_GRAVITY);
        this.acc.add(dir);
        break;
    }
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= CONFIG.PARTICLE_LIFESPAN_DECAY;
    this.acc.mult(0);
  }
  display() {
    fill(fondoBlanco ? 0 : 255, this.lifespan);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.r);
  }
  isDead() { return this.lifespan < 0; }
}

// Clase para el sistema del Plexus
class ParticleSystem {
  constructor() {
    this.origin = createVector(width / 2, height / 2);
    this.particles = [];
  }
  addParticle() {
    this.particles.push(new Particle(this.origin.x, this.origin.y, this.origin));
  }
  run() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.update();
      p.display();
      if (p.isDead()) { this.particles.splice(i, 1); }
    }
    stroke(fondoBlanco ? 0 : 255, 88);
    strokeWeight(1);
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        if (dist(this.particles[i].pos.x, this.particles[i].pos.y, this.particles[j].pos.x, this.particles[j].pos.y) < CONFIG.PARTICLE_CONNECTION_DISTANCE) {
          line(this.particles[i].pos.x, this.particles[i].pos.y, this.particles[j].pos.x, this.particles[j].pos.y);
        }
      }
    }
    if (this.particles.length > CONFIG.PARTICLE_MAX_PER_SYSTEM) {
      this.particles.splice(0, this.particles.length - CONFIG.PARTICLE_MAX_PER_SYSTEM);
    }
  }
}

// NUEVA CLASE PARA LAS LETRAS (DEL PROTOTIPO)
class LetterParticle {
  constructor(x, y, l, targetX, targetY) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 3));
    this.acc = createVector(0, 0);
    this.lifespan = 255;
    this.letter = l;
    this.angle = random(TWO_PI);
    this.target = createVector(targetX, targetY);
  }

  arrive() {
    let desired = p5.Vector.sub(this.target, this.pos);
    let d = desired.mag();
    let speed = CONFIG.LETRA_MAX_SPEED;
    if (d < 100) {
      speed = map(d, 0, 100, 0, CONFIG.LETRA_MAX_SPEED);
    }
    desired.setMag(speed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(CONFIG.LETRA_MAX_FORCE);
    return steer;
  }

  update() {
    this.acc.add(this.arrive());
    this.vel.add(this.acc);
    this.vel.limit(CONFIG.LETRA_MAX_SPEED);
    this.pos.add(this.vel);
    this.lifespan -= CONFIG.LETRA_LIFESPAN_DECAY;
    this.acc.mult(0);
    this.angle += this.vel.mag() * CONFIG.LETRA_ROTATION_SPEED_FACTOR;
  }

  display() {
    fill(fondoBlanco ? 0 : 255, this.lifespan);
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    textSize(20); // Tamaño fijo para consistencia
    textAlign(CENTER, CENTER);
    text(this.letter, 0, 0);
    pop();
  }

  isDead() { return this.lifespan < 0; }
}

// NUEVO SISTEMA PARA LAS LETRAS
class LetterParticleSystem {
  constructor() {
    this.origin = createVector(width / 2, height / 2);
    this.letterParticles = [];
  }
  addLetter(letter, targetX, targetY) {
    this.letterParticles.push(new LetterParticle(this.origin.x, this.origin.y, letter, targetX, targetY));
  }
  run() {
    for (let i = this.letterParticles.length - 1; i >= 0; i--) {
      let l = this.letterParticles[i];
      l.update();
      l.display();
      if (l.isDead()) {
        this.letterParticles.splice(i, 1);
      }
    }
  }
}

// --- FUNCIONES PRINCIPALES ---

function preload() {
  interfaz = loadImage("fondonegro.png");
  plano = loadImage("assets/4f.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  notaX = width - 60;
  notaY = 60;
  document.body.style.overflow = 'hidden';

  osciladorSonido = new p5.Oscillator(waveTypes[currentWaveIndex]);
  osciladorSonido.amp(0);
  osciladorSonido.start();
  osciladorLetras = new p5.Oscillator('triangle');
  osciladorLetras.amp(0);
  osciladorLetras.start();

  botonGrabar = select('.boton-grabar');
  botonBack = select('.boton-back');
  botonLetras = select('.boton-acordes');
  botonParticulas = select('.boton-particulas');

  botonGrabar.mousePressed(() => { fondoBlanco = !fondoBlanco; });
  botonBack.mousePressed(() => { modo = 'sonido'; apagarOsciladores(); });
  botonLetras.mousePressed(() => { modo = 'letras'; apagarOsciladores(); });
  botonParticulas.mousePressed(() => { modo = 'arpegio'; apagarOsciladores(); });
}

function draw() {
  if (!haIniciado) {
    background(colors.black);
    fill(colors.white);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("Toca la pantalla para comenzar", width / 2, height / 2);
    return;
  }

  background(fondoBlanco ? colors.white : colors.black, 40); // Fondo con estela
  if (!fondoBlanco) { image(interfaz, 0, 0, width, height); }

  push();
  tint(255, 0, 255, fondoBlanco ? 255 : 80);
  image(plano, 0, 0, width, height);
  pop();

  dibujarGuias();

  let points = (touches.length > 0) ? touches : (mouseTouchActivo ? [{ x: mouseX, y: mouseY }] : []);
  let limite = height * 0.8;
  points = points.filter(p => p.y < limite);

  if (modo === 'sonido') {
    manejarParticulas(points, osciladorSonido);
  } else if (modo === 'arpegio') {
    manejarArpegio(points, osciladorSonido);
  } else if (modo === 'letras') {
    manejarLetras(points, osciladorLetras);
  }

  push();
  noStroke();
  fill(fondoBlanco ? 0 : 255, 50);
  textSize(50);
  textAlign(CENTER, CENTER);
  text('♫', notaX, notaY);
  pop();
}

// --- FUNCIONES DE INTERACCIÓN ---

function mousePressed() {
  if (!haIniciado) {
    activarContextoAudio();
    haIniciado = true;
    return;
  }
  if (dist(mouseX, mouseY, notaX, notaY) < CONFIG.NOTA_ICON_RADIO) {
    cambiarFormaOnda();
    return;
  }
  if (touches.length === 0) {
    mouseTouchActivo = !mouseTouchActivo;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  notaX = width - 60;
  notaY = 60;
}

// --- FUNCIONES MANEJADORAS ---

function manejarParticulas(points, oscilador) {
  gestionarSistemas(points, particleSystems, ParticleSystem);
  for (let i = 0; i < points.length; i++) {
    let t = points[i];
    let ps = particleSystems[i];
    ps.origin.set(t.x, t.y);
    ps.addParticle();
    ps.run();
    procesarAudioParaPunto(t, oscilador);
  }
  apagarOsciladorSiNoHayPuntos(points, oscilador);
}

function manejarArpegio(points, oscilador) {
  manejarParticulas(points, null);
  if (points.length > 0) {
    let t = points[0];
    let resultado = getEscalaPorSlice(t);
    if (resultado) {
      let notasDelAcorde = resultado.escala;
      let arpegioSpeed = map(t.y, height * 0.2, height, CONFIG.ARPEGGIO_SPEED_MIN, CONFIG.ARPEGGIO_SPEED_MAX);
      if (millis() - arpegioClock > arpegioSpeed) {
        let frecuenciaActual = escalasVertical[notasDelAcorde][arpegioNoteIndex];
        activarOscilador(oscilador, frecuenciaActual, 0.5);
        arpegioNoteIndex = (arpegioNoteIndex + 1) % escalasVertical[notasDelAcorde].length;
        arpegioClock = millis();
      }
    }
  } else {
    oscilador.amp(0, CONFIG.AUDIO_AMP_RELEASE);
  }
}

// NUEVA FUNCIÓN MANEJADORA DE LETRAS
function manejarLetras(points, oscilador) {
  // 1. Dibuja el plexus/nido de fondo
  gestionarSistemas(points, particleSystems, ParticleSystem);
  for (let i = 0; i < points.length; i++) {
    let t = points[i];
    let ps = particleSystems[i];
    ps.origin.set(t.x, t.y);
    ps.addParticle();
    ps.run();
  }

  // 2. Gestiona y genera las letras desde los puntos de toque
  gestionarSistemas(points, letterParticleSystems, LetterParticleSystem);
  if (frameCount % 5 === 0) { // Controla la velocidad de generación
      for (let i = 0; i < points.length; i++) {
        let t = points[i];
        let lps = letterParticleSystems[i];
        lps.origin.set(t.x, t.y);
        
        // Evita generar espacios en blanco como letras
        let charToAdd = phrase.charAt(phraseIndex);
        if (charToAdd.trim() !== '') {
            let totalLetras = phrase.replace(/\s/g, '').length;
            let currentLetterIndex = phrase.substring(0, phraseIndex).replace(/\s/g, '').length;
            let espaciado = width / (totalLetras + 1);
            let targetX = espaciado * (currentLetterIndex + 1);
            let targetY = height / 2;
            lps.addLetter(charToAdd, targetX, targetY);
        }
        
        phraseIndex = (phraseIndex + 1) % phrase.length;
      }
  }
  
  // 3. Corre los sistemas de letras
  for (let lps of letterParticleSystems) {
      lps.run();
  }

  // 4. Gestiona el audio
  if (points.length > 0) {
      procesarAudioParaPunto(points[0], oscilador);
  }
  apagarOsciladorSiNoHayPuntos(points, oscilador);
}

// --- FUNCIONES AYUDANTES ---

function gestionarSistemas(puntos, listaDeSistemas, ClaseDelSistema) {
  while (listaDeSistemas.length < puntos.length) {
    listaDeSistemas.push(new ClaseDelSistema());
  }
  while (listaDeSistemas.length > puntos.length) {
    listaDeSistemas.pop();
  }
}

function procesarAudioParaPunto(punto, oscilador) {
  if (oscilador) {
    let resultado = getEscalaPorSlice(punto);
    if (resultado) {
      activarOscilador(oscilador, resultado.frecuencia);
    }
  }
}

function apagarOsciladorSiNoHayPuntos(puntos, oscilador) {
  if (oscilador && puntos.length === 0) {
    oscilador.amp(0, CONFIG.AUDIO_AMP_ATTACK);
  }
}

function activarOscilador(oscilador, frecuencia, volumen = 0.5) {
  oscilador.freq(frecuencia, 0.01);
  oscilador.amp(volumen, CONFIG.AUDIO_AMP_ATTACK);
}

function apagarOsciladores() {
  osciladorSonido.amp(0, CONFIG.AUDIO_AMP_ATTACK);
  osciladorLetras.amp(0, CONFIG.AUDIO_AMP_ATTACK);
}

function cambiarFormaOnda() {
  currentWaveIndex = (currentWaveIndex + 1) % waveTypes.length;
  let newType = waveTypes[currentWaveIndex];
  osciladorSonido.setType(newType);
  console.log("Forma de onda cambiada a: " + newType);
}

function activarContextoAudio() {
  if (!contextoAudioActivado) {
    getAudioContext().resume();
    contextoAudioActivado = true;
  }
}

const escalasVertical = {
  'Am': [220.00, 261.63, 329.63, 440.00, 523.25], // La, Do, Mi, La, Do
  'Em': [164.81, 196.00, 246.94, 329.63, 392.00], // Mi, Sol, Si, Mi, Sol
  'C':  [261.63, 329.63, 392.00, 523.25, 659.26], // Do, Mi, Sol, Do, Mi
  'G7': [196.00, 246.94, 293.66, 349.23, 392.00]  // Sol, Si, Re, Fa, Sol
};

function getEscalaPorSlice(puntoToque) {
  const limiteSuperior = height * 0.2;
  const limiteInferior = height;
  let anchoColumna = width / 4;
  let columna = floor(puntoToque.x / anchoColumna);
  
  let escalaSeleccionada;
  // Nueva progresión de acordes
  if (columna === 0) escalaSeleccionada = 'Am';
  else if (columna === 1) escalaSeleccionada = 'Em';
  else if (columna === 2) escalaSeleccionada = 'C';
  else if (columna === 3) escalaSeleccionada = 'G7';
  else return null;

  let notas = escalasVertical[escalaSeleccionada];
  let indice = floor(map(puntoToque.y, limiteSuperior, limiteInferior, 0, notas.length));
  indice = constrain(indice, 0, notas.length - 1);
  
  return { escala: escalaSeleccionada, frecuencia: notas[indice] };
}

function dibujarGuias() {
  push();
  strokeWeight(1.5);
  drawingContext.setLineDash([10, 10]);
  stroke(255, 0, 230, 40);
  let anchoColumna = width / 4;
  for (let i = 1; i < 4; i++) {
    let x = i * anchoColumna;
    line(x, 0, x, height);
  }
  drawingContext.setLineDash([]);
  pop();
}
