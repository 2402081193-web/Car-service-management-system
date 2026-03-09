// 认证相关功能

// 登出函数
window.logout = async function() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('登出失败: ' + error.message);
    }
};

// 检查登录状态
auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname.split('/').pop();
    
    if (user) {
        console.log('User logged in:', user.email);
        
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                
                // 如果在管理员页面但不是管理员，跳转到客户页面
                if (currentPath === 'admin-dashboard.html' && userData.role !== 'admin') {
                    window.location.href = 'customer-dashboard.html';
                }
                
                // 如果在客户页面但是管理员，跳转到管理员页面
                if (currentPath === 'customer-dashboard.html' && userData.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                }
            }
        }).catch(error => {
            console.error('Error getting user data:', error);
        });
    } else {
        console.log('No user logged in');
        
        // 如果在受保护的页面且未登录，跳转到首页
        const protectedPages = ['admin-dashboard.html', 'customer-dashboard.html'];
        if (protectedPages.includes(currentPath)) {
            window.location.href = 'index.html';
        }
    }
});

// 显示错误消息
window.showError = function(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
};

// 显示成功消息
window.showSuccess = function(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
};
