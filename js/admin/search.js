// 全局搜索功能

// 执行搜索
async function performSearch() {
    const searchTerm = document.getElementById('globalSearch').value.trim();
    
    if (!searchTerm) {
        alert('请输入手机号或邮箱');
        return;
    }
    
    console.log('搜索:', searchTerm);
    
    // 显示加载状态
    const searchBtn = document.querySelector('.search-btn');
    const originalText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<span class="spinner"></span> 搜索中...';
    searchBtn.disabled = true;
    
    try {
        // 搜索用户
        const users = await searchUsers(searchTerm);
        
        if (users.length === 0) {
            alert('未找到匹配的用户');
            return;
        }
        
        // 显示搜索结果下拉
        showSearchResults(users);
        
    } catch (error) {
        console.error('搜索失败:', error);
        alert('搜索失败: ' + error.message);
    } finally {
        searchBtn.innerHTML = originalText;
        searchBtn.disabled = false;
    }
}

// 搜索用户（通过邮箱或手机号）
async function searchUsers(searchTerm) {
    const users = [];
    
    // 转换为小写进行不区分大小写搜索
    const term = searchTerm.toLowerCase();
    
    try {
        // 方法1: 搜索邮箱（使用 startAt/endAt 进行前缀匹配）
        const emailSnapshot = await db.collection('users')
            .orderBy('email')
            .startAt(term)
            .endAt(term + '\uf8ff')
            .limit(10)
            .get();
        
        emailSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 方法2: 搜索手机号（如果搜索词是数字）
        if (/^\d+$/.test(term)) {
            const phoneSnapshot = await db.collection('users')
                .where('phone', '>=', term)
                .where('phone', '<=', term + '\uf8ff')
                .limit(10)
                .get();
            
            phoneSnapshot.forEach(doc => {
                // 避免重复
                if (!users.some(u => u.id === doc.id)) {
                    users.push({
                        id: doc.id,
                        ...doc.data()
                    });
                }
            });
        }
        
        // 如果以上方法没找到，尝试全文本搜索（通过获取所有然后过滤）
        if (users.length === 0) {
            const allUsers = await db.collection('users').get();
            allUsers.forEach(doc => {
                const user = doc.data();
                if ((user.email && user.email.toLowerCase().includes(term)) ||
                    (user.phone && user.phone.includes(term))) {
                    users.push({
                        id: doc.id,
                        ...user
                    });
                }
            });
        }
        
        return users.slice(0, 5); // 只返回前5个结果
        
    } catch (error) {
        console.error('搜索用户失败:', error);
        return [];
    }
}

// 显示搜索结果下拉
function showSearchResults(users) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (users.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item">未找到匹配的用户</div>';
        resultsDiv.style.display = 'block';
        setTimeout(() => {
            resultsDiv.style.display = 'none';
        }, 3000);
        return;
    }
    
    let html = '';
    users.forEach(user => {
        html += `
            <div class="search-result-item" onclick="viewUserDetails('${user.id}')">
                <div>
                    <span class="result-name">${escapeHtml(user.name || '未知')}</span>
                    <span class="result-badge">${user.role === 'admin' ? '管理员' : '车主'}</span>
                </div>
                <div>
                    <span class="result-email">${escapeHtml(user.email || '')}</span>
                    <span class="result-phone">${escapeHtml(user.phone || '')}</span>
                </div>
            </div>
        `;
    });
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // 点击其他地方关闭搜索结果
    document.addEventListener('click', function closeResults(e) {
        if (!e.target.closest('.search-container')) {
            resultsDiv.style.display = 'none';
            document.removeEventListener('click', closeResults);
        }
    });
}

// 查看用户详细信息
async function viewUserDetails(userId) {
    // 关闭搜索结果下拉
    document.getElementById('searchResults').style.display = 'none';
    
    // 显示加载中模态框
    const modal = document.getElementById('searchResultModal');
    const contentDiv = document.getElementById('searchResultContent');
    contentDiv.innerHTML = '<div class="loading-spinner"></div><p>加载中...</p>';
    modal.classList.add('show');
    
    try {
        // 获取用户信息
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error('用户不存在');
        }
        
        const user = userDoc.data();
        
        // 获取用户的车辆
        const carsSnapshot = await db.collection('cars')
            .where('userId', '==', userId)
            .get();
        
        // 获取用户的服务记录
        const servicesSnapshot = await db.collection('services')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .limit(10)
            .get();
        
        // 获取用户的支付记录
        const paymentsSnapshot = await db.collection('payments')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .limit(10)
            .get();
        
        // 获取用户的预约
        const appointmentsSnapshot = await db.collection('appointments')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .limit(10)
            .get();
        
        // 渲染用户详情
        renderUserDetails(user, carsSnapshot, servicesSnapshot, paymentsSnapshot, appointmentsSnapshot);
        
    } catch (error) {
        console.error('加载用户详情失败:', error);
        document.getElementById('searchResultContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                加载失败: ${error.message}
            </div>
        `;
    }
}

// 渲染用户详细信息
function renderUserDetails(user, carsSnapshot, servicesSnapshot, paymentsSnapshot, appointmentsSnapshot) {
    const contentDiv = document.getElementById('searchResultContent');
    
    // 计算总消费
    let totalSpent = 0;
    paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        if (payment.status === 'completed') {
            totalSpent += payment.amount || 0;
        }
    });
    
    // 构建车辆HTML
    let carsHtml = '';
    if (carsSnapshot.empty) {
        carsHtml = '<p class="text-muted">暂无车辆</p>';
    } else {
        carsSnapshot.forEach(doc => {
            const car = doc.data();
            carsHtml += `
                <div class="record-item">
                    <div class="record-header">
                        <span class="record-type">${escapeHtml(car.plate)}</span>
                        <span class="record-date">${escapeHtml(car.model || '')}</span>
                    </div>
                    <div>品牌: ${escapeHtml(car.brand || '-')} | 颜色: ${escapeHtml(car.color || '-')}</div>
                </div>
            `;
        });
    }
    
    // 构建服务HTML
    let servicesHtml = '';
    if (servicesSnapshot.empty) {
        servicesHtml = '<p class="text-muted">暂无服务记录</p>';
    } else {
        servicesSnapshot.forEach(doc => {
            const service = doc.data();
            servicesHtml += `
                <div class="record-item">
                    <div class="record-header">
                        <span class="record-type">${escapeHtml(service.serviceType)}</span>
                        <span class="record-date">${service.date || '-'}</span>
                    </div>
                    <div>${escapeHtml(service.description || '')}</div>
                    <div style="margin-top: 5px;"><strong>¥${(service.cost || 0).toFixed(2)}</strong></div>
                </div>
            `;
        });
    }
    
    // 构建支付HTML
    let paymentsHtml = '';
    if (paymentsSnapshot.empty) {
        paymentsHtml = '<p class="text-muted">暂无支付记录</p>';
    } else {
        paymentsSnapshot.forEach(doc => {
            const payment = doc.data();
            paymentsHtml += `
                <div class="record-item">
                    <div class="record-header">
                        <span class="record-amount">¥${(payment.amount || 0).toFixed(2)}</span>
                        <span class="record-date">${payment.date || '-'}</span>
                    </div>
                    <div>支付方式: ${getPaymentMethodText(payment.method)} | 状态: ${getStatusText(payment.status)}</div>
                </div>
            `;
        });
    }
    
    // 构建预约HTML
    let appointmentsHtml = '';
    if (appointmentsSnapshot.empty) {
        appointmentsHtml = '<p class="text-muted">暂无预约</p>';
    } else {
        appointmentsSnapshot.forEach(doc => {
            const apt = doc.data();
            appointmentsHtml += `
                <div class="record-item">
                    <div class="record-header">
                        <span class="record-type">${escapeHtml(apt.serviceType)}</span>
                        <span class="record-date">${apt.date || '-'} ${apt.time || ''}</span>
                    </div>
                    <div>状态: ${getStatusText(apt.status)}</div>
                </div>
            `;
        });
    }
    
    contentDiv.innerHTML = `
        <div class="info-section">
            <h4><i class="fas fa-user"></i> 客户信息</h4>
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">姓名</div>
                    <div class="value">${escapeHtml(user.name || '未知')}</div>
                </div>
                <div class="info-item">
                    <div class="label">邮箱</div>
                    <div class="value">${escapeHtml(user.email || '-')}</div>
                </div>
                <div class="info-item">
                    <div class="label">手机号</div>
                    <div class="value">${escapeHtml(user.phone || '-')}</div>
                </div>
                <div class="info-item">
                    <div class="label">角色</div>
                    <div class="value">${user.role === 'admin' ? '管理员' : '车主'}</div>
                </div>
                <div class="info-item">
                    <div class="label">注册时间</div>
                    <div class="value">${formatDate(user.createdAt)}</div>
                </div>
                <div class="info-item">
                    <div class="label">总消费</div>
                    <div class="value">¥${totalSpent.toFixed(2)}</div>
                </div>
            </div>
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-car"></i> 车辆信息 (${carsSnapshot.size})</h4>
            <div class="record-list">
                ${carsHtml}
            </div>
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-tools"></i> 最近服务记录 (${servicesSnapshot.size})</h4>
            <div class="record-list">
                ${servicesHtml}
            </div>
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-credit-card"></i> 最近支付记录 (${paymentsSnapshot.size})</h4>
            <div class="record-list">
                ${paymentsHtml}
            </div>
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-calendar-check"></i> 最近预约 (${appointmentsSnapshot.size})</h4>
            <div class="record-list">
                ${appointmentsHtml}
            </div>
        </div>
    `;
}

// 关闭搜索模态框
function closeSearchModal() {
    document.getElementById('searchResultModal').classList.remove('show');
}

// 添加回车搜索功能
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});

// 辅助函数
function getPaymentMethodText(method) {
    const methods = {
        'cash': '现金',
        'card': '银行卡',
        'wechat': '微信支付',
        'alipay': '支付宝'
    };
    return methods[method] || method || '-';
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status || '未知';
}

function escapeHtml(text) {
    if (!text) return '-';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('zh-CN');
    } catch {
        return '-';
    }
}

// 导出到全局
window.performSearch = performSearch;
window.viewUserDetails = viewUserDetails;
window.closeSearchModal = closeSearchModal;
