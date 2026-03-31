/**
 * 學生預約系統 - 核心邏輯
 * 整合 Google Service Account (JWT) 自動同步
 */

// --- Google Service Account 配置 ---
const CALENDAR_ID = 'leonyifengwu@gmail.com'; // 設定為您的 Google Email
const SERVICE_ACCOUNT = {
    client_email: "student-scheduler@gen-lang-client-0149930540.iam.gserviceaccount.com",
    private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC2h/YRUcAgcpuA\nZJh3qXoKxLvQs2/pcWayNq04BP0K24VXPnDhdLu1XZ/QT6fImohvrJZStVmbJjiW\n0dVVLuA9wujtJR+z2WDIXE1dgaDVkiHtcWQYkF3rvcWVcaYA6cW5x67yKkxr2N5+\niBjfiqc1Fz3HHUnnmTeNrlr6w45Y5MfLVAV9xAPKqwKxnonuaADLgKfUgitXkXDg\nCaeTehQ61P7nS3DGT84HNxwC957WHY5N3ScmVu8/tRq+wr0JW7iZV07SpeVzMNNh\nfak1caG+8jyk4qsUVKNY5YnJNyUZTtkOS/iPbVTIcHanqhfa3oE7tuiLdpzI7NnL\n37qXx+knAgMBAAECggEANZI414NxSnSoi+m6T+B3N6Le5pVLYq3MMMDYXOkl5SJh\ng6YJVjo+/y9fwLEoMrmcEn6KTfL4vg7dK/Kg1JPh7259k2BCajQB8jwY3rk1XYk6\nmOgfMxBn6FD1pPNKf9kclXZ0M5HThRGM14EVH8KfaXcNRBul/ambwuLpw9BSPmdD\nrnCr0aclGwqD2BHz8GSQ1gn82cYlxuBAnrZndQlSufv9WHXsZyYHkmU06yv4MIDe\njWZwO8G5x7hdVd57C6MYPI0M0CifI09htQQXRC3Y8bhjk3xUQy5O9saUb0KuUUb9\n2Ilb2Ckq/WNjY6nPVbGSvj9UN2lCis/j6RfYxHPscQKBgQDp22/w6dVmH1BocW5B\nK2dnbpxITH65bhBY7Q9DBBeBYlIeuKtCIgBmmO0PsIgLp0+LesXOQqSnAosaylh9\nvQS9QMYBGGRbLyJfE+v8XOJ5B7yDHzhZr1XQ243fdn7NWGCpd3+8wFe/FXfnvILB\nXDvsL/a9kxOjQn2berF5VQ2EEQKBgQDH0GjTN7fgohouCZHIQTPB5uZYLKM+auy2\nq8rXuHsWCFen2BIsKlLXcaIDNp0udtPu1/MCv4/X9Gmw+TqUqco8hS8Ah7iVDdVo\n8CjaZNGqIP7OXBTPWRo82chM1U+A4w7s6JMk+6aWv/MBKnorR2isfHXjcuuLE3Lf\nujBF7aNxtwKBgQCqsb03f7Z/4AN0+LadYu0LFjWEoDEvcCMGhaJKLEZr7jQ6sFhw\n4RihyqXeeeATgYASMv8G2qYMMVMPrvqAbON0sD7WtdMqq3DPLV9myPWVmgwDOVqM\nO+rLlDYuEfPkNsn3aH4Ya9ygYS8wOuzF7mjesPPM0/nVhMbiIeBAy9AdwQKBgBUP\nxrzc1qj67T+FCrTNCqOZrxYEPoDJzIHEwfDTJUZBQtwSTngRTgIfnDAyhYbsR5KZ\neKgFgSgGP03EN4SMESEn+LhZlf9AIgqZpfS/Q8pnB/TAiAEDJ1zap95RbbvsMxqN\nuVTgocKqIPcyfwYo1MO5qsN6zZEvT6B9g7EbR2spAoGBAN8+T6fv0og12Zd2WBG6\np+6sFc6DF3F2jfpSNgeOsApiZ/E2fwEeMfidp4slVAJr01/rUoEpnWUMEt0PEyrI\n5saKrqMD0FGl1KYgMBZ4JUOZtqmWl70ohngvMu3+AZsQw3H21YeKhvRec9Kjz90t\nDQC9kUkwgtzPC8+Zg83NMtcF\n-----END PRIVATE KEY-----\n`
};

let accessToken = null;
let tokenExpiresAt = 0;

document.addEventListener('DOMContentLoaded', () => {
    // --- 狀態管理 ---
    let currentDate = new Date();
    let selectedDate = null;
    let selectedDuration = 30; 
    const RESTRICTIONS = { days: [2, 3, 4, 5], startH: 13, startM: 30, endH: 20, endM: 30 };

    // --- DOM 元素 ---
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthYearHeader = document.getElementById('currentMonthYear');
    const slotsGrid = document.getElementById('slotsGrid');
    const selectedDateTitle = document.getElementById('selectedDateTitle');
    const durationBtns = document.querySelectorAll('.duration-btn');
    const bookingForm = document.getElementById('bookingForm');
    const successOverlay = document.getElementById('successOverlay');
    const bookingModal = document.getElementById('bookingModal');

    // --- 初始化 ---
    renderCalendar();
    lucide.createIcons();

    // --- 事件處理 ---
    prevMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
    nextMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };
    
    durationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            durationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDuration = parseInt(btn.getAttribute('data-duration'));
            if (selectedDate) renderSlots(selectedDate);
        });
    });

    bookingForm.onsubmit = async (e) => {
        e.preventDefault();
        const studentName = document.getElementById('studentName').value;
        const studentEmail = document.getElementById('studentEmail').value;
        const subject = document.getElementById('meetingSubject').value;
        
        // 取得預定時段 (例如 "14:30")
        const startTimeStr = document.getElementById('summaryTime').textContent.split(' - ')[0];
        
        // 執行預約
        await createCalendarEvent(selectedDate, startTimeStr, selectedDuration, studentName, studentEmail, subject);
        
        bookingModal.classList.remove('active');
        successOverlay.classList.add('active');
        bookingForm.reset();
    };

    document.querySelector('.close-modal').onclick = () => bookingModal.classList.remove('active');
    document.getElementById('closeSuccess').onclick = () => successOverlay.classList.remove('active');

    // --- 核心邏輯 ---
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
                    renderSlots(dateObj);
                };
            }
            calendarGrid.appendChild(cell);
        }
    }

    async function renderSlots(date) {
        slotsGrid.innerHTML = '<div class="loading-msg">正在確認行程中...</div>';
        // 修正：使用在地化日期字串，避免 ISO 造成的日期偏移
        const dateLabel = date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
        selectedDateTitle.textContent = `${dateLabel} 可用時段`;

        try {
            // 取得真實忙碌時段
            const busyRanges = await fetchRealBusySlots(date);
            const slots = generateOptimizedSlots(selectedDuration, busyRanges);
            
            slotsGrid.innerHTML = '';
            if (slots.length === 0) {
                slotsGrid.innerHTML = '<div class="empty-slots-msg">此日期無可用時段</div>';
                return;
            }

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
            console.error('載入時段失敗:', err);
            slotsGrid.innerHTML = '<div class="empty-slots-msg">載入失敗，請檢查 API 設定</div>';
        }
    }

    function generateOptimizedSlots(duration, busyPeriods) {
        const slots = [];
        let [curH, curM] = [RESTRICTIONS.startH, RESTRICTIONS.startM];
        const endTotal = RESTRICTIONS.endH * 60 + RESTRICTIONS.endM;

        while ((curH * 60 + curM + duration) <= endTotal) {
            const timeStr = `${curH.toString().padStart(2, '0')}:${curM.toString().padStart(2, '0')}`;
            const sStart = curH * 60 + curM;
            const sEnd = sStart + duration;

            const isBusy = busyPeriods.some(p => {
                const [psH, psM] = p.start.split(':').map(Number);
                const [peH, peM] = p.end.split(':').map(Number);
                return (sStart < (peH * 60 + peM) && sEnd > (psH * 60 + psM));
            });

            slots.push({ time: timeStr, isBusy });
            curM += duration;
            if (curM >= 60) { curH += 1; curM %= 60; }
        }
        return slots;
    }

    // --- Google API 整合核心 ---
    async function getAccessToken() {
        if (accessToken && Date.now() < tokenExpiresAt) return accessToken;

        const header = { alg: 'RS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const claim = {
            iss: SERVICE_ACCOUNT.client_email,
            scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        const sHeader = JSON.stringify(header);
        const sClaim = JSON.stringify(claim);
        const sSignature = KJUR.jws.JWS.sign("RS256", sHeader, sClaim, SERVICE_ACCOUNT.private_key);

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${sSignature}`
        });

        const data = await response.json();
        accessToken = data.access_token;
        tokenExpiresAt = Date.now() + (data.expires_in * 1000);
        return accessToken;
    }

    async function fetchRealBusySlots(date) {
        const token = await getAccessToken();
        const start = new Date(date); start.setHours(0,0,0,0);
        const end = new Date(date); end.setHours(23,59,59,999);

        const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                items: [{ id: CALENDAR_ID }]
            })
        });

        const data = await response.json();
        const busyList = (data.calendars && data.calendars[CALENDAR_ID]) ? data.calendars[CALENDAR_ID].busy : [];
        return busyList.map(b => ({
            start: new Date(b.start).toTimeString().slice(0, 5),
            end: new Date(b.end).toTimeString().slice(0, 5)
        }));
    }

    async function createCalendarEvent(date, time, duration, name, email, subject) {
        const token = await getAccessToken();
        const [h, m] = time.split(':').map(Number);
        const start = new Date(date); start.setHours(h, m, 0);
        const end = new Date(start.getTime() + duration * 60000);

        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: `學生預約：${name}`,
                description: `主題：${subject}\n學生信箱：${email}`,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() }
            })
        });
    }

    function openBookingModal(date, startTime) {
        const [h, m] = startTime.split(':').map(Number);
        const endTotal = h * 60 + m + selectedDuration;
        const endTimeStr = `${Math.floor(endTotal/60).toString().padStart(2,'0')}:${(endTotal%60).toString().padStart(2,'0')}`;
        document.getElementById('summaryDate').textContent = date.toISOString().split('T')[0];
        document.getElementById('summaryTime').textContent = `${startTime} - ${endTimeStr}`;
        document.getElementById('summaryDuration').textContent = selectedDuration;
        bookingModal.classList.add('active');
        lucide.createIcons();
    }
});
