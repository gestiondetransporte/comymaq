import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";
import { differenceInDays as fnsDifferenceInDays } from "date-fns";

// Zona horaria de Monterrey, Nuevo León (UTC-6, sin DST)
export const MTY_TZ = "America/Monterrey";

/**
 * Formatea una fecha en la zona horaria de Monterrey.
 * Soporta strings (incluyendo 'YYYY-MM-DD' de columnas DATE de Postgres) y Date.
 */
export function formatMty(
  date: string | Date | null | undefined,
  fmt: string = "dd/MMM/yyyy"
): string {
  if (!date) return "N/A";
  try {
    // Para fechas tipo 'YYYY-MM-DD' (columnas DATE), se interpretan como medianoche
    // en la zona horaria de Monterrey, NO como UTC, para evitar el desfase de un día.
    const input =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? `${date}T00:00:00-06:00`
        : date;
    return formatInTimeZone(input, MTY_TZ, fmt, { locale: es });
  } catch {
    return "N/A";
  }
}

/**
 * Devuelve la fecha actual ajustada a la zona horaria de Monterrey.
 * Útil para cálculos relativos (días transcurridos, vencimiento, etc.).
 */
export function nowMty(): Date {
  return toZonedTime(new Date(), MTY_TZ);
}

/**
 * Convierte una fecha (string DATE o ISO) a Date en zona horaria de Monterrey.
 */
export function toMty(date: string | Date): Date {
  const input =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? `${date}T00:00:00-06:00`
      : date;
  return toZonedTime(input, MTY_TZ);
}

/**
 * Diferencia en días entre dos fechas, evaluadas en zona horaria de Monterrey.
 */
export function diffDaysMty(
  end: string | Date,
  start: string | Date = new Date()
): number {
  return fnsDifferenceInDays(toMty(end), toMty(start));
}

/**
 * Devuelve un timestamp ISO (UTC) que representa "ahora" en Monterrey.
 * Equivalente funcional a new Date().toISOString(), ya que el instante en
 * el tiempo es el mismo independientemente de la zona horaria.
 */
export function nowMtyIso(): string {
  return new Date().toISOString();
}
