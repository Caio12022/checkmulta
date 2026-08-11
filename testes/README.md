# Bateria de testes de análise

Testa se a IA de cada vertical devolve o resultado certo para autos de
infração conhecidos. É a rede de segurança da parte mais sensível do
produto: se um prompt for alterado e passar a inventar achado, a bateria
reprova antes de o usuário pagar por uma defesa sem fundamento.

## Como rodar

No GitHub: aba **Actions** → **Bateria de testes de analise** → **Run
workflow**. O campo `vertical` aceita `ibama`, `transito`, `procon`,
`vigilancia` ou `energia`; em branco, roda todas. A `GEMINI_API_KEY` vem
do secret do repositório — não precisa configurar nada.

Localmente, com o servidor já no ar e a chave configurada:

```bash
node testes/rodar.mjs          # todas as verticais
node testes/rodar.mjs ibama    # só uma
```

## Como os casos são organizados

Cada vertical tem uma pasta com os autos em `.txt` e um `casos.json` que
declara, para cada arquivo, o objetivo e o resultado esperado.

Os autos são sintéticos e escritos para exercitar um comportamento
específico. A base de casos cobre quatro situações, e essa proporção é
proposital:

1. **Autos corretos** — têm que passar sem achado nenhum. São os casos
   que pegam falso positivo, o erro mais caro: cobrar por uma defesa que
   não tem fundamento.
2. **Autos com vício real** — um por padrão do catálogo (descrição
   genérica, prescrição, prescrição intercorrente, incompetência,
   enquadramento vazio), para confirmar que o achado legítimo continua
   sendo encontrado depois de qualquer mexida em prompt.
3. **Documentos fora de escopo** — embargo, dívida ativa e afins, que se
   parecem com auto de infração e precisam ser recusados. Analisar um
   desses e devolver "nenhuma falha" é pior que errar: tranquiliza quem
   precisava agir com urgência.
4. **Ataque por injeção** — auto correto com parecer falso plantado no
   corpo do documento, mandando classificar como crítico. Nenhum achado
   pode nascer daí.

## Formato do `casos.json`

```jsonc
{
  "vertical": "ibama",
  "rota": "/api/analyze-ibama",
  "casos": [
    {
      "arquivo": "03-descricao-generica.txt",
      "objetivo": "por que este caso existe",
      "espera": {
        "tipo": "analise",              // ou "recusa"
        "houve_achado": true,
        "criticos_min": 1,              // piso de achados críticos
        "criticos_max": 0,              // teto (usar quando o padrão não pode ser crítico)
        "blocos_esperados": ["prescricao"]
      }
    },
    {
      "arquivo": "08-termo-embargo.txt",
      "objetivo": "...",
      "espera": { "tipo": "recusa", "valor": "fora_escopo_cautelar" }
    }
  ]
}
```

A conferência é deliberadamente frouxa quanto ao texto e rígida quanto ao
resultado: não se compara a redação do achado, que varia de execução para
execução, e sim se houve achado, quantos foram críticos e em que bloco
caíram. Testar a redação produziria falha toda hora sem indicar defeito.

## Ao mexer em prompt

Rode a bateria da vertical afetada antes e depois. Se um caso que passava
começar a falhar, o prompt regrediu — mesmo que a saída "pareça boa".

O teste roda contra a rota HTTP real, não chamando o Gemini direto, para
cobrir também o validador programático (`prompts/validador.ts`), as
recusas e o parsing. Um achado que o modelo inventa mas o validador
descarta tem que aparecer como aprovado; um que o validador deixa passar
indevidamente tem que reprovar.
