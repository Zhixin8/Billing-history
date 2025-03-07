// 存储支出数据的数组
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

// 生成随机支出记录
function generateRandomExpenses() {
    const types = ['food', 'rent', 'transportation', 'shopping', 'other'];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    const randomExpenses = Array.from({ length: 30 }, () => {
        const randomType = types[Math.floor(Math.random() * types.length)];
        const randomAmount = +(Math.random() * 1000 + 50).toFixed(2);
        const randomDate = new Date(
            thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
        ).toISOString().split('T')[0];

        return {
            type: randomType,
            amount: randomAmount,
            date: randomDate
        };
    });

    expenses = randomExpenses;
    localStorage.setItem('expenses', JSON.stringify(expenses));
    updateStatistics();
    renderExpenseList();
}

// 页面加载时初始化数据
document.addEventListener('DOMContentLoaded', () => {
    // 设置日期输入框的默认值为今天
    document.getElementById('expense-date').valueAsDate = new Date();
    
    // 如果本地存储中没有数据，生成随机数据
    if (!localStorage.getItem('expenses')) {
        generateRandomExpenses();
    } else {
        expenses = JSON.parse(localStorage.getItem('expenses'));
    }
    
    // 更新统计数据和支出列表
    updateStatistics();
    renderExpenseList();
    
    // 添加标题跷跷板效果
    setupTitleSeesaw();
});

// 设置标题跷跷板效果
function setupTitleSeesaw() {
    const titleElement = document.querySelector('h1');
    const titleLeft = document.querySelector('h1 .title-left');
    const titleRight = document.querySelector('h1 .title-right');
    
    if (titleElement && titleLeft && titleRight) {
        titleElement.addEventListener('mousemove', (e) => {
            // 获取鼠标相对于标题元素的位置
            const rect = titleElement.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const titleWidth = rect.width;
            
            // 判断鼠标是在左半部分还是右半部分
            if (mouseX < titleWidth / 2) {
                // 鼠标在左侧，右侧高亮
                titleLeft.classList.remove('title-highlight');
                titleRight.classList.add('title-highlight');
            } else {
                // 鼠标在右侧，左侧高亮
                titleLeft.classList.add('title-highlight');
                titleRight.classList.remove('title-highlight');
            }
        });
        
        // 鼠标离开标题时移除所有高亮
        titleElement.addEventListener('mouseleave', () => {
            titleLeft.classList.remove('title-highlight');
            titleRight.classList.remove('title-highlight');
        });
    }
}

// 添加支出记录
function addExpense() {
    const type = document.getElementById('expense-type').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const date = document.getElementById('expense-date').value;

    if (!amount || !date) {
        alert('请填写完整的支出信息');
        return;
    }

    const expense = {
        type,
        amount,
        date
    };

    expenses.push(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));

    // 清空输入框
    document.getElementById('expense-amount').value = '';

    // 更新统计和列表
    updateStatistics();
    renderExpenseList();
}

// 更新统计数据
function updateStatistics(startDate, endDate) {
    // 如果没有指定日期范围，使用当前月份的起始日期和结束日期
    if (!startDate || !endDate) {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
    });

    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    document.getElementById('period-total').textContent = `¥${total.toFixed(2)}`;

    // 计算日均支出
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const dailyAverage = total / days;
    document.getElementById('daily-average').textContent = `¥${dailyAverage.toFixed(2)}`;

    // 计算最大单笔支出
    const maxExpense = filteredExpenses.reduce((max, expense) => 
        Math.max(max, expense.amount), 0);
    document.getElementById('max-expense').textContent = `¥${maxExpense.toFixed(2)}`;

    // 按类型统计支出
    const expensesByType = {};
    filteredExpenses.forEach(expense => {
        if (!expensesByType[expense.type]) {
            expensesByType[expense.type] = 0;
        }
        expensesByType[expense.type] += expense.amount;
    });

    // 更新饼图
    updatePieChart(expensesByType, total);
}

// 更新饼图
function updatePieChart(expensesByType, total) {
    const canvas = document.getElementById('expense-chart');
    if (!canvas) {
        const chartContainer = document.createElement('div');
        chartContainer.style.flex = '1';
        chartContainer.innerHTML = '<canvas id="expense-chart"></canvas>';
        document.querySelector('.statistics').appendChild(chartContainer);
    }

    const ctx = document.getElementById('expense-chart').getContext('2d');
    
    // 如果已存在图表，先销毁
    if (window.expenseChart) {
        window.expenseChart.destroy();
    }

    const colors = {
        food: '#FF6384',
        rent: '#36A2EB',
        transportation: '#FFCE56',
        shopping: '#4BC0C0',
        other: '#9966FF'
    };

    const data = {
        labels: Object.keys(expensesByType).map(type => getExpenseTypeName(type)),
        datasets: [{
            data: Object.values(expensesByType),
            backgroundColor: Object.keys(expensesByType).map(type => colors[type]),
            hoverOffset: 4
        }]
    };

    window.expenseChart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `¥${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 计算自定义日期范围的支出
function calculateCustomRange() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!startDate || !endDate) {
        alert('请选择完整的日期范围');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 设置时间为当天的开始和结束
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    updateStatistics(start, end);
}

// 计算从指定日期开始的总支出
function calculateTotal(startDate) {
    return expenses
        .filter(expense => new Date(expense.date) >= startDate)
        .reduce((total, expense) => total + expense.amount, 0);
}

// 渲染支出列表
function renderExpenseList() {
    const tbody = document.getElementById('expense-records');
    if (!tbody) {
        console.error('无法找到expense-records元素');
        return;
    }
    tbody.innerHTML = '';

    // 按日期降序排序显示所有记录
    const sortedExpenses = [...expenses]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedExpenses.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" style="text-align: center;">暂无支出记录</td>';
        tbody.appendChild(tr);
        return;
    }

    sortedExpenses.forEach((expense, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="日期">${expense.date}</td>
            <td data-label="类型">${getExpenseTypeName(expense.type)}</td>
            <td data-label="金额">¥${expense.amount.toFixed(2)}</td>
            <td data-label="操作"><button class="delete-btn" data-index="${index}">删除</button></td>
        `;
        tbody.appendChild(tr);

        // 添加删除按钮事件监听器
        const deleteBtn = tr.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            if (confirm('确定要删除这条记录吗？')) {
                expenses.splice(index, 1);
                localStorage.setItem('expenses', JSON.stringify(expenses));
                updateStatistics();
                renderExpenseList();
            }
        });
    });
}

// 获取支出类型的中文名称
function getExpenseTypeName(type) {
    const typeMap = {
        food: '餐饮食品',
        rent: '房租水电',
        transportation: '交通出行',
        shopping: '日常购物',
        entertainment: '休闲娱乐',
        medical: '医疗保健',
        education: '教育培训',
        clothes: '服饰美容',
        communication: '通讯网络',
        other: '其他支出'
    };
    return typeMap[type] || type;
}

// 导出支出记录为Excel文件
function exportToExcel() {
    // 准备数据
    const data = expenses.map(expense => [
        expense.date,
        getExpenseTypeName(expense.type),
        `¥${expense.amount.toFixed(2)}`
    ]);

    // 添加表头
    data.unshift(['日期', '类型', '金额']);

    // 创建CSV内容
    let csvContent = 'data:text/csv;charset=utf-8,';
    data.forEach(row => {
        csvContent += row.join(',') + '\n';
    });

    // 创建下载链接
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `支出记录_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);

    // 触发下载
    link.click();
    document.body.removeChild(link);
}

