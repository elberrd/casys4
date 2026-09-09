function chip(
  key: string,
  label: string,
  attrs?: { bold?: boolean },
): string {
  const bold = attrs?.bold ? ' data-bold="true"' : "";
  return `<span data-type="report-variable" class="report-variable" data-key="${key}"${bold}>${label}</span>`;
}

export const CRIMINAL_BACKGROUND_REPORT_NAME =
  "Declaração de ausência de antecedentes criminais";

export const CRIMINAL_BACKGROUND_REPORT_DESCRIPTION =
  "Declaração de ausência de antecedentes criminais para Autorização de Residência, com variáveis do processo individual.";

export function isCriminalBackgroundReportName(name: string): boolean {
  return name.trim() === CRIMINAL_BACKGROUND_REPORT_NAME;
}

/** TipTap HTML for the former hard-coded criminal-background declaration. */
export const CRIMINAL_BACKGROUND_REPORT_HTML = [
  `<p style="text-align: center; margin-bottom: 2.5em"><strong><u>DECLARAÇÃO</u></strong></p>`,
  `<p>Ao</p>`,
  `<p style="margin-bottom: 2em">Ilmo. Sr. Coordenador-Geral de Imigração Laboral/CGIL/DEMIG/SNJ/MJSP</p>`,
  `<p style="margin-bottom: 2em">Prezado Sr. Coordenador,</p>`,
  `<p style="text-align: justify; text-indent: 2em; margin-bottom: 2em">Eu, ${chip("personNameUpper", "Nome do indivíduo (maiúsculas)", { bold: true })}, nacional da ${chip("nationalityShort", "Nacionalidade (texto da declaração)")}, ${chip("maritalStatusText", "Estado civil (texto da declaração)")}, ${chip("bornWord", "Nascido/nascida")} em ${chip("birthDateLong", "Data de nascimento (por extenso)")}, ${chip("childWord", "Filho/filha")} de ${chip("fatherNameUpper", "Nome do pai (maiúsculas)")} (pai) e de ${chip("motherNameUpper", "Nome da mãe (maiúsculas)")} (mãe), ${chip("holderWord", "Portador/portadora")} do passaporte de nº ${chip("passportNumber", "Número do Passaporte")} – emitido em ${chip("issueDateLong", "Data de emissão (por extenso)")} pela ${chip("issuingCountryOfficial", "País emissor (nome oficial)")}, válido até ${chip("expiryDateLong", "Data de validade (por extenso)")} – em atendimento ao disposto no Inciso XI do art. 1º da RN 01/2017 CNIg, <strong>DECLARO</strong> sob as penas do art. 299 do Código Penal Brasileiro, que não possuo antecedentes criminais em qualquer país, nos 05 anos anteriores à data da solicitação de minha Autorização de Residência com base no ${chip("legalFrameworkPlain", "Amparo legal (sem ponto final)")}.</p>`,
  `<p style="padding-left: 3em; margin-bottom: 1.5em">Por ser a expressão da verdade, firmo a presente declaração.</p>`,
  `<p style="padding-left: 3em">Nestes termos,</p>`,
  `<p style="padding-left: 3em; margin-bottom: 2.5em">Pede deferimento.</p>`,
  `<p style="text-align: center">${chip("locationDate", "Local e data da declaração")}</p>`,
  `<p style="text-align: center; margin-top: 4em">${chip("personNameUpper", "Nome do indivíduo (maiúsculas)", { bold: true })}</p>`,
].join("");

export const PROFESSIONAL_EXPERIENCE_REPORT_NAME =
  "Declaração de experiência profissional";

export const PROFESSIONAL_EXPERIENCE_REPORT_DESCRIPTION =
  "Declaração de experiência profissional com atividades CBO do processo individual e grupo empresarial opcional.";

export function isProfessionalExperienceReportName(name: string): boolean {
  return name.trim() === PROFESSIONAL_EXPERIENCE_REPORT_NAME;
}

/** TipTap HTML for the professional experience declaration. */
export const PROFESSIONAL_EXPERIENCE_REPORT_HTML = [
  `<p style="text-align: center; margin-bottom: 2.5em"><strong><u>DECLARAÇÃO DE EXPERIÊNCIA PROFISSIONAL</u></strong></p>`,
  `<p style="text-align: justify; text-indent: 2em; margin-bottom: 2em">Declaramos, para todos os efeitos, que ${chip("srPhrase", "o Sr./a Sra.")} ${chip("personNameUpper", "Nome do indivíduo (maiúsculas)", { bold: true })} é ${chip("employeeWord", "funcionário/funcionária")} da ${chip("companyEmploymentPlace", "Empresa, cidade e grupo", { bold: true })} desde ${chip("professionalExperienceSinceLong", "Experiência profissional (por extenso)")}, atuando como ${chip("cboTitleUpper", "Título CBO (maiúsculas)", { bold: true })} desenvolvendo as seguintes atividades:</p>`,
  `<p style="text-align: justify; margin-bottom: 2.5em">${chip("atividadeCBO", "Atividade CBO")}</p>`,
  `<p style="text-align: center">${chip("locationDate", "Local e data da declaração")}</p>`,
  `<p style="text-align: center; margin-top: 4em">${chip("userApplicantName", "Nome do solicitante")}</p>`,
  `<p style="text-align: center">Representante legal</p>`,
  `<p style="text-align: center">Por: ${chip("companyApplicant", "Empresa Requerente")}</p>`,
].join("");
