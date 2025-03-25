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

// Função assíncrona para inicialização correta
async function initializeFirebase() {
    try {
        // 1. Limpar persistência ANTES de inicializar
        await firebase.firestore().clearPersistence();

        // 2. Inicializar o Firebase
        const app = firebase.initializeApp(firebaseConfig);

        // 3. Configurar Firestore com cache e opções experimentais
        const firestoreSettings = {
            host: 'firestore.googleapis.com',
            ssl: true,
            experimentalForceLongPolling: true
        };
        const db = firebase.firestore(app);
        db.settings({
            ...firestoreSettings,
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            merge: true
        });

        // 4. Teste de conexão modificado
        db.collection("connectionTest").doc("test").set({
            timestamp: new Date()
        }, { merge: true })
        .then(() => console.log("✅ Conexão estabelecida"))
        .catch(e => console.error("❌ Erro de conexão:", e));

        return db;
    } catch (error) {
        console.error("Erro na inicialização:", error);
        throw error;
    }
}

// Uso da inicialização assíncrona
initializeFirebase().then(db => {

    // Variáveis de controle de data e referência ao orçamento
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    let budgetRef;

    // Atualiza a referência do mês e cria o documento se não existir
    async function updateBudgetRef(year, month) {
        const monthId = `${year}-${String(month + 1).padStart(2, '0')}`;
        budgetRef = db.collection('budgets').doc(monthId);
        
        try {
            await budgetRef.set({
                husbandIncome: 0,
                wifeIncome: 0,
                expenses: []
            }, { merge: true });
            loadMonthData();
        } catch (error) {
            console.error("Erro ao inicializar mês:", error);
            showAlert('Erro ao carregar mês!', '#F97316');
        }
    }

    // Carrega os dados do mês com listener em tempo real
    function loadMonthData() {
        budgetRef.onSnapshot(
            (doc) => {
                if (doc.metadata.hasPendingWrites) return;
                const data = doc.data() || {};
                updateSummary(data);
                updateExpensesList(data.expenses || []);
                updateChart(data);
            },
            (error) => {
                console.error("Erro no listener:", error);
                showAlert('Erro ao carregar dados!', '#F97316');
            }
        );
    }

    // Atualiza o mês atual automaticamente
    function setCurrentMonth() {
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth();
        document.getElementById('monthSelect').value = currentMonth;
        document.getElementById('yearInput').value = currentYear;
        updateBudgetRef(currentYear, currentMonth);
    }

    // Permite mudar de mês manualmente
    window.updateMonth = function() {
        currentMonth = parseInt(document.getElementById('monthSelect').value);
        currentYear = parseInt(document.getElementById('yearInput').value);
        updateBudgetRef(currentYear, currentMonth);
    }

    // Inicialização modificada: atualiza automaticamente no início de cada mês
    function initialize() {
        setCurrentMonth();
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const timeUntilNextMonth = nextMonth - now;
        setTimeout(() => {
            setCurrentMonth();
            setInterval(setCurrentMonth, 3600000);
        }, timeUntilNextMonth);
    }
    initialize();

    // Tratamento de erros globais
    window.addEventListener('error', (e) => {
        console.error('Erro não tratado:', e.error);
        showAlert(`Erro: ${e.message}`, '#F97316');
    });

    // Ajuste dos inputs de renda
    document.getElementById('husbandIncome').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/,/g, '.');
    });
    document.getElementById('wifeIncome').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/,/g, '.');
    });

    /* Configuração das categorias */
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
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);

    /* Cadastro de Rendas */
    document.getElementById('incomeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const husbandIncome = parseFloat(document.getElementById('husbandIncome').value);
        const wifeIncome = parseFloat(document.getElementById('wifeIncome').value);
        budgetRef.update({ husbandIncome, wifeIncome });
        showAlert('Rendas salvas com sucesso!', '#16A34A');
        e.target.reset();
    });

    /* Cadastro de Despesas com tratamento de erros */
    document.getElementById('expenseForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validações
        const name = document.getElementById('expenseName').value.trim();
        const value = parseFloat(document.getElementById('expenseValue').value);
        const category = document.getElementById('expenseCategory').value;
        if (!name || isNaN(value) || !category) {
            showAlert('Preencha todos os campos corretamente!', '#F97316');
            return;
        }

        try {
            // Verificar se o documento existe; se não, criar com merge
            const doc = await budgetRef.get();
            if (!doc.exists) {
                await budgetRef.set({ expenses: [] }, { merge: true });
            }

            // Atualiza o documento adicionando a despesa
            await budgetRef.update({
                expenses: firebase.firestore.FieldValue.arrayUnion({
                    name,
                    value,
                    category,
                    date: new Date().toISOString()
                })
            });

            showAlert('Despesa adicionada com sucesso!', '#16A34A');
            e.target.reset();
        } catch (error) {
            console.error("Erro ao adicionar despesa:", error);
            showAlert('Erro ao salvar despesa!', '#F97316');
        }
    });

    /* Atualiza resumo financeiro */
    function updateSummary(data) {
        const totalIncome = (data.husbandIncome || 0) + (data.wifeIncome || 0);
        const totalExpenses = (data.expenses || []).reduce((sum, e) => sum + e.value, 0);
        document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
        document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('remaining').textContent = formatCurrency(totalIncome - totalExpenses);
    }

    /* Atualiza lista de despesas filtrando pelo mês atual */
    function updateExpensesList(expenses) {
        const list = document.getElementById('expensesList');
        list.innerHTML = '';
        expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth &&
                   expenseDate.getFullYear() === currentYear;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(expense => {
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

    /* Atualiza gráfico com animação */
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
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
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
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#1E3A8A',
                            font: { family: 'Montserrat' }
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
                            font: { family: 'Montserrat' }
                        }
                    }
                }
            }
        });
    }

    /* Exibe alertas personalizados */
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
        setTimeout(() => alert.remove(), 3000);
    }
}).catch(error => {
    console.error("Falha crítica:", error);
    showAlert('Erro na inicialização do sistema!', '#F97316');
});
