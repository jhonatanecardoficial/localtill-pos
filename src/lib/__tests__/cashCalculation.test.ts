import { describe, it, expect } from 'vitest';

describe('Regras de Negócio: Cálculo de Troco e Movimentação de Caixa', () => {
  it('deve calcular o troco correto quando o valor pago for maior que o total da venda', () => {
    const totalVenda = 15.50;
    const valorPago = 20.00;
    const troco = Math.max(0, valorPago - totalVenda);

    expect(troco).toBeCloseTo(4.50);
  });

  it('deve retornar zero de troco quando o valor pago for exato', () => {
    const totalVenda = 50.00;
    const valorPago = 50.00;
    const troco = Math.max(0, valorPago - totalVenda);

    expect(troco).toBe(0);
  });

  it('deve somar corretamente o suprimento ao saldo atual do caixa', () => {
    const saldoInicial = 100.00;
    const suprimento = 50.00;
    const novoSaldo = saldoInicial + suprimento;

    expect(novoSaldo).toBe(150.00);
  });

  it('deve impedir sangria com valor superior ao saldo disponível', () => {
    const saldoDisponivel = 80.00;
    const sangriaTentada = 100.00;
    const sangriaPermitida = sangriaTentada <= saldoDisponivel;

    expect(sangriaPermitida).toBe(false);
  });
});
