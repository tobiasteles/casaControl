   // Configuração do Firebase
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
    const budgetRef = db.collection('budgets').doc('current');

    // Configuração das categorias e limites
    const categories = {
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
        'Lazer': 0.05
    };

    let chartInstance = null;

    // Função para formatar valores monetários
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Monitorar alterações no banco de dados em tempo real
    budgetRef.onSnapshot((doc) => {
        const data = doc.data() || {};
        updateSummary(data);
        updateExpensesList(data.expenses || []);
        updateChart(data);
    });

// Dentro do script.js

// CADASTRO DE RENDAS (Código corrigido)
document.getElementById('incomeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const husbandIncome = parseFloat(document.getElementById('husbandIncome').value);
  const wifeIncome = parseFloat(document.getElementById('wifeIncome').value);
  
  // REMOVA A LINHA DO expenses
  budgetRef.set({
      husbandIncome,
      wifeIncome
  }, { merge: true });
  
  showAlert('Rendas salvas com sucesso!', '#16A34A');
  e.target.reset();
});

    // Cadastro de Despesas
    document.getElementById('expenseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('expenseName').value.trim();
        const value = parseFloat(document.getElementById('expenseValue').value);
        const category = document.getElementById('expenseCategory').value;

        if (!name || isNaN(value) || !category) {
            showAlert('Preencha todos os campos corretamente!', '#F97316');
            return;
        }

        const doc = await budgetRef.get();
        const data = doc.data() || {};
        const totalIncome = (data.husbandIncome || 0) + (data.wifeIncome || 0);

        if (totalIncome === 0) {
            showAlert('Cadastre as rendas primeiro!', '#F97316');
            return;
        }

        // Verificação de limite da categoria
        const limit = totalIncome * categories[category];
        const currentExpenses = data.expenses || [];
        const categoryTotal = currentExpenses
            .filter(e => e.category === category)
            .reduce((sum, e) => sum + e.value, 0);

        if ((categoryTotal + value) > limit) {
            const exceeded = (categoryTotal + value) - limit;
            showAlert(`Limite de ${category} excedido em ${formatCurrency(exceeded)}!`, '#FACC15');
        }

        // Adicionar despesa
        budgetRef.update({
            expenses: firebase.firestore.FieldValue.arrayUnion({
                name,
                value,
                category,
                date: new Date().toISOString()
            })
        });

        showAlert('Despesa adicionada com sucesso!', '#16A34A');
        e.target.reset();
    });

    // Atualizar resumo financeiro
    function updateSummary(data) {
        const totalIncome = (data.husbandIncome || 0) + (data.wifeIncome || 0);
        const totalExpenses = (data.expenses || []).reduce((sum, e) => sum + e.value, 0);
        
        document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
        document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('remaining').textContent = formatCurrency(totalIncome - totalExpenses);
    }

    // Atualizar lista de despesas
    function updateExpensesList(expenses) {
        const list = document.getElementById('expensesList');
        list.innerHTML = '';
        
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(expense => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${expense.name}</strong>
                    <span>${expense.category}</span>
                </div>
                <div>
                    ${formatCurrency(expense.value)}
                    <small>${new Date(expense.date).toLocaleDateString()}</small>
                </div>
            `;
            list.appendChild(li);
        });
    }

    // Atualizar gráfico
    function updateChart(data) {
        const ctx = document.getElementById('chart').getContext('2d');
        const totalIncome = (data.husbandIncome || 0) + (data.wifeIncome || 0);
        const expenses = data.expenses || [];

        const labels = Object.keys(categories);
        const actual = labels.map(cat => 
            expenses.filter(e => e.category === cat)
                   .reduce((sum, e) => sum + e.value, 0)
        );
        const limits = labels.map(cat => totalIncome * categories[cat]);

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gasto Real',
                    data: actual,
                    backgroundColor: '#F97316',
                    borderRadius: 4
                }, {
                    label: 'Limite',
                    data: limits,
                    backgroundColor: '#2563EB',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#1E3A8A',
                            font: {
                                family: 'Montserrat'
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#1E3A8A',
                            callback: (value) => formatCurrency(value)
                        }
                    },
                    x: {
                        ticks: {
                            color: '#1E3A8A',
                            font: {
                                family: 'Montserrat'
                            }
                        }
                    }
                }
            }
        });
    }

    // Mostrar alertas personalizados
    function showAlert(message, color) {
        const alert = document.createElement('div');
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.padding = '15px 25px';
        alert.style.borderRadius = '8px';
        alert.style.background = color;
        alert.style.color = color === '#FACC15' ? '#1E3A8A' : 'white';
        alert.style.fontFamily = 'Montserrat';
        alert.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        alert.textContent = message;

        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    // Inicialização inicial
    budgetRef.get().then(doc => {
        if (!doc.exists) {
            budgetRef.set({
                husbandIncome: 0,
                wifeIncome: 0,
                expenses: []
            });
        }
    });

    