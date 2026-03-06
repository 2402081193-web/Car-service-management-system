// 加载支付管理页面
function loadPaymentsPage() {
    const container = document.getElementById('pageContent');
    container.innerHTML = `
        <div class="cards-grid">
            <div class="card">
                <div class="card-info">
                    <h3>总收入</h3>
                    <div class="number" id="totalRevenue">¥0</div>
                </div>
                <div class="card-icon icon-green"><i class="fas fa-dollar-sign"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>今日收入</h3>
                    <div class="number" id="todayRevenue">¥0</div>
                </div>
                <div class="card-icon icon-blue"><i class="fas fa-calendar-day"></i></div>
            </div>
            <div class="card">
                <div class="card-info">
                    <h3>待收款</h3>
                    <div class="number" id="pendingRevenue">¥0</div>
                </div>
                <div class="card-icon icon-yellow"><i class="fas fa-clock"></i></div>
            </div>
        </div>

        <div class="form-container">
            <h3 class="form-title">记录支付</h3>
            <form id="paymentForm" class="form-grid">
                <div class="form-group">
                    <label>选择汽车</label>
                    <select id="paymentCarId" required>
                        <option value="">请选择汽车</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>支付金额 (¥)</label>
                    <input type="number" id="paymentAmount" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label>支付日期</label>
                    <input type="date" id="paymentDate" required>
                </div>
                <div class="form-group">
                    <label>支付方式</label>
                    <select id="paymentMethod">
                        <option value="cash">现金</option>
                        <option value="card">银行卡</option>
                        <option value="wechat">微信支付</option>
                        <option value="alipay">支付宝</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>状态</label>
                    <select id="paymentStatus">
                        <option value="completed">已支付</option>
                        <option value="pending">待支付</option>
                        <option value="cancelled">已取消</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea id="paymentNotes" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">记录支付</button>
                </div>
            </form>
        </div>

        <div class="table-container">
            <h3>支付记录</h3>
            <table>
                <thead>
                    <tr>
                        <th>车牌号</th>
                        <th>金额</th>
                        <th>支付日期</th>
                        <th>支付方式</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="paymentsTableBody">
                    <tr><td colspan="6" class="loading">加载中...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // 加载汽车选项
    loadPaymentCarOptions();

    // 设置默认日期
    document.getElementById('paymentDate').valueAsDate = new Date();

    // 表单提交
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // 验证必填字段
        const carId = document.getElementById('paymentCarId').value;
        if (!carId) {
            showErrorMessage('请选择汽车');
            return;
        }

        const amount = parseFloat(document.getElementById('paymentAmount').value);
        if (isNaN(amount) || amount <= 0) {
            showErrorMessage('请输入有效的金额');
            return;
        }

        const paymentData = {
            carId: carId,
            amount: amount,
            date: document.getElementById('paymentDate').value,
            method: document.getElementById('paymentMethod').value,
            status: document.getElementById('paymentStatus').value,
            notes: document.getElementById('paymentNotes').value || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('payments').add(paymentData);
            document.getElementById('paymentForm').reset();
            document.getElementById('paymentDate').valueAsDate = new Date();
            loadPayments();
            loadPaymentStats();
            showSuccessMessage('支付记录添加成功');
        } catch (error) {
            console.error('添加支付记录失败:', error);
            showErrorMessage('添加失败: ' + error.message);
        }
    });

    // 加载支付记录和统计
    loadPayments();
    loadPaymentStats();
}

// 加载汽车选项
async function loadPaymentCarOptions() {
    const select = document.getElementById('paymentCarId');
    select.innerHTML = '<option value="">加载中...</option>';

    try {
        // 暂时去掉排序，避免索引问题
        const snapshot = await db.collection('cars').get();
        
        if (snapshot.empty) {
            select.innerHTML = '<option value="">暂无汽车数据</option>';
            return;
        }
        
        // 在客户端排序
        const cars = [];
        snapshot.forEach(doc => {
            cars.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 按车牌号排序
        cars.sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));
        
        select.innerHTML = '<option value="">请选择汽车</option>';
        
        cars.forEach(car => {
            select.innerHTML += `<option value="${car.id}">${car.plate} - ${car.owner || '未知'}</option>`;
        });
        
    } catch (error) {
        console.error('加载汽车列表失败:', error);
        select.innerHTML = '<option value="">加载失败</option>';
    }
}

// 加载支付记录
async function loadPayments() {
    const tbody = document.getElementById('paymentsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">加载中...</td></tr>';

    try {
        // 暂时去掉排序，避免索引问题
        const snapshot = await db.collection('payments').get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无支付记录</td></tr>';
            return;
        }

        // 在客户端排序
        const payments = [];
        snapshot.forEach(doc => {
            payments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 按日期倒序排序
        payments.sort((a, b) => {
            if (a.date && b.date) {
                return b.date.localeCompare(a.date);
            }
            return 0;
        });

        // 只显示最近50条
        const recentPayments = payments.slice(0, 50);

        tbody.innerHTML = '';
        
        for (const payment of recentPayments) {
            // 获取汽车信息
            let plate = '未知';
            try {
                if (payment.carId) {
                    const carDoc = await db.collection('cars').doc(payment.carId).get();
                    if (carDoc.exists) {
                        plate = carDoc.data().plate || '未知';
                    }
                }
            } catch (error) {
                console.error('Error loading car:', error);
            }
            
            tbody.innerHTML += `
                <tr>
                    <td>${plate}</td>
                    <td><strong>¥${(payment.amount || 0).toFixed(2)}</strong></td>
                    <td>${payment.date || '-'}</td>
                    <td>${getPaymentMethodText(payment.method)}</td>
                    <td><span class="badge badge-${payment.status || 'pending'}">${getStatusText(payment.status)}</span></td>
                    <td class="action-btns">
                        <button class="action-btn delete" onclick="deletePayment('${payment.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('加载支付记录失败:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="error-message">加载失败: ${error.message}</td></tr>`;
    }
}

// 加载支付统计
async function loadPaymentStats() {
    try {
        // 获取所有支付记录
        const snapshot = await db.collection('payments').get();
        
        let totalCompleted = 0;
        let todayTotal = 0;
        let pendingTotal = 0;
        
        const today = new Date().toISOString().split('T')[0];
        
        snapshot.forEach(doc => {
            const payment = doc.data();
            const amount = payment.amount || 0;
            
            // 总收入（已完成）
            if (payment.status === 'completed') {
                totalCompleted += amount;
            }
            
            // 今日收入（已完成且日期是今天）
            if (payment.status === 'completed' && payment.date === today) {
                todayTotal += amount;
            }
            
            // 待收款
            if (payment.status === 'pending') {
                pendingTotal += amount;
            }
        });
        
        document.getElementById('totalRevenue').textContent = `¥${totalCompleted.toFixed(2)}`;
        document.getElementById('todayRevenue').textContent = `¥${todayTotal.toFixed(2)}`;
        document.getElementById('pendingRevenue').textContent = `¥${pendingTotal.toFixed(2)}`;

    } catch (error) {
        console.error('加载支付统计失败:', error);
        // 设置默认值
        document.getElementById('totalRevenue').textContent = '¥0';
        document.getElementById('todayRevenue').textContent = '¥0';
        document.getElementById('pendingRevenue').textContent = '¥0';
    }
}

// 删除支付记录
window.deletePayment = async (paymentId) => {
    if (!confirm('确定要删除这条支付记录吗？')) return;

    try {
        await db.collection('payments').doc(paymentId).delete();
        loadPayments();
        loadPaymentStats();
        showSuccessMessage('删除成功');
    } catch (error) {
        console.error('删除失败:', error);
        showErrorMessage('删除失败: ' + error.message);
    }
};

// 获取支付方式文本
function getPaymentMethodText(method) {
    const methods = {
        'cash': '现金',
        'card': '银行卡',
        'wechat': '微信支付',
        'alipay': '支付宝'
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

// 显示成功消息
function showSuccessMessage(message) {
    // 检查是否已有成功提示函数
    if (typeof window.showSuccess === 'function') {
        window.showSuccess(message);
        return;
    }
    
    // 创建临时提示
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #22c55e;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 显示错误消息
function showErrorMessage(message) {
    // 检查是否已有错误提示函数
    if (typeof window.showError === 'function') {
        window.showError(message);
        return;
    }
    
    // 创建临时提示
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .badge-pending {
        background: #fef9c3;
        color: #854d0e;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
    }
    
    .badge-completed {
        background: #dcfce7;
        color: #166534;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
    }
    
    .badge-cancelled {
        background: #fee2e2;
        color: #991b1b;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
    }
`;
document.head.appendChild(style);
