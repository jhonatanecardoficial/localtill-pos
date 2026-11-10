-- =====================================================
-- SEED - Dados iniciais do sistema PDV Local
-- =====================================================

-- Senha padrão: admin123 (hash bcrypt)
-- Este hash será gerado pelo setup.ts, mas está aqui como referência
-- $2a$10$... (gerado em runtime)

-- 1. Criar filial padrão
INSERT INTO branches (id, name, code, address, is_active)
VALUES (
    gen_random_uuid(),
    'Filial Principal',
    'F001',
    'Endereço da filial principal',
    true
);

-- 2. Configurações do sistema
INSERT INTO system_settings (key, value, description) VALUES
    ('max_branches', '10', 'Número máximo de filiais'),
    ('max_users', '50', 'Número máximo de usuários'),
    ('backup_enabled', 'true', 'Backup automático ativado'),
    ('backup_schedule', '0 2 * * *', 'Cron schedule do backup (02:00 diário)'),
    ('backup_retention_days', '30', 'Dias para manter backups'),
    ('backup_path', './backups', 'Pasta de destino dos backups'),
    ('server_name', 'PDV Server', 'Nome do servidor na rede'),
    ('server_port', '3000', 'Porta do servidor');

-- 3. Configurações da organização
INSERT INTO organization_settings (currency, locale, timezone, company_name)
VALUES ('BRL', 'pt-BR', 'America/Sao_Paulo', 'Minha Empresa');

-- 4. Configurações de fidelidade (desativado por padrão)
INSERT INTO loyalty_settings (points_per_real, reais_per_point, is_active)
VALUES (1, 0.01, false);

-- NOTA: O usuário admin será criado pelo script setup.ts
-- pois precisa de hash bcrypt gerado em runtime
