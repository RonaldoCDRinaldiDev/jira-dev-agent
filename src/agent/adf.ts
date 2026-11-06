/** Extrai texto plano de um documento ADF do Jira (descricao, comentario). */
export function adfToText(node: unknown): string {
  if (node == null || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === "text") return n.text ?? "";
  if (n.type === "hardBreak") return "\n";
  const kids = Array.isArray(n.content) ? n.content.map(adfToText).join("") : "";
  if (n.type === "paragraph" || n.type === "heading") return kids + "\n";
  if (n.type === "listItem") return `- ${kids}`;
  return kids;
}

/**
 * Converte texto simples no ADF que a API do Jira aceita em comentarios.
 * Paragrafos em linhas em branco; quebras simples viram hardBreak (preserva o
 * formato do relatorio). Nunca gera text node vazio (invalido no ADF).
 */
export function textToAdf(text: string) {
  const paras = (text || "").split(/\n{2,}/);
  const content = paras.map((para) => {
    const lines = para.split("\n");
    const nodes: Array<Record<string, unknown>> = [];
    lines.forEach((line, i) => {
      if (i > 0) nodes.push({ type: "hardBreak" });
      if (line.length) nodes.push({ type: "text", text: line });
    });
    return nodes.length
      ? { type: "paragraph", content: nodes }
      : { type: "paragraph" }; // paragrafo vazio e valido
  });
  return { type: "doc", version: 1, content: content.length ? content : [{ type: "paragraph" }] };
}
