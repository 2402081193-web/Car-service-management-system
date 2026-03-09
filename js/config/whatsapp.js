// WhatsApp Cloud API 配置
const WHATSAPP_CONFIG = {
    version: 'v18.0',
    phoneNumberId: '15551668734',  // 你的 Phone Number ID
    accessToken: 'EAAUkoW0tdmYBQyXo0VG9CATfw4HWw9XXnkhvLg5ILfyfTIdZCZCPS4z6XnZCRxeGk9UrZC169emnjP7fUiMfb2A1D0EaPQXNTYnyFyvgCNwZCFUqohNPAAbuSISRLk3h6YF5wWRae7RrdZBFuqFTV0DYEQEPzMdnjCv5ZBqtv9whoNXFdN9FVeTRSKdxrN3ho0CARJAaw8ZBNJZC8A8ZAfERFZCKWOrQFoi3wnRgZBjVwKQNG85wlsm55qflCwZCgCmkw4nnlU7zVWFpPfmUSBDi0e2Nuh5jg',
    apiUrl: 'https://graph.facebook.com'
};

// WhatsApp 服务类
class WhatsAppService {
    constructor() {
        this.baseUrl = `${WHATSAPP_CONFIG.apiUrl}/${WHATSAPP_CONFIG.version}/${WHATSAPP_CONFIG.phoneNumberId}`;
        this.headers = {
            'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * 发送模板消息（用于预约确认、服务完成等）
     */
    async sendTemplateMessage(to, templateName, variables = {}) {
        try {
            const components = this.buildTemplateComponents(variables);
            
            const messageData = {
                messaging_product: 'whatsapp',
                to: this.formatPhoneNumber(to),
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: 'zh_CN'  // 使用中文模板
                    },
                    components: components
                }
            };

            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(messageData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error?.message || '发送失败');
            }

            await this.logNotification({
                to: to,
                template: templateName,
                status: 'success',
                messageId: result.messages?.[0]?.id
            });

            return result;

        } catch (error) {
            await this.logNotification({
                to: to,
                template: templateName,
                status: 'failed',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 发送文本消息（仅限24小时会话窗口内）
     */
    async sendTextMessage(to, text) {
        try {
            const messageData = {
                messaging_product: 'whatsapp',
                to: this.formatPhoneNumber(to),
                type: 'text',
                text: {
                    preview_url: false,
                    body: text
                }
            };

            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(messageData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error?.message || '发送失败');
            }

            return result;

        } catch (error) {
            console.error('发送文本消息失败:', error);
            throw error;
        }
    }

    /**
     * 发送预约确认
     */
    async sendAppointmentConfirmation(to, customerName, serviceType, date, time) {
        const text = `🚗 *预约确认*\n\n尊敬的 ${customerName}，您的预约已确认！\n\n📋 服务类型：${serviceType}\n📅 日期：${date}\n⏰ 时间：${time}\n\n请准时到店，如有变动请提前联系我们。`;
        
        return this.sendTextMessage(to, text);
    }

    /**
     * 发送服务完成通知
     */
    async sendServiceCompletion(to, customerName, plate, serviceType, cost) {
        const text = `✅ *服务完成通知*\n\n尊敬的 ${customerName}，您的车辆 ${plate} 的 ${serviceType} 服务已完成。\n\n💰 费用：RM ${cost}\n\n欢迎随时取车，感谢您的惠顾！`;
        
        return this.sendTextMessage(to, text);
    }

    /**
     * 发送取车提醒
     */
    async sendPickupReminder(to, customerName, date, time, plate) {
        const text = `⏰ *取车提醒*\n\n${customerName} 您好，您明天 ${date} ${time} 有预约服务（车辆：${plate}），请准时到店。`;
        
        return this.sendTextMessage(to, text);
    }

    /**
     * 发送支付收据
     */
    async sendPaymentReceipt(to, customerName, plate, amount, date) {
        const text = `💰 *支付收据*\n\n尊敬的 ${customerName}，您为车辆 ${plate} 的支付已完成。\n\n💵 金额：RM ${amount}\n📅 日期：${date}\n\n感谢您的惠顾！`;
        
        return this.sendTextMessage(to, text);
    }

    /**
     * 格式化手机号（马来西亚格式）
     */
    formatPhoneNumber(phone) {
        // 移除所有非数字字符
        let cleaned = phone.replace(/\D/g, '');
        
        // 如果以0开头，替换为60
        if (cleaned.startsWith('0')) {
            cleaned = '60' + cleaned.substring(1);
        }
        // 如果已经有60开头，保持不变
        else if (!cleaned.startsWith('60')) {
            cleaned = '60' + cleaned;
        }
        
        return cleaned;
    }

    /**
     * 构建模板组件
     */
    buildTemplateComponents(variables) {
        const components = [];
        
        if (variables.header) {
            components.push({
                type: 'header',
                parameters: variables.header.map(text => ({
                    type: 'text',
                    text: text
                }))
            });
        }
        
        if (variables.body) {
            components.push({
                type: 'body',
                parameters: variables.body.map(text => ({
                    type: 'text',
                    text: text
                }))
            });
        }
        
        return components;
    }

    /**
     * 记录通知日志到 Firestore
     */
    async logNotification(data) {
        try {
            await db.collection('notifications').add({
                ...data,
                channel: 'whatsapp',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('记录通知日志失败:', error);
        }
    }

    /**
     * 测试连接
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}`, {
                method: 'GET',
                headers: this.headers
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// 创建全局实例
const whatsapp = new WhatsAppService();

// 导出到全局
window.whatsapp = whatsapp;

console.log('✅ WhatsApp 服务已初始化');
console.log('📱 Phone Number ID:', WHATSAPP_CONFIG.phoneNumberId);