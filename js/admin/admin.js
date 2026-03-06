// 当前页面
let currentPage = 'dashboard';
let currentUser = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin DOM loaded');
});

// 监听认证状态
auth.onAuthStateChanged(async (user) => {
    console.log('Admin auth state:', user ? 'logged in' : 'not logged in');
    
    if (user) {
        currentUser = user;
        
        try {
            // 验证用户是否是管理员
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                console.error('User document not found');
                window.location.href = 'index.html';
                return;
            }
            
            const userData = userDoc.data();
            
            // 检查角色
            if (userData.role !== 'admin') {
                console.error('Not an admin user');
                alert('您没有管理员权限');
                window.location.href = 'customer-dashboard.html';
                return;
            }
            
            // 显示用户名
            document.getElementById('userName').textContent = userData.name || '管理员';
            
            // 加载仪表板
            loadDashboard();
            
        } catch (error) {
            console.error('Error loading admin data:', error);
            showError('加载管理员信息失败');
        }
    } else {
        // 未登录，跳转到登录页
        console.log('No user, redirecting to login');
        window.location.href = 'index.html';
    }
});

// 菜单点击事件
document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', () => {
        // 移除所有active类
        document.querySelectorAll('.sidebar-menu li').forEach(li => {
            li.classList.remove('active');
        });
        
        // 添加active类到当前项
        item.classList.add('active');
        
        // 获取页面名称
        currentPage = item.dataset.page;
        
        // 更新页面标题
        const pageTitle = item.textContent.trim();
        document.getElementById('pageTitle').textContent = pageTitle;
        
        // 加载对应页面
        if (currentUser) {
            loadPage(currentPage);
        }
    });
});

// 页面加载函数
function loadPage(page) {
    console.log('Loading page:', page);
    
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'cars':
            if (typeof loadCarsPage === 'function') {
                loadCarsPage();
            } else {
                console.error('loadCarsPage not defined');
                showError('汽车管理模块加载失败');
            }
            break;
        case 'appointments':
            if (typeof loadAppointmentsPage === 'function') {
                loadAppointmentsPage();
            } else {
                console.error('loadAppointmentsPage not defined');
                showError('预约管理模块加载失败');
            }
            break;
        case 'services':
            if (typeof loadServicesPage === 'function') {
                loadServicesPage();
            } else {
                console.error('loadServicesPage not defined');
                showError('服务记录模块加载失败');
            }
            break;
        case 'payments':
            if (typeof loadPaymentsPage === 'function') {
                loadPaymentsPage();
            } else {
                console.error('loadPaymentsPage not defined');
                showError('支付管理模块加载失败');
            }
            break;
        case 'reports':
            if (typeof loadReportsPage === 'function') {
                loadReportsPage();
            } else {
                console.error('loadReportsPage not defined');
                showError('报表模块加载失败');
            }
            break;
        case 'users':
            if (typeof loadUsersPage === 'function') {
                loadUsersPage();
            } else {
                console.error('loadUsersPage not defined');
                showError('用户管理模块加载失败');
            }
            break;
        case 'settings':
            if (typeof loadSettingsPage === 'function') {
                loadSettingsPage();
            } else {
                console.error('loadSettingsPage not defined');
                showError('系统设置模块加载失败');
            }
            break;
        default:
            console.warn('Unknown page:', page);
            loadDashboard();
    }
}

// 显示错误
function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorEl.style.display = 'block';
        
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    } else {
        console.error(message);
        alert(message);
    }
}

// 显示成功消息
function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 加载仪表板
async function loadDashboard() {
    const container = document.getElementById('pageContent');
    if (!container) return;
    
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
        console.log('Loading dashboard stats...');
        
        // 总汽车数
        const carsSnapshot = await db.collection('cars').get();
        document.getElementById('totalCars').textContent = carsSnapshot.size || 0;

        // 今日预约
        const today = new Date().toISOString().split('T')[0];
        const appointmentsSnapshot = await db.collection('appointments')
            .where('date', '==', today)
            .get();
        document.getElementById('todayAppointments').textContent = appointmentsSnapshot.size || 0;

        // 待处理服务
        const pendingSnapshot = await db.collection('services')
            .where('status', '==', 'pending')
            .get();
        document.getElementById('pendingServices').textContent = pendingSnapshot.size || 0;

        // 本月收入
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const paymentsSnapshot = await db.collection('payments')
            .where('date', '>=', firstDay)
            .where('date', '<=', lastDay)
            .where('status', '==', 'completed')
            .get();
        
        let monthlyTotal = 0;
        paymentsSnapshot.forEach(doc => {
            monthlyTotal += doc.data().amount || 0;
        });
        document.getElementById('monthlyRevenue').textContent = `¥${monthlyTotal.toFixed(2)}`;

        // 最近预约
        const recentSnapshot = await db.collection('appointments')
            .orderBy('date', 'desc')
            .orderBy('time', 'desc')
            .limit(5)
            .get();

        const tbody = document.getElementById('recentAppointments');
        tbody.innerHTML = '';

        if (recentSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无预约</td></tr>';
        } else {
            for (const doc of recentSnapshot.docs) {
                const apt = doc.data();
                
                // 获取汽车信息
                let plate = '未知';
                try {
                    const carDoc = await db.collection('cars').doc(apt.carId).get();
                    if (carDoc.exists) {
                        plate = carDoc.data().plate || '未知';
                    }
                } catch (error) {
                    console.error('Error loading car:', error);
                }
                
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${plate}</strong></td>
                        <td>${apt.serviceType || '-'}</td>
                        <td>${apt.date || '-'} ${apt.time || ''}</td>
                        <td><span class="badge badge-${apt.status || 'pending'}">${getStatusText(apt.status)}</span></td>
                    </tr>
                `;
            }
        }

        // 创建图表
        setTimeout(() => createRevenueChart(), 500);

    } catch (error) {
        console.error('加载仪表板失败:', error);
        showError('加载数据失败: ' + error.message);
        
        // 设置默认值
        document.getElementById('totalCars').textContent = '0';
        document.getElementById('todayAppointments').textContent = '0';
        document.getElementById('pendingServices').textContent = '0';
        document.getElementById('monthlyRevenue').textContent = '¥0';
    }
}

// 获取状态文本
function getStatusText(status) {
    const map = {
        'pending': '待处理',
        'confirmed': '已确认',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return map[status] || status || '待处理';
}

// 创建收入图表
async function createRevenueChart() {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 获取最近7天的数据
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
        
        try {
            const snapshot = await db.collection('payments')
                .where('date', '==', dateStr)
                .where('status', '==', 'completed')
                .get();
            
            let dailyTotal = 0;
            snapshot.forEach(doc => {
                dailyTotal += doc.data().amount || 0;
            });
            data.push(dailyTotal);
        } catch (error) {
            console.error('Error loading payment data for', dateStr, error);
            data.push(0);
        }
    }

    // 如果所有数据都是0，显示一些示例数据
    const hasData = data.some(value => value > 0);
    const chartData = hasData ? data : [120, 190, 300, 500, 200, 300, 400];

    // 销毁旧图表（如果存在）
    if (window.revenueChart instanceof Chart) {
        window.revenueChart.destroy();
    }

    // 创建新图表
    window.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hasData ? labels : ['1/1', '1/2', '1/3', '1/4', '1/5', '1/6', '1/7'],
            datasets: [{
                label: '每日收入 (¥)',
                data: chartData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: hasData ? '最近7天收入趋势' : '示例数据（暂无真实数据）'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `¥${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value;
                        }
                    }
                }
            }
        }
    });
}

// 导出函数到全局
window.showError = showError;
window.showSuccess = showSuccess;
window.getStatusText = getStatusText;
