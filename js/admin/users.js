// 当前选中的用户ID
let selectedUserId = null;
let selectedUserName = '';

// 加载用户管理页面
function loadUsersPage() {
    const container = document.getElementById('pageContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-users"></i> 用户管理</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>用户名</th>
                                <th>邮箱</th>
                                <th>手机号</th>
                                <th>角色</th>
                                <th>注册时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <tr>
                                <td colspan="6" class="text-center">
                                    <div class="loading-spinner"></div>
                                    <p>加载中...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    loadUsers();
}

// 加载用户列表
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    try {
        console.log('Loading users...');
        
        // 获取所有用户，按创建时间倒序
        const snapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">暂无用户</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const user = doc.data();
            const userData = {
                id: doc.id,
                name: user.name || '未知',
                email: user.email || '-',
                phone: user.phone || '-',
                role: user.role || 'customer',
                createdAt: user.createdAt || null
            };
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHtml(userData.name)}</strong></td>
                    <td>${escapeHtml(userData.email)}</td>
                    <td>${escapeHtml(userData.phone)}</td>
                    <td>
                        <span class="badge ${userData.role === 'admin' ? 'badge-danger' : 'badge-success'}">
                            ${userData.role === 'admin' ? '管理员' : '车主'}
                        </span>
                    </td>
                    <td>${formatDate(userData.createdAt)}</td>
                    <td>
                        <div class="btn-group" style="gap: 5px;">
                            ${userData.role !== 'admin' ? `
                                <button class="btn btn-sm btn-warning" onclick="showPromoteModal('${userData.id}', '${userData.name}')">
                                    <i class="fas fa-arrow-up"></i> 提升
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-info" onclick="showDemoteModal('${userData.id}', '${userData.name}')">
                                    <i class="fas fa-arrow-down"></i> 移除管理员
                                </button>
                            `}
                            <button class="btn btn-sm btn-danger" onclick="deleteUser('${userData.id}')">
                                <i class="fas fa-trash"></i> 删除
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error('加载用户失败:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger">加载失败: ${error.message}</td></tr>`;
    }
}

// 转义HTML特殊字符
function escapeHtml(text) {
    if (!text) return '-';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch {
        return '-';
    }
}

// 显示提升管理员模态框
function showPromoteModal(userId, userName) {
    selectedUserId = userId;
    selectedUserName = userName;
    const modal = document.getElementById('promoteModal');
    if (modal) {
        document.getElementById('promotePassword').value = '';
        document.getElementById('promoteModalTitle').textContent = `提升用户 "${userName}" 为管理员`;
        modal.classList.add('show');
    }
}

// 关闭提升管理员模态框
function closePromoteModal() {
    const modal = document.getElementById('promoteModal');
    if (modal) {
        modal.classList.remove('show');
    }
    selectedUserId = null;
    selectedUserName = '';
}

// 确认提升为管理员
async function confirmPromote() {
    const password = document.getElementById('promotePassword')?.value;
    
    if (!password) {
        alert('请输入管理员密码');
        return;
    }
    
    // 检查管理员密码
    if (password !== ADMIN_REGISTER_PASSWORD) {
        alert('管理员密码错误');
        return;
    }
    
    if (!selectedUserId) {
        alert('请选择用户');
        return;
    }
    
    try {
        await db.collection('users').doc(selectedUserId).update({
            role: 'admin',
            promotedAt: new Date().toISOString(),
            promotedBy: auth.currentUser?.uid
        });
        
        alert('已成功提升为管理员');
        closePromoteModal();
        loadUsers(); // 刷新列表
        
    } catch (error) {
        console.error('提升失败:', error);
        alert('提升失败: ' + error.message);
    }
}

// 显示移除管理员模态框
function showDemoteModal(userId, userName) {
    selectedUserId = userId;
    selectedUserName = userName;
    
    // 创建移除管理员模态框（如果不存在）
    let modal = document.getElementById('demoteModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'demoteModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 id="demoteModalTitle">移除管理员</h3>
                    <span class="close" onclick="closeDemoteModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <p>确定要将 <strong id="demoteUserName"></strong> 的管理员权限移除吗？</p>
                    <p class="text-warning">移除后该用户将成为普通车主。</p>
                    
                    <div class="form-group" style="margin-top: 20px;">
                        <label>请输入管理员密码确认操作：</label>
                        <input type="password" id="demotePassword" class="form-control" placeholder="请输入管理员密码">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="confirmDemote()">确认移除</button>
                    <button class="btn btn-secondary" onclick="closeDemoteModal()">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('demoteUserName').textContent = userName;
    document.getElementById('demotePassword').value = '';
    modal.classList.add('show');
}

// 关闭移除管理员模态框
function closeDemoteModal() {
    const modal = document.getElementById('demoteModal');
    if (modal) {
        modal.classList.remove('show');
    }
    selectedUserId = null;
    selectedUserName = '';
}

// 确认移除管理员
async function confirmDemote() {
    const password = document.getElementById('demotePassword')?.value;
    
    if (!password) {
        alert('请输入管理员密码');
        return;
    }
    
    // 检查管理员密码
    if (password !== ADMIN_REGISTER_PASSWORD) {
        alert('管理员密码错误');
        return;
    }
    
    if (!selectedUserId) {
        alert('请选择用户');
        return;
    }
    
    // 不能移除自己的管理员权限
    if (selectedUserId === auth.currentUser?.uid) {
        alert('不能移除自己的管理员权限');
        closeDemoteModal();
        return;
    }
    
    try {
        await db.collection('users').doc(selectedUserId).update({
            role: 'customer',
            demotedAt: new Date().toISOString(),
            demotedBy: auth.currentUser?.uid
        });
        
        alert('已成功移除管理员权限');
        closeDemoteModal();
        loadUsers(); // 刷新列表
        
    } catch (error) {
        console.error('移除失败:', error);
        alert('移除失败: ' + error.message);
    }
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除这个用户吗？此操作不可恢复！')) return;
    
    // 不能删除自己
    if (userId === auth.currentUser?.uid) {
        alert('不能删除自己的账号');
        return;
    }
    
    try {
        // 获取用户的所有关联数据
        const cars = await db.collection('cars').where('userId', '==', userId).get();
        const appointments = await db.collection('appointments').where('userId', '==', userId).get();
        const services = await db.collection('services').where('userId', '==', userId).get();
        const payments = await db.collection('payments').where('userId', '==', userId).get();
        
        // 批量删除
        const batch = db.batch();
        
        cars.forEach(doc => batch.delete(doc.ref));
        appointments.forEach(doc => batch.delete(doc.ref));
        services.forEach(doc => batch.delete(doc.ref));
        payments.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection('users').doc(userId));
        
        await batch.commit();
        
        alert('用户删除成功');
        loadUsers(); // 刷新列表
        
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 导出到全局
window.loadUsersPage = loadUsersPage;
window.showPromoteModal = showPromoteModal;
window.closePromoteModal = closePromoteModal;
window.confirmPromote = confirmPromote;
window.showDemoteModal = showDemoteModal;
window.closeDemoteModal = closeDemoteModal;
window.confirmDemote = confirmDemote;
window.deleteUser = deleteUser;
