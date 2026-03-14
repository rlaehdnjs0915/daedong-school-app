let currentTodayDate = "";

function getSuppliesKey(date) {
    return `supplies_${date}`;
}

function loadSuppliesFromLocal(date) {
    const raw = localStorage.getItem(getSuppliesKey(date));
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveSuppliesToLocal(date, items) {
    localStorage.setItem(getSuppliesKey(date), JSON.stringify(items));
}

function deleteSuppliesFromLocal(date) {
    localStorage.removeItem(getSuppliesKey(date));
}

function renderList(elementId, items, emptyText = "없음") {
    const list = document.getElementById(elementId);
    list.innerHTML = "";

    if (!items || items.length === 0) {
        list.innerHTML = `<li>${emptyText}</li>`;
        return;
    }

    items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
    });
}

function refreshSuppliesView() {
    const selectedDate = document.getElementById("supply-date").value;
    const selectedItems = loadSuppliesFromLocal(selectedDate);
    const todayItems = loadSuppliesFromLocal(currentTodayDate);

    renderList("selected-supplies-list", selectedItems, "준비물 없음");
    renderList("supplies-list", todayItems, "준비물 없음");
}

async function loadTodayInfo() {
    const response = await fetch("/api/today");
    const data = await response.json();

    currentTodayDate = data.date;

    document.getElementById("today-date").textContent = `${data.date} (${data.weekday})`;
    document.getElementById("lunch").innerText = data.meal.lunch;
    document.getElementById("dinner").innerText = data.meal.dinner;

    const timetableList = document.getElementById("timetable-list");
    timetableList.innerHTML = "";

    if (!data.timetable || data.timetable.length === 0) {
        timetableList.innerHTML = "<li>시간표 없음</li>";
    } else {
        data.timetable.forEach((subject, index) => {
            const li = document.createElement("li");
            li.textContent = `${index + 1}교시 - ${subject}`;
            timetableList.appendChild(li);
        });
    }

    document.getElementById("supply-date").value = currentTodayDate;
    document.getElementById("supply-input").value = "";

    refreshSuppliesView();
}

function saveSupplies() {
    const date = document.getElementById("supply-date").value;
    const inputEl = document.getElementById("supply-input");

    const newItems = inputEl.value
        .split("\n")
        .map(item => item.trim())
        .filter(item => item !== "");

    if (newItems.length === 0) {
        const messageEl = document.getElementById("save-message");
        messageEl.textContent = "추가할 준비물을 입력해";
        setTimeout(() => {
            messageEl.textContent = "";
        }, 1500);
        return;
    }

    const oldItems = loadSuppliesFromLocal(date);
    const mergedItems = [...oldItems];

    newItems.forEach(item => {
        if (!mergedItems.includes(item)) {
            mergedItems.push(item);
        }
    });

    saveSuppliesToLocal(date, mergedItems);

    inputEl.value = "";
    refreshSuppliesView();

    const messageEl = document.getElementById("save-message");
    messageEl.textContent = "추가 저장 완료";

    setTimeout(() => {
        messageEl.textContent = "";
    }, 2000);
}

function clearSupplies() {
    const date = document.getElementById("supply-date").value;

    deleteSuppliesFromLocal(date);
    document.getElementById("supply-input").value = "";

    refreshSuppliesView();

    const messageEl = document.getElementById("save-message");
    messageEl.textContent = "해당 날짜 준비물 삭제 완료";

    setTimeout(() => {
        messageEl.textContent = "";
    }, 2000);
}

document.getElementById("save-btn").addEventListener("click", saveSupplies);
document.getElementById("clear-btn").addEventListener("click", clearSupplies);
document.getElementById("supply-date").addEventListener("change", refreshSuppliesView);

document.getElementById("supply-input").addEventListener("input", () => {
    document.getElementById("save-message").textContent = "";
});

loadTodayInfo();