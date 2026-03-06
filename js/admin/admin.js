// 当前页面
let currentPage = 'dashboard';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 获取当前用户
    const user = auth.currentUser;
    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            document.getElementById('userName').textContent = userDoc.data().name || '管理员';
        }
    }

    // 加载仪表板
    loadDashboard();
});

// 菜单点击事件
document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        currentPage = item.dataset.page;
        document.getElementById('pageTitle').textContent = item.textContent.trim();
        loadPage(currentPage);
    });
});

// 页面加载函数
function loadPage(page) {
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'cars':
            loadCarsPage();
            break;
        case 'appointments':
            loadAppointmentsPage();
            break;
        case 'services':
            loadServicesPage();
            break;
        case 'payments':
            loadPaymentsPage();
            break;
        case 'reports':
            loadReportsPage();
            break;
    }
}

// 显示错误
function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 3000);
}

// 加载仪表板
async function loadDashboard() {
    const container = document.getElementById('pageContent');
    container.innerHTML = `
        <div class="cards-grid">
            <div class="card">
                <div class="card-info">
                    <h3>总汽车数</h3>
                    <div class="number" id="totalCars">0</div>
                </div>
                <div class="card-icon icon-blue"><i class="fas fa-car"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>今日预约</h3>
                    <div class="number" id="todayAppointments">0</div>
                </div>
                <div class="card-icon icon-green"><i class="fas fa-calendar-check"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>待处理服务</h3>
                    <div class="number" id="pendingServices">0</div>
                </div>
                <div class="card-icon icon-yellow"><i class="fas fa-tools"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>本月收入</h3>
                    <div class="number" id="monthlyRevenue">¥0</div>
                </div>
                <div class="card-icon icon-red"><i class="fas fa-credit-card"></i></div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="revenueChart"></canvas>
        </div>

        <div class="table-container">
            <h3>最近预约</h3>
            <table>
                <thead>
                    <tr>
                        <th>车牌号</th>
                        <th>服务类型</th>
                        <th>预约时间</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody id="recentAppointments">
                    <tr><td colspan="4" class="loading">加载中...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    await loadDashboardStats();
}

// 加载仪表板数据
async function loadDashboardStats() {
    try {
        // 总汽车数
        const cars = await db.collection('cars').get();
        document.getElementById('totalCars').textContent = cars.size;

        // 今日预约
        const today = new Date().toISOString().split('T')[0];
        const appointments = await db.collection('appointments').where('date', '==', today).get();
        document.getElementById('todayAppointments').textContent = appointments.size;

        // 待处理服务
        const pending = await db.collection('services').where('status', '==', 'pending').get();
        document.getElementById('pendingServices').textContent = pending.size;

        // 本月收入
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const payments = await db.collection('payments')
            .where('date', '>=', firstDay)
            .where('date', '<=', lastDay)
            .where('status', '==', 'completed')
            .get();
        
        let total = 0;
        payments.forEach(doc => total += doc.data().amount || 0);
        document.getElementById('monthlyRevenue').textContent = `¥${total.toFixed(2)}`;

        // 最近预约
        const recent = await db.collection('appointments')
            .orderBy('date', 'desc')
            .limit(5)
            .get();

        const tbody = document.getElementById('recentAppointments');
        tbody.innerHTML = '';

        for (const doc of recent.docs) {
            const apt = doc.data();
            const carDoc = await db.collection('cars').doc(apt.carId).get();
            const plate = carDoc.exists ? carDoc.data().plate : '未知';
            
            tbody.innerHTML += `
                <tr>
                    <td>${plate}</td>
                    <td>${apt.serviceType}</td>
                    <td>${apt.date} ${apt.time}</td>
                    <td><span class="status-badge status-${apt.status}">${getStatusText(apt.status)}</span></td>
                </tr>
            `;
        }

        // 创建图表
        createRevenueChart();

    } catch (error) {
        console.error('加载仪表板失败:', error);
        showError('加载数据失败');
    }
}

// 创建收入图表
async function createRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(`${date.getMonth()+1}/${date.getDate()}`);
        
        const snapshot = await db.collection('payments')
            .where('date', '==', dateStr)
            .where('status', '==', 'completed')
            .get();
        
        let dailyTotal = 0;
        snapshot.forEach(doc => dailyTotal += doc.data().amount || 0);
        data.push(dailyTotal);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '每日收入 (¥)',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        }
    });
}

function getStatusText(status) {
    const map = {
        'pending': '待处理',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return map[status] || status;
}