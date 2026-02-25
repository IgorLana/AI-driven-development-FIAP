/**
 * Seção 2 (Fase 5) — Elimina todos os `any` nos controllers e decorators.
 * Interface que representa o usuário autenticado extraído do JWT via @CurrentUser().
 * Espelha o JwtPayload mas com campos tipados para uso nos controllers.
 */
export interface AuthenticatedUser {
    id: string;
    email: string;
    role: string;
    companyId: string;
}
