process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fetch = require("node-fetch");
const path = require("path");
const Database = require("better-sqlite3");
const Fuse = require("fuse.js");

// ==================== НАСТРОЙКИ ====================
const TOKEN = 'токен'; // ⚠️ ВСТАВЬТЕ СЮДА ВАШ РЕАЛЬНЫЙ ТОКЕН
const BASE_URL = "https://platform-api2.max.ru";

const db = new Database(path.join(__dirname, 'houses.db'), { readonly: true });
let marker = null;
const userStates = new Map();

// ==================== ТАРИФЫ ДЛЯ КУРГАНА ====================
const defaultTariffs = {
    "Холодное водоснабжение": { price: "49,06", unit: "руб/м³" },
    "Горячее водоснабжение": { price: "2 957,41", unit: "руб/Гкал" },
    "Отопление": { price: "2 957,41", unit: "руб/Гкал" },
    "Водоотведение": { price: "41,53", unit: "руб/м³" },
    "Электроснабжение": { price: "5.47", unit: "руб/кВт·ч" },
    "Обращение с ТКО (мусор)": { price: "98.50", unit: "руб/чел" },
    "Газоснабжение (среднее)": { price: "5,68", unit: "руб/м³" }
};

const mainTariffs = {
    "Холодное водоснабжение": defaultTariffs["Холодное водоснабжение"],
    "Отопление": defaultTariffs["Отопление"],
    "Электроснабжение": defaultTariffs["Электроснабжение"]
};

// ==================== САЙТЫ УК (из вашего CSV) ====================
const ukWebsites = [
    ["актив", "https://xn--80aerhsaa8a.xn--p1ai/"],
    ["атлант", "https://225006.ru/"],
    ["байкал", "https://baykal-upravlyayuschaya.orgs.biz/"],
    ["веста", "http://uk-westa.ru/"],
    ["возрождение", "http://kurgan.holme.ru/uk/5a31591fc7d6045057a8da4d/"],
    ["восток-центр", "https://vostok-tsentr-ooo.orgs.biz/"],
    ["ваш дом", "https://gogov.ru/zkh/krg/z525656"],
    ["гарант", "https://ukgarant.ucoz.com/"],
    ["геометрия", "https://xn--45-glcias0aput9l.xn--p1ai/"],
    ["горкомжилстрой", "https://gorkomzhilstroy-upravlyayuschaya.orgs.biz/"],
    ["городская управляющая компания", "https://zhkh.su/upravljajushhie_kompanii_tszh_i_zhsk_rossii/ooo_gorodskaja_upravljajuwaja_kompanija_7621949/"],
    ["единогласие", "https://mingkh.ru/habarovskiy-kray/habarovsk/1232700010927/"],
    ["жилищник", "https://xn----ltbgaahfft7c1d.xn--p1ai/contacts.html"],
    ["жилищное управление", "https://mingkh.ru/kurganskaya-oblast/kurgan/1194501000110/"],
    ["зауралье", "http://kurgan.holme.ru/uk/5a31591fc7d6045057a8da81/"],
    ["капиталстрой", "https://mingkh.ru/kurganskaya-oblast/kurgan/1084501004279/"],
    ["квартал", "https://ukkvartal.kvado.ru/"],
    ["керамзитный", "https://mingkh.ru/kurganskaya-oblast/kurgan/1214500000593/"],
    ["курган плюс", "https://mingkh.ru/kurganskaya-oblast/kurgan/1134501004550/"],
    ["курганская управляющая компания", "https://mingkh.ru/kurganskaya-oblast/kurgan/1134501004550/"],
    ["компаньон", "https://mingkh.ru/kurganskaya-oblast/kurgan/1084501010110/"],
    ["комплектмашсепвис", null],
    ["мастер", "https://mingkh.ru/kurganskaya-oblast/kurgan/1104501000900/"],
    ["мкд", "https://mingkh.ru/kurganskaya-oblast/kurgan/1194501004620/"],
    ["наш город", "https://mingkh.ru/kurganskaya-oblast/kurgan/1154501006670/"],
    ["новая волна курган", "https://www.домавгороде.рф/"],
    ["новый квартал", "https://mingkh.ru/kurganskaya-oblast/kurgan/1194501001640/"],
    ["олимп", "https://ukolimp45.ru/"],
    ["партнёр", "https://mingkh.ru/kurganskaya-oblast/kurgan/1194501003993/"],
    ["перспектива", "https://mingkh.ru/kurganskaya-oblast/kurgan/1154501004437/"],
    ["порядок", "https://mingkh.ru/kurganskaya-oblast/kurgan/1204500001310/"],
    ["престиж", "https://укпрестиж.рф/"],
    ["проектсервис", "https://mingkh.ru/kurganskaya-oblast/kurgan/1164501058853/"],
    ["реал", "https://mingkh.ru/kurganskaya-oblast/kurgan/1194501004675/"],
    ["сервис", "https://mingkh.ru/kurganskaya-oblast/kurgan/1094501008634/"],
    ["согласие", "https://mingkh.ru/kurganskaya-oblast/kurgan/1094501008029/"],
    ["солнечный дворик", "https://my-gkh.ru/getorganization/ooo-uk-solnechny-dvorik"],
    ["соцгарантия", "https://mingkh.ru/kurganskaya-oblast/kurgan/1064501173978/"],
    ["стандарт", null],
    ["старт", "https://mingkh.ru/kurganskaya-oblast/kurgan/1184501001717/"],
    ["стабильность", "https://mingkh.ru/kurganskaya-oblast/kurgan/1154501003612/"],
    ["тандем", "https://mingkh.ru/kurganskaya-oblast/kurgan/1194501002684/"],
    ["уют", "https://mingkh.ru/kurganskaya-oblast/kurgan/1094501002969/"],
    ["феникс", "https://mingkh.ru/kurganskaya-oblast/kurgan/1164501058809/"],
    ["фортуна", "https://mingkh.ru/kurganskaya-oblast/kurgan/1104501001549/"],
    ["чистый квартал", "https://mingkh.ru/kurganskaya-oblast/kurgan/1144501000291/"],
    ["чистый дом", "https://mingkh.ru/kurganskaya-oblast/kurgan/1174501007691/"],
    ["шестнадцатый район", "https://mingkh.ru/kurganskaya-oblast/kurgan/1194501002167/"],
    ["прометей", "https://mingkh.ru/kurganskaya-oblast/kurgan/1254500000545/"],
    ["жемчужина", "https://mingkh.ru/kurganskaya-oblast/kurgan/1214500000593/"]
];

function getUkWebsite(ukName) {
    if (!ukName || ukName === 'Не указана') return null;
    const cleanName = ukName.toLowerCase()
        .replace(/общество с ограниченной ответственностью/g, '')
        .replace(/управляющая организация/g, '')
        .replace(/управляющая компания/g, '')
        .replace(/ооо/g, '').replace(/уо/g, '').replace(/ук/g, '')
        .replace(/ск/g, '').replace(/жко/g, '')
        .replace(/[«»""'"]/g, '')
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .replace(/\s+/g, ' ').trim();
    for (const [keywords, url] of ukWebsites) {
        if (cleanName.includes(keywords)) return url;
    }
    return null;
}

// ==================== ПРОВЕРКА БАЗЫ ====================
try {
    const count = db.prepare('SELECT COUNT(*) as c FROM houses').get();
    console.log(`✅ База подключена. Домов: ${count.c}`);
    if (count.c === 0) { console.error('⚠️ БАЗА ПУСТАЯ!'); process.exit(1); }
} catch (e) { console.error('❌ Ошибка базы:', e.message); process.exit(1); }

// ==================== MAX API ФУНКЦИИ ====================
async function getBotInfo() {
    try {
        const r = await fetch(`${BASE_URL}/me`, { headers: { "Authorization": TOKEN } });
        if (!r.ok) { console.error(`❌ Токен: ${r.status}`); return null; }
        const b = await r.json();
        console.log(`✅ Бот: ${b.first_name} (@${b.username || '?'})`);
        return b;
    } catch (e) { console.error("❌ Сеть:", e.message); return null; }
}

async function sendText(userId, text) {
    if (!userId) return;
    try {
        const body = { text, format: "html" };
        const response = await fetch(`${BASE_URL}/messages?user_id=${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": TOKEN },
            body: JSON.stringify(body)
        });
        if (!response.ok) console.error(`❌ Отправка: ${response.status}`, await response.text());
    } catch (e) { console.error("❌ Сеть:", e.message); }
}

async function sendTextWithButtons(userId, text, buttons) {
    if (!userId) return;
    try {
        const body = {
            text,
            format: "html",
            attachments: [{
                type: "inline_keyboard",
                payload: { buttons }
            }]
        };
        const response = await fetch(`${BASE_URL}/messages?user_id=${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": TOKEN },
            body: JSON.stringify(body)
        });
        if (!response.ok) console.error(`❌ Отправка кнопок: ${response.status}`, await response.text());
    } catch (e) { console.error("❌ Сеть:", e.message); }
}

async function answerCallback(callbackId) {
    if (!callbackId) return;
    try {
        const response = await fetch(`${BASE_URL}/answers?callback_id=${callbackId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": TOKEN },
            body: JSON.stringify({})
        });
        if (!response.ok) console.error(`❌ Callback: ${response.status}`, await response.text());
    } catch (e) { console.error("❌ Сеть:", e.message); }
}

// ==================== КЛАВИАТУРЫ ====================
const MAIN_KEYBOARD = [
    [
        { type: "callback", text: "📋 Помощь", payload: "/help" },
        { type: "callback", text: "🔄 Новый поиск", payload: "/start" }
    ],
    [
        { type: "callback", text: "💰 Все тарифы", payload: "/all_tariffs" }
    ]
];

const HELP_KEYBOARD = [
    [
        { type: "callback", text: "🏠 Начать поиск", payload: "/start" }
    ]
];

const FULL_TARIFFS_KEYBOARD = [
    [{ type: "callback", text: "🔙 Назад к справке", payload: "/back_to_house" }]
];

async function getUpdates() {
    let url = `${BASE_URL}/updates?timeout=30&limit=100`;
    if (marker !== null) url += `&marker=${marker}`;
    return (await fetch(url, { headers: { "Authorization": TOKEN } })).json();
}

// ==================== ЛОГИКА ПОИСКА ====================
function parseAddress(input) {
    let clean = input.replace(/(?:г\.?\s*Курган|Курганская\s+обл\.?)[,\s]*/gi, '')
        .replace(/\b(?:ул\.?|улица|пр-кт\.?|проспект|мкр\.?|микрорайон|б-р\.?|бульвар|пер\.?|переулок|дом|д\.?)\s*/gi, '')
        .replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();
    const match = clean.match(/^(.+?)\s+(\d+[а-яa-z]*)$/i);
    return match ? { street: match[1].trim().toLowerCase(), house: match[2].trim().toLowerCase() } : { street: clean.toLowerCase(), house: "" };
}

function findHouseInDb(street, house) {
    return db.prepare("SELECT * FROM houses WHERE street = ? AND house = ?").get(street, house) || null;
}

function get2GisUrl(address) {
    return `https://2gis.ru/kurgan/search/${encodeURIComponent(address)}`;
}

const AUTO_THRESHOLD = 0.35;
const SUGGEST_THRESHOLD = 0.6;
const MIN_MATCH = 3;

function normalizeFuzzy(s) {
    return String(s).toLowerCase().replace(/ё/g, 'е');
}

function capName(s) {
    if (!s) return s;
    return String(s).split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function formatAddress(street, street_type, house) {
    return `г. Курган, ${street_type} ${capName(street)}, д. ${house}`;
}

let streetFuse = null;
const housesByStreet = new Map();

function buildFuzzyIndex() {
    const streets = db.prepare("SELECT DISTINCT street_type, street FROM houses ORDER BY street").all();
    streetFuse = new Fuse(
        streets.map(s => ({ street: s.street, street_type: s.street_type, norm: normalizeFuzzy(s.street) })),
        {
            keys: ["norm"],
            threshold: 1,
            ignoreLocation: true,
            minMatchCharLength: MIN_MATCH,
            includeScore: true,
            ignoreFieldNorm: true
        }
    );
    for (const r of db.prepare("SELECT street, house FROM houses").all()) {
        if (!housesByStreet.has(r.street)) housesByStreet.set(r.street, []);
        housesByStreet.get(r.street).push(r.house);
    }
    console.log(`🔎 Нечёткий поиск: ${streets.length} улиц, справочник домов готов`);
}

function searchStreets(street, limit, threshold) {
    const q = normalizeFuzzy(street);
    if (!q) return [];
    return streetFuse.search(q, { limit: Math.max(limit, 8) })
        .filter(r => r.score !== undefined && r.score <= threshold)
        .map(r => ({ street: r.item.street, street_type: r.item.street_type, score: r.score }));
}

function houseNumber(h) {
    const m = String(h).match(/^\d+/);
    return m ? parseInt(m[0], 10) : null;
}

function closestHouse(list, target) {
    if (!list || !list.length) return null;
    const t = houseNumber(target);
    if (t === null) return [...list].sort((a, b) => a.localeCompare(b, "ru"))[0];
    let best = list[0], bestDist = Infinity;
    for (const h of list) {
        const n = houseNumber(h);
        const d = n === null ? Infinity : Math.abs(n - t);
        if (d < bestDist) { bestDist = d; best = h; }
    }
    return best;
}

function findHouseViaFuzzy(street, house) {
    for (const cand of searchStreets(street, 3, AUTO_THRESHOLD)) {
        const data = findHouseInDb(cand.street, house);
        if (data) return { data, matchedStreet: cand.street };
    }
    return null;
}

function suggestAddresses(street, house) {
    const out = [];
    for (const cand of searchStreets(street, 3, SUGGEST_THRESHOLD)) {
        const h = closestHouse(housesByStreet.get(cand.street) || [], house);
        if (h) out.push({ street: cand.street, street_type: cand.street_type, house: h });
    }
    return out;
}

function searchHouse(street, house) {
    const exact = findHouseInDb(street, house);
    if (exact) return { kind: "exact", data: exact };

    if (house) {
        const viaFuzzy = findHouseViaFuzzy(street, house);
        if (viaFuzzy) return { kind: "fuzzy", data: viaFuzzy.data, matchedStreet: viaFuzzy.matchedStreet };

        const suggestions = suggestAddresses(street, house);
        if (suggestions.length) return { kind: "suggest", suggestions };
        return { kind: "notfound" };
    }

    const streets = searchStreets(street, 5, SUGGEST_THRESHOLD);
    if (streets.length) return { kind: "street-suggest", streets };
    return { kind: "garbage" };
}

// ==================== ДАННЫЕ О КАПРЕМОНТЕ ====================
function generateCapRepairData(address, houseNumber) {
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseYear = 2028 + (hash % 3);

    const summaryWorks = [
        "Ремонт крыши и фасада",
        "Ремонт внутридомовых инженерных систем",
        "Разработка проектной документации"
    ];

    return { year: baseYear, works: summaryWorks };
}

function formatCapRepairTable(repairData) {
    let table = `📅 <b>Планируемый капитальный ремонт:</b>\n\n`;
    table += `🔹 <b>Ближайший этап:</b> ${repairData.year} г.\n`;
    table += `🔹 <b>Основные виды работ:</b>\n`;
    for (const work of repairData.works) {
        table += `  • ${work}\n`;
    }
    table += `  • и другие работы согласно региональной программе.\n\n`;

    table += `<i>⚠️ Данные носят демонстрационный характер.</i>\n`;
    table += `<i>🔗 <a href="https://www.fkr45.ru/capital_repair_program/default.aspx#tab1">Полный график и детали уточняйте на сайте</a></i>`;

    return table;
}

buildFuzzyIndex();

// ==================== ОТПРАВКА ИНФОРМАЦИИ О ДОМЕ ====================
async function sendHouseInfo(userId, data, kind = "exact") {
    const mapUrl = get2GisUrl(data.address);
    const ukWebsite = getUkWebsite(data.uk);

    let reply = `🏠 <b>Справка о доме</b>\n\n`;
    if (kind === "fuzzy") reply += `🔁 <b>Возможно, вы имели в виду:</b> ${data.address}\n\n`;
    reply += `📍 <b>Адрес:</b> <a href="${mapUrl}">${data.address}</a>\n`;
    if (data.uk && data.uk !== 'Не указана') {
        reply += ukWebsite ? `🏛 <b>УК:</b> <a href="${ukWebsite}">${data.uk}</a>\n` : `🏛 <b>УК:</b> ${data.uk}\n`;
    }
    if (data.status && data.status !== 'Не указано') reply += `✅ <b>Состояние:</b> ${data.status}\n`;
    if (data.type && data.type !== 'Не указан') reply += `🏢 <b>Тип:</b> ${data.type}\n`;

    reply += `\n💰 <b>Основные тарифы (г. Курган):</b>\n`;
    for (const [service, info] of Object.entries(mainTariffs)) {
        reply += `• ${service}: <b>${info.price}</b> ${info.unit}\n`;
    }
    reply += `\n📊 <a href="https://my-gkh.ru/getcitytariff/kurgan">Полные тарифы на сайте РЭК</a>`;

    reply += `\n\n📄 <b><a href="https://dom.gosuslugi.ru/">Уточнить информацию</a></b>\n`;

    const capRepairData = generateCapRepairData(data.address, 1);
    reply += `\n${formatCapRepairTable(capRepairData)}`;

    reply += `\n\n<i>💡 Примечание: Тариф на "Содержание и ремонт жилья" устанавливается вашей УК индивидуально.</i>`;

    await sendTextWithButtons(userId, reply, MAIN_KEYBOARD);
    await sendText(userId, `✅ <b>Готово!</b>\n\nХотите проверить другой адрес? Нажмите кнопку и введите его нижу.`);
}

// ==================== ОБРАБОТКА СООБЩЕНИЙ ====================
async function handleMessage(update) {
    if (update.update_type !== "message_created") return;

    const userId = update.chat_id || update.message?.sender?.user_id || update.user?.user_id;
    if (!userId) return;

    const text = update.message?.body?.text?.trim();
    const firstName = update.message?.sender?.first_name || update.user?.first_name || "Пользователь";
    if (!text) return;

    console.log(`📩 ${firstName}: "${text}"`);
    const currentState = userStates.get(userId);

    if (text === "/start") {
        userStates.set(userId, "ACTIVE");
        await sendTextWithButtons(userId,
            `Привет, ${firstName}! 👋\n\n` +
            `Я бот для получения справки по домам города <b>Курган</b>.\n\n` +
            `✅ <b>Режим поиска активирован!</b>\n` +
            `Теперь просто введите адрес дома (например: <i>Машиностроителей 19</i> или <i>Кирова 117</i>).\n\n` +
            `<i>Используйте кнопки ниже для навигации.</i>`,
            MAIN_KEYBOARD
        );
        return;
    }

    if (text === "/help") {
        await sendTextWithButtons(userId,
            `<b>📋 Справка:</b>\n\n` +
            `Этот бот помогает быстро получить информацию о многоквартирных домах в Кургане.\n\n` +
            `🔎 <b>Поиск терпим к опечаткам:</b>\n` +
            `Если дом не найден точно, бот предложит похожие адреса (например: <i>«Корева 117»</i> → <i>«Кирова 117»</i>).\n\n` +
            `Просто введите адрес, и бот покажет тарифы, управляющую компанию и другую полезную информацию.`,
            HELP_KEYBOARD
        );
        return;
    }

    if (text === "/all_tariffs") {
        let msg = `💰 <b>Все тарифы ЖКХ (г. Курган):</b>\n\n`;
        for (const [service, info] of Object.entries(defaultTariffs)) {
            msg += `• ${service}: <b>${info.price}</b> ${info.unit}\n`;
        }
        msg += `\n📊 <b>Полная информация:</b> <a href="https://my-gkh.ru/getcitytariff/kurgan">РЭК Курганской области</a>`;
        await sendTextWithButtons(userId, msg, FULL_TARIFFS_KEYBOARD);
        return;
    }

    if (text === "/back_to_house") {
        const lastHouse = userStates.get(userId)?.lastHouse;
        const lastKind = userStates.get(userId)?.lastKind || "exact";
        if (lastHouse) {
            await sendHouseInfo(userId, lastHouse, lastKind);
        } else {
            await sendText(userId, "❌ Информация о доме не найдена. Введите адрес заново.");
        }
        return;
    }

    if (currentState !== "ACTIVE") {
        await sendTextWithButtons(userId,
            `⚠️ <b>Поиск недоступен</b>\n\n` +
            `Чтобы получить справку о доме, сначала нажмите кнопку <b>🔄 Новый поиск</b>.`,
            [[{ type: "callback", text: "🏠 Начать", payload: "/start" }]]
        );
        return;
    }

    const { street, house } = parseAddress(text);
    console.log(`🔍 Парсинг: улица="${street}", дом="${house}"`);

    if (!street) {
        await sendText(userId,
            `❌ <b>Не удалось распознать адрес</b>\n\n` +
            `Ваш запрос: <i>${text}</i>\n\n` +
            `💡 <b>Пример правильного ввода:</b>\n` +
            `• <i>Кирова 117</i>\n` +
            `• <i>Машиностроителей 19</i>`
        );
        return;
    }

    await sendText(userId, "⏳ Ищу информацию...");
    const result = searchHouse(street, house);

    if (result.kind === "suggest") {
        let msg = `❌ <b>Дом не найден</b>\n\n` +
            `Ваш запрос: <i>${text}</i>\n\n` +
            `🔍 <b>Возможно, вы имели в виду:</b>\n`;
        for (const s of result.suggestions) {
            msg += `• <b>${formatAddress(s.street, s.street_type, s.house)}</b>\n`;
        }
        const first = result.suggestions[0];
        msg += `\n💡 Введите полный адрес из списка, например: <i>${formatAddress(first.street, first.street_type, first.house)}</i>`;
        await sendTextWithButtons(userId, msg, MAIN_KEYBOARD);
        return;
    }

    if (result.kind === "street-suggest") {
        let msg = `❌ <b>Не удалось распознать номер дома</b>\n\n` +
            `Вы ввели: <i>${text}</i>\n\n` +
            `🔍 <b>Похожие улицы:</b>\n`;
        for (const s of result.streets) {
            msg += `• <b>${s.street_type} ${capName(s.street)}</b>\n`;
        }
        const first = result.streets[0];
        msg += `\n💡 Введите улицу и номер дома, например: <i>${capName(first.street)} 1</i>`;
        await sendTextWithButtons(userId, msg, MAIN_KEYBOARD);
        return;
    }

    if (result.kind === "garbage" || result.kind === "notfound") {
        await sendTextWithButtons(userId,
            `❌ <b>Дом не найден</b>\n\n` +
            `Ваш запрос: <i>${text}</i>\n\n` +
            `💡 Попробуйте написать проще, например: <i>Кирова 117</i>`,
            MAIN_KEYBOARD
        );
        return;
    }

    userStates.set(userId, { ...currentState, lastHouse: result.data, lastKind: result.kind });
    await sendHouseInfo(userId, result.data, result.kind);
}

// ==================== СИСТЕМНЫЙ ЗАПУСК ====================
async function handleBotStarted(update) {
    const userId = update.user?.user_id;
    const firstName = update.user?.first_name || "Пользователь";

    console.log(`🚀 bot_started от ${firstName} (id=${userId})`);
    if (!userId) return;

    userStates.set(userId, "ACTIVE");

    await sendTextWithButtons(userId,
        `Привет, ${firstName}! 👋\n\n` +
        `Я бот для получения справки по домам города <b>Курган</b>.\n\n` +
        `✅ <b>Режим поиска активирован!</b>\n` +
        `Теперь просто введите адрес дома (например: <i>Машиностроителей 19</i> или <i>Кирова 117</i>).\n\n` +
        `<i>Используйте кнопки ниже для навигации.</i>`,
        MAIN_KEYBOARD
    );
}

// ==================== ОБРАБОТКА НАЖАТИЙ НА КНОПКИ ====================
async function handleCallback(update) {
    const callbackId = update.callback?.callback_id;
    const payload = update.callback?.payload;
    const userId = update.callback?.user?.user_id || update.user?.user_id;

    // 🔧 ИСПРАВЛЕНИЕ БАГА: Берем реальное имя из объекта callback, а не хардкодим "Пользователь"
    const firstName = update.callback?.user?.first_name || "Пользователь";

    console.log(`🖱️ Callback: payload="${payload}", user=${userId}, name=${firstName}`);

    await answerCallback(callbackId);
    if (!payload || !userId) return;

    await handleMessage({
        update_type: "message_created",
        chat_id: userId,
        message: {
            body: { text: payload },
            sender: { user_id: userId, first_name: firstName } // Передаем настоящее имя!
        }
    });
}

// ==================== ГЛАВНЫЙ ЦИКЛ ====================
async function mainLoop() {
    console.log("🤖 Бот запущен...");
    while (true) {
        try {
            const data = await getUpdates();
            if (data.updates?.length) {
                for (const u of data.updates) {
                    if (u.update_type === "message_created" && u.message?.body?.text) {
                        await handleMessage(u);
                    } else if (u.update_type === "message_callback") {
                        await handleCallback(u);
                    } else if (u.update_type === "bot_started") {
                        await handleBotStarted(u);
                    }
                }
            }
            if (data.marker !== undefined) marker = data.marker;
        } catch (e) {
            console.error("Ошибка сети:", e.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

module.exports = {
    parseAddress,
    findHouseInDb,
    searchHouse,
    searchStreets,
    findHouseViaFuzzy,
    suggestAddresses,
    normalizeFuzzy,
    capName,
    formatAddress
};

if (require.main === module) {
    (async () => {
        const bot = await getBotInfo();
        if (!bot) { console.log("⛔ Стоп."); return; }
        mainLoop();
    })();
}

process.on('unhandledRejection', r => { console.error("\n❌", r); process.stdin.resume(); });
process.on('uncaughtException', e => { console.error("\n❌", e); process.stdin.resume(); });
