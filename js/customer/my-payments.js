// 加载支付记录页面
function loadMyPayments() {
    if (!currentUser) {
        console.error('No user logged in');
        return;
    }
    
    const container = document.getElementById('customerContent');
    container.innerHTML = `
        <h2 style="margin-bottom: 20px;">支付记录</h2>

        <div class="cards-grid" style="margin-bottom: 25px;">
            <div class="card">
                <div class="card-info">
                    <h3>总支付</h3>
                    <div class="number" id="customerTotalPaid">¥0</div>
                </div>
                <div class="card-icon icon-blue"><i class="fas fa-credit-card"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>待支付</h3>
                    <div class="number" id="customerPendingPayment">¥0</div>
                </div>
                <div class="card-icon icon-yellow"><i class="fas fa-clock"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>已支付</h3>
                    <div class="number" id="customerCompletedPayment">¥0</div>
                </div>
                <div class="card-icon icon-green"><i class="fas fa-check-circle"></i></div>
            </div>
        </div>

        <div id="myPaymentsContainer">
            <div class="loading">
                <div class="spinner"></div>
                <p>加载中...</p>
            </div>
        </div>
    `;

    loadUserPayments();
}

// 获取支付方式文本
function getPaymentMethodText(method) {
    const methods = {
        'cash': '现金',
        'card': '银行卡',
        'wechat': '微信支付',
        'alipay': '支付宝',
        'other': '其他'
    };
    return methods[method] || method || '-';
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待支付',
        'completed': '已支付',
        'cancelled': '已取消'
    };
    return statusMap[status] || status || '未知';
}

// 加载用户支付记录
async function loadUserPayments() {
    if (!currentUser) {
        console.error('No user logged in');
        return;
    }
    
    const container = document.getElementById('myPaymentsContainer');
    
    try {
        // 获取用户的所有车辆
        const carsSnapshot = await db.collection('cars')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const carIds = carsSnapshot.docs.map(doc => doc.id);
        
        if (carIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <h3>暂无支付记录</h3>
                    <p>请先在"我的爱车"中添加车辆</p>
                    <button class="btn btn-primary" onclick="loadMyCars()">
                        <i class="fas fa-car"></i> 去添加车辆
                    </button>
                </div>
            `;
            return;
        }

        // 由于 Firestore 的 'in' 查询限制，如果 carIds 太多需要分批查询
        // 这里假设 carIds 数量不大
        let allPayments = [];
        
        // 分批查询（每次最多10个ID）
        for (let i = 0; i < carIds.length; i += 10) {
            const batch = carIds.slice(i, i + 10);
            const snapshot = await db.collection('payments')
                .where('carId', 'in', batch)
                .get();
            
            snapshot.forEach(doc => {
                allPayments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }

        if (allPayments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <h3>暂无支付记录</h3>
                    <p>您的车辆还没有支付记录</p>
                </div>
            `;
            return;
        }

        // 在客户端排序（按日期倒序）
        allPayments.sort((a, b) => {
            if (a.date && b.date) {
                return b.date.localeCompare(a.date);
            }
            return 0;
        });

        // 计算统计
        let totalPaid = 0;
        let pendingTotal = 0;
        let completedTotal = 0;

        allPayments.forEach(payment => {
            const amount = payment.amount || 0;
            if (payment.status === 'completed') {
                totalPaid += amount;
                completedTotal += amount;
            } else if (payment.status === 'pending') {
                pendingTotal += amount;
            }
        });

        // 更新统计卡片
        document.getElementById('customerTotalPaid').textContent = `¥${totalPaid.toFixed(2)}`;
        document.getElementById('customerPendingPayment').textContent = `¥${pendingTotal.toFixed(2)}`;
        document.getElementById('customerCompletedPayment').textContent = `¥${completedTotal.toFixed(2)}`;

        // 构建支付记录列表
        container.innerHTML = '<div class="payments-list"></div>';
        const listContainer = container.querySelector('.payments-list');

        // 获取所有车辆信息的 Map
        const carMap = new Map();
        carsSnapshot.docs.forEach(doc => {
            carMap.set(doc.id, doc.data());
        });

        for (const payment of allPayments) {
            const car = carMap.get(payment.carId) || { plate: '未知' };
            
            listContainer.innerHTML += `
                <div class="payment-item" style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <span style="font-weight: 600; font-size: 1.1rem; color: #3b82f6;">${car.plate}</span>
                            <span style="margin-left: 10px; color: #64748b;">${payment.date || '-'}</span>
                        </div>
                        <span class="badge badge-${payment.status || 'pending'}">${getStatusText(payment.status)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="color: #64748b;">
                                <i class="fas fa-credit-card"></i> ${getPaymentMethodText(payment.method)}
                            </span>
                            ${payment.notes ? `
                                <div style="color: #64748b; font-size: 0.9rem; margin-top: 5px;">
                                    <i class="fas fa-comment"></i> ${payment.notes}
                                </div>
                            ` : ''}
                        </div>
                        <span style="font-size: 1.3rem; font-weight: 600; color: #1e293b;">
                            ¥${(payment.amount || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            `;
        }

    } catch (error) {
        console.error('加载支付记录失败:', error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>加载失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadMyPayments()">重试</button>
            </div>
        `;
    }
}
