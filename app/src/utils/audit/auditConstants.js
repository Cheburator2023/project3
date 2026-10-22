/**
 * Константы для модуля аудита.
 */

/**
 * Известные роли ролевой модели СУМ.
 * Используются как приоритетный источник staff_roleId при отсутствии
 * корректных данных из РМ.
 */
const KNOWN_ROLES = new Set([
    // Управление моделями / DS
    'ds',
    'ds_lead',
    'ds_editor',
    'de',
    'de_lead',
    'mipm',
    'mipm_lead',
    'modelops',
    'modelops_lead',
    // Валидация
    'validator',
    'validator_lead',
    // Бизнес-заказчик
    'business_customer',
    // Аудит / безопасность
    'auditor',
    'auditor_lead',
    'audit_admin',
    // Системные
    'admin',
    'staff',
    'trust',
]);

/**
 * Список технических каналов, которые не соответствуют контракту 24. vtb
 * и должны быть нормализованы в internal или service.
 */
const TECHNICAL_CHANNELS = new Set([
    'http', 'graphql', 'rest', 'ws', 'grpc', // пользовательские/API
    'kafka', 'bpmn', 'system', 'keycloak', 'validation' // системные
]);

/**
 * Список допустимых каналов согласно контракту 24. vtb.
 */
const VALID_CHANNELS = new Set([
    'internal', 'external', 'apic', 'service', 'smmb', 'smbguest', 'trust', 'unknown'
]);

module.exports = {
    KNOWN_ROLES,
    TECHNICAL_CHANNELS,
    VALID_CHANNELS,
};