import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

const TIMEZONE = 'Europe/Paris';

/**
 * Convertit une valeur datetime-local (ex: "2026-06-15T20:00")
 * en UTC ISO string, en interprétant l'entrée comme heure de Paris.
 */
export function parisLocalToUTC(datetimeLocalValue: string): string {
  return zonedTimeToUtc(datetimeLocalValue, TIMEZONE).toISOString();
}

/**
 * Convertit un UTC ISO string en format datetime-local
 * en heure de Paris (pour pré-remplir les formulaires).
 * Retourne le format "YYYY-MM-DDTHH:mm"
 */
export function utcToParisLocal(isoString: string): string {
  const parisDate = utcToZonedTime(new Date(isoString), TIMEZONE);
  return format(parisDate, "yyyy-MM-dd'T'HH:mm", { timeZone: TIMEZONE });
}

/**
 * Formate un UTC ISO string pour affichage en heure de Paris.
 */
export function formatParisDate(
  isoString: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Date(isoString).toLocaleString('fr-FR', {
    timeZone: TIMEZONE,
    ...options,
  });
}
