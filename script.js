// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBVAqR7ZnzRZ7OETBtKFFeWOJxs1SotCoY",
    authDomain: "casacontrol-c8b16.firebaseapp.com",
    projectId: "casacontrol-c8b16",
    storageBucket: "casacontrol-c8b16.firebasestorage.app",
    messagingSenderId: "353427490780",
    appId: "1:353427490780:web:6fb383c3c83faad3ab3119",
    measurementId: "G-YQF4XQ5VQ5"
};

// Inicialização do Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Referências aos elementos do DOM
const incomeForm = document.getElementById('incomeForm');
const expenseForm = document.getElementById('expenseForm');
const monthlyIncomeInput = document.getElementById('monthlyIncome');
const remainingBudget = document.getElementById('remainingBudget');
const expenseTableBody = document.getElementById('expenseTableBody');
const categoryBody = document.getElementById('categoryTableBody');

// Variáveis globais
let currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
let totalExpenses = 0;
window.categoryTotals = {};

// Referência ao Firestore
const budgetRef = db.collection('budgets').doc(currentMonth);
const expensesRef = budgetRef.collection('expenses');

// Objeto de limites de categoria
const categoryLimits = {
    'Aluguel': 0.3,
    'Alimentação': 0.15,
    'Gasolina': 0.08,
    'Saúde': 0.05,
    'Energia Elétrica': 0.03,
    'Pet': 0.03,
    'MEI': 0.04,
    'Telefone': 0.03,
    'Terapia': 0.05,
    'Streaming': 0.02,
    'Barbeiro': 0.02,
    'Lazer': 0.05,
    'Investimento': 0.15,
    'Outros': 0.03,

};

// Função para atualizar a tabela de categorias
function updateCategoryTable(income) {
    categoryBody.innerHTML = '';
    for (const [category, percentage] of Object.entries(categoryLimits)) {
        const row = document.createElement('tr');
        const categoryTotal = window.categoryTotals?.[category] || 0;
        const categoryLimit = income * percentage;
        const remaining = categoryLimit - categoryTotal;
        
        row.innerHTML = `
            <td>${category}</td>
            <td>R$ ${categoryLimit.toFixed(2)}</td>
            <td>R$ ${categoryTotal.toFixed(2)}</td>
            <td class="${remaining < 0 ? 'negative-limit' : ''}">
                R$ ${remaining.toFixed(2)}
            </td>
        `;
        categoryBody.appendChild(row);
    }
}

// Monitorar alterações na renda
budgetRef.onSnapshot((doc) => {
    if (doc.exists) {
        const data = doc.data();
        monthlyIncomeInput.value = data.income || 0;
        calculateRemainingBudget(data.income, totalExpenses);
        if (data.income) updateCategoryTable(data.income);
    }
});

// Monitorar alterações nas despesas
expensesRef.onSnapshot((querySnapshot) => {
    totalExpenses = 0;
    expenseTableBody.innerHTML = '';
    window.categoryTotals = {};

    querySnapshot.forEach((doc) => {
        const expense = doc.data();
        totalExpenses += expense.amount;
        
        if (window.categoryTotals[expense.category]) {
            window.categoryTotals[expense.category] += expense.amount;
        } else {
            window.categoryTotals[expense.category] = expense.amount;
        }
        
        addExpenseToTable({ id: doc.id, ...expense });
    });

    budgetRef.get().then(doc => {
        if (doc.exists && doc.data().income) {
            calculateRemainingBudget(doc.data().income, totalExpenses);
            updateCategoryTable(doc.data().income);
        }
    });
});

// Formulário de Renda
incomeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const income = parseFloat(monthlyIncomeInput.value);
    
    try {
        await budgetRef.set({ income }, { merge: true });
    } catch (error) {
        console.error('Erro ao salvar renda:', error);
    }
});

// Formulário de Despesa
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const expense = {
        name: document.getElementById('expenseName').value.trim(),
        amount: parseFloat(document.getElementById('expenseAmount').value),
        category: document.getElementById('expenseCategory').value,
        date: new Date().toISOString()
    };

    if (!expense.name || isNaN(expense.amount) || expense.amount <= 0) {
        alert('Preencha todos os campos corretamente!');
        return;
    }

    if (!categoryLimits.hasOwnProperty(expense.category)) {
        alert('Categoria inválida!');
        return;
    }

    const income = parseFloat(monthlyIncomeInput.value);
    if (isNaN(income)) {
        alert('Defina sua renda mensal primeiro!');
        return;
    }

    const maxAllowed = income * categoryLimits[expense.category];
    const currentTotal = window.categoryTotals?.[expense.category] || 0;

    if ((currentTotal + expense.amount) > maxAllowed) {
        if (!confirm(`Atenção: Você está excedendo o limite recomendado para ${expense.category}! Deseja continuar?`)) {
            return;
        }
    }

    try {
        await expensesRef.add(expense);
        expenseForm.reset();
    } catch (error) {
        console.error('Erro ao adicionar despesa:', error);
    }
});

// Função para calcular saldo restante
function calculateRemainingBudget(income, expenses) {
    const remaining = income - expenses;
    remainingBudget.textContent = remaining.toFixed(2);
    remainingBudget.className = remaining >= 0 ? 'positive-balance' : 'negative-balance';
}

// Função para adicionar despesas na tabela
function addExpenseToTable(expense) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${expense.name}</td>
        <td>R$ ${expense.amount.toFixed(2)}</td>
        <td>${expense.category}</td>
        <td>${new Date(expense.date).toLocaleDateString('pt-BR')}</td>
        <td><button onclick="deleteExpense('${expense.id}')">Excluir</button></td>
    `;
    expenseTableBody.appendChild(row);
}

// Função para excluir despesa
window.deleteExpense = async (expenseId) => {
    if (confirm('Deseja excluir esta despesa?')) {
        try {
            await expensesRef.doc(expenseId).delete();
        } catch (error) {
            console.error('Erro ao excluir despesa:', error);
        }
    }
};
