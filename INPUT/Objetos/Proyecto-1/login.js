// Verificación de las credenciales del login de gestion.html. Se carga
// después de credenciales.js (ver el orden de los <script defer> en
// gestion.html), así que `usuario` y `password` ya existen acá.
//
// Este archivo SOLO responde "¿estos datos son correctos?" (true/false). No
// abre el panel: eso lo decide gestion.js, que llama a verificarLogin() desde
// el listener del formulario y, si da true, llama a su iniciarGestion()
// privada. Por eso no importa que verificarLogin sea global: llamarla desde
// la consola solo devuelve true o false, no da acceso a nada.
//
// Lo que SÍ sería peligroso es REEMPLAZARLA (verificarLogin = () => true).
// Dos defensas contra eso:
//   1. Es `const`: reasignarla da TypeError: Assignment to constant variable.
//      (Con `function verificarLogin() {}` sí se podría reasignar.)
//   2. gestion.js guarda su propia referencia apenas carga, dentro de su
//      IIFE, así que aunque alguien lograra cambiar la global después, el
//      login sigue usando la original.
//
// OJO: sigue siendo práctica de front-end, no seguridad real. credenciales.js
// se descarga al navegador. En un sistema real esta función viviría en un
// servidor, y el navegador solo le mandaría los datos con fetch().
const verificarLogin = (usuarioIngresado, contrasenaIngresada) => {
    // Si credenciales.js está vacío o no define `usuario` y `password`,
    // usarlas directamente lanzaría un ReferenceError. typeof no lanza error
    // con variables que no existen: devuelve "undefined". Así, si faltan las
    // credenciales, nadie entra (el login falla "cerrado", no "abierto").
    if (typeof usuario === "undefined" || typeof password === "undefined") {
        return false;
    }

    // Los parámetros se llaman "...Ingresado/a" y NO `usuario`/`password` a
    // propósito: con esos nombres TAPARÍAN a las variables globales de
    // credenciales.js (shadowing) y la comparación sería usuario === usuario,
    // que siempre da true: entraría cualquiera.
    // El usuario se compara sin espacios sobrantes (trim); la contraseña NO,
    // porque un espacio también es parte de ella.
    return (
        usuarioIngresado.trim() === usuario &&
        contrasenaIngresada === password
    );
};
