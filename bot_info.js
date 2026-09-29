const fetch = require("node-fetch");


const TOKEN = "твой токен";

async function getBotInfo() {
    try {
        const response = await fetch("https://platform-api2.max.ru/me", {
            headers: {
                "Authorization": TOKEN
            }
        });

        if (!response.ok) {
            console.error("Ошибка:", response.status, await response.text());
            return;
        }

        const botInfo = await response.json();
        console.log("✅ Информация о вашем боте:");
        console.log(`🤖 Имя (отображаемое): ${botInfo.first_name}`);
        console.log(`🔗 Никнейм (username): @${botInfo.username}`);
        console.log(`🆔 ID бота (user_id): ${botInfo.user_id}`);
        console.log(`📝 Описание: ${botInfo.description || "Нет описания"}`);

    } catch (error) {
        console.error("Ошибка сети:", error.message);
    }
}

getBotInfo();// JavaScript source code
