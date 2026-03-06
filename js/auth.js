// 在 auth.js 中添加角色验证
auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname.split('/').pop();
    
    if (user) {
        // 获取用户角色
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
        });
    } else {
        // 如果在受保护的页面且未登录，跳转到首页
        if (currentPath !== 'index.html' && 
            !currentPath.includes('login.html') && 
            !currentPath.includes('register.html')) {
            window.location.href = 'index.html';
        }
    }
});
