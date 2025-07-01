// api/db/seeds/01_create_admin_user.js
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set in .env file. Skipping admin user seed.');
    return;
  }

  // Хешируем пароль из .env. Он будет использован ТОЛЬКО если мы создаем нового пользователя.
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const userId = crypto.randomUUID();

  // Данные для вставки нового пользователя
  const adminUserData = {
    id: userId,
    email: adminEmail,
    name: 'Super Admin',
    password_hash: hashedPassword,
    role: 'admin',
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Данные для обновления, если пользователь уже существует.
  // ВАЖНО: Мы не обновляем пароль! Только роль.
  const adminRoleUpdate = {
    role: 'admin',
    updated_at: new Date(),
  };

  try {
    // Выполняем операцию "UPSERT"
    await knex('users')
      .insert(adminUserData)
      .onConflict('email') // Если возникает конфликт по уникальному полю 'email'
      .merge(adminRoleUpdate); // ...то не вставляем, а обновляем существующую запись данными из merge()

    console.log(`Admin privileges ensured for user ${adminEmail}.`);
  } catch (error) {
    console.error(`Error during admin user seed: ${error.message}`);
  }
};