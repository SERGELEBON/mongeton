/**
 * Équivalent minimal de `Either<Error, Value>` (Arrow) utilisé par Ivy :
 * une fonction qui peut échouer renvoie un résultat typé au lieu de lever une exception.
 */
export type Result<E, T> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<never, T> => ({ ok: true, value });
export const err = <E>(error: E): Result<E, never> => ({ ok: false, error });
