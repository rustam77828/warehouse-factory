const API_URL = 'http://localhost:3001/api/logs';

async function sendLog(action) {
    const coil = document.getElementById('coilInput').value.trim();
    const statusDiv = document.getElementById('status');
    const timeDiv = document.getElementById('timeInfo');

    if (!coil) {
        statusDiv.textContent = '⚠️ Введите номер рулона!';
        statusDiv.style.color = 'red';
        return;
    }

    statusDiv.textContent = 'Связь с базой...';
    timeDiv.textContent = '';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                coil_number: coil,
                operator: 'Rustam',
                status: action === 'complete' ? 'complete' : 'partial'
            })
        });

        const result = await response.json();

        if (response.ok) {
            const isSet = action === 'complete';
            statusDiv.textContent = isSet ? '✅ Статус: SET (Завершено)' : '⏳ Статус: Not finished';
            statusDiv.style.color = isSet ? 'green' : 'orange';

            const now = new Date().toLocaleString('ru-RU');
            timeDiv.textContent = `Дата записи: ${now}`;

            if (isSet) document.getElementById('coilInput').value = '';
        } else {
            statusDiv.textContent = '❌ ' + (result.message || 'Ошибка');
            statusDiv.style.color = 'red';

            // Поиск существующей записи
            const searchRes = await fetch(`${API_URL}/search?number=${encodeURIComponent(coil)}`);
            const searchData = await searchRes.json();

            if (searchData.status === 'ok' && searchData.data) {
                const dateObj = new Date(searchData.data.updated_at);
                const formattedDate = dateObj.toLocaleString('ru-RU');
                timeDiv.textContent = `Был завершен: ${formattedDate}`;
            }
        }
    } catch (error) {
        statusDiv.textContent = '❌ Ошибка сервера: Проверьте соединение';
        statusDiv.style.color = 'red';
    }
}

function downloadExcel() {
    const from = document.getElementById('dateFrom').value;
    const to = document.getElementById('dateTo').value;

    if (!from || !to) {
        alert("Пожалуйста, выберите начальную и конечную дату!");
        return;
    }

    window.location.href = `${API_URL}/export?from=${from}&to=${to}`;
}
