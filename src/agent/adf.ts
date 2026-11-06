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

/** Converte texto simples no ADF minimo que a API do Jira aceita em comentarios. */
export function textToAdf(text: string) {
  return {
    type: "doc",
    version: 1,
    content: text.split(/\n{2,}/).map((para) => ({
      type: "paragraph",
      content: [{ type: "text", text: para }],
    })),
  };
}
