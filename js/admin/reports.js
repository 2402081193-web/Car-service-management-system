// 加载报表页面
function loadReportsPage() {
    const container = document.getElementById('pageContent');
    container.innerHTML = `
        <div class="cards-grid">
            <div class="card">
                <div class="card-info">
                    <h3>总收入</h3>
                    <div class="number" id="reportTotalRevenue">¥0</div>
                </div>
                <div class="card-icon icon-green"><i class="fas fa-chart-line"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>总服务次数</h3>
                    <div class="number" id="reportTotalServices">0</div>
                </div>
                <div class="card-icon icon-blue"><i class="fas fa-tools"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>平均客单价</h3>
                    <div class="number" id="reportAvgPrice">¥0</div>
                </div>
                <div class="card-icon icon-yellow"><i class="fas fa-calculator"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>总客户数</h3>
                    <div class="number" id="reportTotalCustomers">0</div>
                </div>
                <div class="card-icon icon-red"><i class="fas fa-users"></i></div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="monthlyRevenueChart"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="serviceTypeChart"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="paymentMethodChart"></canvas>
        </div>
    `;

    loadReportData();
}

// 加载报表数据
async function loadReportData() {
    try {
        // 总收入
        const payments = await db.collection('payments')
            .where('status', '==', 'completed')
            .get();
        
        let totalRevenue = 0;
        payments.forEach(doc => totalRevenue += doc.data().amount || 0);
        document.getElementById('reportTotalRevenue').textContent = `¥${totalRevenue.toFixed(2)}`;

        // 总服务次数
        const services = await db.collection('services').get();
        document.getElementById('reportTotalServices').textContent = services.size;

        // 平均客单价
        const avgPrice = services.size > 0 ? totalRevenue / services.size : 0;
        document.getElementById('reportAvgPrice').textContent = `¥${avgPrice.toFixed(2)}`;

        // 总客户数
        const customers = await db.collection('users').where('role', '==', 'customer').get();
        document.getElementById('reportTotalCustomers').textContent = customers.size;

        // 创建图表
        createMonthlyRevenueChart();
        createServiceTypeChart();
        createPaymentMethodChart();

    } catch (error) {
        console.error('加载报表数据失败:', error);
        showError('加载报表数据失败');
    }
}

// 月度收入图表
async function createMonthlyRevenueChart() {
    const ctx = document.getElementById('monthlyRevenueChart').getContext('2d');
    
    const labels = [];
    const revenueData = [];
    const serviceCountData = [];
    
    // 获取最近6个月的数据
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        labels.push(`${date.getFullYear()}年${date.getMonth() + 1}月`);
        
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        // 月度收入
        const payments = await db.collection('payments')
            .where('date', '>=', firstDay)
            .where('date', '<=', lastDay)
            .where('status', '==', 'completed')
            .get();
        
        let monthlyRevenue = 0;
        payments.forEach(doc => monthlyRevenue += doc.data().amount || 0);
        revenueData.push(monthlyRevenue);

        // 月度服务次数
        const services = await db.collection('services')
            .where('date', '>=', firstDay)
            .where('date', '<=', lastDay)
            .get();
        
        serviceCountData.push(services.size);
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '收入 (¥)',
                    data: revenueData,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: '服务次数',
                    data: serviceCountData,
                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '月度收入与服务次数统计'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '收入 (¥)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: '服务次数'
                    }
                }
            }
        }
    });
}

// 服务类型分布图表
async function createServiceTypeChart() {
    const ctx = document.getElementById('serviceTypeChart').getContext('2d');
    
    // 统计各服务类型数量
    const services = await db.collection('services').get();
    const typeCount = {};
    const typeRevenue = {};
    
    services.forEach(doc => {
        const service = doc.data();
        const type = service.serviceType;
        typeCount[type] = (typeCount[type] || 0) + 1;
        typeRevenue[type] = (typeRevenue[type] || 0) + (service.cost || 0);
    });

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(typeCount),
            datasets: [{
                data: Object.values(typeCount),
                backgroundColor: [
                    '#3b82f6',
                    '#22c55e',
                    '#eab308',
                    '#ef4444',
                    '#a855f7',
                    '#ec4899',
                    '#14b8a6'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '服务类型分布'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const revenue = typeRevenue[label] || 0;
                            return `${label}: ${value}次 (收入: ¥${revenue.toFixed(2)})`;
                        }
                    }
                }
            }
        }
    });
}

// 支付方式分布图表
async function createPaymentMethodChart() {
    const ctx = document.getElementById('paymentMethodChart').getContext('2d');
    
    // 统计各支付方式金额
    const payments = await db.collection('payments')
        .where('status', '==', 'completed')
        .get();
    
    const methodAmount = {};
    const methodCount = {};
    
    payments.forEach(doc => {
        const payment = doc.data();
        const method = payment.method || 'other';
        methodAmount[method] = (methodAmount[method] || 0) + (payment.amount || 0);
        methodCount[method] = (methodCount[method] || 0) + 1;
    });

    const methodNames = {
        'cash': '现金',
        'card': '银行卡',
        'wechat': '微信支付',
        'alipay': '支付宝',
        'other': '其他'
    };

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(methodAmount).map(key => methodNames[key] || key),
            datasets: [{
                data: Object.values(methodAmount),
                backgroundColor: [
                    '#3b82f6',
                    '#22c55e',
                    '#eab308',
                    '#ef4444',
                    '#a855f7'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '支付方式占比 (金额)'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const count = methodCount[Object.keys(methodAmount)[context.dataIndex]] || 0;
                            return `${label}: ¥${value.toFixed(2)} (${count}笔)`;
                        }
                    }
                }
            }
        }
    });
}