// Dados iniciais e configuração
let transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
let rendaMensal = parseFloat(localStorage.getItem('rendaMensal')) || 0;

const orcamentoBase = {
  'Aluguel': 30,
  'Alimentação': 15,
  'Gasolina': 8,
  'Saúde': 5,
  'Energia Elétrica': 3,
  'Pet': 3,
  'MEI': 4,
  'Telefone': 3,
  'Terapia': 5,
  'Streaming': 2,
  'Barbeiro': 2,
  'Lazer': 5,
  'Investimento': 15,
  'Compras Longo Prazo': 0 // Não entra no cálculo padrão
};

// Elementos do DOM
const forms = {
  gasto: document.getElementById('form-gasto'),
  renda: document.getElementById('form-renda')
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  const rendaInput = document.getElementById('renda-input');
  if (rendaInput) {
    rendaInput.value = rendaMensal;
  }
  atualizarTudo();
});

// Salvar renda mensal e atualizar interface
function salvarRenda() {
  const rendaInput = document.getElementById('renda-input');
  rendaMensal = parseFloat(rendaInput.value) || 0;
  localStorage.setItem('rendaMensal', rendaMensal);
  atualizarTudo();
}

// Função principal para adicionar transação
function adicionarTransacao(tipo, dados) {
  const transacao = {
    id: Date.now(),
    tipo,
    ...dados,
    data: new Date().toLocaleDateString('pt-BR'),
    parcelamento: dados.parcelamento || null
  };

  transacoes.push(transacao);
  localStorage.setItem('transacoes', JSON.stringify(transacoes));
  atualizarTudo();
}

// Calcula os totais considerando a renda mensal inicial + receitas
function calcularTotais() {
  const totalGasto = transacoes
    .filter(t => t.tipo === 'gasto')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalRendaTransacoes = transacoes
    .filter(t => t.tipo === 'renda')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalRenda = rendaMensal + totalRendaTransacoes;
  return { totalGasto, totalRenda, saldo: totalRenda - totalGasto };
}

// Calcula os limites reais para cada categoria
function calcularLimites() {
  return Object.fromEntries(
    Object.entries(orcamentoBase).map(([categoria, porcentagem]) => [
      categoria,
      (rendaMensal * porcentagem) / 100
    ])
  );
}

// Verifica orçamentos por categoria
function verificarOrcamentos() {
  const limites = calcularLimites();
  const gastosPorCategoria = transacoes
    .filter(t => t.tipo === 'gasto' && t.categoria in limites)
    .reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {});

  return Object.entries(gastosPorCategoria).map(([categoria, total]) => {
    const limite = limites[categoria];
    const porcentagem = (total / limite) * 100;
    return {
      categoria,
      total,
      limite,
      porcentagem: Math.min(porcentagem, 100),
      excedido: porcentagem > 100
    };
  });
}

// Atualiza toda a interface
function atualizarTudo() {
  const { totalGasto, totalRenda, saldo } = calcularTotais();
  const metaGuardar = saldo * 0.2; // 20% do saldo

  document.querySelector('.valor-gasto').textContent = `R$ ${totalGasto.toFixed(2)}`;
  document.querySelector('.valor-renda').textContent = `R$ ${totalRenda.toFixed(2)}`;
  document.querySelector('.saldo').textContent = `R$ ${saldo.toFixed(2)}`;
  document.querySelector('.guardar').textContent = `R$ ${metaGuardar.toFixed(2)}`;

  atualizarTabela();
  atualizarGrafico();
  verificarLimitesOrcamento();
}

// Atualiza a tabela de transações
function atualizarTabela() {
  const tbody = document.getElementById('lista-transacoes');
  tbody.innerHTML = '';

  transacoes.forEach(transacao => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${transacao.data}</td>
      <td>${transacao.descricao} ${transacao.parcelamento ? 
        `(${transacao.parcelamento.pagas}/${transacao.parcelamento.total})` : ''}</td>
      <td>${transacao.categoria || '-'}</td>
      <td class="${transacao.tipo}">R$ ${transacao.valor.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

// Atualiza gráfico de gastos
function atualizarGrafico() {
    const ctx = document.getElementById('grafico-gastos').getContext('2d');
    const gastos = transacoes.filter(t => t.tipo === 'gasto');
    
    // Agrupar por categoria
    const categorias = gastos.reduce((acc, transacao) => {
        acc[transacao.categoria] = (acc[transacao.categoria] || 0) + transacao.valor;
        return acc;
    }, {});

    if (Object.keys(categorias).length === 0) {
        if (window.grafico) window.grafico.destroy();
        return; // Não criar gráfico se não houver categorias
    }

    if (window.grafico) window.grafico.destroy();
    
    window.grafico = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categorias),
            datasets: [{
                data: Object.values(categorias),
                backgroundColor: Object.keys(categorias).map((_, i) => 
                    `hsl(${i * 360 / Object.keys(categorias).length}, 70%, 50%)`
                )
            }]
        }
    });
}
// Verifica limites e atualiza visualmente na tabela
function verificarLimitesOrcamento() {
    const analise = verificarOrcamentos();
  
    analise.forEach(item => {
      const tabela = document.getElementById('lista-transacoes');
      const elementos = tabela.querySelectorAll('td'); // Filtrar apenas na tabela correta
      elementos.forEach(td => {
        if (td.textContent.includes(item.categoria)) {
          let row = td.closest('tr');
          let progressBar = row.querySelector('.progress-bar');
          if (!progressBar) {
            const container = criarProgressBar();
            row.appendChild(container);
            progressBar = container.querySelector('.progress-bar');
          }
          progressBar.style.width = `${item.porcentagem}%`;
          progressBar.style.backgroundColor = item.excedido ? '#dc2626' : '#16A34A';
  
          if (item.excedido) {
            row.classList.add('excedido');
            td.innerHTML = `${item.categoria} <br><small>Limite: R$${item.limite.toFixed(2)}</small>`;
          }
        }
      });
    });
  }

// Cria um elemento de progress bar
function criarProgressBar() {
  const container = document.createElement('div');
  container.className = 'progress-container';
  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  container.appendChild(bar);
  return container;
}

// Event Listener para formulário de gastos
forms.gasto.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const descricao = formData.get('descricao');
    const valor = parseFloat(formData.get('valor'));
    const categoria = formData.get('categoria');
    
    if (!descricao || isNaN(valor) || valor <= 0 || !categoria) {
        alert('Preencha todos os campos obrigatórios com valores válidos!');
        return;
    }

    adicionarTransacao('gasto', {
        descricao,
        valor,
        categoria,
        parcelamento: formData.has('parcelamento-total') ? {
            total: parseInt(formData.get('parcelamento-total')),
            pagas: parseInt(formData.get('parcelamento-pagas')) || 0
        } : null
    });

    e.target.reset();
});

forms.renda.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const descricao = formData.get('descricao');
  const valor = parseFloat(formData.get('valor'));

  if (!descricao || isNaN(valor) || valor <= 0) {
      alert('Preencha todos os campos obrigatórios com valores válidos!');
      return;
  }

  adicionarTransacao('renda', { descricao, valor });
  e.target.reset();
});
// Event Listener para formulário de renda
forms.renda.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const descricao = formData.get('descricao');
  const valor = parseFloat(formData.get('valor'));

  adicionarTransacao('renda', { descricao, valor });
  e.target.reset();
});

// Adiciona campos de parcelamento dinamicamente se o select externo mudar
const selectElem = document.getElementById('categoria');
if (selectElem) {
  selectElem.addEventListener('change', function() {
    let parcelamentoDiv = document.getElementById('parcelamento-fields');
    if (this.value === 'Compras Longo Prazo') {
      if (!parcelamentoDiv) {
        parcelamentoDiv = document.createElement('div');
        parcelamentoDiv.id = 'parcelamento-fields';
        parcelamentoDiv.innerHTML = `
          <input type="number" placeholder="Total de Parcelas" name="parcelamento-total" min="1" required>
          <input type="number" placeholder="Parcelas Pagas" name="parcelamento-pagas" min="0" required>
        `;
        forms.gasto.insertBefore(parcelamentoDiv, forms.gasto.lastElementChild);
      }
    } else if (parcelamentoDiv) {
      parcelamentoDiv.remove();
    }
  });
}
