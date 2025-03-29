// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBVAqR7ZnzRZ7OETBtKFFeWOJxs1SotCoY",
    authDomain: "casacontrol-c8b16.firebaseapp.com",
    projectId: "casacontrol-c8b16", // Corrigi o projectId
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

    // Variáveis globais
    let currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    let totalExpenses = 0;

    // Referência ao Firestore
    const budgetRef = db.collection('budgets').doc(currentMonth);
    const expensesRef = budgetRef.collection('expenses');

    // Monitorar alterações na renda
    budgetRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            monthlyIncomeInput.value = data.income || 0;
            calculateRemainingBudget(data.income, totalExpenses);
        }
    });

    // Monitorar alterações nas despesas
    expensesRef.onSnapshot((querySnapshot) => {
        totalExpenses = 0;
        expenseTableBody.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const expense = doc.data();
            totalExpenses += expense.amount;
            addExpenseToTable({ id: doc.id, ...expense });
        });

        // Atualizar saldo após carregar despesas
        budgetRef.get().then(doc => {
            if (doc.exists) {
                calculateRemainingBudget(doc.data().income, totalExpenses);
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
            <td data-label="Nome">${expense.name}</td>
            <td data-label="Valor">R$ ${expense.amount.toFixed(2)}</td>
            <td data-label="Categoria"><span class="category-badge">${expense.category}</span></td>
            <td data-label="Data">${new Date(expense.date).toLocaleDateString('pt-BR')}</td>
            <td data-label="Ações" class="expense-actions">
                <button class="btn btn-danger delete-btn" onclick="deleteExpense('${expense.id}')">Excluir</button>
            </td>
        `;
        expenseTableBody.appendChild(row);
    }

    // Função para excluir despesa (global para o onclick)
    window.deleteExpense = async (expenseId) => {
        if (confirm('Tem certeza que deseja excluir esta despesa?')) {
            try {
                await expensesRef.doc(expenseId).delete();
            } catch (error) {
                console.error('Erro ao excluir despesa:', error);
            }
        }
    };

    // Carregar dados iniciais
    budgetRef.get().then(doc => {
        if (!doc.exists) {
            budgetRef.set({ income: 0 });
        }
    });