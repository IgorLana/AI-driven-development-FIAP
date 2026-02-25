// F5 — Elimina magic strings de roles em todo o frontend
export const Role = {
    EMPLOYEE: 'EMPLOYEE',
    MANAGER: 'MANAGER',
    ADMIN: 'ADMIN',
} as const;

export type RoleKey = keyof typeof Role;
