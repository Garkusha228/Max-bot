const Database = require('better-sqlite3');
const db = new Database('./houses.db', { readonly: true });
const count = db.prepare('SELECT COUNT(*) as c FROM houses').get();
console.log(`Домов в базе: ${count.c}`);
if (count.c > 0) {
    const sample = db.prepare('SELECT * FROM houses LIMIT 3').all();
    console.log(JSON.stringify(sample, null, 2));
} else {
    console.log('⚠️ БАЗА ПУСТАЯ! Нужно пересоздать через init-db.js');
}
db.close();
