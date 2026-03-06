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

        const paymentData = {
            carId: document.getElementById('paymentCarId').value,
            amount: parseFloat(document.getElementById('paymentAmount').value),
            date: document.getElementById('paymentDate').value,
            method: document.getElementById('paymentMethod').value,
            status: document.getElementById('paymentStatus').value,
            notes: document.getElementById('paymentNotes').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('payments').add(paymentData);
            document.getElementById('paymentForm').reset();
            document.getElementById('paymentDate').valueAsDate = new Date();
            loadPayments();
            loadPaymentStats();
            showError('支付记录添加成功');
        } catch (error) {
            console.error('添加支付记录失败:', error);
            showError('添加失败');
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
        const snapshot = await db.collection('cars').orderBy('plate').get();
        select.innerHTML = '<option value="">请选择汽车</option>';
        
        snapshot.forEach(doc => {
            const car = doc.data();
            select.innerHTML += `<option value="${doc.id}">${car.plate} - ${car.owner}</option>`;
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
        const snapshot = await db.collection('payments')
            .orderBy('date', 'desc')
            .limit(50)
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无支付记录</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const payment = doc.data();
            
            // 获取汽车信息
            const carDoc = await db.collection('cars').doc(payment.carId).get();
            const plate = carDoc.exists ? carDoc.data().plate : '未知';
            
            tbody.innerHTML += `
                <tr>
                    <td>${plate}</td>
                    <td><strong>¥${payment.amount.toFixed(2)}</strong></td>
                    <td>${payment.date}</td>
                    <td>${getPaymentMethodText(payment.method)}</td>
                    <td><span class="status-badge status-${payment.status}">${getStatusText(payment.status)}</span></td>
                    <td class="action-btns">
                        <button class="action-btn delete" onclick="deletePayment('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('加载支付记录失败:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error-message">加载失败</td></tr>';
    }
}

// 加载支付统计
async function loadPaymentStats() {
    try {
        // 总收入
        const allPayments = await db.collection('payments')
            .where('status', '==', 'completed')
            .get();
        
        let total = 0;
        allPayments.forEach(doc => total += doc.data().amount || 0);
        document.getElementById('totalRevenue').textContent = `¥${total.toFixed(2)}`;

        // 今日收入
        const today = new Date().toISOString().split('T')[0];
        const todayPayments = await db.collection('payments')
            .where('date', '==', today)
            .where('status', '==', 'completed')
            .get();
        
        let todayTotal = 0;
        todayPayments.forEach(doc => todayTotal += doc.data().amount || 0);
        document.getElementById('todayRevenue').textContent = `¥${todayTotal.toFixed(2)}`;

        // 待收款
        const pendingPayments = await db.collection('payments')
            .where('status', '==', 'pending')
            .get();
        
        let pendingTotal = 0;
        pendingPayments.forEach(doc => pendingTotal += doc.data().amount || 0);
        document.getElementById('pendingRevenue').textContent = `¥${pendingTotal.toFixed(2)}`;

    } catch (error) {
        console.error('加载支付统计失败:', error);
    }
}

// 删除支付记录
window.deletePayment = async (paymentId) => {
    if (!confirm('确定要删除这条支付记录吗？')) return;

    try {
        await db.collection('payments').doc(paymentId).delete();
        loadPayments();
        loadPaymentStats();
        showError('删除成功');
    } catch (error) {
        console.error('删除失败:', error);
        showError('删除失败');
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
    return methods[method] || method;
}