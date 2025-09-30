let interfaz, plano;
let particleSystems = [];
let moleculaSystems = [];
let modo = 'sonido';
let osciladorSonido, osciladorMoleculas;
let contextoAudioActivado = false;
let haIniciado = false;

let arpegioClock = 0;
let arpegioSpeed = 150; 
let arpegioNoteIndex = 0;

let waveTypes = ['sine', 'triangle', 'square', 'saw'];
let currentWaveIndex = 0; 

let mouseTouchActivo = false;
let mouseTouchPos = { x: 0, y: 0 };
let phrase = "pppppoooooowwwwweeeeerrrrreeeedddd..bbyyy...vvvvvvVvVvVvAaAaAaAtTtTtTtTOoOoOo00000oOotTtTtrRrRraAaAavVvVvEeEeE";
let phraseIndex = 0;
let letterParticles = [];

let notaX, notaY;

function noCanvasScroll() {
  document.body.style.overflow = 'hidden';
}

let botonGrabar, botonBack, botonAcordes, botonParticulas;
let fondoBlanco = false;

const colors = {
  black: "#000000",
  darkGray: "#1A1A1A",
  magenta: "#FF00E6",
  pink: "#FF2AAF",
  red: "#FF004D",
  green: "#00FF73",
  cyan: "#00FFFF",
  yellow: "#FFFF00",
  white: "#F2F2F2"
};

// --- CLASE PARTICLE MODIFICADA ---
class Particle {
  constructor(x, y, origin) { // Se añade 'origin' para el modo 'saw'
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.5, 2));
    this.acc = createVector(0, 0);
    this.lifespan = 255;
    this.r = random(4, 8);
    
    // Propiedades nuevas
    this.origin = origin.copy(); // Guardamos el punto de origen
    this.turnTimer = 0; // Temporizador para la onda cuadrada
  }

  update() {
    // --- LÓGICA VISUAL BASADA EN LA ONDA ACTUAL ---
    let currentWave = waveTypes[currentWaveIndex];

    switch (currentWave) {
      case 'sine':
        // Movimiento suave y curvo (original)
        this.vel.rotate(0.01);
        break;
      
      case 'triangle':
        // Movimiento errático y nervioso
        this.vel.rotate(random(-0.1, 0.1));
        break;
        
      case 'square':
        // Movimiento en 90 grados
        this.turnTimer++;
        if (this.turnTimer > 30) { // Gira cada 30 frames
          this.vel.rotate(random() > 0.5 ? HALF_PI : -HALF_PI); // Gira 90 grados a la derecha o izquierda
          this.turnTimer = 0;
        }
        break;
        
      case 'saw':
        // Movimiento con "gravedad" hacia el origen
        let dir = p5.Vector.sub(this.origin, this.pos);
        dir.normalize();
        dir.mult(0.08); // Fuerza de la gravedad
        this.acc.add(dir);
        break;
    }
    
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 1.2;
    this.acc.mult(0); // Reiniciar la aceleración
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

// --- CLASE PARTICLESYSTEM MODIFICADA ---
class ParticleSystem {
  constructor() {
    this.origin = createVector(width / 2, height / 2);
    this.particles = [];
  }
  
  // Se modifica para pasar el origen a cada partícula nueva
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
        if (dist(this.particles[i].pos.x, this.particles[i].pos.y,
            this.particles[j].pos.x, this.particles[j].pos.y) < 50) {
          line(this.particles[i].pos.x, this.particles[i].pos.y,
            this.particles[j].pos.x, this.particles[j].pos.y);
        }
        const maxParticles = 100;
        if (this.particles.length > maxParticles) {
          this.particles.splice(0, this.particles.length - maxParticles);
        }
      }
    }
  }
}

class Molecula {
  constructor(x, y, letra) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 5));
    this.acc = createVector(0, 0);
    this.lifespan = 255;
    this.letra = letra;
    this.textSize = random(20, 50);
  }
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 2;
    this.vel.mult(0.98);
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

class MoleculaSystem {
  constructor() {
    this.origin = createVector(width / 2, height / 2);
    this.moleculas = [];
  }
  addMolecula(letra) {
    this.moleculas.push(new Molecula(this.origin.x, this.origin.y, letra));
  }
  run() {
    for (let i = this.moleculas.length - 1; i >= 0; i--) {
      let m = this.moleculas[i];
      m.update();
      m.display();
      if (m.isDead()) {
        this.moleculas.splice(i, 1);
      }
    }
  }
}

function preload() {
  interfaz = loadImage("fondonegro.png");
  plano = loadImage("assets/4f.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  notaX = width - 60;
  notaY = 60;
  noCanvasScroll();

  osciladorSonido = new p5.Oscillator(waveTypes[currentWaveIndex]);
  osciladorSonido.amp(0);
  osciladorSonido.start();

  osciladorMoleculas = new p5.Oscillator('triangle');
  osciladorMoleculas.amp(0);
  osciladorMoleculas.start();

  botonGrabar = select('.boton-grabar');
  botonBack = select('.boton-back');
  botonAcordes = select('.boton-acordes');
  botonParticulas = select('.boton-particulas');

  botonGrabar.mousePressed(() => { fondoBlanco = !fondoBlanco; });
  botonBack.mousePressed(() => { modo = 'sonido'; apagarOsciladores(); });
  botonAcordes.mousePressed(() => { modo = 'acordes'; apagarOsciladores(); });
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

  push();
  stroke(fondoBlanco ? 0 : 255, 80);
  strokeWeight(1);
  const limiteSuperior = height * 0.2;
  const limiteInferior = height;
  const alturaCuadricula = limiteInferior - limiteSuperior;
  for (let i = 1; i < 5; i++) {
    let y = limiteSuperior + (alturaCuadricula / 5) * i;
    line(0, y, width, y);
  }
  pop();

  let points;
  if (touches.length > 0) {
    points = touches;
  } else if (mouseTouchActivo) {
    mouseTouchPos.x = mouseX;
    mouseTouchPos.y = mouseY;
    points = [mouseTouchPos];
  } else {
    points = [];
  }

  let limite = height * 0.8;
  points = points.filter(p => p.y < limite);

  if (modo === 'sonido') {
    manejarParticulas(points, osciladorSonido);
  } else if (modo === 'arpegio') {
    manejarArpegio(points, osciladorSonido);
  } else if (modo === 'acordes') {
    manejarMoleculas(points, osciladorMoleculas);
  }

  for (let i = letterParticles.length - 1; i >= 0; i--) {
    let m = letterParticles[i];
    m.update();
    m.display();
    if (m.isDead()) {
      letterParticles.splice(i, 1);
      continue;
    }
    for (let j = i - 1; j >= 0; j--) {
      let other = letterParticles[j];
      let d = dist(m.pos.x, m.pos.y, other.pos.x, other.pos.y);
      if (d < 60) {
        stroke(fondoBlanco ? 0 : 255, 50);
        strokeWeight(1);
        line(m.pos.x, m.pos.y, other.pos.x, other.pos.y);
      }
    }
  }

  push();
  noStroke();
  fill(fondoBlanco ? 0 : 255, 50);
  textSize(50);
  textAlign(CENTER, CENTER);
  text('♫', notaX, notaY);
  pop();
}

function cambiarFormaOnda() {
  currentWaveIndex = (currentWaveIndex + 1) % waveTypes.length;
  osciladorSonido.setType(waveTypes[currentWaveIndex]);
  console.log("Forma de onda cambiada a: " + waveTypes[currentWaveIndex]);
}

function mousePressed() {
  if (!haIniciado) {
    activarContextoAudio();
    haIniciado = true;
  } else {
    let notaRadio = 30;
    if (dist(mouseX, mouseY, notaX, notaY) < notaRadio) {
      cambiarFormaOnda();
      return;
    }
  }

  if (touches.length === 0) {
    mouseTouchActivo = !mouseTouchActivo;
  }
}

function activarContextoAudio() {
  if (!contextoAudioActivado) {
    getAudioContext().resume();
    contextoAudioActivado = true;
  }
}

function activarOscilador(oscilador, frecuencia, volumen = 0.5) {
  oscilador.freq(frecuencia, 0.01);
  oscilador.amp(volumen, 0.05);
}

function manejarArpegio(points, oscilador) {
  manejarParticulas(points, null);

  if (points.length > 0) {
    let t = points[0];
    let resultado = getEscalaPorSlice(t);

    if (resultado) {
      let notasDelAcorde = resultado.escala;
      const limiteSuperior = height * 0.2;
      const limiteInferior = height;

      arpegioSpeed = map(t.y, limiteSuperior, limiteInferior, 50, 400);

      if (millis() - arpegioClock > arpegioSpeed) {
        let frecuenciaActual = escalasVertical[notasDelAcorde][arpegioNoteIndex];
        activarOscilador(oscilador, frecuenciaActual, 0.5);
        arpegioNoteIndex = (arpegioNoteIndex + 1) % escalasVertical[notasDelAcorde].length;
        arpegioClock = millis();
      }
    }
  } else {
    oscilador.amp(0, 0.1);
  }
}

function manejarParticulas(points, oscilador) {
  while (particleSystems.length < points.length) {
    particleSystems.push(new ParticleSystem());
  }
  while (particleSystems.length > points.length) {
    particleSystems.pop();
  }

  for (let i = 0; i < points.length; i++) {
    let t = points[i];
    let ps = particleSystems[i];
    ps.origin.set(t.x, t.y);
    ps.addParticle();
    ps.run();

    if (oscilador) {
      let resultado = getEscalaPorSlice(t);
      if (resultado) {
        activarOscilador(oscilador, resultado.frecuencia);
      }
    }
  }
  if (oscilador && points.length === 0) {
    oscilador.amp(0, 0.05);
  }
}

function manejarMoleculas(points, oscilador) {
  while (moleculaSystems.length < points.length) {
    moleculaSystems.push(new MoleculaSystem());
  }
  while (moleculaSystems.length > points.length) {
    moleculaSystems.pop();
  }

  for (let i = 0; i < points.length; i++) {
    let t = points[i];
    let ms = moleculaSystems[i];
    ms.origin.set(t.x, t.y);
    let nextLetter = phrase.charAt(phraseIndex);
    ms.addMolecula(nextLetter);
    phraseIndex = (phraseIndex + 1) % phrase.length;
    ms.run();
    if (oscilador) {
      let resultado = getEscalaPorSlice(t);
      if (resultado) {
        activarOscilador(oscilador, resultado.frecuencia);
      }
    }
  }
  if (oscilador && points.length === 0) {
    oscilador.amp(0, 0.05);
  }
}

function apagarOsciladores() {
  osciladorSonido.amp(0, 0.05);
  osciladorMoleculas.amp(0, 0.05);
  letterParticles = [];
}

const escalasVertical = {
    'Am': [220.00, 261.63, 293.66, 329.63, 392.00],
    'G':  [196.00, 220.00, 246.94, 293.66, 329.63],
    'C':  [261.63, 293.66, 329.63, 392.00, 440.00],
    'F':  [174.61, 220.00, 261.63, 293.66, 349.23]
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Actualizar la posición de la nota al cambiar el tamaño de la ventana
  notaX = width - 60;
  notaY = 60;
}
