// =============================================================================
  // 1. DEFINICIÓN DE DATOS (MODELO)
  //    Un "Array" es una lista. Aquí guardamos 8 objetos, donde cada uno 
  //    representa un producto con su ID, nombre, precio e imagen.
  // =============================================================================
  const bike = [
    { id: 1, nombre: "Cafe Etiopia Natural",  precio: 32000, imagen: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80" },
    { id: 2, nombre: "Te Matcha Premium",     precio: 58000, imagen: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80" },
    { id: 3, nombre: "Miel Silvestre",        precio: 24000, imagen: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80" },
    { id: 4, nombre: "Granola Andina",        precio: 19500, imagen: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400&q=80" },
    { id: 5, nombre: "Chocolate Artesanal",   precio: 15000, imagen: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80" },
    { id: 6, nombre: "Aceite de Coco Virgen", precio: 27000, imagen: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
    { id: 7, nombre: "Quinua Real",           precio: 22000, imagen: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
    { id: 8, nombre: "Panela Organica",       precio: 12000, imagen: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" }
  ];

  // =============================================================================
  // 2. ESTADO DEL JUEGO (VARIABLES GLOBALES)
  //    Estas variables guardan la información de lo que está pasando en el juego
  //    en un momento dado.
  // =============================================================================
  var carta1           = null;  // Guarda el elemento HTML de la primera carta clickeada
  var carta2           = null;  // Guarda el elemento HTML de la segunda carta clickeada
  var id1              = null;  // ID del producto de la primera carta
  var id2              = null;  // ID del producto de la segunda carta
  var esperando        = false; // Bloquea clics mientras se comparan dos cartas
  var paresEncontrados = 0;     // Contador de cuántas parejas han sido halladas
  var intentos         = 0;     // Contador de cuántas veces el usuario ha intentado un par

  // Variables para el control del Cronómetro (Timer)
  var timerInterval  = null;  // Guardará el intervalo para poder detenerlo luego
  var segundosJuego  = 0;     // Tiempo total en segundos
  var juegoActivo    = false; // Indica si el usuario está jugando actualmente

  // =============================================================================
  // 3. FUNCIONES DEL CRONÓMETRO
  // =============================================================================

  /**
   * iniciaTimer: Comienza a contar el tiempo desde cero.
   * setInterval ejecuta una función cada 1000 milisegundos (1 segundo).
   */
  function iniciarTimer() {
    // Si ya había un timer, lo limpiamos para evitar que corran varios a la vez
    clearInterval(timerInterval);
    segundosJuego = 0;
    juegoActivo   = true;

    timerInterval = setInterval(function() {
      if (!juegoActivo) return; // Si el juego se detuvo, no hacemos nada
      segundosJuego++;

      // Cálculo de minutos (mm) y segundos (ss)
      var mm  = String(Math.floor(segundosJuego / 60)).padStart(2, '0');
      var ss  = String(segundosJuego % 60).padStart(2, '0');
      
      var hud = document.getElementById('hud-timer');
      hud.textContent = mm + ':' + ss;

      // Efecto visual: si pasa de 2 minutos, ponemos el texto en rojo
      if (segundosJuego >= 120) {
        hud.classList.add('danger');
      }
    }, 1000);
  }

  /**
   * detenerTimer: Para el cronómetro.
   */
  function detenerTimer() {
    juegoActivo = false;
    clearInterval(timerInterval);
  }

  /**
   * formatearTiempo: Convierte segundos a formato MM:SS para mostrar en la victoria.
   */
  function formatearTiempo(segs) {
    var mm = String(Math.floor(segs / 60)).padStart(2, '0');
    var ss = String(segs % 60).padStart(2, '0');
    return mm + ':' + ss;
  }

  // =============================================================================
  // 4. ALGORITMO DE MEZCLA (SHUFFLE)
  //    Usa el método Fisher-Yates para desordenar una lista de forma aleatoria.
  // =============================================================================
  function shuffle(array) {
    var copia = array.slice(); // Creamos una copia para no alterar el original
    for (var i = copia.length - 1; i > 0; i--) {
      // Elegimos un índice al azar entre 0 e i
      var j = Math.floor(Math.random() * (i + 1));
      // Intercambiamos los elementos en la posición i y j
      var tmp = copia[i];
      copia[i] = copia[j];
      copia[j] = tmp;
    }
    return copia;
  }

  // =============================================================================
  // 5. RENDERIZAR TABLERO (CREACIÓN DE CARTAS)
  //    Esta función toma los datos y crea los elementos visuales en el HTML.
  // =============================================================================
  function renderizarTablero() {
    var tablero = document.getElementById('tablero');
    tablero.innerHTML = ''; // Limpiamos el tablero por si hay algo previo

    /**
     * Preparamos el mazo:
     * 1. productos.concat(productos) duplica la lista (8 -> 16 items)
     * 2. shuffle(...) los desordena
     */
    var mazo = shuffle(bike.concat(bike));

    // Recorremos cada producto del mazo para crear su carta
    mazo.forEach(function(producto) {

      // Crear el div contenedor de la carta
      var flipCard = document.createElement('div');
      flipCard.classList.add('flip-card');
      // Guardamos el ID del producto en un atributo "data" para saber qué producto es al hacer clic
      flipCard.dataset.idProducto = producto.id;

      // Construimos el HTML interno de la carta con sus dos caras
      flipCard.innerHTML =
        '<div class="flip-card-inner">' +
          '<div class="flip-card-front">' +
        '<img class="img-reverso" src ="https://scontent-bog2-1.xx.fbcdn.net/v/t1.6435-9/194939999_4320212197997586_6399374311391451483_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=0327a3&_nc_ohc=8gF5cYgxM-sQ7kNvwHnJlda&_nc_oc=Adr1lR8yz6Rvk-ny8BAxrvBaU3fcuO0CEwBkyQ-pFY3y7CvlffuhT-QJn5mM1M5RDbE&_nc_zt=23&_nc_ht=scontent-bog2-1.xx&_nc_gid=nh3vOCKlB5MPrbyAKcCI7Q&_nc_ss=7a389&oh=00_Af1acNBXPCqBFHc6nLOZ69CE3f3VdyObowIdmfJSHGYI-w&oe=6A04A6EF" >'+
       
          '</div>' +
          '<div class="flip-card-back">' +
            '<img src="' + producto.imagen + '" alt="' + producto.nombre + '" loading="lazy" />' +
            '<div class="info-producto">' +
              '<p class="nombre-producto">' + producto.nombre + '</p>' +
              '<p class="precio-producto">$' + producto.precio.toLocaleString('es-CO') + '</p>' +
            '</div>' +
          '</div>' +
        '</div>';

      /**
       * Escuchador de Eventos (Event Listener):
       * Cuando el usuario hace clic en la carta, se ejecuta 'manejarClic'.
       */
      flipCard.addEventListener('click', function() {
        manejarClic(flipCard);
      });

      // Insertamos la carta completa en el tablero del HTML
      tablero.appendChild(flipCard);
    });

    // Una vez creadas las cartas, iniciamos el cronómetro
    iniciarTimer();
  }

  // =============================================================================
  // 6. LÓGICA DE CONTROL (MANEJAR CLIC)
  //    Controla qué pasa cuando tocas una carta.
  // =============================================================================
  function manejarClic(carta) {
    // Validaciones de seguridad:
    if (esperando)                              return; // No dejar clickear si hay cartas comparándose
    if (carta.classList.contains('volteada'))   return; // No dejar clickear si ya está volteada
    if (carta.classList.contains('encontrada')) return; // No dejar clickear si ya es un par resuelto

    // Efecto visual: añadimos la clase que hace el giro 3D
    carta.classList.add('volteada');

    // CASO A: Es la primera carta del turno que se voltea
    if (!carta1) {
      carta1 = carta;
      id1    = carta.dataset.idProducto;
      return; // Salimos de la función y esperamos el segundo clic
    }

    // CASO B: Es la segunda carta del turno
    carta2 = carta;
    id2    = carta.dataset.idProducto;
    
    // Aumentamos el contador de intentos y actualizamos el HUD
    intentos++;
    document.getElementById('hud-intentos').textContent = intentos;
    
    esperando = true; // Bloqueamos nuevos clics temporalmente

    // COMPARACIÓN: ¿Tienen el mismo ID de producto?
    if (id1 === id2) {
      // ¡Es un par!
      procesarParEncontrado();
    } else {
      // No coinciden, esperamos un poco y las devolvemos a su estado original
      setTimeout(voltearDeNuevo, 900);
    }
  }

  /**
   * procesarParEncontrado: Se ejecuta cuando las dos cartas elegidas son iguales.
   */
  function procesarParEncontrado() {
    // Quitamos el estado temporal 'volteada' y ponemos el permanente 'encontrada'
    carta1.classList.remove('volteada');
    carta2.classList.remove('volteada');
    carta1.classList.add('encontrada', 'bloqueada');
    carta2.classList.add('encontrada', 'bloqueada');

    paresEncontrados++;
    document.getElementById('hud-pares').textContent = paresEncontrados + '/8';

    // Limpiamos las variables de turno para el siguiente par
    limpiarSeleccion();

    // ¿Ganó el juego?
    if (paresEncontrados === bike.length) {
      detenerTimer();
      setTimeout(mostrarVictoria, 500); // Esperamos un poco para mostrar el mensaje
    }
  }

  /**
   * voltearDeNuevo: Se ejecuta cuando las cartas NO coinciden (las oculta).
   */
  function voltearDeNuevo() {
    carta1.classList.remove('volteada');
    carta2.classList.remove('volteada');
    limpiarSeleccion();
  }

  /**
   * limpiarSeleccion: Reinicia las variables temporales de elección.
   */
  function limpiarSeleccion() {
    carta1    = null;
    carta2    = null;
    id1       = null;
    id2       = null;
    esperando = false;
  }

  // =============================================================================
  // 7. MENSAJE DE VICTORIA Y PREMIACIÓN
  // =============================================================================
  function mostrarVictoria() {
    var codigo    = "TIENDA10";
    var descuento = "10% de descuento en tu proxima compra";

    // Lógica de premios según el desempeño del jugador
    if (intentos <= 10 && segundosJuego <= 60) {
      codigo    = "EXPERTO30";
      descuento = "30%! Eres un maestro de la memoria";
    } else if (intentos <= 14) {
      codigo    = "TIENDA20";
      descuento = "20% de descuento en tu proxima compra";
    } else if (intentos <= 20) {
      codigo    = "TIENDA15";
      descuento = "15% de descuento en tu proxima compra";
    }

    // Actualizamos los textos del modal de victoria
    document.getElementById('codigo-descuento').textContent = codigo;
    document.getElementById('desc-descuento').textContent   = descuento;
    document.getElementById('stat-tiempo').textContent      = formatearTiempo(segundosJuego);
    document.getElementById('stat-intentos').textContent    = intentos;
    
    // Hacemos visible el overlay
    document.getElementById('overlay-victoria').classList.add('visible');
  }

  // =============================================================================
  // 8. REINICIAR EL JUEGO
  // =============================================================================
  function reiniciarJuego() {
    // Ocultar modal y reiniciar todas las variables de estado
    document.getElementById('overlay-victoria').classList.remove('visible');
    carta1           = null;
    carta2           = null;
    id1              = null;
    id2              = null;
    esperando        = false;
    paresEncontrados = 0;
    intentos         = 0;
    
    // Resetear textos en la interfaz
    document.getElementById('hud-intentos').textContent = '0';
    document.getElementById('hud-pares').textContent    = '0/8';
    document.getElementById('hud-timer').textContent    = '00:00';
    document.getElementById('hud-timer').classList.remove('danger');
    
    // Volver a crear y mezclar las cartas
    renderizarTablero();
  }

  // =============================================================================
  // 9. CONFIGURACIÓN FINAL (EVENT LISTENERS)
  // =============================================================================
  
  // Asignamos la función de reiniciar a los botones correspondientes
  document.getElementById('btn-reiniciar').addEventListener('click', reiniciarJuego);
  document.getElementById('btn-jugar-de-nuevo').addEventListener('click', reiniciarJuego);

  // ARRANCAR EL JUEGO POR PRIMERA VEZ
  renderizarTablero();