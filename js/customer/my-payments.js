// 加载支付记录页面
function loadMyPayments() {
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
            <div class="loading">加载中...</div>
        </div>
    `;

    loadUserPayments();
}

// 加载用户支付记录
async function loadUserPayments() {
    const container = document.getElementById('myPaymentsContainer');
    
    try {
        // 获取用户的所有车辆
        const cars = await db.collection('cars')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const carIds = cars.docs.map(doc => doc.id);
        
        if (carIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <p>暂无支付记录</p>
                </div>
            `;
            return;
        }

        // 查询支付记录
        const snapshot = await db.collection('payments')
            .where('carId', 'in', carIds)
            .orderBy('date', 'desc')
            .limit(50)
            .get();

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <p>暂无支付记录</p>
                </div>
            `;
            return;
        }

        // 计算统计
        let totalPaid = 0;
        let pendingTotal = 0;
        let completedTotal = 0;

        container.innerHTML = '<div class="payments-list"></div>';
        const listContainer = container.querySelector('.payments-list');

        for (const doc of snapshot.docs) {
            const payment = doc.data();
            
            if (payment.status === 'completed') {
                totalPaid += payment.amount;
                completedTotal += payment.amount;
            } else if (payment.status === 'pending') {
                pendingTotal += payment.amount;
            }
            
            // 获取车辆信息
            const carDoc = await db.collection('cars').doc(payment.carId).get();
            const car = carDoc.exists ? carDoc.data() : { plate: '未知' };
            
            listContainer.innerHTML += `
                <div class="payment-item" style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <span style="font-weight: 600; font-size: 1.1rem;">${car.plate}</span>
                            <span style="margin-left: 10px; color: #64748b;">${payment.date}</span>
                        </div>
                        <span class="status-badge status-${payment.status}">${getStatusText(payment.status)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="color: #64748b;">支付方式: ${getPaymentMethodText(payment.method)}</span>
                            ${payment.notes ? `<div style="color: #64748b; font-size: 0.9rem; margin-top: 5px;">备注: ${payment.notes}</div>` : ''}
                        </div>
                        <span style="font-size: 1.3rem; font-weight: 600; color: #1e293b;">¥${payment.amount.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }

        // 更新统计
        document.getElementById('customerTotalPaid').textContent = `¥${totalPaid.toFixed(2)}`;
        document.getElementById('customerPendingPayment').textContent = `¥${pendingTotal.toFixed(2)}`;
        document.getElementById('customerCompletedPayment').textContent = `¥${completedTotal.toFixed(2)}`;

    } catch (error) {
        console.error('加载支付记录失败:', error);
        container.innerHTML = '<div class="error-message">加载失败，请刷新重试</div>';
    }
}