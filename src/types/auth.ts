export type UserRole = 'owner' | 'admin' | 'manager' | 'cashier' | 'stock_manager' | 'operator' | 'stock_clerk';

export interface User {
    id: string;
    email: string;
    full_name: string;
    branch_id?: string;
    roles: UserRole[];
}
