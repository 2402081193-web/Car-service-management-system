// 用户管理功能

// 加载用户管理页面
function loadUsersPage() {
    const container = document.getElementById('pageContent');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>用户管理</h3>
            </div>
            <div class="card-body">
                <table class="table">
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
                        <tr><td colspan="6" class="text-center">加载中...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    loadUsers();
}

// 加载用户列表
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    try {
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
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${user.name || '未知'}</strong></td>
                    <td>${user.email || '-'}</td>
                    <td>${user.phone || '-'}</td>
                    <td>
                        <span class="badge ${user.role === 'admin' ? 'badge-danger' : 'badge-success'}">
                            ${user.role === 'admin' ? '管理员' : '车主'}
                        </span>
                    </td>
                    <td>${formatDate(user.createdAt)}</td>
                    <td>
                        ${user.role !== 'admin' ? `
                            <button class="btn btn-sm btn-warning" onclick="promoteToAdmin('${doc.id}')">
                                提升管理员
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${doc.id}')">
                            删除
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error('加载用户失败:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger">加载失败: ${error.message}</td></tr>`;
    }
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    } catch {
        return '-';
    }
}

// 提升为管理员
async function promoteToAdmin(userId) {
    const password = prompt('请输入管理员注册密码以确认操作：');
    
    if (!password) return;
    
    if (password !== ADMIN_REGISTER_PASSWORD) {
        alert('管理员密码错误');
        return;
    }
    
    try {
        await db.collection('users').doc(userId).update({
            role: 'admin',
            promotedAt: new Date().toISOString()
        });
        
        alert('已成功提升为管理员');
        loadUsers();
        
    } catch (error) {
        console.error('提升失败:', error);
        alert('提升失败: ' + error.message);
    }
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除这个用户吗？此操作不可恢复！')) return;
    
    try {
        // 删除用户相关数据
        const cars = await db.collection('cars').where('userId', '==', userId).get();
        const appointments = await db.collection('appointments').where('userId', '==', userId).get();
        
        const batch = db.batch();
        
        cars.forEach(doc => batch.delete(doc.ref));
        appointments.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection('users').doc(userId));
        
        await batch.commit();
        
        alert('用户删除成功');
        loadUsers();
        
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 导出到全局
window.loadUsersPage = loadUsersPage;
window.promoteToAdmin = promoteToAdmin;
window.deleteUser = deleteUser;
