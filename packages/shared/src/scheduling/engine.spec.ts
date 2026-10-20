import { describe, it, expect } from 'vitest';
import { calculateAvailableSlots } from './engine';

describe('Motor Puro de Cálculo de Horários (calculateAvailableSlots)', () => {
  const defaultWindows = [
    {
      startTime: '09:00',
      endTime: '18:00',
      professionalId: 'prof-1',
      professionalName: 'Ana Nails'
    }
  ];

  it('deve gerar horários de 30 em 30 minutos em expediente padrão', () => {
    const slots = calculateAvailableSlots({
      dateStr: '2026-10-20',
      totalDurationMinutes: 30,
      slotIntervalMinutes: 30,
      windows: defaultWindows
    });

    expect(slots.length).toBe(18); // 09:00 até 17:30
    expect(slots[0].time).toBe('09:00');
    expect(slots[0].endTime).toBe('09:30');
    expect(slots[0].shift).toBe('MORNING');

    const lastSlot = slots[slots.length - 1];
    expect(lastSlot.time).toBe('17:30');
    expect(lastSlot.endTime).toBe('18:00');
    expect(lastSlot.shift).toBe('AFTERNOON');
  });

  it('deve calcular corretamente para combos longos (ex: 90 minutos)', () => {
    const slots = calculateAvailableSlots({
      dateStr: '2026-10-20',
      totalDurationMinutes: 90,
      slotIntervalMinutes: 30,
      windows: defaultWindows
    });

    // O último horário possível precisa terminar até 18:00 (16:30 + 90m = 18:00)
    const lastSlot = slots[slots.length - 1];
    expect(lastSlot.time).toBe('16:30');
    expect(lastSlot.endTime).toBe('18:00');
  });

  it('deve eliminar horários que colidem com bloqueios de almoço', () => {
    const slots = calculateAvailableSlots({
      dateStr: '2026-10-20',
      totalDurationMinutes: 60,
      slotIntervalMinutes: 30,
      windows: defaultWindows,
      blocks: [
        {
          startTime: '12:00',
          endTime: '13:00',
          professionalId: 'prof-1'
        }
      ]
    });

    const times = slots.map((s) => s.time);
    // 11:30 + 60m terminaria às 12:30 (colide com 12:00-13:00) -> deve estar fora
    expect(times).not.toContain('11:30');
    // 12:00 começaria no almoço -> fora
    expect(times).not.toContain('12:00');
    // 12:30 começaria no almoço -> fora
    expect(times).not.toContain('12:30');
    // 11:00 termina às 12:00 -> permitido
    expect(times).toContain('11:00');
    // 13:00 começa após o almoço -> permitido
    expect(times).toContain('13:00');
  });

  it('deve eliminar horários que colidem com agendamentos existentes', () => {
    const slots = calculateAvailableSlots({
      dateStr: '2026-10-20',
      totalDurationMinutes: 45,
      slotIntervalMinutes: 15,
      windows: defaultWindows,
      bookings: [
        {
          startTime: '14:00',
          endTime: '15:00',
          professionalId: 'prof-1'
        }
      ]
    });

    const times = slots.map((s) => s.time);
    expect(times).not.toContain('13:30'); // 13:30 + 45m = 14:15 (colide com 14:00)
    expect(times).not.toContain('14:00');
    expect(times).not.toContain('14:30');
    expect(times).toContain('13:15'); // 13:15 + 45m = 14:00 (termina exatamente no início)
    expect(times).toContain('15:00'); // inicia exatamente no fim
  });

  it('deve gerar apenas horários em ponto quando roundSlotStarts for true', () => {
    const slots = calculateAvailableSlots({
      dateStr: '2026-10-20',
      totalDurationMinutes: 60,
      roundSlotStarts: true,
      windows: defaultWindows
    });

    const times = slots.map((s) => s.time);
    expect(times).toEqual(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']);
  });

  it('deve filtrar horários do passado quando nowMinutesToday é informado', () => {
    // Simulando que agora são 13:30 (810 minutos) + antecedência mínima de 30 min = 840 minutos (14:00)
    const slots = calculateAvailableSlots({
      dateStr: '2026-10-20',
      totalDurationMinutes: 30,
      slotIntervalMinutes: 30,
      windows: defaultWindows,
      nowMinutesToday: 14 * 60 // 14:00
    });

    const times = slots.map((s) => s.time);
    expect(times).not.toContain('13:30');
    expect(times).toContain('14:00');
    expect(times).toContain('14:30');
  });

  it('deve disponibilizar horário imediatamente após agendamento que terminou em horário quebrado (ex: 14:45)', () => {
    const slots = calculateAvailableSlots({
      dateStr: '2026-10-20',
      totalDurationMinutes: 60,
      slotIntervalMinutes: 30,
      windows: defaultWindows,
      bookings: [
        {
          startTime: '13:30',
          endTime: '14:45',
          professionalId: 'prof-1'
        }
      ]
    });

    const times = slots.map((s) => s.time);
    // 14:45 deve estar disponível para agendar exatamente na sequência da cliente anterior!
    expect(times).toContain('14:45');
    expect(times).not.toContain('14:00');
    expect(times).not.toContain('14:30');
    expect(times).toContain('15:00');
  });
});
