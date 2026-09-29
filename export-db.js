const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, 'houses.db'), { readonly: true });

const rows = db.prepare('SELECT address, street, house, uk, status, type FROM houses ORDER BY street, house').all();

// Создаём CSV
let csv = 'Адрес,Улица,Дом,УК,Состояние,Тип\n';
rows.forEach(row => {
    csv += `"${row.address}","${row.street}","${row.house}","${row.uk}","${row.status}","${row.type}"\n`;
});

fs.writeFileSync(path.join(__dirname, 'houses_list.csv'), csv, 'utf8');
console.log(`✅ Экспортировано ${rows.length} домов в файл houses_list.csv`);

db.close();
