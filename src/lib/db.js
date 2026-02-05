import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 Estrutura:
 /data/database.sqlite
*/
const dataDir = path.join(__dirname, "../../data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log("✅ Pasta data criada");
}

const dbPath = path.join(dataDir, "database.sqlite");
console.log("📁 Banco:", dbPath);

let db = null;

export function getDB() {
  if (!db) {
    console.log("🔌 Conectando ao SQLite...");
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("❌ Erro ao conectar:", err);
        process.exit(1);
      }
      console.log("✅ SQLite conectado");
    });

    db.run("PRAGMA foreign_keys = ON");
  }
  return db;
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/* ---------- Inicialização ---------- */
export function initializeDatabase() {
  const database = getDB();

  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // ✅ TABELA USERS
      database.run(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) {
            console.error("❌ Erro ao criar tabela users:", err);
            reject(err);
          } else {
            console.log("✅ Tabela users criada/verificada");
          }
        }
      );

      // ✅ ÍNDICE EMAIL
      database.run(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
         ON users(email)`,
        (err) => {
          if (err) console.error("❌ Erro ao criar índice email:", err);
          else console.log("✅ Índice users.email criado");
        }
      );

      // ✅ TABELA TRAINING
      database.run(
        `CREATE TABLE IF NOT EXISTS training (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          day1_exercises TEXT,
          day2_exercises TEXT,
          day3_exercises TEXT,
          day4_exercises TEXT,
          day5_exercises TEXT,
          day6_exercises TEXT,
          day7_exercises TEXT,
          current_day INTEGER DEFAULT 1,
          generated_at DATETIME,
          ai_model TEXT DEFAULT 'llama-3.3-70b-versatile',
          user_preferences TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        )`,
        (err) => {
          if (err) {
            console.error("❌ Erro ao criar tabela training:", err);
            reject(err);
          } else {
            console.log("✅ Tabela training criada/verificada");
          }
        }
      );

      // ✅ ÍNDICE TRAINING.USER_ID
      database.run(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_training_user_id
         ON training(user_id)`,
        (err) => {
          if (err) {
            console.error("❌ Erro ao criar índice training:", err);
            reject(err);
          } else {
            console.log("✅ Índice training.user_id criado");
          }
        }
      );

      // ✅ MIGRAÇÃO: Adicionar colunas Google OAuth (se não existirem)
      database.all(`PRAGMA table_info(users)`, [], (err, columns) => {
        if (err) {
          console.error("❌ Erro ao verificar colunas users:", err);
          return;
        }

        const columnNames = columns.map((col) => col.name);

        // Adicionar google_id se não existe
        if (!columnNames.includes("google_id")) {
          database.run(
            `ALTER TABLE users ADD COLUMN google_id TEXT`,
            (err) => {
              if (err) {
                console.error("❌ Erro ao adicionar google_id:", err);
              } else {
                console.log("✅ Coluna google_id adicionada");
                // ✅ CRIAR ÍNDICE APENAS APÓS ADICIONAR A COLUNA
                database.run(
                  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`,
                  (err) => {
                    if (err) console.error("❌ Erro ao criar índice google_id:", err);
                    else console.log("✅ Índice users.google_id criado");
                  }
                );
              }
            }
          );
        } else {
          console.log("✅ Coluna google_id já existe");
          // Se coluna já existe, criar índice
          database.run(
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`,
            (err) => {
              if (err) console.error("❌ Erro ao criar índice google_id:", err);
              else console.log("✅ Índice users.google_id criado");
            }
          );
        }

        // Adicionar profile_picture se não existe
        if (!columnNames.includes("profile_picture")) {
          database.run(
            `ALTER TABLE users ADD COLUMN profile_picture TEXT`,
            (err) => {
              if (err) console.error("❌ Erro ao adicionar profile_picture:", err);
              else console.log("✅ Coluna profile_picture adicionada");
            }
          );
        } else {
          console.log("✅ Coluna profile_picture já existe");
        }
      });

      // ✅ MIGRAÇÃO: Adicionar coluna diasSemana na tabela training
      database.all(`PRAGMA table_info(training)`, [], (err, columns) => {
        if (err) {
          console.error("❌ Erro ao verificar colunas training:", err);
          return;
        }

        const columnNames = columns.map((col) => col.name);

        // ✅ Adicionar diasSemana se não existe
        if (!columnNames.includes("diasSemana")) {
          database.run(
            `ALTER TABLE training ADD COLUMN diasSemana INTEGER DEFAULT 5`,
            (err) => {
              if (err) {
                console.error("❌ Erro ao adicionar diasSemana:", err);
              } else {
                console.log("✅ Coluna diasSemana adicionada com sucesso!");
              }
            }
          );
        } else {
          console.log("✅ Coluna diasSemana já existe");
        }

        console.log("✅ Banco de dados totalmente inicializado");
        resolve();
      });
    });
  });
}

// ✅ FECHAR BANCO (ao desligar servidor)
export function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) console.error("❌ Erro ao fechar banco:", err);
      else console.log("✅ Banco fechado");
      db = null;
    });
  }
}

// ✅ EXPORT DEFAULT
export default {
  getDB,
  dbGet,
  dbRun,
  dbAll,
  initializeDatabase,
  closeDatabase,
};
