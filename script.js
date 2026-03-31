/**
 * 學生預約系統 - 基於 API Key & 公開日曆版本
 */

const API_KEY = 'AIzaSyA2Cm6Dg7wjZxa8l4L7PkeYl2hmzo5TY78';
const CALENDAR_ID = 'leonyifengwu@gmail.com';
const RESTRICTIONS = { days: [2, 3, 4, 5], startH: 13, startM: 30, endH: 20, endM: 30 };

document.addEventListener('DOMContentLoaded', () => {
    let currentDate = new Date();
    let selectedDate = null;
    let selectedDuration = 30;

    const currentMonthYearHeader = document.getElementById('currentMonthYear');
    const calendarGrid = document.getElementById('calendarGrid');
    const slotsGrid = document.getElementById('slotsGrid');
    const selectedDateTitle = document.getElementById('selectedDateTitle');
    const durationBtns = document.querySelectorAll('.duration-btn');
    const bookingForm = document.getElementById('bookingForm');
    const bookingModal = document.getElementById('bookingModal');

    renderCalendar();
    lucide.createIcons();

    document.getElementById('prevMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };

    durationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            durationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDuration = parseInt(btn.getAttribute('data-duration'));
            if (selectedDate) fetchAndRenderSlots(selectedDate);
        });
    });

    bookingForm.onsubmit = (e) => {
        e.preventDefault();
        // 這裡可以導向 Email 或 LINE 確認
        alert('預約請求已送出！老師會盡快與您聯絡確認。');
        bookingModal.classList.remove('active');
        document.getElementById('successOverlay').classList.add('active');
    };

    document.querySelector('.close-modal').onclick = () => bookingModal.classList.remove('active');
    document.getElementById('closeSuccess').onclick = () => document.getElementById('successOverlay').classList.remove('active');

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        currentMonthYearHeader.textContent = `${year}年 ${month + 1}月`;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date(); today.setHours(0,0,0,0);

        for (let i = 0; i < firstDay; i++) {
            calendarGrid.appendChild(Object.assign(document.createElement('div'), { className: 'day-cell disabled' }));
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const isAvail = RESTRICTIONS.days.includes(dateObj.getDay()) && dateObj >= today;
            const cell = document.createElement('div');
            cell.className = `day-cell ${isAvail ? '' : 'disabled'} ${dateObj.getTime() === today.getTime() ? 'today' : ''}`;
            cell.textContent = d;
            if (isAvail) {
                cell.onclick = () => {
                    document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
                    cell.classList.add('selected');
                    selectedDate = dateObj;
                    fetchAndRenderSlots(dateObj);
                };
            }
            calendarGrid.appendChild(cell);
        }
    }

    async function fetchAndRenderSlots(date) {
        slotsGrid.innerHTML = '<div class="loading-msg">正在載入行程...</div>';
        selectedDateTitle.textContent = `${date.toLocaleDateString('zh-TW')} 的時段`;

        const timeMin = new Date(date); timeMin.setHours(0,0,0,0);
        const timeMax = new Date(date); timeMax.setHours(23,59,59,999);

        try {
            // 使用 API Key 獲取事件列表 (前提是日曆須設為「公開」)
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) throw new Error(data.error.message);

            const busyPeriods = (data.items || []).map(event => ({
                start: new Date(event.start.dateTime || event.start.date).toTimeString().slice(0, 5),
                end: new Date(event.end.dateTime || event.end.date).toTimeString().slice(0, 5)
            }));

            const slots = generateSlots(selectedDuration, busyPeriods);
            slotsGrid.innerHTML = '';
            
            slots.forEach(slot => {
                const btn = document.createElement('button');
                btn.className = `slot-btn ${slot.isBusy ? 'busy-slot' : ''}`;
                btn.disabled = slot.isBusy;
                if (slot.isBusy) {
                    btn.innerHTML = `<span>${slot.time}</span><span class="busy-label">已佔用</span>`;
                } else {
                    btn.textContent = slot.time;
                    btn.onclick = () => openBookingModal(date, slot.time);
                }
                slotsGrid.appendChild(btn);
            });
        } catch (err) {
            console.error('API Error:', err);
            slotsGrid.innerHTML = '<div class="empty-slots-msg">無法連線行事曆，請確保日曆已設為「公開」。</div>';
        }
    }

    function generateSlots(duration, busyPeriods) {
        const slots = [];
        let [h, m] = [RESTRICTIONS.startH, RESTRICTIONS.startM];
        const endT = RESTRICTIONS.endH * 60 + RESTRICTIONS.endM;

        while ((h * 60 + m + duration) <= endT) {
            const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
            const sS = h * 60 + m;
            const sE = sS + duration;
            const isBusy = busyPeriods.some(p => {
                const [psH, psM] = p.start.split(':').map(Number);
                const [peH, peM] = p.end.split(':').map(Number);
                return (sS < (peH * 60 + peM) && sE > (psH * 60 + psM));
            });
            slots.push({ time: timeStr, isBusy });
            m += duration; if (m >= 60) { h += 1; m %= 60; }
        }
        return slots;
    }

    function openBookingModal(date, time) {
        const [h, m] = time.split(':').map(Number);
        const endTotal = h * 60 + m + selectedDuration;
        const endTimeStr = `${Math.floor(endTotal/60).toString().padStart(2,'0')}:${(endTotal%60).toString().padStart(2,'0')}`;
        document.getElementById('summaryDate').textContent = date.toLocaleDateString('zh-TW');
        document.getElementById('summaryTime').textContent = `${time} - ${endTimeStr}`;
        document.getElementById('summaryDuration').textContent = selectedDuration;
        bookingModal.classList.add('active');
        lucide.createIcons();
    }
});
