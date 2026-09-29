const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'houses.db');
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️ Старая база удалена');
}

const db = new Database(dbPath);
db.exec(`
    CREATE TABLE houses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT,
        street_type TEXT,
        street TEXT,
        house TEXT,
        uk TEXT,
        year_built TEXT,
        floors TEXT,
        total_area TEXT,
        living_area TEXT,
        status TEXT,
        type TEXT,
        fias_guid TEXT
    );
    CREATE UNIQUE INDEX idx_street_house ON houses(street_type, street, house);
`);

console.log('📊 Читаю CSV...');
const csvFile = path.join(__dirname, 'base.csv');
const csvData = fs.readFileSync(csvFile, 'utf8').replace(/^\uFEFF/, '');
const lines = csvData.split('\n').filter(l => l.trim());
console.log(`📄 Строк: ${lines.length}`);

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (char === '|' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else { current += char; }
    }
    result.push(current.trim());
    return result;
}

const stmt = db.prepare(
    `INSERT OR IGNORE INTO houses 
     (address, street_type, street, house, uk, year_built, floors, total_area, living_area, status, type, fias_guid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

let added = 0, duplicates = 0, skipped = 0;
let stats = { 'ул.': 0, 'пр-кт': 0, 'мкр': 0, 'б-р': 0, 'пер.': 0, other: 0 };

for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    const rawAddress = (cols[0] || '').replace(/^"|"$/g, '').trim();
    if (!rawAddress) { skipped++; continue; }

    const match = rawAddress.match(
        /г\.\s*Курган,\s*(ул\.|пр-кт\.?|пр\.|проспект|мкр\.?|микрорайон|б-р\.?|бульвар|пер\.?|переулок)\s*([^,]+),\s*д\.\s*(\d+[а-яa-z]*)/i
    );
    if (!match) { skipped++; continue; }

    let streetTypeRaw = match[1].trim().toLowerCase().replace(/\.$/, '');
    let streetType;
    if (streetTypeRaw === 'ул' || streetTypeRaw === 'улица') streetType = 'ул.';
    else if (streetTypeRaw === 'пр-кт' || streetTypeRaw === 'пр' || streetTypeRaw === 'проспект') streetType = 'пр-кт';
    else if (streetTypeRaw === 'мкр' || streetTypeRaw === 'микрорайон') streetType = 'мкр';
    else if (streetTypeRaw === 'б-р' || streetTypeRaw === 'бульвар') streetType = 'б-р';
    else if (streetTypeRaw === 'пер' || streetTypeRaw === 'переулок') streetType = 'пер.';
    else streetType = streetTypeRaw;

    const streetName = match[2].trim().toLowerCase();
    const house = match[3].trim().toLowerCase();
    const fullAddress = `г. Курган, ${streetType} ${match[2].trim()}, д. ${house}`;

    const rawUK = (cols[7] || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
    const shortUK = rawUK
        .replace(/ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ/g, 'ООО')
        .replace(/УПРАВЛЯЮЩАЯ ОРГАНИЗАЦИЯ/g, 'УО')
        .replace(/Управляющая организация/g, 'УО');

    // 🆕 Извлекаем FIAS GUID (колонка с индексом 2)
    const fiasGuid = (cols[2] || '').replace(/^"|"$/g, '').trim();

    const result = stmt.run(
        fullAddress, streetType, streetName, house, shortUK || 'Не указана',
        'Не указано', 'Не указано',
        `${(cols[10] || '0').replace(/^"|"$/g, '').trim()} м²`,
        `${(cols[11] || '0').replace(/^"|"$/g, '').trim()} м²`,
        (cols[9] || 'Не указано').replace(/^"|"$/g, '').trim(),
        (cols[8] || 'Не указан').replace(/^"|"$/g, '').trim(),
        fiasGuid
    );

    if (result.changes > 0) {
        added++;
        if (stats[streetType] !== undefined) stats[streetType]++;
        else stats.other++;
    } else {
        duplicates++;
    }
}

console.log(`\n🎉 Готово!`);
console.log(`✅ Всего уникальных домов: ${added}`);
console.log(`📁 База данных сохранена: houses.db`);
db.close();
