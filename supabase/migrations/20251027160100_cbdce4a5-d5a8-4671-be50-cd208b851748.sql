-- Eliminar almacenes duplicados, manteniendo solo los correctos
DELETE FROM almacenes 
WHERE nombre IN ('Almacén Monterrey', 'Almacén San Luis', 'Taller Monterrey', 'Taller San Luis');