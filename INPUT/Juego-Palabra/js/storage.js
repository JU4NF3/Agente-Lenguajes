// MINI BASE DE DATOS EN localStorage
// Imita la forma de trabajar de Supabase que usamos en clase:
//   Supabase:  db.from('productos_práctica').insert([datos]).select()
//   Aquí:      db.from('games').insert([datos])
// Cada método devuelve { data, error }, el mismo patrón de siempre:
// primero se revisa error y solo después se usa data.
//
// La diferencia: aquí la "tabla" es un arreglo de objetos guardado como
// texto JSON dentro del navegador, no una tabla en un servidor.

const db = {
  from(table) {
    const key = `letrario:${table}`;

    // lee la tabla completa (un arreglo). Si no existe todavía, arreglo vacío.
    function readAll() {
      try {
        return JSON.parse(localStorage.getItem(key)) ?? [];
      } catch {
        return [];
      }
    }

    function writeAll(rows) {
      localStorage.setItem(key, JSON.stringify(rows));
    }

    // envuelve cada operación: si algo falla (por ejemplo, el navegador
    // bloquea localStorage), se devuelve el error en vez de romper el juego
    function run(operation) {
      try {
        return { data: operation(), error: null };
      } catch (error) {
        console.log(`Error en la tabla ${table}:`, error);
        return { data: null, error };
      }
    }

    return {
      // CREATE — como .insert([datos]).select(): recibe un ARRAY de objetos,
      // les pone id y fechas, y devuelve las filas creadas
      insert(newRows) {
        return run(() => {
          const rows = readAll();
          const now = new Date().toISOString();
          const created = newRows.map((row) => ({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
            ...row,
            createdAt: now,
            updatedAt: now,
          }));
          writeAll([...rows, ...created]);
          return created;
        });
      },

      // READ — como .select('*') con .eq(): filter es un objeto con las
      // columnas que deben coincidir, ej. { mode: 'daily', date: '2026-11-02' }.
      // Sin filtro devuelve todas las filas.
      select(filter = {}) {
        return run(() =>
          readAll().filter((row) =>
            Object.entries(filter).every(([column, value]) => row[column] === value)
          )
        );
      },

      // UPDATE — como .update(cambios).eq('id', id).select(): solo cambia las
      // columnas que vengan en "changes", y solo en la fila con ese id
      update(id, changes) {
        return run(() => {
          const rows = readAll();
          let updated = null;
          const newRows = rows.map((row) => {
            if (row.id !== id) return row;
            updated = { ...row, ...changes, updatedAt: new Date().toISOString() };
            return updated;
          });
          writeAll(newRows);
          // igual que Supabase con RLS: si no encontró la fila, no hay error,
          // simplemente no se actualizó nada (arreglo vacío)
          return updated ? [updated] : [];
        });
      },

      // DELETE — como .delete().eq('id', id).select(): devuelve las filas
      // que SÍ se borraron. Sin id borra toda la tabla.
      delete(id) {
        return run(() => {
          const rows = readAll();
          if (id === undefined) {
            writeAll([]);
            return rows;
          }
          writeAll(rows.filter((row) => row.id !== id));
          return rows.filter((row) => row.id === id);
        });
      },
    };
  },
};
