/**
 * Analisador Clínico de Anamnese (TypeSafe JEV) — MarqueSuaHora
 * Identifica fatores de risco (alergias a esmaltes/gel, diabetes, micose, sensibilidade química)
 * para fornecer resguardo técnico e proteção à profissional de beleza na bancada.
 */
export interface AnamnesisAlert {
  code: 'ALLERGY_GEL' | 'DIABETES' | 'MYCOSIS' | 'CHEMICAL_SENSITIVITY' | 'BITTEN_NAILS' | 'PREGNANCY';
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  recommendation: string;
}

export class AnamnesisAnalyzerService {
  /**
   * Avalia as respostas do formulário de anamnese e gera a lista de alertas clínicos.
   */
  public static analyze(anamnesisData: any): AnamnesisAlert[] {
    const alerts: AnamnesisAlert[] = [];
    if (!anamnesisData || typeof anamnesisData !== 'object') {
      return alerts;
    }

    const data = anamnesisData;

    // 1. Alergia a esmaltes, gel ou monômeros
    if (data.allergyPolish || data.allergyGel || data.hasAllergies === true || data.hasAllergies === 'true') {
      alerts.push({
        code: 'ALLERGY_GEL',
        severity: 'HIGH',
        title: 'Alerta de Alergia a Esmalte/Gel',
        recommendation: 'Utilizar linha hipoalergênica e não encostar o produto na lâmina cuticular.'
      });
    }

    // 2. Diabetes
    if (data.diabetes === true || data.diabetes === 'true') {
      alerts.push({
        code: 'DIABETES',
        severity: 'HIGH',
        title: 'Cliente Diabética',
        recommendation: 'Atenção redobrada na cuticulagem: não realizar corte profundo para evitar microlesões.'
      });
    }

    // 3. Micoses ou Fungos
    if (data.mycosis === true || data.mycosis === 'true' || data.fungusHistory === true) {
      alerts.push({
        code: 'MYCOSIS',
        severity: 'HIGH',
        title: 'Histórico de Micose/Fungos',
        recommendation: 'Avaliar integridade da lâmina ungueal antes da aplicação de alongamentos e desinfetar alicates.'
      });
    }

    // 4. Contato com produtos químicos sem luvas
    if (data.chemicalContactWithoutGloves === true || data.chemicalContactWithoutGloves === 'true') {
      alerts.push({
        code: 'CHEMICAL_SENSITIVITY',
        severity: 'MEDIUM',
        title: 'Exposição Química Frequente',
        recommendation: 'Reforçar o preparador e desidratador antes de procedimentos de fixação.'
      });
    }

    // 5. Unhas roídas
    if (data.bittenNails === true || data.bittenNails === 'true') {
      alerts.push({
        code: 'BITTEN_NAILS',
        severity: 'INFO',
        title: 'Unhas Roídas',
        recommendation: 'Adaptar o molde ou tip para leito curto com manutenção em intervalo reduzido de 15 dias.'
      });
    }

    return alerts;
  }
}
