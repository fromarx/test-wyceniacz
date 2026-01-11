import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Zwraca istniejące połączenie lub tworzy nowe, jeśli nie istnieje.
 * Zapobiega błędom NullPointerException przy równoległych zapytaniach.
 */
export const getDbConnection = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('QuoteMasterProDB.db');
  }
  return dbInstance;
};

export const initDatabase = async () => {
  const db = await getDbConnection();

  try {
    // Włączamy WAL (wydajność) oraz Foreign Keys (spójność danych)
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT, firstName TEXT, lastName TEXT, companyName TEXT,
        nip TEXT, phone TEXT, address TEXT, city TEXT, postalCode TEXT,
        logo TEXT, notificationsEnabled INTEGER, pdfThemeColor TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT, description TEXT, netPrice REAL, vatRate REAL,
        unit TEXT, categoryId TEXT, materialMode TEXT, estimatedMaterialPrice REAL,
        FOREIGN KEY (categoryId) REFERENCES categories (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY NOT NULL,
        firstName TEXT, lastName TEXT, phone TEXT, email TEXT,
        companyName TEXT, nip TEXT, street TEXT, houseNo TEXT,
        apartmentNo TEXT, postalCode TEXT, city TEXT, notes TEXT, createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS clientReminders (
        id TEXT PRIMARY KEY NOT NULL,
        clientId TEXT, date TEXT, time TEXT, topic TEXT,
        completed INTEGER, notified INTEGER,
        FOREIGN KEY (clientId) REFERENCES clients (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY NOT NULL,
        number TEXT, date TEXT, clientId TEXT,
        clientFirstName TEXT, clientLastName TEXT, clientPhone TEXT,
        clientEmail TEXT, clientCompany TEXT, clientNip TEXT,
        serviceStreet TEXT, serviceHouseNo TEXT, serviceApartmentNo TEXT,
        servicePostalCode TEXT, serviceCity TEXT, status TEXT,
        totalNet REAL, totalVat REAL, totalGross REAL
      );

      CREATE TABLE IF NOT EXISTS quoteItems (
        id TEXT PRIMARY KEY NOT NULL,
        quoteId TEXT, serviceId TEXT, name TEXT, quantity REAL,
        netPrice REAL, vatRate REAL, unit TEXT, materialMode TEXT,
        estimatedMaterialPrice REAL,
        FOREIGN KEY (quoteId) REFERENCES quotes (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY NOT NULL,
        quoteItemId TEXT, name TEXT, price REAL, unit TEXT,
        quantity REAL, consumption REAL,
        FOREIGN KEY (quoteItemId) REFERENCES quoteItems (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS shoppingLists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT, createdAt TEXT,
        items TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};