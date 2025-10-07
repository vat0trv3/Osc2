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
  LETRA_LIFESPAN_DECAY: 2,
  LETRA_VELOCITY_DECAY: 0.98,
  LETRA_CONNECTION_DISTANCE: 60,
  LETRA_MIN_TEXT_SIZE: 20,
  LETRA_MAX_TEXT_SIZE: 50,

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
let letraSystems = [];
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
let phrase = "P     O       W        E       R        E         D       B       Y        V       A      T     O       T       R       A       V         E     ";
let phraseIndex = 0;

let notaX, notaY;
let botonGrabar, botonBack, botonLetras, botonParticulas;
let fondoBlanco = false;

const colors = {
  black: "#000000",
  white: "#F2F2F2"
};

// --- CLASES ---

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
      case 'sine':
        this.vel.rotate(CONFIG.SINE_WAVE_ROTATION);
        break;
      case 'triangle':
        this.vel.rotate(random(CONFIG.TRIANGLE_WAVE_ROTATION_MIN, CONFIG.TRIANGLE_WAVE_ROTATION_MAX));
        break;
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

  isDead() {
    return this.lifespan < 0;
  }
}

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
      if (p.isDead()) {
        this.particles.splice(i, 1);
      }
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

class Letra { // Renombrada desde Molecula
  constructor(x, y, letra, targetX, targetY) { // Añadimos targetX y targetY
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 5));
    this.acc = createVector(0, 0);
    this.lifespan = 255;
    this.letra = letra;
    this.textSize = random(CONFIG.LETRA_MIN_TEXT_SIZE, CONFIG.LETRA_MAX_TEXT_SIZE);
    
    // ¡NUEVO! El destino de la letra
    this.target = createVector(targetX, targetY);
    this.maxSpeed = 4; // Velocidad máxima para que no se dispare
    this.maxForce = 0.3; // Fuerza de la "correa" que la jala
  }

  // ¡NUEVO! Comportamiento de "llegar" al destino (Arrive behavior)
  arrive() {
    let desired = p5.Vector.sub(this.target, this.pos);
    let d = desired.mag();
    let speed = this.maxSpeed;
    if (d < 100) {
      // Si está cerca, empieza a frenar
      speed = map(d, 0, 100, 0, this.maxSpeed);
    }
    desired.setMag(speed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  update() {
    // Aplicamos la fuerza de atracción hacia el destino
    let arriveForce = this.arrive();
    this.acc.add(arriveForce);

    // Mantenemos un poco de movimiento aleatorio para que no sea rígido
    let randomForce = p5.Vector.random2D().mult(0.1);
    this.acc.add(randomForce);

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.lifespan -= CONFIG.LETRA_LIFESPAN_DECAY;
    this.acc.mult(0); // Reiniciamos la aceleración
  }

  display() {
    fill(fondoBlanco ? 0 : 255, this.lifespan);
    noStroke();
    textSize(this.textSize);
    textAlign(CENTER, CENTER);
    text(this.letra, this.pos.x, this.pos.y);
  }

  isDead() {
    return this.lifespan < 0;
  }
}
class LetraSystem { // Renombrada desde MoleculaSystem
  constructor() {
    this.origin = createVector(width / 2, height / 2);
    this.letras = [];
  }
  // Modificamos esta línea para aceptar el destino
  addLetra(letra, targetX, targetY) { 
    this.letras.push(new Letra(this.origin.x, this.origin.y, letra, targetX, targetY));
  }
  run() {
    // ...el resto de la función run() se queda igual
    for (let i = this.letras.length - 1; i >= 0; i--) {
      let l = this.letras[i];
      l.update();
      l.display();
      if (l.isDead()) {
        this.letras.splice(i, 1);
      }
    }
  }
}
// --- FUNCIONES PRINCIPALES (SETUP Y DRAW) ---

function preload() {
  interfaz = loadImage("fondonegro.png");
  plano = loadImage("assets/4f.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  notaX = width - 60;
  notaY = 60;
  document.body.style.overflow = 'hidden'; // Evita scroll

  // Inicializar osciladores
  osciladorSonido = new p5.Oscillator(waveTypes[currentWaveIndex]);
  osciladorSonido.amp(0);
  osciladorSonido.start();

  osciladorLetras = new p5.Oscillator('triangle');
  osciladorLetras.amp(0);
  osciladorLetras.start();

  // Conectar botones del HTML
  botonGrabar = select('.boton-grabar');
  botonBack = select('.boton-back');
  botonLetras = select('.boton-acordes'); // Mantenemos la clase CSS por ahora
  botonParticulas = select('.boton-particulas');

  botonGrabar.mousePressed(() => { fondoBlanco = !fondoBlanco; });
  botonBack.mousePressed(() => { modo = 'sonido'; apagarOsciladores(); });
  botonLetras.mousePressed(() => { modo = 'letras'; apagarOsciladores(); }); // Modo renombrado
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

  background(fondoBlanco ? colors.white : colors.black);
  if (!fondoBlanco) { image(interfaz, 0, 0, width, height); }

  push();
  tint(255, 0, 255, fondoBlanco ? 255 : 80);
  image(plano, 0, 0, width, height);
  pop();

  dibujarGuias();

  // Determinar puntos de interacción (multitouch o mouse)
  let points = (touches.length > 0) ? touches : (mouseTouchActivo ? [{ x: mouseX, y: mouseY }] : []);
  let limite = height * 0.8;
  points = points.filter(p => p.y < limite);

  // Manejador de modo
  if (modo === 'sonido') {
    manejarParticulas(points, osciladorSonido);
  } else if (modo === 'arpegio') {
    manejarArpegio(points, osciladorSonido);
  } else if (modo === 'letras') { // Modo renombrado
    manejarLetras(points, osciladorLetras);
  }

  // Dibujar ícono de nota
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

// --- FUNCIONES MANEJADORAS (REFACTORIZADAS) ---

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
  manejarParticulas(points, null); // Usamos la misma lógica visual sin sonido

  if (points.length > 0) {
    let t = points[0];
    let resultado = getEscalaPorSlice(t);

    if (resultado) {
      let notasDelAcorde = resultado.escala;
      const limiteSuperior = height * 0.2;
      const limiteInferior = height;

      let arpegioSpeed = map(t.y, limiteSuperior, limiteInferior, CONFIG.ARPEGGIO_SPEED_MIN, CONFIG.ARPEGGIO_SPEED_MAX);

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

function manejarLetras(points, oscilador) { // Renombrada desde manejarMoleculas
  gestionarSistemas(points, letraSystems, LetraSystem);

  for (let i = 0; i < points.length; i++) {
    let t = points[i];
    let ls = letraSystems[i];
    ls.origin.set(t.x, t.y);
    let nextLetter = phrase.charAt(phraseIndex);
   // --- Bloque de código para reemplazar la línea original ---
    
    // 1. Calculamos el destino de la letra
    let totalLetras = phrase.length;
    let espaciado = width / (totalLetras + 1); // Espacio entre letras
    let targetX = espaciado * (phraseIndex + 1);
    let targetY = height / 2; // Centradas verticalmente

    // 2. Creamos la letra y le pasamos su destino
    ls.addLetra(nextLetter, targetX, targetY); 
    
    // --- Fin del bloque ---

    phraseIndex = (phraseIndex + 1) % phrase.length;
    ls.run();
    procesarAudioParaPunto(t, oscilador);
  }
  apagarOsciladorSiNoHayPuntos(points, oscilador);
}

// --- FUNCIONES AYUDANTES (LÓGICA REUTILIZABLE) ---

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
  'Am': [220.00, 261.63, 293.66, 329.63, 392.00],
  'G': [196.00, 220.00, 246.94, 293.66, 329.63],
  'C': [261.63, 293.66, 329.63, 392.00, 440.00],
  'F': [174.61, 220.00, 261.63, 293.66, 349.23]
};

function getEscalaPorSlice(puntoToque) {
  const limiteSuperior = height * 0.2;
  const limiteInferior = height;
  let anchoColumna = width / 4;
  let columna = floor(puntoToque.x / anchoColumna);
  
  let escalaSeleccionada;
  if (columna === 0) escalaSeleccionada = 'Am';
  else if (columna === 1) escalaSeleccionada = 'G';
  else if (columna === 2) escalaSeleccionada = 'C';
  else if (columna === 3) escalaSeleccionada = 'F';
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
