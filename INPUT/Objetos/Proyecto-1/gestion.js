// Lógica de gestion.html. Se carga después de data.js (ver el orden de los
// <script defer> en gestion.html), así que el array `perritos` ya existe acá.

const sidebarItems = document.querySelectorAll(".sidebar__item");
const gestionContent = document.getElementById("gestion-content");

// Arma y engancha el formulario de "Crear" dentro de #gestion-content.
// Un campo por cada propiedad del objeto perrito (ver data.js): el tipo de
// input depende del tipo de dato (number para edad/altura/aura, checkbox
// para activo, texto para el resto). "poderes" es un array en los datos,
// así que acá se pide como texto separado por comas y se convierte a
// array recién al armar el objeto nuevo.
function renderFormularioCrear() {
    gestionContent.innerHTML = `
        <h2 class="gestion-main__title">Crear perrito</h2>
        <form class="form" id="form-crear">
            <label class="form__field">
                <span>Nombre</span>
                <input type="text" name="nombre" required>
            </label>
            <label class="form__field">
                <span>Raza</span>
                <input type="text" name="raza" required>
            </label>
            <label class="form__field">
                <span>Universo</span>
                <input type="text" name="universo" required>
            </label>
            <label class="form__field">
                <span>Imagen (URL)</span>
                <input type="url" name="imagen" required>
            </label>
            <label class="form__field form__field--full">
                <span>Descripción</span>
                <textarea name="description" rows="3" required></textarea>
            </label>
            <label class="form__field">
                <span>Edad</span>
                <input type="number" name="edad" min="0" required>
            </label>
            <label class="form__field">
                <span>Altura (m)</span>
                <input type="number" name="altura" min="0" step="0.01" required>
            </label>
            <label class="form__field">
                <span>Aura</span>
                <input type="number" name="aura" min="0" required>
            </label>
            <label class="form__field form__field--checkbox">
                <input type="checkbox" name="activo" checked>
                <span>Activo</span>
            </label>
            <label class="form__field form__field--full">
                <span>Poderes (separados por coma)</span>
                <input type="text" name="poderes" placeholder="ej: volar, teletransportar juguetes" required>
            </label>
            <fieldset class="form__field form__field--full form__field--radios">
                <legend>¿Dónde se agrega al arreglo?</legend>
                <label class="form__radio">
                    <input type="radio" name="posicion" value="inicio">
                    <span>Al inicio</span>
                </label>
                <label class="form__radio">
                    <input type="radio" name="posicion" value="final" checked>
                    <span>Al final</span>
                </label>
            </fieldset>
            <button class="form__submit" type="submit">Agregar</button>
        </form>
    `;

    const formulario = document.getElementById("form-crear");

    formulario.addEventListener("submit", (event) => {
        event.preventDefault(); // evita que el form recargue la página
        const datos = new FormData(formulario);

        const nuevoPerrito = {
            nombre: datos.get("nombre").trim(),
            raza: datos.get("raza").trim(),
            universo: datos.get("universo").trim(),
            imagen: datos.get("imagen").trim(),
            description: datos.get("description").trim(),
            edad: Number(datos.get("edad")),
            altura: Number(datos.get("altura")),
            aura: Number(datos.get("aura")),
            activo: datos.get("activo") === "on", // el checkbox solo manda "on" cuando está marcado
            // "perro, gato" -> ["perro", "gato"]: separa por coma, quita espacios
            // sobrantes y descarta entradas vacías (ej. si quedó una coma de más)
            poderes: datos
                .get("poderes")
                .split(",")
                .map((poder) => poder.trim())
                .filter((poder) => poder !== ""),
        };

        // unshift lo pone al inicio (posición 0), push lo pone al final —
        // mismo par de métodos que ya usan los botones de Arrays.
        if (datos.get("posicion") === "inicio") {
            perritos.unshift(nuevoPerrito);
        } else {
            perritos.push(nuevoPerrito);
        }

        // Redirige a "Mostrar todos" para que el perrito recién creado se
        // vea de una vez dentro de la tabla, ya agregado.
        activarSidebarItem("mostrar-todos");
    });
}

// Arma la tabla con TODOS los perritos y TODAS sus propiedades dentro de
// #gestion-content. Se vuelve a llamar cada vez que se entra a "Mostrar
// todos", así que siempre refleja el estado actual del array perritos
// (incluye los que se hayan creado desde el formulario).
function renderTablaMostrarTodos() {
    const filas = perritos
        .map(
            (perrito) => `
                <tr>
                    <td><img class="tabla__imagen" src="${perrito.imagen}" alt="${perrito.nombre}"></td>
                    <td>${perrito.nombre}</td>
                    <td>${perrito.raza}</td>
                    <td>${perrito.universo}</td>
                    <td>${perrito.edad}</td>
                    <td>${perrito.altura}m</td>
                    <td>${perrito.aura}</td>
                    <td>${perrito.activo ? "Sí" : "No"}</td>
                    <td>${perrito.poderes.join(", ")}</td>
                    <td>${perrito.description}</td>
                </tr>
            `
        )
        .join("");

    gestionContent.innerHTML = `
        <h2 class="gestion-main__title">Todos los perritos (${perritos.length})</h2>
        <div class="tabla-wrapper">
            <table class="tabla">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th>Nombre</th>
                        <th>Raza</th>
                        <th>Universo</th>
                        <th>Edad</th>
                        <th>Altura</th>
                        <th>Aura</th>
                        <th>Activo</th>
                        <th>Poderes</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

// Marca como activo el ítem del sidebar con ese data-action y ejecuta su
// lógica correspondiente. Se usa tanto al hacer click como al redirigir
// automáticamente desde el formulario de Crear.
function activarSidebarItem(action) {
    sidebarItems.forEach((item) => {
        item.classList.toggle("active", item.dataset.action === action);
    });

    if (action === "crear") {
        renderFormularioCrear();
    } else if (action === "mostrar-todos") {
        renderTablaMostrarTodos();
    }
    // leer, actualizar, eliminar: todavía sin implementar
}

sidebarItems.forEach((item) => {
    item.addEventListener("click", () => activarSidebarItem(item.dataset.action));
});
